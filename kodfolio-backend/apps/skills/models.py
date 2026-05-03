"""Skills (technologies, tags) and their relation to profiles."""
import uuid

from django.db import models


class SkillCategory(models.TextChoices):
    LANGUAGE = "language", "Language"
    FRONTEND = "frontend", "Frontend"
    BACKEND = "backend", "Backend"
    DATABASE = "database", "Database"
    DEVOPS = "devops", "DevOps"
    MOBILE = "mobile", "Mobile"
    DATA = "data", "Data / ML"
    OTHER = "other", "Other"


class Skill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True, db_index=True)
    slug = models.SlugField(max_length=80, unique=True)
    category = models.CharField(
        max_length=20,
        choices=SkillCategory.choices,
        default=SkillCategory.OTHER,
        db_index=True,
    )
    icon = models.CharField(max_length=120, blank=True, help_text="Имя иконки или эмодзи")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self) -> str:
        return self.name


class ProfileSkill(models.Model):
    """Связь Profile <-> Skill с уровнем proficiency."""

    profile = models.ForeignKey(
        "accounts.Profile", on_delete=models.CASCADE, related_name="profileskill_set"
    )
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    proficiency = models.PositiveSmallIntegerField(
        default=3, help_text="1 (новичок) — 5 (эксперт)"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("profile", "skill")
        ordering = ["-proficiency"]

    def __str__(self) -> str:
        return f"{self.profile} → {self.skill} ({self.proficiency})"
