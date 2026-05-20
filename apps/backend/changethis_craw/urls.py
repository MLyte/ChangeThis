from django.contrib import admin
from django.urls import path, re_path

from feedback import views as feedback_views
from integrations import views as integration_views
from workspaces import views as workspace_views
from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", views.health),
    path("api/ready", views.ready),
    path("api/auth/signup", views.signup),
    path("api/auth/login", views.login_view),
    path("api/auth/logout", views.logout_view),
    path("api/auth/session", views.session_view),
    path("api/widget/config", feedback_views.widget_config),
    path("api/public/feedback", feedback_views.create_public_feedback),
    path("api/public/feedback/<uuid:feedback_id>/cancel", feedback_views.cancel_public_feedback),
    path("api/public/feedback/<uuid:feedback_id>/reporter", feedback_views.update_public_reporter),
    path("api/projects/feedbacks", feedback_views.list_feedbacks),
    path("api/projects/sites", feedback_views.sites),
    path("api/projects/sites/<str:project_key>", feedback_views.site_detail),
    path("api/projects/sites/<str:project_key>/script-test", feedback_views.site_script_test),
    path("api/projects/feedbacks/<uuid:feedback_id>/issue", feedback_views.create_issue),
    path("api/projects/feedbacks/<uuid:feedback_id>/keep", feedback_views.keep_feedback),
    path("api/projects/feedbacks/<uuid:feedback_id>/ignore", feedback_views.ignore_feedback),
    path("api/projects/feedbacks/<uuid:feedback_id>/sync", feedback_views.sync_feedback),
    path("api/projects/retries", feedback_views.run_retries),
    path("api/projects/issue-targets", feedback_views.issue_targets),
    path("api/integrations/<str:provider>/repositories", integration_views.repositories),
    path("api/integrations/<str:provider>/connection", integration_views.connection),
    path("api/integrations/<str:provider>/connect", integration_views.connect),
    path("api/workspace/members", workspace_views.members),
    path("widget.js", views.widget_js),
    path("widget.global.js", views.widget_global_js),
    path("assets/<path:asset_path>", views.frontend_asset),
    re_path(r"^(?!api/|admin/|widget\.js|widget\.global\.js).*$", views.frontend),
]
