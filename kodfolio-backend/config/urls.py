"""KODfolio URL Configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def health_check(_request):
    return JsonResponse({"status": "ok", "service": "kodfolio-api"})


api_v1_patterns = [
    path("auth/", include("apps.accounts.urls.auth")),
    path("profiles/", include("apps.accounts.urls.profiles")),
    path("skills/", include("apps.skills.urls")),
    path("tasks/", include("apps.tasks.urls")),
    path("tasks/", include("apps.submissions.urls_task_submissions")),
    path("applications/", include("apps.tasks.urls_applications")),
    path("submissions/", include("apps.submissions.urls")),
    path("reviews/", include("apps.submissions.urls_reviews")),
    path("portfolio/", include("apps.portfolio.urls")),
    path("payments/", include("apps.payments.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health"),
    path("api/v1/", include((api_v1_patterns, "api_v1"))),
    # OpenAPI / docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
