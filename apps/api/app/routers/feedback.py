from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select

from ..database import AsyncSessionLocal
from ..models import Feedback, IssueTarget, Project
from ..schemas import PublicFeedbackRequest, PublicFeedbackResponse

router = APIRouter(prefix="/public", tags=["public-feedback"])


@router.post("/feedback", response_model=PublicFeedbackResponse)
async def create_feedback(payload: PublicFeedbackRequest, origin: str | None = Header(default=None)) -> PublicFeedbackResponse:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.public_key == payload.projectKey).limit(1))
        project = result.scalar_one_or_none()

        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown project")

        if not origin or origin not in project.allowed_origins:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin is not allowed for this project")

        target_result = await db.execute(select(IssueTarget).where(IssueTarget.project_id == project.id).limit(1))
        issue_target = target_result.scalar_one_or_none()

        feedback = Feedback(
            project_id=project.id,
            issue_target_id=issue_target.id if issue_target else None,
            status="raw",
            type=payload.type,
            message=payload.message,
            page_url=payload.pageUrl,
            page_title=payload.pageTitle,
            browser=payload.browser,
            payload=payload.model_dump(),
            screenshot_data_url=payload.screenshotDataUrl,
            screenshot_thumbnail_data_url=payload.screenshotThumbnailDataUrl,
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)

    return PublicFeedbackResponse(id=feedback.id, status=feedback.status, next="issue_creation")
