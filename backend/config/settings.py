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

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

RENDER_HOST = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)

try:
    backend_host = urlparse(BACKEND_URL).hostname
    if backend_host and backend_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(backend_host)
except Exception:
    pass


AUTH_USER_MODEL = "accounts.User"

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # required if you blacklist rotated refresh tokens

    "accounts",
    'parts',
    'core',
    'minifigs',
    'catalog',
    'inventory',
    'sets',
    'search',
]

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

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

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
    # Keep signed-in users remembered for a year. Each successful refresh rotates
    # this token and starts a fresh one-year window.
    "REFRESH_TOKEN_LIFETIME": timedelta(days=365),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}


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


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise storage (optional but nice)
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


if not DEBUG:
    # Render sits behind a proxy; this tells Django how to detect HTTPS correctly
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
