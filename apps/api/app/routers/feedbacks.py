import re
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..feedback_mapping import (
    build_feedback_response,
    estimate_data_url_bytes,
    hash_data_url,
    parse_data_url_mime_type,
)
from ..models import ExternalIssue, Feedback, FeedbackStatusEvent, IssueTarget, Project, ProviderIssueAttempt
from ..schemas import (
    CleanupScreenshotsRequest,
    FeedbackEventResponse,
    FeedbackFullResponse,
    RecordBrowserCaptureRequest,
    RecordExternalIssueStateRequest,
    RecordIssueAttemptRequest,
    UpdateIssueDraftRequest,
    UpdateReporterRequest,
    WorkspaceScopedActionRequest,
)

router = APIRouter(prefix="/feedbacks", tags=["feedbacks"])


@router.get("", response_model=list[FeedbackFullResponse])
async def list_feedbacks(
    workspace_id: UUID | None = None,
    project_key: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> list[FeedbackFullResponse]:
    query = (
        select(Feedback, Project, IssueTarget)
        .join(Project, Project.id == Feedback.project_id)
        .outerjoin(IssueTarget, IssueTarget.id == Feedback.issue_target_id)
        .order_by(Feedback.created_at.desc())
    )
    if workspace_id:
        query = query.where(Project.workspace_id == workspace_id)
    if project_key:
        query = query.where(Project.public_key == project_key)
    if status_filter:
        query = query.where(Feedback.status == status_filter)

    rows = (await db.execute(query)).all()
    responses = []
    for feedback, project, issue_target in rows:
        attempt, external_issue = await load_extras(db, feedback.id)
        responses.append(build_feedback_response(feedback, project, issue_target, external_issue, attempt))
    return responses


@router.get("/due-for-retry", response_model=list[FeedbackFullResponse])
async def list_due_for_retry(
    workspace_id: UUID | None = None,
    now: datetime | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[FeedbackFullResponse]:
    threshold = now or datetime.now(UTC)
    query = (
        select(Feedback, Project, IssueTarget)
        .join(Project, Project.id == Feedback.project_id)
        .outerjoin(IssueTarget, IssueTarget.id == Feedback.issue_target_id)
        .join(ProviderIssueAttempt, ProviderIssueAttempt.feedback_id == Feedback.id)
        .where(Feedback.status == "retrying")
        .where(ProviderIssueAttempt.next_retry_at.is_not(None))
        .where(ProviderIssueAttempt.next_retry_at <= threshold)
    )
    if workspace_id:
        query = query.where(Project.workspace_id == workspace_id)

    rows = (await db.execute(query)).all()
    responses = []
    for feedback, project, issue_target in rows:
        attempt, external_issue = await load_extras(db, feedback.id)
        responses.append(build_feedback_response(feedback, project, issue_target, external_issue, attempt))
    return responses


@router.post("/cleanup-screenshots")
async def cleanup_screenshots(
    payload: CleanupScreenshotsRequest | None = None,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    require_cron_secret(authorization)
    policy = payload or CleanupScreenshotsRequest()

    now = datetime.now(UTC)
    archive_before = now - timedelta(days=policy.archive_after_days)
    delete_before = now - timedelta(days=policy.delete_after_days)

    result = await db.execute(
        select(Feedback)
        .where(Feedback.status.in_(("ignored", "resolved")))
        .where(Feedback.screenshot_mime_type.is_not(None))
    )

    archived = 0
    deleted = 0

    for feedback in result.scalars().all():
        current_status = feedback.screenshot_status

        if (
            current_status == "active"
            and feedback.screenshot_data_url
            and (feedback.screenshot_bytes or 0) > policy.min_archive_bytes
            and (feedback.screenshot_last_used_at or feedback.created_at) <= archive_before
        ):
            feedback.screenshot_status = "archived"
            feedback.screenshot_archived_at = now
            feedback.screenshot_data_url = None
            feedback.screenshot_bytes = (
                estimate_data_url_bytes(feedback.screenshot_thumbnail_data_url) if feedback.screenshot_thumbnail_data_url else 0
            )
            feedback.updated_at = now
            archived += 1
            current_status = "archived"

        if current_status == "archived" and (feedback.screenshot_archived_at or feedback.created_at) <= delete_before:
            feedback.screenshot_status = "deleted"
            feedback.screenshot_deleted_at = now
            feedback.screenshot_data_url = None
            feedback.screenshot_thumbnail_data_url = None
            feedback.screenshot_bytes = 0
            feedback.updated_at = now
            deleted += 1

    await db.commit()
    return {"archived": archived, "deleted": deleted}


@router.get("/{feedback_id}", response_model=FeedbackFullResponse)
async def get_feedback(feedback_id: UUID, workspace_id: UUID | None = None, db: AsyncSession = Depends(get_db)) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, workspace_id)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.get("/{feedback_id}/events", response_model=list[FeedbackEventResponse])
async def list_feedback_events(
    feedback_id: UUID,
    workspace_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[FeedbackEventResponse]:
    await find_feedback_or_404(db, feedback_id, workspace_id)
    result = await db.execute(
        select(FeedbackStatusEvent)
        .where(FeedbackStatusEvent.feedback_id == feedback_id)
        .order_by(FeedbackStatusEvent.created_at.desc())
    )
    return [to_event_response(event) for event in result.scalars().all()]


@router.patch("/{feedback_id}/reporter", response_model=FeedbackFullResponse)
async def update_feedback_reporter(
    feedback_id: UUID,
    payload: UpdateReporterRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)

    feedback.payload = {
        **(feedback.payload or {}),
        "reporter": payload.reporter.model_dump() if payload.reporter else None,
    }
    feedback.issue_draft_title = payload.issue_draft.title
    feedback.issue_draft_description = payload.issue_draft.description
    feedback.issue_draft_labels = payload.issue_draft.labels
    feedback.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.patch("/{feedback_id}/issue-draft", response_model=FeedbackFullResponse)
async def update_feedback_issue_draft(
    feedback_id: UUID,
    payload: UpdateIssueDraftRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    feedback.issue_draft_title = payload.title
    feedback.issue_draft_description = payload.description
    feedback.issue_draft_labels = payload.labels
    feedback.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.post("/{feedback_id}/issue-pending", response_model=FeedbackFullResponse)
async def mark_issue_creation_pending(
    feedback_id: UUID,
    payload: WorkspaceScopedActionRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)
    from_status = feedback.status
    feedback.status = "issue_creation_pending"
    feedback.updated_at = now

    db.add(FeedbackStatusEvent(
        feedback_id=feedback.id,
        from_status=from_status,
        to_status="issue_creation_pending",
        reason="provider_issue_creation_started",
        provider=issue_target.provider if issue_target else None,
    ))

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.post("/{feedback_id}/issue-attempt", response_model=FeedbackFullResponse)
async def record_issue_attempt(
    feedback_id: UUID,
    payload: RecordIssueAttemptRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)
    from_status = feedback.status
    provider = payload.external_issue.provider if payload.external_issue else (issue_target.provider if issue_target else "github")
    idempotency_key = f"changethis:{feedback.id}"

    attempt_result = await db.execute(
        select(ProviderIssueAttempt)
        .where(ProviderIssueAttempt.provider == provider)
        .where(ProviderIssueAttempt.idempotency_key == idempotency_key)
        .limit(1)
    )
    attempt = attempt_result.scalar_one_or_none()
    if attempt is None:
        attempt = ProviderIssueAttempt(feedback_id=feedback.id, provider=provider, idempotency_key=idempotency_key)
        db.add(attempt)

    if payload.ok:
        if not payload.external_issue:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="external_issue is required when ok is true")

        feedback.status = "sent_to_provider"
        feedback.updated_at = now
        attempt.status = "succeeded"
        attempt.last_error = None
        attempt.next_retry_at = None
        attempt.updated_at = now

        external_result = await db.execute(select(ExternalIssue).where(ExternalIssue.feedback_id == feedback.id).limit(1))
        external_issue = external_result.scalar_one_or_none()
        if external_issue is None:
            external_issue = ExternalIssue(feedback_id=feedback.id, issue_target_id=issue_target.id if issue_target else None, provider=provider)
            db.add(external_issue)

        external_issue.provider = provider
        external_issue.external_id = payload.external_issue.id
        external_issue.external_iid = payload.external_issue.iid
        external_issue.external_number = payload.external_issue.number
        external_issue.url = payload.external_issue.url
        external_issue.state = payload.external_issue.state
        external_issue.updated_at = now

        db.add(FeedbackStatusEvent(
            feedback_id=feedback.id,
            from_status=from_status,
            to_status="sent_to_provider",
            reason="provider_issue_created",
            provider=provider,
            external_url=payload.external_issue.url,
        ))
    else:
        attempt.retry_count += 1
        attempt.status = "retrying" if payload.retryable else "failed"
        attempt.last_error = payload.error
        attempt.next_retry_at = payload.next_retry_at
        attempt.updated_at = now

        feedback.status = "retrying" if payload.retryable else "failed"
        feedback.updated_at = now

        db.add(FeedbackStatusEvent(
            feedback_id=feedback.id,
            from_status=from_status,
            to_status=feedback.status,
            reason=payload.error,
            provider=provider,
        ))

    await db.commit()
    await db.refresh(feedback)
    attempt_row, external_issue_row = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue_row, attempt_row)


@router.post("/{feedback_id}/external-issue-state", response_model=FeedbackFullResponse)
async def record_external_issue_state(
    feedback_id: UUID,
    payload: RecordExternalIssueStateRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)
    from_status = feedback.status

    external_result = await db.execute(select(ExternalIssue).where(ExternalIssue.feedback_id == feedback.id).limit(1))
    external_issue = external_result.scalar_one_or_none()
    if external_issue is None:
        external_issue = ExternalIssue(feedback_id=feedback.id, issue_target_id=issue_target.id if issue_target else None, provider=payload.provider)
        db.add(external_issue)

    external_issue.provider = payload.provider
    external_issue.external_id = payload.id
    external_issue.external_iid = payload.iid
    external_issue.external_number = payload.number
    external_issue.url = payload.url
    external_issue.state = payload.state
    external_issue.updated_at = now

    feedback.status = "resolved" if payload.state == "closed" else "sent_to_provider"
    feedback.updated_at = now

    db.add(FeedbackStatusEvent(
        feedback_id=feedback.id,
        from_status=from_status,
        to_status=feedback.status,
        reason="provider_issue_state_synced",
        provider=payload.provider,
        external_url=payload.url,
    ))

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue_row = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue_row, attempt)


@router.post("/{feedback_id}/keep", response_model=FeedbackFullResponse)
async def mark_feedback_kept(
    feedback_id: UUID,
    payload: WorkspaceScopedActionRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)
    from_status = feedback.status
    feedback.status = "kept"
    feedback.updated_at = now

    db.add(FeedbackStatusEvent(feedback_id=feedback.id, from_status=from_status, to_status="kept", reason="kept_without_issue"))

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.post("/{feedback_id}/resolve", response_model=FeedbackFullResponse)
async def mark_feedback_resolved(
    feedback_id: UUID,
    payload: WorkspaceScopedActionRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)
    from_status = feedback.status

    external_result = await db.execute(select(ExternalIssue).where(ExternalIssue.feedback_id == feedback.id).limit(1))
    external_issue = external_result.scalar_one_or_none()

    feedback.status = "resolved"
    feedback.updated_at = now

    db.add(FeedbackStatusEvent(
        feedback_id=feedback.id,
        from_status=from_status,
        to_status="resolved",
        reason="provider_issue_closed",
        provider=issue_target.provider if issue_target else None,
        external_url=external_issue.url if external_issue else None,
    ))

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue_row = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue_row, attempt)


@router.post("/{feedback_id}/ignore", response_model=FeedbackFullResponse)
async def mark_feedback_ignored(
    feedback_id: UUID,
    payload: WorkspaceScopedActionRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)
    from_status = feedback.status
    feedback.status = "ignored"
    feedback.updated_at = now

    db.add(FeedbackStatusEvent(feedback_id=feedback.id, from_status=from_status, to_status="ignored", reason="ignored_from_inbox"))

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.post("/{feedback_id}/browser-capture", response_model=FeedbackFullResponse)
async def record_browser_capture(
    feedback_id: UUID,
    payload: RecordBrowserCaptureRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedbackFullResponse:
    feedback, project, issue_target = await find_feedback_or_404(db, feedback_id, payload.workspace_id)
    now = datetime.now(UTC)

    feedback.browser_capture_mime_type = parse_data_url_mime_type(payload.data_url)
    feedback.browser_capture_bytes = estimate_data_url_bytes(payload.data_url)
    feedback.browser_capture_data_url = payload.data_url
    feedback.browser_capture_hash = hash_data_url(payload.data_url)
    feedback.browser_capture_status = "active"
    feedback.browser_capture_last_used_at = now
    feedback.browser_capture_usage_count = 1
    feedback.browser_capture_created_at = feedback.browser_capture_created_at or now
    feedback.updated_at = now

    db.add(FeedbackStatusEvent(feedback_id=feedback.id, from_status=feedback.status, to_status=feedback.status, reason="browser_capture_created"))

    await db.commit()
    await db.refresh(feedback)
    attempt, external_issue = await load_extras(db, feedback.id)
    return build_feedback_response(feedback, project, issue_target, external_issue, attempt)


@router.delete("")
async def clear_workspace_feedbacks(workspace_id: UUID, db: AsyncSession = Depends(get_db)) -> dict[str, int]:
    result = await db.execute(
        select(Feedback).join(Project, Project.id == Feedback.project_id).where(Project.workspace_id == workspace_id)
    )
    feedbacks = list(result.scalars().all())
    feedback_ids = [feedback.id for feedback in feedbacks]

    events_count = 0
    if feedback_ids:
        events_result = await db.execute(
            select(FeedbackStatusEvent).where(FeedbackStatusEvent.feedback_id.in_(feedback_ids))
        )
        events_count = len(events_result.scalars().all())

    for feedback in feedbacks:
        await db.delete(feedback)

    await db.commit()
    return {"feedbacks": len(feedbacks), "events": events_count}


async def find_feedback_or_404(
    db: AsyncSession,
    feedback_id: UUID,
    workspace_id: UUID | None,
) -> tuple[Feedback, Project, IssueTarget | None]:
    query = (
        select(Feedback, Project, IssueTarget)
        .join(Project, Project.id == Feedback.project_id)
        .outerjoin(IssueTarget, IssueTarget.id == Feedback.issue_target_id)
        .where(Feedback.id == feedback_id)
    )
    if workspace_id:
        query = query.where(Project.workspace_id == workspace_id)

    result = await db.execute(query.limit(1))
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    return row[0], row[1], row[2]


async def load_extras(db: AsyncSession, feedback_id: UUID) -> tuple[ProviderIssueAttempt | None, ExternalIssue | None]:
    attempt_result = await db.execute(
        select(ProviderIssueAttempt)
        .where(ProviderIssueAttempt.feedback_id == feedback_id)
        .order_by(ProviderIssueAttempt.created_at.desc())
        .limit(1)
    )
    external_result = await db.execute(select(ExternalIssue).where(ExternalIssue.feedback_id == feedback_id).limit(1))
    return attempt_result.scalar_one_or_none(), external_result.scalar_one_or_none()


def to_event_response(event: FeedbackStatusEvent) -> FeedbackEventResponse:
    return FeedbackEventResponse(
        id=event.id,
        feedback_id=event.feedback_id,
        from_status=event.from_status,
        to_status=event.to_status,
        reason=event.reason,
        provider=event.provider,
        external_url=event.external_url,
        created_at=event.created_at,
    )


def require_cron_secret(authorization: str | None) -> None:
    settings = get_settings()
    configured = settings.changethis_cron_secret or settings.changethis_secret_key
    if not configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Storage cleanup is not configured")

    token = None
    if authorization:
        match = re.match(r"^Bearer\s+(.+)$", authorization, re.IGNORECASE)
        token = match.group(1) if match else None

    if token != configured:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
