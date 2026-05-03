"""URLs for tasks marketplace."""
from django.urls import path

from .views import (
    AcceptApplicationView,
    ApplyToTaskView,
    MyTasksView,
    RejectApplicationView,
    TaskApplicationsView,
    TaskDetailView,
    TaskListCreateView,
)

urlpatterns = [
    # Tasks
    path("", TaskListCreateView.as_view(), name="task-list-create"),
    path("my/", MyTasksView.as_view(), name="my-tasks"),
    path("<uuid:id>/", TaskDetailView.as_view(), name="task-detail"),
    # Applications inside tasks
    path("<uuid:task_id>/apply/", ApplyToTaskView.as_view(), name="task-apply"),
    path(
        "<uuid:task_id>/applications/",
        TaskApplicationsView.as_view(),
        name="task-applications",
    ),
    path(
        "<uuid:task_id>/applications/<uuid:application_id>/accept/",
        AcceptApplicationView.as_view(),
        name="application-accept",
    ),
    path(
        "<uuid:task_id>/applications/<uuid:application_id>/reject/",
        RejectApplicationView.as_view(),
        name="application-reject",
    ),
]
