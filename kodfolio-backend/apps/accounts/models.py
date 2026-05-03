"""User accounts models for KODfolio."""
import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class Role(models.TextChoices):
    STUDENT = "student", _("Student")
    COMPANY = "company", _("Company")
    MENTOR = "mentor", _("Mentor")
    ADMIN = "admin", _("Admin")


class User(AbstractBaseUser, PermissionsMixin):
    """
    Кастомная модель пользователя.
    Логин — email. Роль определяет permissions и доступные функции.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True, db_index=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Email verified through confirmation link",
    )
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        ordering = ["-date_joined"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return f"{self.email} ({self.role})"

    @property
    def is_student(self) -> bool:
        return self.role == Role.STUDENT

    @property
    def is_company(self) -> bool:
        return self.role == Role.COMPANY

    @property
    def is_mentor(self) -> bool:
        return self.role == Role.MENTOR


class Profile(models.Model):
    """
    Профиль студента / ментора.
    Создаётся автоматически после регистрации (signal).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    full_name = models.CharField(max_length=120, blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    bio = models.TextField(blank=True)
    experience_years = models.PositiveSmallIntegerField(default=0)
    github_username = models.CharField(max_length=80, blank=True, db_index=True)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        help_text="0.00–5.00",
    )
    badges_count = models.PositiveIntegerField(default=0)
    skills = models.ManyToManyField(
        "skills.Skill",
        through="skills.ProfileSkill",
        related_name="profiles",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"

    def __str__(self) -> str:
        return self.full_name or self.user.email


class CompanyProfile(models.Model):
    """
    Профиль компании. Создаётся для пользователей с role=company.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="company_profile",
    )
    company_name = models.CharField(max_length=200)
    logo_url = models.URLField(max_length=500, blank=True)
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    is_verified = models.BooleanField(
        default=False,
        help_text="Manually verified by admin (badge of trust)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Company Profile"
        verbose_name_plural = "Company Profiles"

    def __str__(self) -> str:
        return self.company_name
