from pathlib import Path
import os
from datetime import timedelta
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent


# -------------------------
# Env helpers
# -------------------------
def env_bool(key: str, default: str = "0") -> bool:
    return os.getenv(key, default).lower() in ("1", "true", "yes", "on")


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-secret-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", "1")

# In production, set these on Render:
# BACKEND_URL=https://your-backend.onrender.com
# FRONTEND_URL=https://your-frontend.onrender.com
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


# -------------------------
# Hosts
# -------------------------
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# Render sets this automatically for the backend service
RENDER_HOST = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)

# Also allow whatever hostname is in BACKEND_URL (helps avoid DisallowedHost surprises)
try:
    backend_host = urlparse(BACKEND_URL).hostname
    if backend_host and backend_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(backend_host)
except Exception:
    pass

# If you want a temporary “make it work” during early setup only:
# if not DEBUG:
#     ALLOWED_HOSTS = ["*"]


# -------------------------
# Applications
# -------------------------
AUTH_USER_MODEL = "accounts.User"

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # required if you blacklist rotated refresh tokens

    # Your apps
    "accounts",
    # "parts",
    # "sets",
    # ...
]


# -------------------------
# Middleware
# -------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # must be high
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serve static in prod (admin, etc.)
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# -------------------------
# URLs / WSGI
# -------------------------
ROOT_URLCONF = "config.urls"

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

WSGI_APPLICATION = "config.wsgi.application"


# -------------------------
# Database
# -------------------------
# Local default: sqlite
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Production (Render Postgres): set DATABASE_URL in env
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    import dj_database_url
    DATABASES["default"] = dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        ssl_require=True,
    )


# -------------------------
# Password validation
# -------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# -------------------------
# Internationalization
# -------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# -------------------------
# DRF + JWT
# -------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}


# -------------------------
# CORS / CSRF
# -------------------------
# Allow local dev frontend + your Render frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if FRONTEND_URL.startswith("http"):
    # Ensure no trailing slash is required; Django expects scheme+host
    CORS_ALLOWED_ORIGINS.append(FRONTEND_URL.rstrip("/"))

# If you're using JWT in headers (Authorization: Bearer ...), credentials are not needed.
CORS_ALLOW_CREDENTIALS = False

# Important for admin + any CSRF-sensitive flows in production
CSRF_TRUSTED_ORIGINS = []
if FRONTEND_URL.startswith("https://"):
    CSRF_TRUSTED_ORIGINS.append(FRONTEND_URL.rstrip("/"))
if BACKEND_URL.startswith("https://"):
    CSRF_TRUSTED_ORIGINS.append(BACKEND_URL.rstrip("/"))


# -------------------------
# Static files (Render)
# -------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise storage (optional but nice)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}


# -------------------------
# Default primary key type
# -------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# -------------------------
# Production security (Render)
# -------------------------
if not DEBUG:
    # Render sits behind a proxy; this tells Django how to detect HTTPS correctly
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
