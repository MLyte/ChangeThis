from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from ..database import AsyncSessionLocal
from ..models import IssueTarget, Project
from ..schemas import IssueTargetResponse, PublicSiteResponse

router = APIRouter(prefix="/public", tags=["public-projects"])


@router.get("/projects/{public_key}", response_model=PublicSiteResponse)
async def get_public_project(public_key: str) -> PublicSiteResponse:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Project, IssueTarget)
            .outerjoin(IssueTarget, IssueTarget.project_id == Project.id)
            .where(Project.public_key == public_key)
            .limit(1)
        )
        row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown project")

    project, issue_target = row
    return to_response(project, issue_target)


@router.get("/origins/known")
async def get_known_origin(origin: str = Query(min_length=1)) -> dict[str, bool]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project.id).where(Project.allowed_origins.any(origin)).limit(1))
        known = result.scalar_one_or_none() is not None

    return {"known": known}


def to_response(project: Project, issue_target: IssueTarget | None) -> PublicSiteResponse:
    return PublicSiteResponse(
        public_key=project.public_key,
        name=project.name,
        workspace_id=project.workspace_id,
        allowed_origins=project.allowed_origins,
        widget_locale=project.widget_locale,
        widget_button_position=project.widget_button_position,
        widget_button_variant=project.widget_button_variant,
        widget_display_mode=project.widget_display_mode,
        widget_reporter_fields=project.widget_reporter_fields,
        widget_title=project.widget_title,
        widget_modes=project.widget_modes,
        issue_creation_mode=project.issue_creation_mode,
        issue_target=to_issue_target_response(issue_target),
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def to_issue_target_response(issue_target: IssueTarget | None) -> IssueTargetResponse | None:
    if issue_target is None:
        return None

    return IssueTargetResponse(
        provider=issue_target.provider,
        namespace=issue_target.namespace,
        project_name=issue_target.project_name,
        integration_id=issue_target.integration_id,
        external_project_id=issue_target.external_project_id,
        web_url=issue_target.web_url,
    )
