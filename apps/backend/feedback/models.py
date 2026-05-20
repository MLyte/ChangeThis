import uuid

from django.db import models

from integrations.models import ProviderIntegration
from workspaces.models import Organization, TimeStampedModel


def generate_public_key() -> str:
    return f"ct_{uuid.uuid4().hex[:24]}"


class Project(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=160)
    public_key = models.CharField(max_length=40, unique=True, default=generate_public_key)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    allowed_origins = models.JSONField(default=list, blank=True)
    widget_settings = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["public_key"]),
        ]

    def __str__(self) -> str:
        return self.name


class ProjectPublicKey(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="public_keys")
    public_key = models.CharField(max_length=40, unique=True, default=generate_public_key)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)


class IssueTarget(TimeStampedModel):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name="issue_target")
    provider = models.CharField(max_length=20, choices=ProviderIntegration.Provider.choices)
    integration = models.ForeignKey(
        ProviderIntegration,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="issue_targets",
    )
    namespace = models.CharField(max_length=240, blank=True)
    project_name = models.CharField(max_length=240, blank=True)
    external_project_id = models.CharField(max_length=240, blank=True)
    web_url = models.URLField(blank=True)
    labels = models.JSONField(default=list, blank=True)
    create_mode = models.CharField(max_length=20, default="manual")


class Feedback(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        QUALIFIED = "qualified", "Qualified"
        IGNORED = "ignored", "Ignored"
        CANCELLED = "cancelled", "Cancelled"
        RETRYING = "retrying", "Retrying"
        FAILED = "failed", "Failed"
        SENT_TO_PROVIDER = "sent_to_provider", "Sent to provider"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="feedbacks")
    issue_target = models.ForeignKey(IssueTarget, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.NEW)
    kind = models.CharField(max_length=40, default="comment")
    message = models.TextField(blank=True)
    page_url = models.URLField(max_length=1200, blank=True)
    reporter_email = models.EmailField(blank=True)
    reporter_name = models.CharField(max_length=160, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    screenshot_path = models.CharField(max_length=800, blank=True)
    screenshot_hash = models.CharField(max_length=96, blank=True)
    screenshot_bytes = models.PositiveIntegerField(default=0)
    screenshot_mime = models.CharField(max_length=80, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["project", "status", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.project}: {self.message[:48]}"


class FeedbackStatusEvent(TimeStampedModel):
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name="events")
    status = models.CharField(max_length=30, choices=Feedback.Status.choices)
    actor = models.CharField(max_length=80, default="system")
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)


class ProviderIssueAttempt(TimeStampedModel):
    class Status(models.TextChoices):
        DUE = "due", "Due"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feedback = models.ForeignKey(Feedback, on_delete=models.CASCADE, related_name="issue_attempts")
    provider = models.CharField(max_length=20, choices=ProviderIntegration.Provider.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DUE)
    attempt_count = models.PositiveIntegerField(default=0)
    due_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)


class ExternalIssue(TimeStampedModel):
    feedback = models.OneToOneField(Feedback, on_delete=models.CASCADE, related_name="external_issue")
    provider = models.CharField(max_length=20, choices=ProviderIntegration.Provider.choices)
    external_id = models.CharField(max_length=240)
    number = models.CharField(max_length=80, blank=True)
    title = models.CharField(max_length=320)
    web_url = models.URLField(max_length=1200, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
