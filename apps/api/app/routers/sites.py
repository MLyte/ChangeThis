from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import IssueTarget, Project
from ..schemas import (
    IssueTargetResponse,
    IssueTargetUpdateRequest,
    SiteCreateRequest,
    SiteResponse,
    SiteWidgetUpdateRequest,
)
from ..security import session_from_token, workspace_access_from_token

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=list[SiteResponse])
async def list_sites(
    workspace_id: UUID,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[SiteResponse]:
    await require_workspace_session(changethis_internal_session, db, workspace_id)

    result = await db.execute(
        select(Project, IssueTarget)
        .outerjoin(IssueTarget, IssueTarget.project_id == Project.id)
        .where(Project.workspace_id == workspace_id)
        .order_by(Project.created_at.desc())
    )
    return [to_response(project, issue_target) for project, issue_target in result.all()]


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(
    payload: SiteCreateRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> SiteResponse:
    await require_workspace_admin(changethis_internal_session, db, payload.workspace_id)

    existing = await db.execute(select(Project).where(Project.public_key == payload.public_key).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Site with this public key already exists")

    project = Project(
        workspace_id=payload.workspace_id,
        name=payload.name,
        public_key=payload.public_key,
        allowed_origins=payload.allowed_origins,
        widget_locale=payload.widget_locale,
        widget_button_position=payload.widget_button_position,
        widget_button_variant=payload.widget_button_variant,
        widget_display_mode=payload.widget_display_mode,
        widget_reporter_fields=payload.widget_reporter_fields,
        widget_title=payload.widget_title.strip()[:240],
        widget_modes=payload.widget_modes,
        issue_creation_mode=payload.issue_creation_mode,
    )
    db.add(project)
    await db.flush()

    issue_target = IssueTarget(
        project_id=project.id,
        integration_id=payload.issue_target.integration_id,
        provider=payload.issue_target.provider,
        namespace=payload.issue_target.namespace,
        project_name=payload.issue_target.project_name,
        external_project_id=payload.issue_target.external_project_id,
        web_url=payload.issue_target.web_url,
    )
    db.add(issue_target)

    await db.commit()
    await db.refresh(project)
    await db.refresh(issue_target)
    return to_response(project, issue_target)


@router.patch("/{public_key}", response_model=SiteResponse)
async def update_site_widget_settings(
    public_key: str,
    payload: SiteWidgetUpdateRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> SiteResponse:
    project, issue_target = await find_site_or_404(db, public_key)
    await require_workspace_admin(changethis_internal_session, db, project.workspace_id)

    if payload.name is not None:
        project.name = payload.name.strip()
    project.widget_locale = payload.widget_locale
    project.widget_button_position = payload.widget_button_position
    project.widget_button_variant = payload.widget_button_variant
    project.widget_display_mode = payload.widget_display_mode
    project.widget_reporter_fields = payload.widget_reporter_fields
    project.widget_title = payload.widget_title.strip()[:240]
    project.widget_modes = payload.widget_modes
    project.issue_creation_mode = payload.issue_creation_mode
    if payload.allowed_origin is not None:
        project.allowed_origins = [payload.allowed_origin]
    project.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(project)
    return to_response(project, issue_target)


@router.delete("/{public_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    public_key: str,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> None:
    project, _issue_target = await find_site_or_404(db, public_key)
    await require_workspace_admin(changethis_internal_session, db, project.workspace_id)

    await db.delete(project)
    await db.commit()


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_sites(
    workspace_id: UUID,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    await require_workspace_admin(changethis_internal_session, db, workspace_id)

    result = await db.execute(select(Project).where(Project.workspace_id == workspace_id))
    projects = list(result.scalars().all())
    for project in projects:
        await db.delete(project)
    await db.commit()
    return {"deleted": len(projects)}


@router.put("/{public_key}/issue-target", response_model=SiteResponse)
async def save_issue_target(
    public_key: str,
    payload: IssueTargetUpdateRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> SiteResponse:
    project, issue_target = await find_site_or_404(db, public_key)
    await require_workspace_admin(changethis_internal_session, db, project.workspace_id)

    if issue_target is None:
        issue_target = IssueTarget(project_id=project.id)
        db.add(issue_target)

    issue_target.provider = payload.provider
    issue_target.namespace = payload.namespace
    issue_target.project_name = payload.project_name
    issue_target.integration_id = payload.integration_id
    issue_target.external_project_id = payload.external_project_id
    issue_target.web_url = payload.web_url

    await db.commit()
    await db.refresh(project)
    await db.refresh(issue_target)
    return to_response(project, issue_target)


async def find_site_or_404(db: AsyncSession, public_key: str) -> tuple[Project, IssueTarget | None]:
    result = await db.execute(
        select(Project, IssueTarget)
        .outerjoin(IssueTarget, IssueTarget.project_id == Project.id)
        .where(Project.public_key == public_key)
        .limit(1)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return row[0], row[1]


async def require_workspace_session(token: str | None, db: AsyncSession, workspace_id: UUID):
    resolved = await workspace_access_from_token(db, token, workspace_id)
    if resolved:
        return resolved

    # Distinguish "no session at all" (401) from "valid session but no
    # access to this particular workspace" (403).
    if not await session_from_token(db, token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace access required")


async def require_workspace_admin(token: str | None, db: AsyncSession, workspace_id: UUID):
    user, membership, workspace = await require_workspace_session(token, db, workspace_id)
    if membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace role")

    return user, membership, workspace


def to_response(project: Project, issue_target: IssueTarget | None) -> SiteResponse:
    return SiteResponse(
        id=project.id,
        workspace_id=project.workspace_id,
        public_key=project.public_key,
        name=project.name,
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
