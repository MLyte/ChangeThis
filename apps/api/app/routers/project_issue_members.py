from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ProjectIssueMember, User
from ..schemas import ProjectIssueMemberResponse, ProjectIssueMembersReplaceRequest
from ..security import session_from_token

router = APIRouter(prefix="/project-issue-members", tags=["project-issue-members"])


@router.get("", response_model=list[ProjectIssueMemberResponse])
async def list_project_issue_members(
    workspace_id: UUID,
    project_key: str | None = None,
    user_id: UUID | None = None,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectIssueMemberResponse]:
    user, membership, _workspace = await require_workspace_session(changethis_internal_session, db)
    if membership.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace access required")

    if user_id and user_id != user.id and membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace role")

    if not user_id and membership.role not in ("owner", "admin"):
        user_id = user.id

    query = (
        select(ProjectIssueMember, User.email)
        .join(User, User.id == ProjectIssueMember.user_id)
        .where(ProjectIssueMember.workspace_id == workspace_id)
        .where(ProjectIssueMember.status == "active")
        .where(User.status == "active")
        .order_by(ProjectIssueMember.created_at.asc())
    )

    if project_key:
        query = query.where(ProjectIssueMember.project_key == project_key)

    if user_id:
        query = query.where(ProjectIssueMember.user_id == user_id)

    rows = await db.execute(query)
    return [to_response(member, email) for member, email in rows.all()]


@router.put("", response_model=list[ProjectIssueMemberResponse])
async def replace_project_issue_members(
    payload: ProjectIssueMembersReplaceRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectIssueMemberResponse]:
    _user, membership, _workspace = await require_workspace_session(changethis_internal_session, db)
    if membership.workspace_id != payload.workspace_id or membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace role")

    user_ids = list(dict.fromkeys(payload.user_ids))
    user_emails = list(dict.fromkeys(email.strip().lower() for email in payload.user_emails if email.strip()))

    selected_user_ids = set(user_ids)
    if user_emails:
        email_rows = await db.execute(
            select(User.id)
            .where(User.email.in_(user_emails))
            .where(User.status == "active")
        )
        email_user_ids = {row[0] for row in email_rows.all()}
        if len(email_user_ids) != len(user_emails):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected user must already have an active ChangeThis account")
        selected_user_ids.update(email_user_ids)

    if selected_user_ids:
        user_rows = await db.execute(
            select(User.id)
            .where(User.id.in_(selected_user_ids))
            .where(User.status == "active")
        )
        active_user_ids = {row[0] for row in user_rows.all()}
        if active_user_ids != selected_user_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Selected user must already have an active ChangeThis account")

    await db.execute(
        delete(ProjectIssueMember)
        .where(ProjectIssueMember.workspace_id == payload.workspace_id)
        .where(ProjectIssueMember.project_key == payload.project_key)
    )

    now = datetime.now(UTC)
    for user_id in selected_user_ids:
        db.add(ProjectIssueMember(
            workspace_id=payload.workspace_id,
            project_key=payload.project_key,
            user_id=user_id,
            role="issue_member",
            status="active",
            created_at=now,
            updated_at=now,
        ))

    await db.commit()
    return await list_project_issue_members(payload.workspace_id, payload.project_key, None, changethis_internal_session, db)


async def require_workspace_session(token: str | None, db: AsyncSession):
    resolved = await session_from_token(db, token)
    if not resolved:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return resolved


def to_response(member: ProjectIssueMember, email: str) -> ProjectIssueMemberResponse:
    return ProjectIssueMemberResponse(
        project_key=member.project_key,
        user_id=member.user_id,
        email=email,
        role=member.role,
        status=member.status,
        created_at=member.created_at,
        updated_at=member.updated_at,
    )
