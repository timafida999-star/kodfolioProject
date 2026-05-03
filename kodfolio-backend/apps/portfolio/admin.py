from django.contrib import admin

from .models import PortfolioEntry


@admin.register(PortfolioEntry)
class PortfolioEntryAdmin(admin.ModelAdmin):
    list_display = ("student", "task", "is_public", "views_count", "created_at")
    list_filter = ("is_public",)
    search_fields = ("student__email", "task__title")
    raw_id_fields = ("student", "task", "submission")
    readonly_fields = ("views_count", "created_at")
