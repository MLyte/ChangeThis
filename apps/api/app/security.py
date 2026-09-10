import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .models import ProjectIssueMember, Session, User, Workspace, WorkspaceMember

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_session(db: AsyncSession, user: User) -> tuple[str, Session]:
    settings = get_settings()
    token = secrets.token_urlsafe(48)
    session = Session(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.session_ttl_seconds),
    )
    db.add(session)
    await db.flush()
    return token, session


async def session_from_token(db: AsyncSession, token: str | None) -> tuple[User, WorkspaceMember, Workspace] | None:
    if not token:
        return None

    result = await db.execute(
        select(User, WorkspaceMember, Workspace)
        .join(Session, Session.user_id == User.id)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
        .where(Session.token_hash == hash_session_token(token))
        .where(Session.revoked_at.is_(None))
        .where(Session.expires_at > datetime.now(UTC))
        .where(User.status == "active")
        .where(WorkspaceMember.status == "active")
        .order_by(WorkspaceMember.created_at.asc())
        .limit(1)
    )
    row = result.first()
    if row:
        return row[0], row[1], row[2]

    project_access_result = await db.execute(
        select(User, Workspace, ProjectIssueMember)
        .join(Session, Session.user_id == User.id)
        .join(ProjectIssueMember, ProjectIssueMember.user_id == User.id)
        .join(Workspace, Workspace.id == ProjectIssueMember.workspace_id)
        .where(Session.token_hash == hash_session_token(token))
        .where(Session.revoked_at.is_(None))
        .where(Session.expires_at > datetime.now(UTC))
        .where(User.status == "active")
        .where(ProjectIssueMember.status == "active")
        .order_by(ProjectIssueMember.updated_at.desc(), ProjectIssueMember.created_at.desc())
        .limit(1)
    )
    project_access_row = project_access_result.first()
    if project_access_row:
        user, workspace, access = project_access_row
        if hasattr(access, "workspace_id"):
            synthetic_membership = SimpleNamespace(
                workspace_id=access.workspace_id,
                user_id=user.id,
                role="viewer",
                status="active",
            )
            return user, synthetic_membership, workspace

    return None


async def workspace_access_from_token(
    db: AsyncSession, token: str | None, workspace_id: uuid.UUID
) -> tuple[User, WorkspaceMember, Workspace] | None:
    """Resolve session access to a specific workspace.

    Unlike session_from_token (which always prefers the caller's own
    WorkspaceMember row), this checks membership in *this* workspace_id
    first and falls back to an active ProjectIssueMember grant for it -
    so a user who already owns their own workspace can still use
    project-scoped sharing into someone else's workspace.
    """
    if not token:
        return None

    result = await db.execute(
        select(User, WorkspaceMember, Workspace)
        .join(Session, Session.user_id == User.id)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
        .where(Session.token_hash == hash_session_token(token))
        .where(Session.revoked_at.is_(None))
        .where(Session.expires_at > datetime.now(UTC))
        .where(User.status == "active")
        .where(WorkspaceMember.status == "active")
        .where(WorkspaceMember.workspace_id == workspace_id)
        .limit(1)
    )
    row = result.first()
    if row:
        return row[0], row[1], row[2]

    project_access_result = await db.execute(
        select(User, Workspace, ProjectIssueMember)
        .join(Session, Session.user_id == User.id)
        .join(ProjectIssueMember, ProjectIssueMember.user_id == User.id)
        .join(Workspace, Workspace.id == ProjectIssueMember.workspace_id)
        .where(Session.token_hash == hash_session_token(token))
        .where(Session.revoked_at.is_(None))
        .where(Session.expires_at > datetime.now(UTC))
        .where(User.status == "active")
        .where(ProjectIssueMember.status == "active")
        .where(ProjectIssueMember.workspace_id == workspace_id)
        .limit(1)
    )
    project_access_row = project_access_result.first()
    if project_access_row:
        user, workspace, access = project_access_row
        synthetic_membership = SimpleNamespace(
            workspace_id=access.workspace_id,
            user_id=user.id,
            role="viewer",
            status="active",
        )
        return user, synthetic_membership, workspace

    return None
