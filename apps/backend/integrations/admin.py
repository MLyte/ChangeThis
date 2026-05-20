from django.contrib import admin

from .models import ProviderCredential, ProviderIntegration


@admin.register(ProviderIntegration)
class ProviderIntegrationAdmin(admin.ModelAdmin):
    list_display = ("organization", "provider", "name", "status", "created_at")
    list_filter = ("provider", "status")
    search_fields = ("organization__name", "name", "external_account_id")


@admin.register(ProviderCredential)
class ProviderCredentialAdmin(admin.ModelAdmin):
    list_display = ("integration", "token_hint", "expires_at", "updated_at")
    search_fields = ("integration__organization__name", "token_hint")
