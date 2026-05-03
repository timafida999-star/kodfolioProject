"""Views for payments — view payments + transactions, calculate splits, webhook stub."""
from decimal import Decimal

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment, Transaction
from .serializers import PaymentSerializer, SplitsRequestSerializer, TransactionSerializer
from .services import calculate_splits


class MyPaymentsView(generics.ListAPIView):
    """
    GET /api/v1/payments/

    Текущий пользователь видит платежи, к которым он причастен:
      - Company: платежи по своим задачам
      - Student: платежи по задачам где он assignee
      - Mentor: платежи где он получил mentor_payout
    """

    serializer_class = PaymentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related("task").prefetch_related("transactions")
        if user.is_company:
            return qs.filter(task__company__user=user)
        if user.is_student:
            return qs.filter(task__assignee=user)
        if user.is_mentor:
            return qs.filter(transactions__user=user, transactions__type="mentor_payout").distinct()
        return qs.none()


class MyTransactionsView(generics.ListAPIView):
    """
    GET /api/v1/payments/transactions/

    Все транзакции, в которых участвовал текущий пользователь.
    """

    serializer_class = TransactionSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        qs = Transaction.objects.select_related("user", "payment__task").order_by("-created_at")
        if user.is_company:
            # Видит escrow_fund и refund по своим задачам, plus нужно показать общую раскладку
            return qs.filter(payment__task__company__user=user)
        return qs.filter(user=user)


class CalculateSplitsView(APIView):
    """
    POST /api/v1/payments/splits-preview/

    Утилита для UI: показать пользователю раскладку перед созданием задачи.
    Body: { "amount": 150.00, "has_reviews": true }
    """

    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = SplitsRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = calculate_splits(
            amount=Decimal(str(serializer.validated_data["amount"])),
            has_reviews=serializer.validated_data["has_reviews"],
        )
        return Response(result)


class StripeWebhookView(APIView):
    """
    POST /api/v1/payments/webhooks/stripe/

    Заглушка под будущие реальные Stripe webhooks.
    Когда переключишься на STRIPE_MODE=live — здесь идёт верификация подписи через
    stripe.Webhook.construct_event() и обработка событий.
    """

    permission_classes = (AllowAny,)
    authentication_classes: list = []  # Stripe webhook не имеет JWT

    def post(self, request):
        # В mock-режиме просто 200 OK.
        # В live-режиме сюда добавить:
        #   stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        return Response({"received": True})
