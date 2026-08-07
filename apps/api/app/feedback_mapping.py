import hashlib
import math
import re

from .models import ExternalIssue, Feedback, IssueTarget, Project, ProviderIssueAttempt
from .schemas import (
    AssetResponse,
    ExternalIssueResponse,
    FeedbackFullResponse,
    IssueDraftSchema,
    IssueTargetResponse,
)

_DATA_URL_MIME_RE = re.compile(r"^data:([^;,]+)[;,]")


def parse_data_url_mime_type(value: str) -> str:
    match = _DATA_URL_MIME_RE.match(value)
    return match.group(1) if match else "application/octet-stream"


def estimate_data_url_bytes(value: str) -> int:
    comma_index = value.find(",")
    if comma_index == -1:
        return len(value)
    return math.ceil((len(value) - comma_index - 1) * 0.75)


def hash_data_url(value: str) -> str:
    comma_index = value.find(",")
    payload = value if comma_index == -1 else value[comma_index + 1 :]
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def to_issue_target_response(issue_target: IssueTarget | None) -> IssueTargetResponse:
    if issue_target is None:
        return IssueTargetResponse(provider="github", namespace="", project_name="")

    return IssueTargetResponse(
        provider=issue_target.provider,
        namespace=issue_target.namespace,
        project_name=issue_target.project_name,
        integration_id=issue_target.integration_id,
        external_project_id=issue_target.external_project_id,
        web_url=issue_target.web_url,
    )


def to_external_issue_response(external_issue: ExternalIssue) -> ExternalIssueResponse:
    return ExternalIssueResponse(
        provider=external_issue.provider,
        id=external_issue.external_id,
        iid=external_issue.external_iid,
        number=external_issue.external_number,
        url=external_issue.url,
        state=external_issue.state,
    )


def build_screenshot_asset_response(feedback: Feedback) -> AssetResponse | None:
    if feedback.screenshot_mime_type is None and feedback.screenshot_hash is None and feedback.screenshot_data_url is None:
        return None

    return AssetResponse(
        id=f"{feedback.id}:screenshot",
        feedback_id=feedback.id,
        kind=feedback.screenshot_kind,
        mime_type=feedback.screenshot_mime_type or "application/octet-stream",
        bytes=feedback.screenshot_bytes or 0,
        data_url=feedback.screenshot_data_url,
        thumbnail_data_url=feedback.screenshot_thumbnail_data_url,
        storage_path=feedback.screenshot_storage_path,
        hash=feedback.screenshot_hash,
        status=feedback.screenshot_status,
        last_used_at=feedback.screenshot_last_used_at,
        usage_count=feedback.screenshot_usage_count,
        archived_at=feedback.screenshot_archived_at,
        deleted_at=feedback.screenshot_deleted_at,
        created_at=feedback.screenshot_last_used_at or feedback.created_at,
    )


def build_browser_capture_asset_response(feedback: Feedback) -> AssetResponse | None:
    if (
        feedback.browser_capture_mime_type is None
        and feedback.browser_capture_hash is None
        and feedback.browser_capture_data_url is None
    ):
        return None

    return AssetResponse(
        id=f"{feedback.id}:browser-capture",
        feedback_id=feedback.id,
        kind="browser_capture",
        mime_type=feedback.browser_capture_mime_type or "application/octet-stream",
        bytes=feedback.browser_capture_bytes or 0,
        data_url=feedback.browser_capture_data_url,
        thumbnail_data_url=feedback.browser_capture_thumbnail_data_url,
        storage_path=feedback.browser_capture_storage_path,
        hash=feedback.browser_capture_hash,
        status=feedback.browser_capture_status,
        last_used_at=feedback.browser_capture_last_used_at,
        usage_count=feedback.browser_capture_usage_count,
        archived_at=feedback.browser_capture_archived_at,
        deleted_at=feedback.browser_capture_deleted_at,
        created_at=feedback.browser_capture_created_at or feedback.created_at,
    )


def build_feedback_response(
    feedback: Feedback,
    project: Project,
    issue_target: IssueTarget | None,
    external_issue: ExternalIssue | None,
    attempt: ProviderIssueAttempt | None,
) -> FeedbackFullResponse:
    return FeedbackFullResponse(
        id=feedback.id,
        project_key=project.public_key,
        workspace_id=project.workspace_id,
        project_name=project.name,
        issue_target=to_issue_target_response(issue_target),
        payload=feedback.payload or {},
        issue_draft=IssueDraftSchema(
            title=feedback.issue_draft_title or "",
            description=feedback.issue_draft_description or "",
            labels=feedback.issue_draft_labels or [],
        ),
        status=feedback.status,
        screenshot_asset=build_screenshot_asset_response(feedback),
        browser_capture_asset=build_browser_capture_asset_response(feedback),
        external_issue=to_external_issue_response(external_issue) if external_issue else None,
        last_error=attempt.last_error if attempt else None,
        retry_count=attempt.retry_count if attempt else 0,
        next_retry_at=attempt.next_retry_at if attempt else None,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
    )
