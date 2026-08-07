from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import auth, feedback, feedbacks, health, inbox, integrations, issue_targets, project_issue_members, public_projects, sites, widget, workspace_members

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(settings.public_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-Id"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(workspace_members.router)
app.include_router(widget.router)
app.include_router(feedback.router)
app.include_router(feedbacks.router)
app.include_router(inbox.router)
app.include_router(sites.router)
app.include_router(public_projects.router)
app.include_router(project_issue_members.router)
app.include_router(issue_targets.router)
app.include_router(integrations.router)
