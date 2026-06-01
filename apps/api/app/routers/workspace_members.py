from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, WorkspaceMember
from ..schemas import WorkspaceMemberAddRequest, WorkspaceMemberResponse, WorkspaceMemberStatusUpdateRequest
from ..security import session_from_token

router = APIRouter(prefix="/workspace/members", tags=["workspace-members"])


@router.get("", response_model=list[WorkspaceMemberResponse])
async def list_workspace_members(
    workspace_id: UUID,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[WorkspaceMemberResponse]:
    _user, actor_membership, _workspace = await require_workspace_admin(changethis_internal_session, db, workspace_id)

    result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.created_at.asc())
    )
    return [to_response(member, user) for member, user in result.all()]


@router.post("", response_model=WorkspaceMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_workspace_member(
    payload: WorkspaceMemberAddRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMemberResponse:
    _actor, actor_membership, _workspace = await require_workspace_admin(changethis_internal_session, db, payload.workspace_id)
    role = normalize_role(payload.role)
    if not role:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")

    if actor_membership.role == "admin" and role == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace role")

    user_result = await db.execute(select(User).where(User.email == payload.email.lower()).where(User.status == "active").limit(1))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    member_result = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == payload.workspace_id)
        .where(WorkspaceMember.user_id == user.id)
        .limit(1)
    )
    member = member_result.scalar_one_or_none()
    now = datetime.now(UTC)

    if member:
        if member.status == "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Member already active")
        member.role = role
        member.status = "active"
        member.joined_at = member.joined_at or now
        member.updated_at = now
    else:
        member = WorkspaceMember(
            workspace_id=payload.workspace_id,
            user_id=user.id,
            role=role,
            status="active",
            joined_at=now,
        )
        db.add(member)

    await db.commit()
    await db.refresh(member)
    return to_response(member, user)


@router.patch("", response_model=WorkspaceMemberResponse)
async def update_workspace_member_status(
    payload: WorkspaceMemberStatusUpdateRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMemberResponse:
    actor, actor_membership, _workspace = await require_workspace_admin(changethis_internal_session, db, payload.workspace_id)
    if payload.user_id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Self-disabling is not allowed")

    if payload.status != "disabled":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only status disabled is supported")

    result = await db.execute(
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == payload.workspace_id)
        .where(WorkspaceMember.user_id == payload.user_id)
        .limit(1)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace member not found")

    member, user = row
    if actor_membership.role == "admin" and member.role == "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace role")

    member.status = "disabled"
    member.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(member)
    return to_response(member, user)


async def require_workspace_admin(token: str | None, db: AsyncSession, workspace_id: UUID):
    resolved = await session_from_token(db, token)
    if not resolved:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user, membership, workspace = resolved
    if membership.workspace_id != workspace_id or membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient workspace role")

    return user, membership, workspace


def normalize_role(role: str) -> str | None:
    return role if role in ("viewer", "member", "admin", "owner") else None


def to_response(member: WorkspaceMember, user: User) -> WorkspaceMemberResponse:
    return WorkspaceMemberResponse(
        user_id=member.user_id,
        email=user.email,
        role=member.role,
        status=member.status,
        created_at=member.created_at,
    )
