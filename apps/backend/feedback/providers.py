from pathlib import Path
from urllib.parse import quote

import requests
from django.conf import settings
from django.utils import timezone

from integrations.models import ProviderCredential
from .models import ExternalIssue, Feedback, ProviderIssueAttempt
from .storage import delete_relative_file, resolve_relative_file


def create_external_issue(feedback: Feedback) -> ExternalIssue:
    target = feedback.issue_target or _project_issue_target(feedback)
    if target is None:
        raise ValueError("feedback has no issue target")
    token = _target_token(target)
    if not token:
        raise ValueError(f"{target.provider} token is not configured")
    title = _issue_title(feedback)
    attachment = _ensure_provider_attachment(feedback, target, token)
    body = _issue_body(feedback, attachment)
    if target.provider == "github":
        payload = _create_github_issue(token, target.namespace or target.project_name, title, body, target.labels)
        external_id = str(payload.get("id", ""))
        number = str(payload.get("number", ""))
        web_url = payload.get("html_url", "")
    elif target.provider == "gitlab":
        payload = _create_gitlab_issue(
            token,
            _gitlab_base_url(target),
            target.external_project_id or target.project_name or target.namespace,
            title,
            body,
            target.labels,
        )
        external_id = str(payload.get("id", ""))
        number = str(payload.get("iid", ""))
        web_url = payload.get("web_url", "")
    else:
        raise ValueError("unsupported provider")
    issue, _created = ExternalIssue.objects.update_or_create(
        feedback=feedback,
        defaults={
            "provider": target.provider,
            "external_id": external_id,
            "number": number,
            "title": title,
            "web_url": web_url,
            "provider_attachment_url": attachment.get("url", ""),
            "provider_attachment_markdown": attachment.get("markdown", ""),
            "raw_payload": payload,
        },
    )
    if attachment.get("uploaded") and feedback.screenshot_path and feedback.screenshot_removed_at is None:
        if delete_relative_file(feedback.screenshot_path):
            feedback.screenshot_removed_at = timezone.now()
    feedback.status = Feedback.Status.SENT_TO_PROVIDER
    feedback.save(update_fields=["status", "screenshot_removed_at", "updated_at"])
    return issue


def run_due_issue_attempt(attempt: ProviderIssueAttempt) -> None:
    attempt.status = ProviderIssueAttempt.Status.RUNNING
    attempt.attempt_count += 1
    attempt.save(update_fields=["status", "attempt_count", "updated_at"])
    try:
        issue = create_external_issue(attempt.feedback)
    except Exception as cause:
        attempt.status = ProviderIssueAttempt.Status.FAILED
        attempt.last_error = str(cause)
        attempt.feedback.status = Feedback.Status.FAILED
        attempt.feedback.save(update_fields=["status", "updated_at"])
    else:
        attempt.status = ProviderIssueAttempt.Status.SUCCEEDED
        attempt.response_payload = {"externalIssue": issue.web_url}
        attempt.last_error = ""
    attempt.save(update_fields=["status", "last_error", "response_payload", "updated_at"])


def _target_token(target) -> str:
    if target.integration_id:
        credential = ProviderCredential.objects.filter(integration=target.integration).first()
        if credential and credential.token:
            return credential.token
    if target.provider == "github":
        return settings.GITHUB_TOKEN or ""
    if target.provider == "gitlab":
        return settings.GITLAB_TOKEN or ""
    return ""


def _issue_title(feedback: Feedback) -> str:
    if feedback.message:
        return f"Feedback: {feedback.message[:80]}"
    return f"Feedback on {feedback.project.name}"


def _issue_body(feedback: Feedback, attachment: dict | None = None) -> str:
    lines = [
        feedback.message or "Feedback without message.",
        "",
        f"Page: {feedback.page_url or 'not provided'}",
        f"Reporter: {feedback.reporter_email or feedback.reporter_name or 'anonymous'}",
    ]
    if attachment and attachment.get("markdown"):
        lines.extend(["", "Screenshot:", str(attachment["markdown"])])
    elif feedback.screenshot_path:
        lines.append(f"Screenshot file: {feedback.screenshot_path}")
    if attachment and attachment.get("error"):
        lines.append(f"Screenshot upload warning: {attachment['error']}")
    return "\n".join(lines)


def _ensure_provider_attachment(feedback: Feedback, target, token: str) -> dict:
    if feedback.provider_attachment_markdown:
        return {
            "uploaded": True,
            "url": feedback.provider_attachment_url,
            "markdown": feedback.provider_attachment_markdown,
            "path": feedback.provider_attachment_path,
            "raw": feedback.provider_attachment_raw_payload,
        }
    if not feedback.screenshot_path:
        return {}
    if target.provider != "gitlab":
        return {}
    project_id = target.external_project_id or target.project_name or target.namespace
    if not project_id:
        return {"error": "GitLab project id is missing"}
    try:
        path = resolve_relative_file(feedback.screenshot_path)
        if not path.exists():
            return {"error": "local screenshot file is missing"}
        attachment = _upload_gitlab_attachment(token, _gitlab_base_url(target), project_id, path, feedback.screenshot_mime)
        feedback.provider_attachment_provider = target.provider
        feedback.provider_attachment_url = attachment.get("url", "")
        feedback.provider_attachment_markdown = attachment.get("markdown", "")
        feedback.provider_attachment_path = attachment.get("path", "")
        feedback.provider_attachment_raw_payload = attachment.get("raw", {})
        update_fields = [
            "provider_attachment_provider",
            "provider_attachment_url",
            "provider_attachment_markdown",
            "provider_attachment_path",
            "provider_attachment_raw_payload",
            "updated_at",
        ]
        if delete_relative_file(feedback.screenshot_path):
            feedback.screenshot_removed_at = timezone.now()
            update_fields.append("screenshot_removed_at")
        feedback.save(update_fields=update_fields)
        return attachment
    except Exception as cause:
        return {"error": str(cause)}


def _create_github_issue(token: str, repo: str, title: str, body: str, labels: list) -> dict:
    if "/" not in repo:
        raise ValueError("GitHub target must be owner/repo")
    response = requests.post(
        f"https://api.github.com/repos/{repo}/issues",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        json={"title": title, "body": body, "labels": labels},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def _create_gitlab_issue(token: str, base_url: str, project_id: str, title: str, body: str, labels: list) -> dict:
    if not project_id:
        raise ValueError("GitLab target project is required")
    response = requests.post(
        f"{base_url}/api/v4/projects/{quote(project_id, safe='')}/issues",
        headers={"PRIVATE-TOKEN": token},
        json={"title": title, "description": body, "labels": ",".join(labels)},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def _upload_gitlab_attachment(token: str, base_url: str, project_id: str, path: Path, mime: str) -> dict:
    with path.open("rb") as handle:
        response = requests.post(
            f"{base_url}/api/v4/projects/{quote(project_id, safe='')}/uploads",
            headers={"PRIVATE-TOKEN": token},
            files={"file": (path.name, handle, mime or "application/octet-stream")},
            timeout=30,
        )
    response.raise_for_status()
    payload = response.json()
    return {
        "uploaded": True,
        "url": payload.get("full_path") or payload.get("url") or "",
        "markdown": payload.get("markdown") or "",
        "path": payload.get("full_path") or payload.get("url") or "",
        "raw": payload,
    }


def _gitlab_base_url(target) -> str:
    if target.integration_id and target.integration and target.integration.base_url:
        return target.integration.base_url.rstrip("/")
    return settings.GITLAB_BASE_URL


def _project_issue_target(feedback: Feedback):
    try:
        return feedback.project.issue_target
    except Exception:
        return None
