import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False)

    memberships: Mapped[list["WorkspaceMember"]] = relationship(back_populates="user")


class Workspace(TimestampMixin, Base):
    __tablename__ = "workspaces"
    __table_args__ = (CheckConstraint("plan in ('free', 'solo', 'studio')", name="workspaces_plan_check"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    plan: Mapped[str] = mapped_column(Text, default="free", nullable=False)

    memberships: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace")
    projects: Mapped[list["Project"]] = relationship(back_populates="workspace")


class WorkspaceMember(TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (
        CheckConstraint("role in ('owner', 'admin', 'member', 'viewer')", name="memberships_role_check"),
        CheckConstraint("status in ('invited', 'active', 'disabled')", name="memberships_status_check"),
        UniqueConstraint("workspace_id", "user_id", name="memberships_workspace_user_unique"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(Text, default="member", nullable=False)
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    invited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="memberships", foreign_keys=[user_id])
    workspace: Mapped[Workspace] = relationship(back_populates="memberships")


class Session(TimestampMixin, Base):
    __tablename__ = "sessions"
    __table_args__ = (Index("sessions_token_hash_idx", "token_hash", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("widget_locale in ('fr', 'en')", name="projects_widget_locale_check"),
        CheckConstraint("widget_button_position in ('bottom-right', 'bottom-left', 'top-right', 'top-left')", name="projects_widget_button_position_check"),
        CheckConstraint("widget_button_variant in ('default', 'subtle')", name="projects_widget_button_variant_check"),
        CheckConstraint("widget_reporter_fields in ('hidden', 'optional', 'required')", name="projects_widget_reporter_fields_check"),
        CheckConstraint("issue_creation_mode in ('manual', 'automatic')", name="projects_issue_creation_mode_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    public_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    allowed_origins: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    widget_locale: Mapped[str] = mapped_column(Text, default="fr", nullable=False)
    widget_button_position: Mapped[str] = mapped_column(Text, default="bottom-right", nullable=False)
    widget_button_variant: Mapped[str] = mapped_column(Text, default="default", nullable=False)
    widget_reporter_fields: Mapped[str] = mapped_column(Text, default="optional", nullable=False)
    issue_creation_mode: Mapped[str] = mapped_column(Text, default="manual", nullable=False)

    workspace: Mapped[Workspace] = relationship(back_populates="projects")
    issue_targets: Mapped[list["IssueTarget"]] = relationship(back_populates="project")


class ProjectPublicKey(Base):
    __tablename__ = "project_public_keys"
    __table_args__ = (CheckConstraint("status in ('active', 'retired')", name="project_public_keys_status_check"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    public_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False)
    rotated_from_key_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("project_public_keys.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    activated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProviderIntegration(TimestampMixin, Base):
    __tablename__ = "provider_integrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    auth_type: Mapped[str] = mapped_column(Text, nullable=False)
    external_account_id: Mapped[str | None] = mapped_column(Text)
    installation_id: Mapped[str | None] = mapped_column(Text)
    base_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="connected", nullable=False)


class ProviderCredential(TimestampMixin, Base):
    __tablename__ = "provider_integration_credentials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("provider_integrations.id", ondelete="CASCADE"), nullable=False)
    credential_kind: Mapped[str] = mapped_column(Text, nullable=False)
    storage_reference: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    fingerprint_sha256: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False)
    ciphertext: Mapped[str | None] = mapped_column(Text)
    iv: Mapped[str | None] = mapped_column(Text)
    tag: Mapped[str | None] = mapped_column(Text)
    algorithm: Mapped[str] = mapped_column(Text, default="aes-256-gcm", nullable=False)


class IssueTarget(Base):
    __tablename__ = "issue_targets"
    __table_args__ = (
        UniqueConstraint("project_id", name="issue_targets_project_unique"),
        CheckConstraint("provider in ('github', 'gitlab')", name="issue_targets_provider_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    integration_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("provider_integrations.id", ondelete="SET NULL"))
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    namespace: Mapped[str] = mapped_column(Text, nullable=False)
    project_name: Mapped[str] = mapped_column(Text, nullable=False)
    external_project_id: Mapped[str | None] = mapped_column(Text)
    web_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project: Mapped[Project] = relationship(back_populates="issue_targets")


class Feedback(TimestampMixin, Base):
    __tablename__ = "feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    issue_target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("issue_targets.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(Text, default="raw", nullable=False)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, default="", nullable=False)
    page_url: Mapped[str] = mapped_column(Text, nullable=False)
    page_title: Mapped[str | None] = mapped_column(Text)
    browser: Mapped[str | None] = mapped_column(Text)
    viewport_width: Mapped[int | None] = mapped_column(Integer)
    viewport_height: Mapped[int | None] = mapped_column(Integer)
    device_pixel_ratio: Mapped[float | None] = mapped_column(Numeric)
    pin_x: Mapped[int | None] = mapped_column(Integer)
    pin_y: Mapped[int | None] = mapped_column(Integer)
    element_selector: Mapped[str | None] = mapped_column(Text)
    element_text: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict | None] = mapped_column(JSONB)
    issue_draft_title: Mapped[str | None] = mapped_column(Text)
    issue_draft_description: Mapped[str | None] = mapped_column(Text)
    issue_draft_labels: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    screenshot_data_url: Mapped[str | None] = mapped_column(Text)
    screenshot_thumbnail_data_url: Mapped[str | None] = mapped_column(Text)
    screenshot_mime_type: Mapped[str | None] = mapped_column(Text)
    screenshot_bytes: Mapped[int | None] = mapped_column(Integer)
    screenshot_original_bytes: Mapped[int | None] = mapped_column(Integer)
    screenshot_hash: Mapped[str | None] = mapped_column(Text)
    screenshot_status: Mapped[str] = mapped_column(Text, default="active", nullable=False)
    screenshot_storage_path: Mapped[str | None] = mapped_column(Text)
    screenshot_last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    screenshot_usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    screenshot_archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    screenshot_deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class FeedbackStatusEvent(Base):
    __tablename__ = "feedback_status_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feedback_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feedbacks.id", ondelete="CASCADE"), nullable=False)
    from_status: Mapped[str | None] = mapped_column(Text)
    to_status: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(Text)
    external_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ProviderIssueAttempt(TimestampMixin, Base):
    __tablename__ = "provider_issue_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feedback_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feedbacks.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    raw_payload: Mapped[dict | None] = mapped_column(JSONB)


class ExternalIssue(TimestampMixin, Base):
    __tablename__ = "external_issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feedback_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("feedbacks.id", ondelete="CASCADE"), unique=True, nullable=False)
    issue_target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("issue_targets.id", ondelete="SET NULL"))
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str | None] = mapped_column(Text)
    external_iid: Mapped[int | None] = mapped_column(Integer)
    external_number: Mapped[int | None] = mapped_column(Integer)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, default="open", nullable=False)
    raw_payload: Mapped[dict | None] = mapped_column(JSONB)
