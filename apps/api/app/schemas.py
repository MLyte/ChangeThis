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
    widget_display_mode: str
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
    display_mode: str
    reporter_fields: str
    visible: bool = True
    title: str
    endpoint: str = "/api/public/feedback"


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


class IssueTargetResponse(BaseModel):
    provider: str
    namespace: str
    project_name: str
    integration_id: UUID | None = None
    external_project_id: str | None = None
    web_url: str | None = None


class IssueTargetSpec(BaseModel):
    provider: str
    namespace: str
    project_name: str
    integration_id: UUID | None = None
    external_project_id: str | None = None
    web_url: str | None = None


class SiteResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    public_key: str
    name: str
    allowed_origins: list[str]
    widget_locale: str
    widget_button_position: str
    widget_button_variant: str
    widget_display_mode: str
    widget_reporter_fields: str
    widget_title: str
    widget_modes: list[str]
    issue_creation_mode: str
    issue_target: IssueTargetResponse | None
    created_at: datetime
    updated_at: datetime


class SiteCreateRequest(BaseModel):
    workspace_id: UUID
    public_key: str = Field(min_length=12, max_length=160)
    name: str = Field(min_length=1, max_length=120)
    allowed_origins: list[str] = Field(min_length=1)
    widget_locale: str = "fr"
    widget_button_position: str = "bottom-right"
    widget_button_variant: str = "default"
    widget_display_mode: str = "standard"
    widget_reporter_fields: str = "optional"
    widget_title: str = Field(default="Que faut-il changer ?", min_length=1, max_length=240)
    widget_modes: list[str] = Field(default_factory=lambda: ["comment", "pin", "screenshot"], min_length=1)
    issue_creation_mode: str = "manual"
    issue_target: IssueTargetSpec


class SiteWidgetUpdateRequest(BaseModel):
    widget_locale: str
    widget_button_position: str
    widget_button_variant: str
    widget_display_mode: str
    widget_reporter_fields: str
    widget_title: str = Field(min_length=1, max_length=240)
    widget_modes: list[str] = Field(min_length=1)
    issue_creation_mode: str
    allowed_origin: str | None = None


class IssueTargetUpdateRequest(BaseModel):
    project_key: str
    provider: str
    namespace: str
    project_name: str
    integration_id: UUID | None = None
    external_project_id: str | None = None
    web_url: str | None = None


class PublicSiteResponse(BaseModel):
    public_key: str
    name: str
    workspace_id: UUID
    allowed_origins: list[str]
    widget_locale: str
    widget_button_position: str
    widget_button_variant: str
    widget_display_mode: str
    widget_reporter_fields: str
    widget_title: str
    widget_modes: list[str]
    issue_creation_mode: str
    issue_target: IssueTargetResponse | None
    created_at: datetime
    updated_at: datetime


class FeedbackReporterSchema(BaseModel):
    name: str | None = None
    email: str | None = None


class IssueDraftSchema(BaseModel):
    title: str
    description: str
    labels: list[str] = Field(default_factory=list)


class PublicFeedbackRequest(BaseModel):
    projectKey: str
    type: str
    message: str = ""
    reporter: FeedbackReporterSchema | None = None
    metadata: dict = Field(default_factory=dict)
    pin: dict | None = None
    pins: list[dict] | None = None
    captureArea: dict | None = None
    screenshotDataUrl: str | None = None
    screenshotThumbnailDataUrl: str | None = None
    screenshotSource: str | None = None
    issueDraft: IssueDraftSchema | None = None


class AssetResponse(BaseModel):
    id: str
    feedback_id: UUID
    kind: str | None = None
    mime_type: str
    bytes: int
    data_url: str | None = None
    thumbnail_data_url: str | None = None
    storage_path: str | None = None
    hash: str | None = None
    status: str
    last_used_at: datetime | None = None
    usage_count: int
    archived_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime


class ExternalIssueSpec(BaseModel):
    provider: str
    id: str | None = None
    iid: int | None = None
    number: int | None = None
    url: str
    state: str = "open"


class ExternalIssueResponse(ExternalIssueSpec):
    pass


class FeedbackFullResponse(BaseModel):
    id: UUID
    project_key: str
    workspace_id: UUID | None = None
    project_name: str
    issue_target: IssueTargetResponse
    payload: dict
    issue_draft: IssueDraftSchema
    status: str
    screenshot_asset: AssetResponse | None = None
    browser_capture_asset: AssetResponse | None = None
    external_issue: ExternalIssueResponse | None = None
    last_error: str | None = None
    retry_count: int
    next_retry_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class FeedbackEventResponse(BaseModel):
    id: UUID
    feedback_id: UUID
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    provider: str | None = None
    external_url: str | None = None
    created_at: datetime


class WorkspaceScopedActionRequest(BaseModel):
    workspace_id: UUID | None = None


class UpdateReporterRequest(BaseModel):
    workspace_id: UUID | None = None
    reporter: FeedbackReporterSchema | None = None
    issue_draft: IssueDraftSchema


class UpdateIssueDraftRequest(BaseModel):
    workspace_id: UUID | None = None
    title: str
    description: str
    labels: list[str] = Field(default_factory=list)


class RecordIssueAttemptRequest(BaseModel):
    workspace_id: UUID | None = None
    ok: bool
    external_issue: ExternalIssueSpec | None = None
    error: str | None = None
    retryable: bool | None = None
    next_retry_at: datetime | None = None


class RecordExternalIssueStateRequest(ExternalIssueSpec):
    workspace_id: UUID | None = None


class RecordBrowserCaptureRequest(BaseModel):
    workspace_id: UUID | None = None
    data_url: str = Field(min_length=1)


class CleanupScreenshotsRequest(BaseModel):
    archive_after_days: int = 30
    delete_after_days: int = 90
    min_archive_bytes: int = 1_000_000
