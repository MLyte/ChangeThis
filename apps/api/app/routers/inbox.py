from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Feedback, Project
from ..schemas import FeedbackResponse

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("/feedbacks", response_model=list[FeedbackResponse])
async def list_feedbacks(workspace_id: UUID | None = None, db: AsyncSession = Depends(get_db)) -> list[Feedback]:
    query = select(Feedback).join(Project, Project.id == Feedback.project_id).order_by(Feedback.created_at.desc()).limit(100)
    if workspace_id:
        query = query.where(Project.workspace_id == workspace_id)
    result = await db.execute(query)
    return list(result.scalars().all())
