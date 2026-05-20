import requests
from django.conf import settings

from integrations.models import ProviderCredential
from .models import ExternalIssue, Feedback, ProviderIssueAttempt


def create_external_issue(feedback: Feedback) -> ExternalIssue:
    target = feedback.issue_target or getattr(feedback.project, "issue_target", None)
    if target is None:
        raise ValueError("feedback has no issue target")
    token = _target_token(target)
    if not token:
        raise ValueError(f"{target.provider} token is not configured")
    title = _issue_title(feedback)
    body = _issue_body(feedback)
    if target.provider == "github":
        payload = _create_github_issue(token, target.namespace or target.project_name, title, body, target.labels)
        external_id = str(payload.get("id", ""))
        number = str(payload.get("number", ""))
        web_url = payload.get("html_url", "")
    elif target.provider == "gitlab":
        payload = _create_gitlab_issue(token, target.external_project_id or target.project_name, title, body, target.labels)
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
            "raw_payload": payload,
        },
    )
    feedback.status = Feedback.Status.SENT_TO_PROVIDER
    feedback.save(update_fields=["status", "updated_at"])
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


def _issue_body(feedback: Feedback) -> str:
    lines = [
        feedback.message or "Feedback without message.",
        "",
        f"Page: {feedback.page_url or 'not provided'}",
        f"Reporter: {feedback.reporter_email or feedback.reporter_name or 'anonymous'}",
    ]
    if feedback.screenshot_path:
        lines.append(f"Screenshot file: {feedback.screenshot_path}")
    return "\n".join(lines)


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


def _create_gitlab_issue(token: str, project_id: str, title: str, body: str, labels: list) -> dict:
    if not project_id:
        raise ValueError("GitLab target project is required")
    response = requests.post(
        f"{settings.GITLAB_BASE_URL}/api/v4/projects/{project_id}/issues",
        headers={"PRIVATE-TOKEN": token},
        json={"title": title, "description": body, "labels": ",".join(labels)},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()
