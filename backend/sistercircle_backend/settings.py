import os
from pathlib import Path
from datetime import timedelta

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Core secrets — never hardcoded, always from environment
# ---------------------------------------------------------------------------

SECRET_KEY = os.environ["SECRET_KEY"]   # hard fail if missing
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
PAYSTACK_SECRET_KEY = os.environ.get("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.environ.get("PAYSTACK_PUBLIC_KEY", "")

DEBUG = os.getenv("DEBUG", "False") == "True"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(",")
# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "api",
    "billing",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",          # must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
]

ROOT_URLCONF = "sistercircle_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "sistercircle_backend.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DATABASES = {
    "default": dj_database_url.config(default=os.environ.get("DATABASE_URL"))
}

# This Postgres instance may be shared with an unrelated project (Render's free tier
# allows only one DB per account). When DB_SCHEMA is set, ALL of this project's tables —
# including Django's own framework tables (django_migrations, auth_permission,
# django_content_type, django_session, ...) — are isolated into a dedicated schema
# instead of colliding with whatever else lives in `public`. Run
# `python manage.py setup_schema` once, BEFORE the first `migrate`, to create it — the
# schema must already exist before Django connects, otherwise unqualified table creation
# silently falls back to `public`. Leave DB_SCHEMA unset for a database this project owns
# outright (e.g. local dev) — behavior is then unchanged, tables just use `public`.
#
# Deliberately NOT falling back to `,public` in search_path: Postgres falls through to the
# next schema in search_path for lookups (not just creation) when a table isn't found in
# the first one — so with a `public` fallback, Django would silently read the OTHER
# project's django_migrations table whenever this project's own copy doesn't exist yet
# (e.g. before the very first migrate), concluding "nothing to apply" instead of actually
# creating this project's tables. Confirmed by testing locally before this ever touched
# the shared production database. This project uses no Postgres extensions that would
# need a `public` fallback (no UUID/pgcrypto usage), so omitting it is safe.
DB_SCHEMA = os.environ.get("DB_SCHEMA", "")
if DB_SCHEMA and DATABASES["default"].get("ENGINE") == "django.db.backends.postgresql":
    DATABASES["default"].setdefault("OPTIONS", {})
    DATABASES["default"]["OPTIONS"]["options"] = f"-c search_path={DB_SCHEMA}"

# ---------------------------------------------------------------------------
# Custom user model
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "api.User"

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Production-only TLS settings — activate when behind HTTPS
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000         # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/hour",
        "user": "200/hour",
        # Custom scopes (used in views via throttle_scope)
        "login": "5/15min",
        "analyse": "10/hour",
    },
}

# ---------------------------------------------------------------------------
# SimpleJWT — 24 h access tokens
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=24),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("REFRESH_TOKEN_LIFETIME_DAYS", "7"))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    # Prevent token leakage in Django error logs
    "UPDATE_LAST_LOGIN": False,
}

# ---------------------------------------------------------------------------
# CORS — locked to env-configured origins only
# ---------------------------------------------------------------------------

_cors_raw = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]
CORS_ALLOW_CREDENTIALS = True

# Never expose CORS wildcard
CORS_ALLOW_ALL_ORIGINS = False

# ---------------------------------------------------------------------------
# Logging — never log patient data
# ---------------------------------------------------------------------------

"""LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
    },
    "formatters": {
        "safe": {
            "format": "[{levelname}] {asctime} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "safe",
        },
    },
    "loggers": {
        # Log framework-level events only — never log request bodies
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.security": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        # Silence DRF request logging so payloads never appear in logs
        "rest_framework": {"handlers": [], "level": "CRITICAL", "propagate": False},
        # Silence our own api app logs in production
        "api": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}"""
