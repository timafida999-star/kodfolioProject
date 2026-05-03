"""URLs for /api/v1/applications/ — отдельные endpoints для studentских заявок."""
from django.urls import path

from .views import MyApplicationsView, WithdrawApplicationView

urlpatterns = [
    path("my/", MyApplicationsView.as_view(), name="my-applications"),
    path(
        "<uuid:application_id>/withdraw/",
        WithdrawApplicationView.as_view(),
        name="application-withdraw",
    ),
]
