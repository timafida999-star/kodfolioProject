"""URLs for submissions endpoints."""
from django.urls import path

from .views import (
    ApproveSubmissionView,
    MySubmissionsView,
    PendingReviewView,
    RejectSubmissionView,
    SubmissionDetailView,
    SubmissionReviewView,
)

# Mounted at /api/v1/submissions/
urlpatterns = [
    path("my/", MySubmissionsView.as_view(), name="my-submissions"),
    path("pending-review/", PendingReviewView.as_view(), name="pending-review"),
    path("<uuid:id>/", SubmissionDetailView.as_view(), name="submission-detail"),
    path(
        "<uuid:submission_id>/reviews/",
        SubmissionReviewView.as_view(),
        name="submission-review",
    ),
    path(
        "<uuid:submission_id>/approve/",
        ApproveSubmissionView.as_view(),
        name="submission-approve",
    ),
    path(
        "<uuid:submission_id>/reject/",
        RejectSubmissionView.as_view(),
        name="submission-reject",
    ),
]
