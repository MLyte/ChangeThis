from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import IssueTarget
from ..schemas import IssueTargetCreateRequest

router = APIRouter(prefix="/issue-targets", tags=["issue-targets"])


@router.post("")
async def create_issue_target(payload: IssueTargetCreateRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    target = IssueTarget(
        project_id=payload.project_id,
        integration_id=payload.integration_id,
        provider=payload.provider,
        namespace=payload.namespace,
        project_name=payload.project_name,
        external_project_id=payload.external_project_id,
        web_url=payload.web_url,
    )
    db.add(target)
    await db.commit()
    await db.refresh(target)
    return {"id": str(target.id)}
