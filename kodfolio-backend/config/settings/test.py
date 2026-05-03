"""Test settings — SQLite in-memory."""
from .base import *  # noqa

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
DEBUG = False  # чтобы DRF возвращал JSON, а не HTML traceback

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # быстрее в тестах
