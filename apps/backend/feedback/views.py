import json

from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from changethis_craw.views import current_workspace
from .models import Feedback, FeedbackStatusEvent, IssueTarget, Project, ProviderIssueAttempt
from .providers import create_external_issue, run_due_issue_attempt
from .storage import store_screenshot_data_url


def _json_body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        value = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def _workspace_or_response(request: HttpRequest):
    if not request.user.is_authenticated:
        return None, JsonResponse({"error": "authentication required"}, status=401)
    member = current_workspace(request.user)
    if member is None:
        return None, JsonResponse({"error": "workspace not found"}, status=404)
    return member.organization, None


@require_GET
def widget_config(request: HttpRequest) -> JsonResponse:
    public_key = request.GET.get("project", "").strip()
    project = Project.objects.filter(public_key=public_key, status=Project.Status.ACTIVE).first()
    if project is None:
        return JsonResponse({"error": "project not found"}, status=404)
    return JsonResponse(
        {
            "project": project.public_key,
            "name": project.name,
            "allowedOrigins": project.allowed_origins,
            "settings": project.widget_settings,
        }
    )


@csrf_exempt
@require_POST
def create_public_feedback(request: HttpRequest) -> JsonResponse:
    body = _json_body(request)
    public_key = str(body.get("project") or body.get("projectKey") or "").strip()
    project = Project.objects.filter(public_key=public_key, status=Project.Status.ACTIVE).first()
    if project is None:
        return JsonResponse({"error": "project not found"}, status=404)
    issue_target = _project_issue_target(project)
    raw_payload = _payload_without_screenshot(body)
    feedback = Feedback.objects.create(
        project=project,
        issue_target=issue_target,
        kind=str(body.get("type") or body.get("kind") or "comment")[:40],
        message=str(body.get("message", ""))[:6000],
        page_url=str(body.get("url") or body.get("pageUrl") or "")[:1200],
        reporter_email=str(body.get("reporterEmail", ""))[:254],
        reporter_name=str(body.get("reporterName", ""))[:160],
        metadata=body.get("metadata") if isinstance(body.get("metadata"), dict) else {},
        raw_payload=raw_payload,
    )
    screenshot_data_url = str(body.get("screenshot") or body.get("screenshotDataUrl") or "")
    if screenshot_data_url:
        try:
            stored = store_screenshot_data_url(screenshot_data_url, str(project.organization_id), str(project.id))
        except ValueError as cause:
            return JsonResponse({"error": str(cause)}, status=413)
        if stored:
            feedback.screenshot_path = stored.relative_path
            feedback.screenshot_hash = stored.content_hash
            feedback.screenshot_bytes = stored.byte_size
            feedback.screenshot_mime = stored.mime
            feedback.save(update_fields=["screenshot_path", "screenshot_hash", "screenshot_bytes", "screenshot_mime"])
    FeedbackStatusEvent.objects.create(feedback=feedback, status=feedback.status, actor="widget")
    if issue_target and issue_target.create_mode == "automatic":
        ProviderIssueAttempt.objects.create(
            feedback=feedback,
            provider=issue_target.provider,
            due_at=timezone.now(),
            request_payload={"source": "automatic"},
        )
    return JsonResponse({"id": str(feedback.id), "status": feedback.status}, status=201)


@csrf_exempt
@require_POST
def cancel_public_feedback(_request: HttpRequest, feedback_id) -> JsonResponse:
    updated = Feedback.objects.filter(id=feedback_id, status=Feedback.Status.NEW).update(status=Feedback.Status.CANCELLED)
    return JsonResponse({"ok": bool(updated)})


@csrf_exempt
@require_POST
def update_public_reporter(request: HttpRequest, feedback_id) -> JsonResponse:
    body = _json_body(request)
    feedback = Feedback.objects.filter(id=feedback_id).first()
    if feedback is None:
        return JsonResponse({"error": "feedback not found"}, status=404)
    feedback.reporter_email = str(body.get("email", ""))[:254]
    feedback.reporter_name = str(body.get("name", ""))[:160]
    feedback.save(update_fields=["reporter_email", "reporter_name", "updated_at"])
    return JsonResponse({"ok": True})


@require_GET
def list_feedbacks(request: HttpRequest) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    rows = (
        Feedback.objects.select_related("project")
        .filter(project__organization=organization)
        .order_by("-created_at")[:100]
    )
    return JsonResponse({"feedbacks": [_feedback_payload(row) for row in rows]})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def sites(request: HttpRequest) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    if request.method == "GET":
        rows = Project.objects.filter(organization=organization).order_by("created_at")
        return JsonResponse({"sites": [_site_payload(row) for row in rows]})
    body = _json_body(request)
    name = str(body.get("name", "")).strip()
    if not name:
        return JsonResponse({"error": "name is required"}, status=422)
    origins = body.get("allowedOrigins", [])
    if isinstance(origins, str):
        origins = [origins]
    project = Project.objects.create(
        organization=organization,
        name=name,
        allowed_origins=[str(origin).strip() for origin in origins if str(origin).strip()],
        widget_settings=body.get("widgetSettings") if isinstance(body.get("widgetSettings"), dict) else {},
    )
    return JsonResponse({"site": _site_payload(project)}, status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
def site_detail(request: HttpRequest, project_key: str) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    project = Project.objects.filter(organization=organization, public_key=project_key).first()
    if project is None:
        return JsonResponse({"error": "site not found"}, status=404)
    if request.method == "GET":
        return JsonResponse({"site": _site_payload(project)})
    if request.method == "DELETE":
        project.status = Project.Status.DISABLED
        project.save(update_fields=["status", "updated_at"])
        return JsonResponse({"ok": True})
    body = _json_body(request)
    project.name = str(body.get("name", project.name)).strip() or project.name
    if isinstance(body.get("allowedOrigins"), list):
        project.allowed_origins = [str(origin).strip() for origin in body["allowedOrigins"] if str(origin).strip()]
    if isinstance(body.get("widgetSettings"), dict):
        project.widget_settings = body["widgetSettings"]
    project.save(update_fields=["name", "allowed_origins", "widget_settings", "updated_at"])
    return JsonResponse({"site": _site_payload(project)})


@csrf_exempt
@require_POST
def site_script_test(request: HttpRequest, project_key: str) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    exists = Project.objects.filter(organization=organization, public_key=project_key, status=Project.Status.ACTIVE).exists()
    return JsonResponse({"ok": exists})


@csrf_exempt
@require_POST
def create_issue(request: HttpRequest, feedback_id) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    feedback = Feedback.objects.filter(id=feedback_id, project__organization=organization).first()
    if feedback is None:
        return JsonResponse({"error": "feedback not found"}, status=404)
    if feedback.issue_target_id is None:
        feedback.issue_target = _project_issue_target(feedback.project)
        if feedback.issue_target is not None:
            feedback.save(update_fields=["issue_target", "updated_at"])
    try:
        issue = create_external_issue(feedback)
    except Exception as cause:
        ProviderIssueAttempt.objects.create(
            feedback=feedback,
            provider=(feedback.issue_target.provider if feedback.issue_target else "github"),
            status=ProviderIssueAttempt.Status.FAILED,
            attempt_count=1,
            last_error=str(cause),
        )
        feedback.status = Feedback.Status.FAILED
        feedback.save(update_fields=["status", "updated_at"])
        return JsonResponse({"error": str(cause)}, status=502)
    return JsonResponse({"issue": {"url": issue.web_url, "number": issue.number}, "feedback": _feedback_payload(feedback)})


@csrf_exempt
@require_POST
def keep_feedback(request: HttpRequest, feedback_id) -> JsonResponse:
    return _set_feedback_status(request, feedback_id, Feedback.Status.QUALIFIED)


@csrf_exempt
@require_POST
def ignore_feedback(request: HttpRequest, feedback_id) -> JsonResponse:
    return _set_feedback_status(request, feedback_id, Feedback.Status.IGNORED)


@csrf_exempt
@require_POST
def sync_feedback(request: HttpRequest, feedback_id) -> JsonResponse:
    return _set_feedback_status(request, feedback_id, Feedback.Status.RETRYING)


@csrf_exempt
@require_POST
def run_retries(request: HttpRequest) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    due = ProviderIssueAttempt.objects.filter(
        feedback__project__organization=organization,
        status=ProviderIssueAttempt.Status.DUE,
    ).order_by("due_at", "created_at")[:20]
    count = 0
    for attempt in due:
        run_due_issue_attempt(attempt)
        count += 1
    return JsonResponse({"processed": count})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def issue_targets(request: HttpRequest) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    if request.method == "GET":
        rows = IssueTarget.objects.select_related("project").filter(project__organization=organization)
        return JsonResponse({"issueTargets": [_issue_target_payload(row) for row in rows]})
    body = _json_body(request)
    project_key = str(body.get("project") or body.get("projectKey") or "")
    project = Project.objects.filter(organization=organization, public_key=project_key).first()
    if project is None:
        return JsonResponse({"error": "site not found"}, status=404)
    target, _created = IssueTarget.objects.update_or_create(
        project=project,
        defaults={
            "provider": str(body.get("provider", "github")),
            "namespace": str(body.get("namespace") or body.get("repository") or ""),
            "project_name": str(body.get("projectName") or body.get("repository") or ""),
            "external_project_id": str(body.get("externalProjectId") or ""),
            "web_url": str(body.get("webUrl") or ""),
            "labels": body.get("labels") if isinstance(body.get("labels"), list) else [],
            "create_mode": str(body.get("createMode", "manual")),
        },
    )
    return JsonResponse({"issueTarget": _issue_target_payload(target)}, status=201)


def _set_feedback_status(request: HttpRequest, feedback_id, status: str) -> JsonResponse:
    organization, error = _workspace_or_response(request)
    if error:
        return error
    feedback = Feedback.objects.filter(id=feedback_id, project__organization=organization).first()
    if feedback is None:
        return JsonResponse({"error": "feedback not found"}, status=404)
    feedback.status = status
    feedback.save(update_fields=["status", "updated_at"])
    FeedbackStatusEvent.objects.create(feedback=feedback, status=status, actor="dashboard")
    return JsonResponse({"feedback": _feedback_payload(feedback)})


def _site_payload(project: Project) -> dict:
    issue_target = _project_issue_target(project)
    return {
        "id": str(project.id),
        "publicKey": project.public_key,
        "name": project.name,
        "status": project.status,
        "allowedOrigins": project.allowed_origins,
        "widgetSettings": project.widget_settings,
        "issueTarget": _issue_target_payload(issue_target) if issue_target else None,
        "createdAt": project.created_at.isoformat(),
    }


def _feedback_payload(feedback: Feedback) -> dict:
    return {
        "id": str(feedback.id),
        "message": feedback.message,
        "status": feedback.status,
        "projectName": feedback.project.name,
        "projectKey": feedback.project.public_key,
        "pageUrl": feedback.page_url,
        "reporterEmail": feedback.reporter_email,
        "screenshotPath": feedback.screenshot_path,
        "createdAt": feedback.created_at.isoformat(),
    }


def _issue_target_payload(target: IssueTarget) -> dict:
    return {
        "id": str(target.id),
        "projectKey": target.project.public_key,
        "provider": target.provider,
        "namespace": target.namespace,
        "projectName": target.project_name,
        "externalProjectId": target.external_project_id,
        "webUrl": target.web_url,
        "labels": target.labels,
        "createMode": target.create_mode,
    }


def _project_issue_target(project: Project) -> IssueTarget | None:
    try:
        return project.issue_target
    except IssueTarget.DoesNotExist:
        return None


def _payload_without_screenshot(body: dict) -> dict:
    sanitized = dict(body)
    for key in ("screenshot", "screenshotDataUrl"):
        if key in sanitized:
            sanitized[key] = "[stored as file]"
    return sanitized
