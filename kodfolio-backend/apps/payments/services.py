"""
Escrow workflow.

Архитектура:
- StripeClient — абстракция над Stripe API. В mock-режиме просто возвращает фейковые id.
- fund_escrow() — компания депонирует деньги для задачи. Status: PENDING → HELD.
- release_escrow() — при approve submission: split распределяется на студента/ментора/платформу.
- refund_escrow() — при cancel/dispute: всё возвращается компании.
"""
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.tasks.models import Task

from .models import Payment, PaymentStatus, Transaction, TransactionType


class PaymentError(Exception):
    """Бизнес-правило escrow нарушено."""


# ─────────────────────────────────────────────────────────────────
# Constants — берём из settings, чтобы можно было крутить из .env
# ─────────────────────────────────────────────────────────────────


def _platform_fee_pct() -> Decimal:
    return Decimal(str(getattr(settings, "PLATFORM_FEE_PERCENT", 10))) / Decimal(100)


def _mentor_fee_pct() -> Decimal:
    return Decimal(str(getattr(settings, "MENTOR_FEE_PERCENT", 5))) / Decimal(100)


def _is_mock_mode() -> bool:
    return getattr(settings, "STRIPE_MODE", "mock") != "live"


def _money(value) -> Decimal:
    """Округление до центов."""
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ─────────────────────────────────────────────────────────────────
# Stripe abstraction (mock + real)
# ─────────────────────────────────────────────────────────────────


class StripeClient:
    """
    Тонкая обёртка над Stripe.
    В mock-режиме возвращает детерминированные fake-id, чтобы тесты были стабильны.
    """

    @staticmethod
    def create_payment_intent(amount: Decimal, task_id: str) -> dict:
        if _is_mock_mode():
            return {
                "id": f"pi_mock_{task_id[:12]}",
                "status": "requires_capture",
                "amount": int(amount * 100),  # cents
            }
        # Реальный режим — нужен установленный stripe SDK + ключ в settings
        import stripe  # type: ignore

        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency="usd",
            capture_method="manual",
            metadata={"task_id": task_id},
        )
        return {"id": intent.id, "status": intent.status, "amount": intent.amount}

    @staticmethod
    def capture(intent_id: str) -> dict:
        if _is_mock_mode():
            return {"id": intent_id, "status": "succeeded"}
        import stripe  # type: ignore

        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.capture(intent_id)
        return {"id": intent.id, "status": intent.status}

    @staticmethod
    def cancel(intent_id: str) -> dict:
        if _is_mock_mode():
            return {"id": intent_id, "status": "canceled"}
        import stripe  # type: ignore

        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.cancel(intent_id)
        return {"id": intent.id, "status": intent.status}

    @staticmethod
    def transfer(amount: Decimal, destination: str, description: str) -> dict:
        if _is_mock_mode():
            return {"id": f"tr_mock_{destination[:8]}", "amount": int(amount * 100)}
        import stripe  # type: ignore

        stripe.api_key = settings.STRIPE_SECRET_KEY
        tr = stripe.Transfer.create(
            amount=int(amount * 100),
            currency="usd",
            destination=destination,
            description=description,
        )
        return {"id": tr.id, "amount": tr.amount}


# ─────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────


@transaction.atomic
def fund_escrow(*, task: Task, funder) -> Payment:
    """
    Компания вносит бюджет задачи в escrow.

    Идемпотентно: повторный вызов на той же задаче возвращает существующий Payment,
    если он уже HELD.
    """
    if task.company.user_id != funder.id:
        raise PaymentError("Только владелец задачи может пополнить escrow.")

    existing = Payment.objects.filter(task=task).first()
    if existing and existing.status == PaymentStatus.HELD:
        return existing
    if existing and existing.status == PaymentStatus.RELEASED:
        raise PaymentError("Платёж уже выпущен — задача завершена.")

    intent = StripeClient.create_payment_intent(amount=task.budget, task_id=str(task.id))

    payment, _ = Payment.objects.update_or_create(
        task=task,
        defaults={
            "amount": task.budget,
            "status": PaymentStatus.HELD,
            "stripe_intent_id": intent["id"],
            "is_mock": _is_mock_mode(),
            "held_at": timezone.now(),
        },
    )

    Transaction.objects.create(
        payment=payment,
        user=funder,
        type=TransactionType.ESCROW_FUND,
        amount=task.budget,
        description=f"Escrow funded for task '{task.title}'",
    )
    return payment


@transaction.atomic
def release_escrow(*, payment: Payment) -> Payment:
    """
    Распределение средств при approve submission:
      Платформа: 10%
      Ментор:    5% (если было хотя бы одно ревью)
      Студент:   остаток
    """
    if payment.status != PaymentStatus.HELD:
        raise PaymentError(
            f"Нельзя release: статус {payment.status} (ожидался held)."
        )

    task = payment.task
    submission = task.submissions.filter(status="approved").first()
    if not submission:
        raise PaymentError("Нет одобренного submission для release.")

    student = submission.student
    has_reviews = submission.reviews.exists()

    # Расчёт splits
    platform_fee = _money(payment.amount * _platform_fee_pct())
    mentor_fee = _money(payment.amount * _mentor_fee_pct()) if has_reviews else Decimal("0.00")
    student_payout = _money(payment.amount - platform_fee - mentor_fee)

    # Capture intent в Stripe
    StripeClient.capture(payment.stripe_intent_id)

    # Платежи menторам — выплачиваем поровну между всеми, кто оставил ревью
    mentors = list({r.mentor_id: r.mentor for r in submission.reviews.all()}.values())
    per_mentor = _money(mentor_fee / len(mentors)) if mentors else Decimal("0.00")

    # Update payment
    payment.platform_fee = platform_fee
    payment.mentor_fee = mentor_fee
    payment.student_payout = student_payout
    payment.status = PaymentStatus.RELEASED
    payment.released_at = timezone.now()
    payment.save()

    # Transactions: платформа, ментор(ы), студент
    Transaction.objects.create(
        payment=payment,
        user=None,
        type=TransactionType.PLATFORM_FEE,
        amount=platform_fee,
        description="Platform commission",
    )

    for mentor in mentors:
        if per_mentor > 0:
            tr = StripeClient.transfer(per_mentor, str(mentor.id), f"Mentor review payout: {task.title}")
            Transaction.objects.create(
                payment=payment,
                user=mentor,
                type=TransactionType.MENTOR_PAYOUT,
                amount=per_mentor,
                description=f"Review payout for {task.title}",
                stripe_transfer_id=tr["id"],
            )

    student_tr = StripeClient.transfer(student_payout, str(student.id), f"Student payout: {task.title}")
    Transaction.objects.create(
        payment=payment,
        user=student,
        type=TransactionType.STUDENT_PAYOUT,
        amount=student_payout,
        description=f"Task payout: {task.title}",
        stripe_transfer_id=student_tr["id"],
    )

    return payment


@transaction.atomic
def refund_escrow(*, payment: Payment, reason: str = "") -> Payment:
    """
    Возврат денег компании (при cancel задачи или dispute).
    """
    if payment.status != PaymentStatus.HELD:
        raise PaymentError(f"Нельзя refund: статус {payment.status}.")

    StripeClient.cancel(payment.stripe_intent_id)

    payment.status = PaymentStatus.REFUNDED
    payment.refunded_at = timezone.now()
    payment.save(update_fields=["status", "refunded_at", "updated_at"])

    Transaction.objects.create(
        payment=payment,
        user=payment.task.company.user,
        type=TransactionType.REFUND,
        amount=payment.amount,
        description=reason or "Refund to company",
    )
    return payment


def calculate_splits(amount: Decimal, has_reviews: bool = True) -> dict:
    """Public helper для UI — показать пользователю что куда уйдёт."""
    platform = _money(amount * _platform_fee_pct())
    mentor = _money(amount * _mentor_fee_pct()) if has_reviews else Decimal("0.00")
    student = _money(amount - platform - mentor)
    return {
        "amount": str(amount),
        "platform_fee": str(platform),
        "mentor_fee": str(mentor),
        "student_payout": str(student),
        "platform_fee_pct": str(_platform_fee_pct() * 100),
        "mentor_fee_pct": str(_mentor_fee_pct() * 100),
    }
