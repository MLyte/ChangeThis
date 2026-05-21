from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Project
from ..schemas import ProjectCreateRequest, ProjectResponse

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=list[ProjectResponse])
async def list_sites(workspace_id: UUID | None = None, db: AsyncSession = Depends(get_db)) -> list[Project]:
    query = select(Project).order_by(Project.created_at.desc())
    if workspace_id:
        query = query.where(Project.workspace_id == workspace_id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=ProjectResponse)
async def create_site(payload: ProjectCreateRequest, db: AsyncSession = Depends(get_db)) -> Project:
    project = Project(
        workspace_id=payload.workspace_id,
        name=payload.name,
        public_key=payload.public_key,
        allowed_origins=payload.allowed_origins,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project
