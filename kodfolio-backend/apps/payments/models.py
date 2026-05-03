"""Payments and Escrow models."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class PaymentStatus(models.TextChoices):
    """
    Жизненный цикл платежа = escrow workflow:

      PENDING → HELD (escrow funded, ждём результата)
      HELD → RELEASED (split: студент + ментор + платформа)
      HELD → REFUNDED (отмена / dispute, деньги назад компании)
    """

    PENDING = "pending", _("Pending")
    HELD = "held", _("Held in escrow")
    RELEASED = "released", _("Released")
    REFUNDED = "refunded", _("Refunded")
    FAILED = "failed", _("Failed")


class Payment(models.Model):
    """
    Один Payment на задачу = бюджет, депонированный компанией в escrow.
    Splits рассчитываются при release:
      - Платформа: PLATFORM_FEE_PERCENT (default 10%)
      - Ментор:    MENTOR_FEE_PERCENT (default 5%, если было хотя бы одно review)
      - Студент:   остаток
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.OneToOneField(
        "tasks.Task",
        on_delete=models.PROTECT,
        related_name="payment",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    mentor_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    student_payout = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))

    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    # Stripe-specific (если STRIPE_MODE=live)
    stripe_intent_id = models.CharField(max_length=120, blank=True)
    stripe_payment_method = models.CharField(max_length=80, blank=True)

    # Метаданные
    is_mock = models.BooleanField(
        default=True,
        help_text="True = симуляция (без Stripe). False = реальная транзакция.",
    )
    held_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Payment ${self.amount} ({self.status}) for {self.task.title}"


class TransactionType(models.TextChoices):
    ESCROW_FUND = "escrow_fund", _("Escrow Funded")
    PLATFORM_FEE = "platform_fee", _("Platform Fee")
    MENTOR_PAYOUT = "mentor_payout", _("Mentor Payout")
    STUDENT_PAYOUT = "student_payout", _("Student Payout")
    REFUND = "refund", _("Refund to Company")


class Transaction(models.Model):
    """
    Аудит-лог финансовых операций.
    На каждое движение денег = одна запись.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        help_text="Получатель / источник (None для платформы)",
    )
    type = models.CharField(max_length=25, choices=TransactionType.choices, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    stripe_transfer_id = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        who = self.user.email if self.user else "platform"
        return f"{self.type} ${self.amount} → {who}"
