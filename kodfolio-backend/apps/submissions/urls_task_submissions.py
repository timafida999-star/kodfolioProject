"""URLs for /api/v1/tasks/{task_id}/submissions/"""
from django.urls import path

from .views import TaskSubmissionsView

urlpatterns = [
    path(
        "<uuid:task_id>/submissions/",
        TaskSubmissionsView.as_view(),
        name="task-submissions",
    ),
]
