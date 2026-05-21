import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .models import Session, User, Workspace, WorkspaceMember

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
    if not row:
        return None
    return row[0], row[1], row[2]
