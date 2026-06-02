from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class WorkspaceSummary(BaseModel):
    id: UUID
    name: str
    role: str


class WorkspaceMemberResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    role: str
    status: str
    created_at: datetime


class WorkspaceMemberAddRequest(BaseModel):
    workspace_id: UUID
    email: EmailStr
    role: str = "member"


class WorkspaceMemberStatusUpdateRequest(BaseModel):
    workspace_id: UUID
    user_id: UUID
    status: str


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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


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
    widget_title: str
    widget_modes: list[str]
    issue_creation_mode: str

    model_config = ConfigDict(from_attributes=True)


class ProjectIssueMemberResponse(BaseModel):
    workspace_id: UUID
    project_key: str
    user_id: UUID
    email: EmailStr
    role: str
    status: str
    created_at: datetime
    updated_at: datetime


class ProjectIssueMembersReplaceRequest(BaseModel):
    workspace_id: UUID
    project_key: str = Field(min_length=1)
    user_ids: list[UUID] = Field(default_factory=list)
    user_emails: list[str] = Field(default_factory=list)


class ProjectCreateRequest(BaseModel):
    workspace_id: UUID
    name: str = Field(min_length=1, max_length=120)
    public_key: str = Field(min_length=12, max_length=160)
    allowed_origins: list[str] = Field(default_factory=list)
    widget_title: str = Field(default="Que faut-il changer ?", min_length=1, max_length=240)
    widget_modes: list[str] = Field(default_factory=lambda: ["comment", "pin", "screenshot"], min_length=1)


class WidgetConfigResponse(BaseModel):
    project_key: str
    name: str
    modes: list[str]
    locale: str
    button_position: str
    button_variant: str
    reporter_fields: str
    title: str
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
