from django.contrib import admin

from .models import Review, Submission


class ReviewInline(admin.StackedInline):
    model = Review
    extra = 0
    raw_id_fields = ("mentor",)
    readonly_fields = ("overall_score", "created_at", "updated_at")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("task", "student", "status", "revision_number", "submitted_at")
    list_filter = ("status",)
    search_fields = ("task__title", "student__email", "github_pr_url")
    raw_id_fields = ("task", "student")
    readonly_fields = ("submitted_at", "reviewed_at", "finalized_at")
    inlines = [ReviewInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("submission", "mentor", "overall_score", "requested_revision", "created_at")
    list_filter = ("requested_revision",)
    search_fields = ("submission__task__title", "mentor__email")
    raw_id_fields = ("submission", "mentor")
    readonly_fields = ("overall_score", "created_at", "updated_at")
