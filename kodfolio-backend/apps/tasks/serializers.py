"""Serializers for tasks app."""
from rest_framework import serializers

from apps.skills.models import Skill
from apps.skills.serializers import SkillSerializer

from .models import Application, ApplicationStatus, Task, TaskStatus


# ───────────────────────────────────────────────────────────────
# Task
# ───────────────────────────────────────────────────────────────


class TaskCompanyShortSerializer(serializers.Serializer):
    """Маленький сериализатор компании внутри Task (избегаем циклических импортов)."""

    id = serializers.UUIDField(read_only=True)
    company_name = serializers.CharField(read_only=True)
    logo_url = serializers.URLField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)


class TaskListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка задач (без полного описания, для скорости)."""

    company = TaskCompanyShortSerializer(read_only=True)
    skills_required = SkillSerializer(many=True, read_only=True)
    applications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "company",
            "difficulty",
            "budget",
            "estimated_hours",
            "status",
            "skills_required",
            "deadline",
            "applications_count",
            "created_at",
        )


class TaskDetailSerializer(serializers.ModelSerializer):
    company = TaskCompanyShortSerializer(read_only=True)
    skills_required = SkillSerializer(many=True, read_only=True)
    applications_count = serializers.IntegerField(read_only=True, required=False)
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "company",
            "assignee",
            "difficulty",
            "budget",
            "estimated_hours",
            "status",
            "skills_required",
            "deadline",
            "applications_count",
            "has_applied",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("assignee", "status", "created_at", "updated_at")

    def get_has_applied(self, obj: Task) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Application.objects.filter(task=obj, student=request.user).exists()


class TaskWriteSerializer(serializers.ModelSerializer):
    """Используется для create / update. Принимает skill_ids списком."""

    skill_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Skill.objects.all(),
        required=False,
        write_only=True,
        source="skills_required",
    )

    class Meta:
        model = Task
        fields = (
            "title",
            "description",
            "difficulty",
            "budget",
            "estimated_hours",
            "deadline",
            "skill_ids",
        )

    def validate_budget(self, value):
        if value <= 0:
            raise serializers.ValidationError("Бюджет должен быть положительным.")
        if value > 10000:
            raise serializers.ValidationError("Максимальный бюджет на задачу — $10 000.")
        return value


# ───────────────────────────────────────────────────────────────
# Application
# ───────────────────────────────────────────────────────────────


class ApplicationStudentShortSerializer(serializers.Serializer):
    """Краткие данные студента для отображения в списке заявок (для компании)."""

    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    github_username = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return getattr(obj.profile, "full_name", "") if hasattr(obj, "profile") else ""

    def get_avatar_url(self, obj):
        return getattr(obj.profile, "avatar_url", "") if hasattr(obj, "profile") else ""

    def get_rating(self, obj):
        return float(getattr(obj.profile, "rating", 0)) if hasattr(obj, "profile") else 0

    def get_github_username(self, obj):
        return getattr(obj.profile, "github_username", "") if hasattr(obj, "profile") else ""


class ApplicationListSerializer(serializers.ModelSerializer):
    student = ApplicationStudentShortSerializer(read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True)
    task_id = serializers.UUIDField(source="task.id", read_only=True)

    class Meta:
        model = Application
        fields = (
            "id",
            "task_id",
            "task_title",
            "student",
            "cover_letter",
            "status",
            "applied_at",
        )


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ("cover_letter",)
