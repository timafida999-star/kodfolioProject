"""Views for submissions and reviews."""
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCompany, IsMentor, IsStudent
from apps.tasks.models import Task

from .models import Review, Submission, SubmissionStatus
from .serializers import (
    RejectionSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
    SubmissionCreateSerializer,
    SubmissionDetailSerializer,
    SubmissionListSerializer,
)
from .services import (
    SubmissionWorkflowError,
    approve_submission,
    create_submission,
    reject_submission,
    request_revision,
)


# ───────────────────────────────────────────────────────────────
# SUBMISSION CREATE / DETAIL
# ───────────────────────────────────────────────────────────────


class TaskSubmissionsView(APIView):
    """
    POST /api/v1/tasks/{task_id}/submissions/  — студент сдаёт работу
    GET  /api/v1/tasks/{task_id}/submissions/  — все submissions по задаче (видит student-assignee, company-owner, ментор-ревьюер)
    """

    permission_classes = (IsAuthenticated,)

    def get(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)
        # Видеть могут: assignee, company-owner, любой ментор
        can_view = (
            request.user.id == task.assignee_id
            or task.company.user_id == request.user.id
            or request.user.is_mentor
        )
        if not can_view:
            return Response(status=status.HTTP_403_FORBIDDEN)

        submissions = (
            task.submissions.select_related("task", "student", "student__profile")
            .prefetch_related("reviews", "reviews__mentor")
            .order_by("-submitted_at")
        )
        return Response(SubmissionListSerializer(submissions, many=True).data)

    def post(self, request, task_id):
        # Только студент-assignee
        if not request.user.is_authenticated or not request.user.is_student:
            return Response(status=status.HTTP_403_FORBIDDEN)

        task = get_object_or_404(Task, id=task_id)
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            submission = create_submission(
                task=task,
                student=request.user,
                github_pr_url=serializer.validated_data["github_pr_url"],
                demo_url=serializer.validated_data.get("demo_url", ""),
                description=serializer.validated_data["description"],
            )
        except SubmissionWorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            SubmissionDetailSerializer(submission).data,
            status=status.HTTP_201_CREATED,
        )


class SubmissionDetailView(generics.RetrieveAPIView):
    """GET /api/v1/submissions/{id}/"""

    serializer_class = SubmissionDetailSerializer
    permission_classes = (IsAuthenticated,)
    lookup_field = "id"

    def get_queryset(self):
        return (
            Submission.objects.select_related("task", "task__company", "student", "student__profile")
            .prefetch_related("reviews", "reviews__mentor", "reviews__mentor__profile")
        )

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        # Видеть могут: assignee-студент, company-owner, любой ментор
        if (
            obj.student_id != user.id
            and obj.task.company.user_id != user.id
            and not user.is_mentor
        ):
            self.permission_denied(self.request)
        return obj


class MySubmissionsView(generics.ListAPIView):
    """GET /api/v1/submissions/my/  — для студента."""

    serializer_class = SubmissionListSerializer
    permission_classes = (IsAuthenticated, IsStudent)

    def get_queryset(self):
        return (
            Submission.objects.filter(student=self.request.user)
            .select_related("task", "student", "student__profile")
            .prefetch_related("reviews")
            .annotate(reviews_count=Count("reviews"))
            .order_by("-submitted_at")
        )


class PendingReviewView(generics.ListAPIView):
    """
    GET /api/v1/submissions/pending-review/  — для ментора.
    Все submissions в статусе IN_REVIEW, которые этот ментор ещё не ревьюил.
    """

    serializer_class = SubmissionListSerializer
    permission_classes = (IsAuthenticated, IsMentor)

    def get_queryset(self):
        already_reviewed = Review.objects.filter(mentor=self.request.user).values_list(
            "submission_id", flat=True
        )
        return (
            Submission.objects.filter(status=SubmissionStatus.IN_REVIEW)
            .exclude(id__in=already_reviewed)
            .select_related("task", "student", "student__profile")
            .annotate(reviews_count=Count("reviews"))
            .order_by("submitted_at")
        )


# ───────────────────────────────────────────────────────────────
# REVIEWS
# ───────────────────────────────────────────────────────────────


class SubmissionReviewView(APIView):
    """
    POST /api/v1/submissions/{submission_id}/reviews/  — ментор оставляет ревью.
    Если ментор уже ревьюил это submission — апдейтим существующее.
    """

    permission_classes = (IsAuthenticated, IsMentor)

    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)

        if submission.status != SubmissionStatus.IN_REVIEW:
            return Response(
                {"detail": f"Нельзя ревьюить submission в статусе {submission.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        review, created = Review.objects.update_or_create(
            submission=submission,
            mentor=request.user,
            defaults=validated,
        )

        # Отметить, что хотя бы 1 ревью было
        if not submission.reviewed_at:
            submission.reviewed_at = timezone.now()
            submission.save(update_fields=["reviewed_at"])

        # Если ментор попросил revision — переводим submission
        if validated.get("requested_revision"):
            try:
                request_revision(submission=submission)
            except SubmissionWorkflowError:
                pass  # safe: state mismatch

        return Response(
            ReviewSerializer(review).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyReviewsView(generics.ListAPIView):
    """GET /api/v1/reviews/my/  — все ревью, оставленные текущим ментором."""

    serializer_class = ReviewSerializer
    permission_classes = (IsAuthenticated, IsMentor)

    def get_queryset(self):
        return (
            Review.objects.filter(mentor=self.request.user)
            .select_related("submission", "mentor", "mentor__profile")
            .order_by("-created_at")
        )


# ───────────────────────────────────────────────────────────────
# COMPANY ACTIONS: approve / reject
# ───────────────────────────────────────────────────────────────


class ApproveSubmissionView(APIView):
    """POST /api/v1/submissions/{submission_id}/approve/"""

    permission_classes = (IsAuthenticated, IsCompany)

    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        try:
            approve_submission(submission=submission, approver=request.user)
        except SubmissionWorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SubmissionDetailSerializer(submission).data)


class RejectSubmissionView(APIView):
    """POST /api/v1/submissions/{submission_id}/reject/"""

    permission_classes = (IsAuthenticated, IsCompany)

    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        serializer = RejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            reject_submission(
                submission=submission,
                rejector=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except SubmissionWorkflowError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SubmissionDetailSerializer(submission).data)
