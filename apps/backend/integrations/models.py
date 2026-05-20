import uuid

from django.db import models

from workspaces.models import Organization, TimeStampedModel


class ProviderIntegration(TimeStampedModel):
    class Provider(models.TextChoices):
        GITHUB = "github", "GitHub"
        GITLAB = "gitlab", "GitLab"

    class Status(models.TextChoices):
        CONNECTED = "connected", "Connected"
        NEEDS_RECONNECT = "needs_reconnect", "Needs reconnect"
        DISABLED = "disabled", "Disabled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="provider_integrations")
    provider = models.CharField(max_length=20, choices=Provider.choices)
    name = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CONNECTED)
    base_url = models.URLField(blank=True)
    external_account_id = models.CharField(max_length=160, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["organization", "provider", "name"], name="unique_provider_integration_name"),
        ]

    def __str__(self) -> str:
        return f"{self.provider} for {self.organization}"


class ProviderCredential(TimeStampedModel):
    integration = models.OneToOneField(ProviderIntegration, on_delete=models.CASCADE, related_name="credential")
    token = models.TextField(blank=True)
    token_hint = models.CharField(max_length=80, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"credential for {self.integration}"
