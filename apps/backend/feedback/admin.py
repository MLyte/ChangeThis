from django.contrib import admin

from .models import (
    ExternalIssue,
    Feedback,
    FeedbackStatusEvent,
    IssueTarget,
    Project,
    ProjectPublicKey,
    ProviderIssueAttempt,
)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "public_key", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "public_key", "organization__name")


@admin.register(ProjectPublicKey)
class ProjectPublicKeyAdmin(admin.ModelAdmin):
    list_display = ("project", "public_key", "status", "created_at")
    list_filter = ("status",)


@admin.register(IssueTarget)
class IssueTargetAdmin(admin.ModelAdmin):
    list_display = ("project", "provider", "namespace", "project_name", "create_mode")
    search_fields = ("project__name", "namespace", "project_name")


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("project", "status", "reporter_email", "created_at")
    list_filter = ("status", "kind")
    search_fields = ("message", "page_url", "reporter_email", "project__name")


@admin.register(FeedbackStatusEvent)
class FeedbackStatusEventAdmin(admin.ModelAdmin):
    list_display = ("feedback", "status", "actor", "created_at")
    list_filter = ("status", "actor")


@admin.register(ProviderIssueAttempt)
class ProviderIssueAttemptAdmin(admin.ModelAdmin):
    list_display = ("feedback", "provider", "status", "attempt_count", "due_at")
    list_filter = ("provider", "status")


@admin.register(ExternalIssue)
class ExternalIssueAdmin(admin.ModelAdmin):
    list_display = ("feedback", "provider", "number", "web_url", "created_at")
    list_filter = ("provider",)
