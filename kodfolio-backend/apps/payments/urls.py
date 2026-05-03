from django.urls import path

from .views import (
    CalculateSplitsView,
    MyPaymentsView,
    MyTransactionsView,
    StripeWebhookView,
)

urlpatterns = [
    path("", MyPaymentsView.as_view(), name="my-payments"),
    path("transactions/", MyTransactionsView.as_view(), name="my-transactions"),
    path("splits-preview/", CalculateSplitsView.as_view(), name="splits-preview"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
]
