"""URLs for /api/v1/profiles/"""
from django.urls import path

from apps.accounts.views import (
    MyProfileView,
    MySkillsView,
    PublicProfileView,
    RemoveSkillView,
)

urlpatterns = [
    path("me/", MyProfileView.as_view(), name="my-profile"),
    path("me/skills/", MySkillsView.as_view(), name="my-skills"),
    path("me/skills/<uuid:skill_id>/", RemoveSkillView.as_view(), name="remove-skill"),
    path("<uuid:user_id>/", PublicProfileView.as_view(), name="public-profile"),
]
