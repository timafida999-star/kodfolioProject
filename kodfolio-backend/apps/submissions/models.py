"""Submissions & Reviews."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class SubmissionStatus(models.TextChoices):
    """
    Жизненный цикл submission:
        IN_REVIEW (создан студентом)
            ├→ APPROVED (компания одобрила, money released, task → completed)
            ├→ REJECTED (компания отклонила, task откатывается в in_progress, студент может пере-submit)
            └→ REVISION_REQUESTED (ментор попросил доработать, task → in_progress)
    """

    IN_REVIEW = "in_review", _("In Review")
    APPROVED = "approved", _("Approved")
    REJECTED = "rejected", _("Rejected")
    REVISION_REQUESTED = "revision_requested", _("Revision Requested")


class Submission(models.Model):
    """Решение студента по задаче."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    github_pr_url = models.URLField(
        max_length=500,
        help_text="Ссылка на Pull Request или коммит",
    )
    demo_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="Опционально: видео-демо или живой демо-URL",
    )
    description = models.TextField(
        help_text="Markdown: что сделано, как тестировать, заметки",
    )
    status = models.CharField(
        max_length=25,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.IN_REVIEW,
        db_index=True,
    )
    revision_number = models.PositiveSmallIntegerField(
        default=1,
        help_text="Номер итерации (растёт при каждом re-submit)",
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    finalized_at = models.DateTimeField(
        null=True, blank=True, help_text="Когда компания approved/rejected"
    )

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["status", "-submitted_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.task.title} ← {self.student.email} (rev {self.revision_number}, {self.status})"


class Review(models.Model):
    """
    Менторская оценка submission по 4 критериям + общий балл.
    Каждый ментор может ревьюить только один раз — если повторно, апдейтит.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_given",
    )

    code_quality = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1–5: чистота кода, читаемость, conventions",
    )
    architecture = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1–5: структура, разделение ответственности",
    )
    correctness = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1–5: задача решена правильно, edge cases",
    )
    documentation = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1–5: README, комментарии, описание PR",
    )

    overall_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        help_text="Авто-рассчитанное среднее 1.00–5.00",
    )
    feedback = models.TextField(help_text="Структурированный фидбек ментора")

    requested_revision = models.BooleanField(
        default=False,
        help_text="Если True — ментор просит студента доработать",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("submission", "mentor")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Review {self.overall_score}/5 by {self.mentor.email}"

    def save(self, *args, **kwargs):
        # Авто-расчёт overall_score
        total = self.code_quality + self.architecture + self.correctness + self.documentation
        self.overall_score = Decimal(total) / Decimal(4)
        super().save(*args, **kwargs)
