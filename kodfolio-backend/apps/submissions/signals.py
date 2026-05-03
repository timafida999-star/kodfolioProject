"""При approve submission — автоматически создаём PortfolioEntry."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Submission, SubmissionStatus


@receiver(post_save, sender=Submission)
def create_portfolio_entry_on_approve(sender, instance: Submission, created: bool, **kwargs):
    """
    Если submission переходит в APPROVED — добавляем в портфолио.
    Импорт внутри хэндлера, чтобы не создавать circular import (portfolio импортирует submissions).
    """
    if instance.status != SubmissionStatus.APPROVED:
        return

    from apps.portfolio.models import PortfolioEntry

    PortfolioEntry.objects.get_or_create(
        student=instance.student,
        task=instance.task,
        submission=instance,
        defaults={"is_public": True},
    )
