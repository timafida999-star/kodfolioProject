from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm

from .models import CompanyProfile, Profile, Role, User


class UserAdminCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "role")


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserAdminCreationForm

    list_display = ("email", "role", "is_verified", "is_active", "is_staff", "date_joined")
    list_filter = ("role", "is_verified", "is_active", "is_staff")
    search_fields = ("email",)
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Role / Status", {"fields": ("role", "is_verified", "is_active")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role"),
            },
        ),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "rating", "experience_years", "badges_count")
    search_fields = ("full_name", "user__email", "github_username")
    list_filter = ("experience_years",)
    raw_id_fields = ("user",)


@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ("company_name", "user", "industry", "is_verified")
    search_fields = ("company_name", "user__email")
    list_filter = ("is_verified", "industry")
    raw_id_fields = ("user",)
    actions = ["mark_verified"]

    @admin.action(description="Отметить выбранных как верифицированных")
    def mark_verified(self, request, queryset):
        queryset.update(is_verified=True)
