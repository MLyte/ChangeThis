from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class WorkspaceSummary(BaseModel):
    id: UUID
    name: str
    role: str


class UserSummary(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str | None = None


class SessionResponse(BaseModel):
    user: UserSummary
    workspace: WorkspaceSummary | None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    workspace_name: str = Field(min_length=1, max_length=120)


class LoginResponse(SessionResponse):
    access_token: str


class ProjectResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    public_key: str
    allowed_origins: list[str]
    widget_locale: str
    widget_button_position: str
    widget_button_variant: str
    widget_reporter_fields: str
    issue_creation_mode: str

    model_config = ConfigDict(from_attributes=True)


class ProjectCreateRequest(BaseModel):
    workspace_id: UUID
    name: str = Field(min_length=1, max_length=120)
    public_key: str = Field(min_length=12, max_length=160)
    allowed_origins: list[str] = Field(default_factory=list)


class WidgetConfigResponse(BaseModel):
    project_key: str
    name: str
    modes: list[str]
    locale: str
    button_position: str
    button_variant: str
    reporter_fields: str
    endpoint: str = "/api/public/feedback"


class PublicFeedbackRequest(BaseModel):
    projectKey: str
    type: str
    message: str = ""
    pageUrl: str
    pageTitle: str | None = None
    browser: str | None = None
    viewport: dict | None = None
    position: dict | None = None
    element: dict | None = None
    metadata: dict = Field(default_factory=dict)
    screenshotDataUrl: str | None = None
    screenshotThumbnailDataUrl: str | None = None


class PublicFeedbackResponse(BaseModel):
    id: UUID
    status: str
    next: str


class FeedbackResponse(BaseModel):
    id: UUID
    project_id: UUID
    status: str
    type: str
    message: str
    page_url: str
    page_title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueTargetCreateRequest(BaseModel):
    project_id: UUID
    provider: str
    namespace: str
    project_name: str
    integration_id: UUID | None = None
    external_project_id: str | None = None
    web_url: str | None = None
