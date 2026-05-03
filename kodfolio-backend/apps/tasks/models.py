"""Task marketplace models."""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TaskDifficulty(models.TextChoices):
    EASY = "easy", _("Easy")
    MEDIUM = "medium", _("Medium")
    HARD = "hard", _("Hard")


class TaskStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    OPEN = "open", _("Open")
    IN_PROGRESS = "in_progress", _("In Progress")
    REVIEW = "review", _("In Review")
    COMPLETED = "completed", _("Completed")
    CANCELLED = "cancelled", _("Cancelled")


class Task(models.Model):
    """
    Задача от компании.

    Жизненный цикл (state machine):
        DRAFT → OPEN (publish)
        OPEN → IN_PROGRESS (accept application)
        IN_PROGRESS → REVIEW (Phase 3: submission создан)
        REVIEW → COMPLETED (Phase 3: company approves)
        OPEN | IN_PROGRESS → CANCELLED (cancel)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        "accounts.CompanyProfile",
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
        help_text="Кандидат, чьё application было принято",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(help_text="Markdown-описание deliverables")
    difficulty = models.CharField(
        max_length=10,
        choices=TaskDifficulty.choices,
        default=TaskDifficulty.MEDIUM,
        db_index=True,
    )
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    estimated_hours = models.PositiveSmallIntegerField(default=4)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.OPEN,
        db_index=True,
    )
    skills_required = models.ManyToManyField(
        "skills.Skill",
        related_name="tasks",
        blank=True,
    )
    deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["difficulty", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} (${self.budget}, {self.status})"

    # ─── State transitions ─────────────────────────────────────
    def can_apply(self) -> bool:
        return self.status == TaskStatus.OPEN

    def can_be_cancelled(self) -> bool:
        return self.status in (TaskStatus.OPEN, TaskStatus.IN_PROGRESS)


class ApplicationStatus(models.TextChoices):
    PENDING = "pending", _("Pending")
    ACCEPTED = "accepted", _("Accepted")
    REJECTED = "rejected", _("Rejected")
    WITHDRAWN = "withdrawn", _("Withdrawn")


class Application(models.Model):
    """
    Отклик студента на задачу.
    Уникальная пара (task, student).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    cover_letter = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING,
        db_index=True,
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("task", "student")
        ordering = ["-applied_at"]

    def __str__(self) -> str:
        return f"{self.student.email} → {self.task.title} ({self.status})"
