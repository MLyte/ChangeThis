import json
from urllib.parse import quote

import requests
from django.conf import settings
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from changethis_craw.views import current_workspace
from .models import ProviderCredential, ProviderIntegration


def _json_body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        parsed = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _workspace_or_response(request: HttpRequest):
    if not request.user.is_authenticated:
        return None, JsonResponse({"error": "authentication required"}, status=401)
    member = current_workspace(request.user)
    if member is None:
        return None, JsonResponse({"error": "workspace not found"}, status=404)
    return member.organization, None


@require_GET
def repositories(request: HttpRequest, provider: str) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    token = _provider_token(organization, provider)
    if not token:
        return JsonResponse({"repositories": [], "connected": False})
    try:
        if provider == "github":
            rows = _github_repositories(token)
        elif provider == "gitlab":
            rows = _gitlab_repositories(token)
        else:
            return JsonResponse({"error": "unsupported provider"}, status=404)
    except requests.RequestException as cause:
        return JsonResponse({"error": str(cause)}, status=502)
    return JsonResponse({"repositories": rows, "connected": True})


@require_GET
def connection(request: HttpRequest, provider: str) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    integration = ProviderIntegration.objects.filter(organization=organization, provider=provider).first()
    return JsonResponse(
        {
            "connected": bool(integration and integration.status == ProviderIntegration.Status.CONNECTED),
            "provider": provider,
            "status": integration.status if integration else "missing",
        }
    )


@csrf_exempt
@require_http_methods(["POST", "DELETE"])
def connect(request: HttpRequest, provider: str) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    if provider not in {"github", "gitlab"}:
        return JsonResponse({"error": "unsupported provider"}, status=404)
    if request.method == "DELETE":
        ProviderIntegration.objects.filter(organization=organization, provider=provider).update(
            status=ProviderIntegration.Status.DISABLED
        )
        return JsonResponse({"connected": False, "provider": provider})
    body = _json_body(request)
    token = str(body.get("token", "")).strip()
    base_url = str(body.get("baseUrl", "")).strip()
    if not token:
        return JsonResponse({"error": "token is required"}, status=422)
    integration, _created = ProviderIntegration.objects.update_or_create(
        organization=organization,
        provider=provider,
        name="default",
        defaults={
            "status": ProviderIntegration.Status.CONNECTED,
            "base_url": base_url,
        },
    )
    ProviderCredential.objects.update_or_create(
        integration=integration,
        defaults={
            "token": token,
            "token_hint": token[-6:] if len(token) >= 6 else "set",
        },
    )
    return JsonResponse({"connected": True, "provider": provider, "status": integration.status})


def _provider_token(organization, provider: str) -> str:
    integration = ProviderIntegration.objects.filter(
        organization=organization,
        provider=provider,
        status=ProviderIntegration.Status.CONNECTED,
    ).first()
    if integration and hasattr(integration, "credential") and integration.credential.token:
        return integration.credential.token
    if provider == "github":
        return settings.GITHUB_TOKEN or ""
    if provider == "gitlab":
        return settings.GITLAB_TOKEN or ""
    return ""


def _github_repositories(token: str) -> list[dict]:
    response = requests.get(
        "https://api.github.com/user/repos?per_page=100&sort=updated",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=15,
    )
    response.raise_for_status()
    return [
        {
            "id": str(row["id"]),
            "name": row["full_name"],
            "url": row["html_url"],
            "provider": "github",
        }
        for row in response.json()
    ]


def _gitlab_repositories(token: str) -> list[dict]:
    base_url = settings.GITLAB_BASE_URL
    response = requests.get(
        f"{base_url}/api/v4/projects?membership=true&simple=true&per_page=100&order_by=last_activity_at",
        headers={"PRIVATE-TOKEN": token},
        timeout=15,
    )
    response.raise_for_status()
    return [
        {
            "id": str(row["id"]),
            "name": row.get("path_with_namespace") or row.get("name"),
            "url": row.get("web_url"),
            "provider": "gitlab",
            "encodedId": quote(str(row["id"]), safe=""),
        }
        for row in response.json()
    ]
