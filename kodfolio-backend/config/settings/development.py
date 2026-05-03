"""Development settings."""
from .base import *  # noqa
from .base import INSTALLED_APPS, MIDDLEWARE

DEBUG = True

# Расширяем приложения для дев-режима (debug toolbar — опционально, требует django-debug-toolbar)
# INSTALLED_APPS += ["debug_toolbar"]
# MIDDLEWARE = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE

INTERNAL_IPS = ["127.0.0.1", "localhost"]

# В dev разрешаем любой origin для удобства
CORS_ALLOW_ALL_ORIGINS = True
