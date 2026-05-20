import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import connection
from django.http import FileResponse, Http404, HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from accounts.models import User
from workspaces.models import Organization, WorkspaceMember


def json_body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        value = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def current_workspace(user: User) -> WorkspaceMember | None:
    return (
        WorkspaceMember.objects.select_related("organization")
        .filter(user=user, status=WorkspaceMember.Status.ACTIVE)
        .order_by("created_at")
        .first()
    )


def session_payload(request: HttpRequest) -> dict:
    if not request.user.is_authenticated:
        return {"authenticated": False}
    member = current_workspace(request.user)
    payload = {
        "authenticated": True,
        "user": {"id": request.user.id, "email": request.user.email},
    }
    if member:
        payload["workspace"] = {
            "id": str(member.organization_id),
            "name": member.organization.name,
            "role": member.role,
        }
    return payload


@require_GET
def health(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"ok": True, "runtime": "django-craw"})


@require_GET
def ready(_request: HttpRequest) -> JsonResponse:
    checks = {
        "database": can_query_database(),
        "postgis": can_query_postgis(),
        "filesRoot": can_write_directory(settings.FILES_ROOT),
        "tempDir": can_write_directory(settings.TEMP_DIR),
        "widgetBundle": (settings.WIDGET_DIST_DIR / "widget.global.js").exists(),
    }
    return JsonResponse({"ok": all(checks.values()), "checks": checks}, status=200 if all(checks.values()) else 503)


@csrf_exempt
@require_POST
def signup(request: HttpRequest) -> JsonResponse:
    body = json_body(request)
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    if not email or len(password) < 8:
        return JsonResponse({"error": "email and an 8+ character password are required"}, status=422)
    if User.objects.filter(email=email).exists():
        return JsonResponse({"error": "email already exists"}, status=409)
    user = User.objects.create_user(username=email, email=email, password=password)
    organization = Organization.objects.create(name=email.split("@")[0] or "CRA-W Workspace", owner=user)
    WorkspaceMember.objects.create(organization=organization, user=user, role=WorkspaceMember.Role.OWNER)
    login(request, user)
    return JsonResponse(session_payload(request), status=201)


@csrf_exempt
@require_POST
def login_view(request: HttpRequest) -> JsonResponse:
    body = json_body(request)
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"error": "invalid credentials"}, status=401)
    login(request, user)
    return JsonResponse(session_payload(request))


@csrf_exempt
@require_POST
def logout_view(request: HttpRequest) -> JsonResponse:
    logout(request)
    return JsonResponse({"ok": True})


@require_GET
def session_view(request: HttpRequest) -> JsonResponse:
    return JsonResponse(session_payload(request))


@require_GET
def widget_js(_request: HttpRequest) -> HttpResponse:
    return serve_widget_file("widget.global.js")


@require_GET
def widget_global_js(_request: HttpRequest) -> HttpResponse:
    return serve_widget_file("widget.global.js")


@require_GET
def frontend(_request: HttpRequest) -> HttpResponse:
    index = settings.FRONTEND_DIST_DIR / "index.html"
    if index.exists():
        return FileResponse(index.open("rb"), content_type="text/html")
    return HttpResponse("Frontend build not found. Run npm run build --workspace @changethis/frontend.", status=503)


@require_GET
def frontend_asset(_request: HttpRequest, asset_path: str) -> HttpResponse:
    root = (settings.FRONTEND_DIST_DIR / "assets").resolve()
    target = (root / asset_path).resolve()
    if root not in target.parents and target != root:
        raise Http404()
    if not target.exists() or not target.is_file():
        raise Http404()
    return FileResponse(target.open("rb"))


def serve_widget_file(filename: str) -> HttpResponse:
    file_path = settings.WIDGET_DIST_DIR / filename
    if not file_path.exists():
        return HttpResponse("Widget bundle not found. Run npm run widget:build.", status=503, content_type="text/plain")
    return FileResponse(file_path.open("rb"), content_type="application/javascript")


def can_query_database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("select 1")
            return cursor.fetchone() == (1,)
    except Exception:
        return False


def can_query_postgis() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("select postgis_version()")
            return bool(cursor.fetchone())
    except Exception:
        return False


def can_write_directory(directory: Path) -> bool:
    try:
        directory.mkdir(parents=True, exist_ok=True)
        probe = directory / ".changethis-write-test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return True
    except Exception:
        return False
