"""Serializers for submissions and reviews."""
from rest_framework import serializers

from .models import Review, Submission


class ReviewSerializer(serializers.ModelSerializer):
    mentor_email = serializers.EmailField(source="mentor.email", read_only=True)
    mentor_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "mentor_email",
            "mentor_name",
            "code_quality",
            "architecture",
            "correctness",
            "documentation",
            "overall_score",
            "feedback",
            "requested_revision",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "overall_score", "mentor_email", "mentor_name", "created_at", "updated_at")

    def get_mentor_name(self, obj):
        return getattr(getattr(obj.mentor, "profile", None), "full_name", "") or obj.mentor.email


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "code_quality",
            "architecture",
            "correctness",
            "documentation",
            "feedback",
            "requested_revision",
        )


class SubmissionTaskShortSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    budget = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    difficulty = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


class SubmissionStudentShortSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    github_username = serializers.SerializerMethodField()

    def _profile(self, obj):
        return getattr(obj, "profile", None)

    def get_full_name(self, obj):
        p = self._profile(obj)
        return p.full_name if p else ""

    def get_avatar_url(self, obj):
        p = self._profile(obj)
        return p.avatar_url if p else ""

    def get_github_username(self, obj):
        p = self._profile(obj)
        return p.github_username if p else ""


class SubmissionListSerializer(serializers.ModelSerializer):
    """Краткий формат для листинга."""

    task = SubmissionTaskShortSerializer(read_only=True)
    student = SubmissionStudentShortSerializer(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True, required=False)
    avg_score = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = (
            "id",
            "task",
            "student",
            "status",
            "revision_number",
            "submitted_at",
            "reviews_count",
            "avg_score",
        )

    def get_avg_score(self, obj):
        reviews = list(obj.reviews.all())
        if not reviews:
            return None
        return round(sum(float(r.overall_score) for r in reviews) / len(reviews), 2)


class SubmissionDetailSerializer(serializers.ModelSerializer):
    task = SubmissionTaskShortSerializer(read_only=True)
    student = SubmissionStudentShortSerializer(read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta:
        model = Submission
        fields = (
            "id",
            "task",
            "student",
            "github_pr_url",
            "demo_url",
            "description",
            "status",
            "revision_number",
            "submitted_at",
            "reviewed_at",
            "finalized_at",
            "reviews",
        )
        read_only_fields = ("id", "status", "revision_number", "submitted_at", "reviewed_at", "finalized_at")


class SubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ("github_pr_url", "demo_url", "description")


class RejectionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=2000)
