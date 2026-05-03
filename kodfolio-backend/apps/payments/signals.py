"""
Сигналы:
- При создании Task → fund_escrow автоматически (компания "депонирует" бюджет).
- При переходе Submission → APPROVED → release_escrow автоматически.
- При переходе Task → CANCELLED → refund_escrow.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.submissions.models import Submission, SubmissionStatus
from apps.tasks.models import Task, TaskStatus

from .models import Payment, PaymentStatus
from .services import fund_escrow, refund_escrow, release_escrow


@receiver(post_save, sender=Task)
def auto_fund_on_task_create(sender, instance: Task, created: bool, **kwargs):
    """Когда компания создаёт задачу — автоматически депонируем escrow (mock)."""
    if not created:
        return
    # Только если задача сразу OPEN (не draft) и есть company
    if instance.status != TaskStatus.OPEN:
        return
    try:
        fund_escrow(task=instance, funder=instance.company.user)
    except Exception:
        # Не падаем при ошибках платежа — задача всё равно создаётся.
        # В реальном проде сюда — Sentry alert + retry queue.
        pass


@receiver(post_save, sender=Submission)
def auto_release_on_approve(sender, instance: Submission, created: bool, **kwargs):
    """При approve submission — автоматически release escrow."""
    if instance.status != SubmissionStatus.APPROVED:
        return
    payment = Payment.objects.filter(task=instance.task).first()
    if not payment or payment.status != PaymentStatus.HELD:
        return
    try:
        release_escrow(payment=payment)
    except Exception:
        pass


@receiver(pre_save, sender=Task)
def auto_refund_on_cancel(sender, instance: Task, **kwargs):
    """При переходе задачи в CANCELLED — refund."""
    if not instance.pk:
        return
    try:
        old = Task.objects.get(pk=instance.pk)
    except Task.DoesNotExist:
        return

    if old.status != TaskStatus.CANCELLED and instance.status == TaskStatus.CANCELLED:
        payment = Payment.objects.filter(task=instance).first()
        if payment and payment.status == PaymentStatus.HELD:
            try:
                refund_escrow(payment=payment, reason="Task cancelled")
            except Exception:
                pass
