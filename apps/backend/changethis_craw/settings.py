from pathlib import Path
import os

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "change-me-only-for-local-development")
DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() in {"1", "true", "yes"}
ALLOWED_HOSTS = [host.strip() for host in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", os.environ.get("PUBLIC_APP_URL", "")).split(",")
    if origin.strip()
]
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts",
    "workspaces",
    "feedback",
    "integrations",
    "storage_app",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "changethis_craw.middleware.SimpleCorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "changethis_craw.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "changethis_craw.wsgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://changethis:changethis@localhost:5432/changethis")
DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=60)}
DATABASES["default"].setdefault("OPTIONS", {})
DATABASES["default"]["OPTIONS"].setdefault(
    "connect_timeout",
    int(os.environ.get("POSTGRES_CONNECTION_TIMEOUT_SECONDS", "5")),
)

LANGUAGE_CODE = "fr-be"
TIME_ZONE = "Europe/Brussels"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/assets/"
STATIC_ROOT = BASE_DIR / "staticfiles"
FRONTEND_DIST_DIR = REPO_ROOT / "apps" / "frontend" / "dist"
WIDGET_DIST_DIR = REPO_ROOT / "packages" / "widget" / "dist"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

SESSION_COOKIE_NAME = "changethis_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG

PUBLIC_APP_URL = os.environ.get("PUBLIC_APP_URL", "http://localhost:8000").rstrip("/")
FILES_ROOT = Path(os.environ.get("FILES_ROOT", BASE_DIR / "var" / "files"))
TEMP_DIR = Path(os.environ.get("TEMP_DIR", BASE_DIR / "var" / "tmp"))
MAX_SCREENSHOT_BYTES = int(os.environ.get("MAX_SCREENSHOT_BYTES", "2500000"))

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("CHANGETHIS_GITHUB_TOKEN")
GITLAB_TOKEN = os.environ.get("GITLAB_TOKEN") or os.environ.get("CHANGETHIS_GITLAB_TOKEN")
GITLAB_BASE_URL = os.environ.get("GITLAB_BASE_URL", "https://gitlab.com").rstrip("/")
