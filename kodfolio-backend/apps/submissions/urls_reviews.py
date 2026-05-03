"""URLs for /api/v1/reviews/"""
from django.urls import path

from .views import MyReviewsView

urlpatterns = [
    path("my/", MyReviewsView.as_view(), name="my-reviews"),
]
