from fastapi import APIRouter, Header, HTTPException, Query, status
from sqlalchemy import select

from ..database import AsyncSessionLocal
from ..models import Project
from ..schemas import WidgetConfigResponse

router = APIRouter(prefix="/widget", tags=["widget"])


@router.get("/config", response_model=WidgetConfigResponse)
async def widget_config(project: str = Query(min_length=1), origin: str | None = Header(default=None)) -> WidgetConfigResponse:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.public_key == project).limit(1))
        configured_project = result.scalar_one_or_none()

    if not configured_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown project")

    if origin and origin not in configured_project.allowed_origins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin is not allowed for this project")

    return WidgetConfigResponse(
        project_key=configured_project.public_key,
        name=configured_project.name,
        modes=["comment", "pin", "screenshot"],
        locale=configured_project.widget_locale,
        button_position=configured_project.widget_button_position,
        button_variant=configured_project.widget_button_variant,
        reporter_fields=configured_project.widget_reporter_fields,
    )
