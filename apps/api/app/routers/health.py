from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/ready")
async def ready(db: AsyncSession = Depends(get_db)) -> dict[str, bool]:
    await db.execute(text("select 1"))
    return {"ok": True, "database": True}
