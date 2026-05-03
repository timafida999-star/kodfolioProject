"""Serializers for accounts app."""
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.skills.models import ProfileSkill, Skill

from .models import CompanyProfile, Profile, Role, User


# ─────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(
        choices=[
            (Role.STUDENT, "Student"),
            (Role.COMPANY, "Company"),
            (Role.MENTOR, "Mentor"),
        ],
        default=Role.STUDENT,
    )

    class Meta:
        model = User
        fields = ("email", "password", "password_confirm", "role")

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Пароли не совпадают."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """
    Расширяем стандартный JWT-сериализатор, чтобы:
    - принимать email вместо username,
    - возвращать данные пользователя в ответе.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        # Authenticate по email
        user = authenticate(
            request=self.context.get("request"),
            email=attrs.get("email"),
            password=attrs.get("password"),
        )
        if not user:
            raise serializers.ValidationError(
                {"email": "Неверный email или пароль."}
            )
        if not user.is_active:
            raise serializers.ValidationError({"email": "Аккаунт деактивирован."})

        refresh = self.get_token(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserMeSerializer(user).data,
        }

    @property
    def fields(self):
        fields = super().fields
        # Меняем username → email
        fields.pop("username", None)
        fields["email"] = serializers.EmailField()
        return fields


# ─────────────────────────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────────────────────────


class ProfileSkillReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="skill.name", read_only=True)
    category = serializers.CharField(source="skill.category", read_only=True)
    icon = serializers.CharField(source="skill.icon", read_only=True)
    skill_id = serializers.UUIDField(source="skill.id", read_only=True)

    class Meta:
        model = ProfileSkill
        fields = ("skill_id", "name", "category", "icon", "proficiency")


class ProfileSerializer(serializers.ModelSerializer):
    skills = ProfileSkillReadSerializer(source="profileskill_set", many=True, read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id",
            "email",
            "role",
            "full_name",
            "avatar_url",
            "bio",
            "experience_years",
            "github_username",
            "rating",
            "badges_count",
            "skills",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "rating", "badges_count", "created_at", "updated_at")


class CompanyProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = CompanyProfile
        fields = (
            "id",
            "email",
            "company_name",
            "logo_url",
            "website",
            "industry",
            "description",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_verified", "created_at", "updated_at")


class UserMeSerializer(serializers.ModelSerializer):
    """Что отдаём после login и в /auth/me/."""

    profile = ProfileSerializer(read_only=True)
    company_profile = CompanyProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "role",
            "is_verified",
            "date_joined",
            "profile",
            "company_profile",
        )


# ─────────────────────────────────────────────────────────────────
# SKILL ASSIGNMENT
# ─────────────────────────────────────────────────────────────────


class AddSkillSerializer(serializers.Serializer):
    skill_id = serializers.UUIDField()
    proficiency = serializers.IntegerField(min_value=1, max_value=5, default=3)

    def validate_skill_id(self, value):
        if not Skill.objects.filter(id=value).exists():
            raise serializers.ValidationError("Скилл не найден.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Старый пароль неверен.")
        return value
