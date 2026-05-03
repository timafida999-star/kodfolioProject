"""Views for tasks marketplace."""
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCompany, IsStudent

from .filters import TaskFilter
from .models import Application, ApplicationStatus, Task, TaskStatus
from .permissions import IsTaskOwner, IsTaskOwnerOrReadOnly
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationListSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskWriteSerializer,
)


# ───────────────────────────────────────────────────────────────
# TASK MARKETPLACE
# ───────────────────────────────────────────────────────────────


class TaskListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/tasks/         — список задач + фильтры (любой)
    POST /api/v1/tasks/         — создать задачу (только Company)
    """

    filterset_class = TaskFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "budget", "deadline"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = (
            Task.objects.select_related("company", "company__user")
            .prefetch_related("skills_required")
            .annotate(applications_count=Count("applications"))
        )
        # Если статус не задан фильтром — показываем только OPEN
        if not self.request.query_params.get("status"):
            qs = qs.filter(status=TaskStatus.OPEN)
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TaskWriteSerializer
        return TaskListSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsCompany()]
        return [AllowAny()]

    def perform_create(self, serializer):
        company_profile = self.request.user.company_profile
        serializer.save(company=company_profile, status=TaskStatus.OPEN)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # После создания возвращаем полный detail
        task = serializer.instance
        return Response(
            TaskDetailSerializer(task, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/tasks/{id}/   — детальная инфа
    PATCH  /api/v1/tasks/{id}/   — изменить (только владелец-компания)
    DELETE /api/v1/tasks/{id}/   — отменить (CANCELLED, soft delete)
    """

    queryset = Task.objects.select_related("company").prefetch_related("skills_required")
    permission_classes = (IsTaskOwnerOrReadOnly,)
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return TaskWriteSerializer
        return TaskDetailSerializer

    def get_permissions(self):
        # Чтение публичное, редактирование/удаление — только владелец
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsAuthenticated(), IsTaskOwnerOrReadOnly()]

    def destroy(self, request, *args, **kwargs):
        """Soft delete = установить статус CANCELLED."""
        task = self.get_object()
        if not task.can_be_cancelled():
            return Response(
                {"detail": f"Задача со статусом '{task.status}' не может быть отменена."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = TaskStatus.CANCELLED
        task.save(update_fields=["status", "updated_at"])
        return Response(
            TaskDetailSerializer(task, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class MyTasksView(generics.ListAPIView):
    """
    GET /api/v1/tasks/my/

    Компания → задачи, которые она запостила.
    Студент → задачи, на которые он назначен (assignee).
    """

    serializer_class = TaskListSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        qs = (
            Task.objects.select_related("company")
            .prefetch_related("skills_required")
            .annotate(applications_count=Count("applications"))
            .order_by("-created_at")
        )
        if user.is_company:
            return qs.filter(company__user=user)
        return qs.filter(assignee=user)


# ───────────────────────────────────────────────────────────────
# APPLICATIONS
# ───────────────────────────────────────────────────────────────


class ApplyToTaskView(APIView):
    """
    POST /api/v1/tasks/{task_id}/apply/

    Студент откликается на задачу.
    """

    permission_classes = (IsAuthenticated, IsStudent)

    def post(self, request, task_id):
        task = get_object_or_404(Task, id=task_id)

        if not task.can_apply():
            return Response(
                {"detail": f"Нельзя откликнуться: статус задачи — '{task.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Application.objects.filter(task=task, student=request.user).exists():
            return Response(
                {"detail": "Вы уже откликались на эту задачу."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = Application.objects.create(
            task=task,
            student=request.user,
            cover_letter=serializer.validated_data.get("cover_letter", ""),
        )
        return Response(
            ApplicationListSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class TaskApplicationsView(generics.ListAPIView):
    """
    GET /api/v1/tasks/{task_id}/applications/

    Список откликов на задачу. Видит только владелец задачи (компания).
    """

    serializer_class = ApplicationListSerializer
    permission_classes = (IsAuthenticated, IsCompany)

    def get_queryset(self):
        task = get_object_or_404(Task, id=self.kwargs["task_id"])
        # Проверка владения
        if task.company.user != self.request.user:
            return Application.objects.none()
        return (
            Application.objects.filter(task=task)
            .select_related("student", "student__profile", "task")
        )


class MyApplicationsView(generics.ListAPIView):
    """
    GET /api/v1/applications/my/

    Список своих откликов (для студента).
    """

    serializer_class = ApplicationListSerializer
    permission_classes = (IsAuthenticated, IsStudent)

    def get_queryset(self):
        return (
            Application.objects.filter(student=self.request.user)
            .select_related("task", "task__company")
            .order_by("-applied_at")
        )


class AcceptApplicationView(APIView):
    """
    POST /api/v1/tasks/{task_id}/applications/{application_id}/accept/

    Компания принимает кандидата → task.assignee = student, status=IN_PROGRESS,
    остальные applications автоматически → REJECTED.
    """

    permission_classes = (IsAuthenticated, IsCompany)

    @transaction.atomic
    def post(self, request, task_id, application_id):
        task = get_object_or_404(Task, id=task_id)
        if task.company.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

        if task.status != TaskStatus.OPEN:
            return Response(
                {"detail": f"Задача уже не открыта (status={task.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = get_object_or_404(Application, id=application_id, task=task)

        # Принимаем выбранного
        application.status = ApplicationStatus.ACCEPTED
        application.save(update_fields=["status", "updated_at"])

        # Остальные — отклоняем
        Application.objects.filter(task=task).exclude(id=application.id).update(
            status=ApplicationStatus.REJECTED
        )

        # Обновляем задачу
        task.assignee = application.student
        task.status = TaskStatus.IN_PROGRESS
        task.save(update_fields=["assignee", "status", "updated_at"])

        return Response(
            {
                "task": TaskDetailSerializer(task, context={"request": request}).data,
                "application": ApplicationListSerializer(application).data,
            }
        )


class RejectApplicationView(APIView):
    """
    POST /api/v1/tasks/{task_id}/applications/{application_id}/reject/
    """

    permission_classes = (IsAuthenticated, IsCompany)

    def post(self, request, task_id, application_id):
        task = get_object_or_404(Task, id=task_id)
        if task.company.user != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

        application = get_object_or_404(Application, id=application_id, task=task)
        application.status = ApplicationStatus.REJECTED
        application.save(update_fields=["status", "updated_at"])
        return Response(ApplicationListSerializer(application).data)


class WithdrawApplicationView(APIView):
    """
    POST /api/v1/applications/{application_id}/withdraw/

    Студент отзывает свой отклик.
    """

    permission_classes = (IsAuthenticated, IsStudent)

    def post(self, request, application_id):
        application = get_object_or_404(
            Application, id=application_id, student=request.user
        )
        if application.status != ApplicationStatus.PENDING:
            return Response(
                {"detail": "Можно отозвать только pending-отклик."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        application.status = ApplicationStatus.WITHDRAWN
        application.save(update_fields=["status", "updated_at"])
        return Response(ApplicationListSerializer(application).data)
