from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..models import Session, User
from ..schemas import LoginRequest, LoginResponse, SessionResponse, UserSummary, WorkspaceSummary
from ..security import create_session, hash_session_token, session_from_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()).limit(1))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token, _session = await create_session(db, user)
    await db.commit()
    resolved = await session_from_token(db, token)

    if not resolved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Workspace access required")

    settings = get_settings()
    response.set_cookie(
        settings.session_cookie_name,
        token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.session_ttl_seconds,
        path="/",
    )
    resolved_user, membership, workspace = resolved
    return LoginResponse(
        access_token=token,
        user=UserSummary(id=resolved_user.id, email=resolved_user.email, display_name=resolved_user.display_name),
        workspace=WorkspaceSummary(id=workspace.id, name=workspace.name, role=membership.role),
    )


@router.get("/session", response_model=SessionResponse)
async def current_session(
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    resolved = await session_from_token(db, changethis_internal_session)

    if not resolved:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user, membership, workspace = resolved
    return SessionResponse(
        user=UserSummary(id=user.id, email=user.email, display_name=user.display_name),
        workspace=WorkspaceSummary(id=workspace.id, name=workspace.name, role=membership.role),
    )


@router.post("/logout")
async def logout(
    response: Response,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    if changethis_internal_session:
        await db.execute(
            update(Session)
            .where(Session.token_hash == hash_session_token(changethis_internal_session))
            .where(Session.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
        await db.commit()

    settings = get_settings()
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"ok": True}
