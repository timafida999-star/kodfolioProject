from django.contrib import admin

from .models import Application, Task


class ApplicationInline(admin.TabularInline):
    model = Application
    extra = 0
    raw_id_fields = ("student",)
    readonly_fields = ("applied_at", "updated_at")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "company",
        "difficulty",
        "budget",
        "status",
        "assignee",
        "created_at",
    )
    list_filter = ("status", "difficulty", "created_at")
    search_fields = ("title", "description", "company__company_name")
    raw_id_fields = ("company", "assignee")
    filter_horizontal = ("skills_required",)
    inlines = [ApplicationInline]
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("company", "title", "description")}),
        ("Parameters", {"fields": ("difficulty", "budget", "estimated_hours", "deadline", "skills_required")}),
        ("State", {"fields": ("status", "assignee")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("task", "student", "status", "applied_at")
    list_filter = ("status",)
    search_fields = ("task__title", "student__email")
    raw_id_fields = ("task", "student")
    readonly_fields = ("applied_at", "updated_at")
