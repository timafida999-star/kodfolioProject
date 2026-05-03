"""Portfolio serializers."""
from rest_framework import serializers

from apps.skills.serializers import SkillSerializer

from .models import PortfolioEntry


class PortfolioCompanyShortSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    company_name = serializers.CharField(read_only=True)
    logo_url = serializers.URLField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)


class PortfolioReviewShortSerializer(serializers.Serializer):
    overall_score = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    feedback = serializers.CharField(read_only=True)
    mentor_email = serializers.EmailField(source="mentor.email", read_only=True)


class PortfolioEntrySerializer(serializers.ModelSerializer):
    """Полная запись для рендера на публичной странице."""

    task_title = serializers.CharField(source="task.title", read_only=True)
    task_description = serializers.CharField(source="task.description", read_only=True)
    task_difficulty = serializers.CharField(source="task.difficulty", read_only=True)
    task_budget = serializers.DecimalField(
        source="task.budget", max_digits=10, decimal_places=2, read_only=True
    )
    skills_used = SkillSerializer(source="task.skills_required", many=True, read_only=True)
    company = PortfolioCompanyShortSerializer(source="task.company", read_only=True)

    github_pr_url = serializers.URLField(source="submission.github_pr_url", read_only=True)
    demo_url = serializers.URLField(source="submission.demo_url", read_only=True)
    description = serializers.CharField(source="submission.description", read_only=True)

    review = serializers.SerializerMethodField()
    completed_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = PortfolioEntry
        fields = (
            "id",
            "task_title",
            "task_description",
            "task_difficulty",
            "task_budget",
            "skills_used",
            "company",
            "github_pr_url",
            "demo_url",
            "description",
            "review",
            "is_public",
            "views_count",
            "completed_at",
        )

    def get_review(self, obj):
        # Лучшее ревью по overall_score (или первое)
        best_review = obj.submission.reviews.order_by("-overall_score").first()
        if not best_review:
            return None
        return {
            "overall_score": str(best_review.overall_score),
            "feedback": best_review.feedback,
            "code_quality": best_review.code_quality,
            "architecture": best_review.architecture,
            "correctness": best_review.correctness,
            "documentation": best_review.documentation,
        }


class PortfolioEntryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioEntry
        fields = ("is_public",)
