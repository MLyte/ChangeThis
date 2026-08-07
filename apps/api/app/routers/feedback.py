from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select

from ..database import AsyncSessionLocal
from ..feedback_mapping import estimate_data_url_bytes, hash_data_url, parse_data_url_mime_type, build_feedback_response
from ..models import Feedback, FeedbackStatusEvent, IssueTarget, Project
from ..schemas import FeedbackFullResponse, PublicFeedbackRequest

router = APIRouter(prefix="/public", tags=["public-feedback"])


@router.post("/feedback", response_model=FeedbackFullResponse)
async def create_feedback(payload: PublicFeedbackRequest, origin: str | None = Header(default=None)) -> FeedbackFullResponse:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.public_key == payload.projectKey).limit(1))
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown project")

        if not origin or origin not in project.allowed_origins:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin is not allowed for this project")

        target_result = await db.execute(select(IssueTarget).where(IssueTarget.project_id == project.id).limit(1))
        issue_target = target_result.scalar_one_or_none()

        metadata = payload.metadata or {}
        viewport = metadata.get("viewport") or {}
        pin = payload.pin or {}
        issue_draft = payload.issueDraft

        feedback = Feedback(
            project_id=project.id,
            issue_target_id=issue_target.id if issue_target else None,
            status="raw",
            type=payload.type,
            message=payload.message,
            page_url=metadata.get("url", ""),
            page_title=metadata.get("title"),
            browser=metadata.get("userAgent"),
            viewport_width=viewport.get("width"),
            viewport_height=viewport.get("height"),
            device_pixel_ratio=metadata.get("devicePixelRatio"),
            pin_x=pin.get("x"),
            pin_y=pin.get("y"),
            element_selector=pin.get("selector"),
            element_text=pin.get("text"),
            payload=payload.model_dump(exclude={"screenshotDataUrl", "screenshotThumbnailDataUrl", "issueDraft"}),
            issue_draft_title=issue_draft.title if issue_draft else None,
            issue_draft_description=issue_draft.description if issue_draft else None,
            issue_draft_labels=issue_draft.labels if issue_draft else [],
        )

        if payload.screenshotDataUrl:
            now = datetime.now(UTC)
            feedback.screenshot_data_url = payload.screenshotDataUrl
            feedback.screenshot_thumbnail_data_url = payload.screenshotThumbnailDataUrl
            feedback.screenshot_mime_type = parse_data_url_mime_type(payload.screenshotDataUrl)
            feedback.screenshot_bytes = estimate_data_url_bytes(payload.screenshotDataUrl)
            feedback.screenshot_hash = hash_data_url(payload.screenshotDataUrl)
            feedback.screenshot_kind = payload.screenshotSource or "client_capture"
            feedback.screenshot_status = "active"
            feedback.screenshot_last_used_at = now
            feedback.screenshot_usage_count = 1

        db.add(feedback)
        await db.flush()

        db.add(FeedbackStatusEvent(
            feedback_id=feedback.id,
            from_status=None,
            to_status="raw",
            reason="feedback_received",
        ))

        await db.commit()
        await db.refresh(feedback)

        return build_feedback_response(feedback, project, issue_target, None, None)
