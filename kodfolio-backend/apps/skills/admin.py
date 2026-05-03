from django.contrib import admin

from .models import ProfileSkill, Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "slug")
    list_filter = ("category",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(ProfileSkill)
class ProfileSkillAdmin(admin.ModelAdmin):
    list_display = ("profile", "skill", "proficiency", "added_at")
    list_filter = ("proficiency", "skill__category")
    raw_id_fields = ("profile", "skill")
