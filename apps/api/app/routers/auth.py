from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..models import Session, User, Workspace, WorkspaceMember
from ..schemas import ChangePasswordRequest, LoginRequest, LoginResponse, SessionResponse, SignUpRequest, UserSummary, WorkspaceSummary
from ..security import create_session, hash_password, hash_session_token, session_from_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignUpRequest, response: Response, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    settings = get_settings()

    if not settings.enable_public_signup:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public signup is disabled")

    email = payload.email.lower()
    workspace_name = payload.workspace_name.strip()
    if not workspace_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Workspace name is required")

    existing = await db.execute(select(User.id).where(User.email == email).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(payload.password), status="active")
    db.add(user)
    await db.flush()

    workspace = Workspace(name=workspace_name, owner_id=user.id, plan="free")
    db.add(workspace)
    await db.flush()

    membership = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner", status="active", joined_at=datetime.now(UTC))
    db.add(membership)

    token, _session = await create_session(db, user)
    await db.commit()

    response.set_cookie(
        settings.session_cookie_name,
        token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.session_ttl_seconds,
        path="/",
    )
    return LoginResponse(
        access_token=token,
        user=UserSummary(id=user.id, email=user.email, display_name=user.display_name),
        workspace=WorkspaceSummary(id=workspace.id, name=workspace.name, role=membership.role),
    )


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


@router.post("/password")
async def change_password(
    payload: ChangePasswordRequest,
    changethis_internal_session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    resolved = await session_from_token(db, changethis_internal_session)

    if not resolved:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user, _membership, _workspace = resolved
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid current password")

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True}


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
