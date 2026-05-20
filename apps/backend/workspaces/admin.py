from django.contrib import admin

from .models import Organization, WorkspaceMember


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "plan", "created_at")
    search_fields = ("name", "owner__email")


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "role", "status", "created_at")
    list_filter = ("role", "status")
    search_fields = ("organization__name", "user__email")
