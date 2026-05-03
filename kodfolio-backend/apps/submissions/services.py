"""Domain services for submissions: approve, reject, revision requests, rating updates."""
from decimal import Decimal

from django.db import transaction
from django.db.models import Avg
from django.utils import timezone

from apps.tasks.models import Task, TaskStatus

from .models import Review, Submission, SubmissionStatus


class SubmissionWorkflowError(Exception):
    """Бизнес-правило нарушено."""


@transaction.atomic
def create_submission(*, task: Task, student, github_pr_url: str, demo_url: str, description: str) -> Submission:
    """
    Создать submission. Откатывает task в REVIEW.
    Если предыдущий submission был REJECTED/REVISION — увеличиваем revision_number.
    """
    if task.assignee_id != student.id:
        raise SubmissionWorkflowError("Эта задача не назначена на вас.")

    if task.status not in (TaskStatus.IN_PROGRESS,):
        raise SubmissionWorkflowError(
            f"Сдать решение можно только когда задача in_progress (сейчас: {task.status})."
        )

    # Если уже есть активный IN_REVIEW — нельзя
    if task.submissions.filter(status=SubmissionStatus.IN_REVIEW).exists():
        raise SubmissionWorkflowError("Уже есть submission на ревью. Дождитесь решения.")

    # Считаем revision number
    last = task.submissions.order_by("-revision_number").first()
    revision_number = (last.revision_number + 1) if last else 1

    submission = Submission.objects.create(
        task=task,
        student=student,
        github_pr_url=github_pr_url,
        demo_url=demo_url,
        description=description,
        revision_number=revision_number,
    )

    # Task → REVIEW
    task.status = TaskStatus.REVIEW
    task.save(update_fields=["status", "updated_at"])

    return submission


@transaction.atomic
def approve_submission(*, submission: Submission, approver) -> Submission:
    """
    Компания approves submission:
      - submission.status → APPROVED
      - task.status → COMPLETED
      - student rating пересчитывается (на основе всех его approved submissions)
      - PortfolioEntry создаётся через signal
    """
    task = submission.task
    if task.company.user_id != approver.id:
        raise SubmissionWorkflowError("Только владелец задачи может одобрить решение.")

    if submission.status != SubmissionStatus.IN_REVIEW:
        raise SubmissionWorkflowError(
            f"Нельзя одобрить submission в статусе {submission.status}."
        )

    submission.status = SubmissionStatus.APPROVED
    submission.finalized_at = timezone.now()
    submission.save(update_fields=["status", "finalized_at"])

    task.status = TaskStatus.COMPLETED
    task.save(update_fields=["status", "updated_at"])

    _recalculate_student_rating(submission.student)

    return submission


@transaction.atomic
def reject_submission(*, submission: Submission, rejector, reason: str = "") -> Submission:
    """
    Компания отклоняет submission. Task откатывается в IN_PROGRESS.
    Студент может сдать новый submission (revision_number инкрементится автоматически).
    """
    task = submission.task
    if task.company.user_id != rejector.id:
        raise SubmissionWorkflowError("Только владелец задачи может отклонить решение.")

    if submission.status != SubmissionStatus.IN_REVIEW:
        raise SubmissionWorkflowError(
            f"Нельзя отклонить submission в статусе {submission.status}."
        )

    submission.status = SubmissionStatus.REJECTED
    submission.finalized_at = timezone.now()
    submission.save(update_fields=["status", "finalized_at"])

    task.status = TaskStatus.IN_PROGRESS
    task.save(update_fields=["status", "updated_at"])

    return submission


@transaction.atomic
def request_revision(*, submission: Submission) -> Submission:
    """
    Ментор просит студента доработать (после своего ревью с requested_revision=True).
    Task откатывается в IN_PROGRESS.
    """
    if submission.status != SubmissionStatus.IN_REVIEW:
        raise SubmissionWorkflowError("Можно запросить revision только в статусе in_review.")

    submission.status = SubmissionStatus.REVISION_REQUESTED
    submission.save(update_fields=["status"])

    task = submission.task
    task.status = TaskStatus.IN_PROGRESS
    task.save(update_fields=["status", "updated_at"])

    return submission


def _recalculate_student_rating(student) -> None:
    """
    Средний рейтинг студента = avg(overall_score) по всем его approved submissions.
    """
    from apps.accounts.models import Profile

    avg = (
        Review.objects.filter(
            submission__student=student,
            submission__status=SubmissionStatus.APPROVED,
        )
        .aggregate(avg_score=Avg("overall_score"))
        .get("avg_score")
    )
    if avg is None:
        return

    Profile.objects.filter(user=student).update(rating=Decimal(avg).quantize(Decimal("0.01")))
