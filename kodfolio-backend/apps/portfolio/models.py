"""Auto-generated portfolio of verified completed tasks."""
import uuid

from django.conf import settings
from django.db import models


class PortfolioEntry(models.Model):
    """
    Запись в портфолио студента.
    Создаётся автоматически когда submission переходит в APPROVED (через signal).

    Каждая запись = верифицированный case: задача + решение + оценка ментора + одобрение компании.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="portfolio_entries",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        related_name="portfolio_entries",
    )
    submission = models.OneToOneField(
        "submissions.Submission",
        on_delete=models.CASCADE,
        related_name="portfolio_entry",
    )
    is_public = models.BooleanField(
        default=True,
        help_text="Если False — запись скрыта с публичной страницы",
    )
    views_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("student", "task")
        verbose_name_plural = "Portfolio Entries"

    def __str__(self) -> str:
        return f"{self.student.email} :: {self.task.title}"
