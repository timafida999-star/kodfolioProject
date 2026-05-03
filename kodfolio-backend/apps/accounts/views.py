"""Views for accounts app."""
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.skills.models import ProfileSkill, Skill

from .models import CompanyProfile, Profile, User
from .serializers import (
    AddSkillSerializer,
    ChangePasswordSerializer,
    CompanyProfileSerializer,
    LoginSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserMeSerializer,
)


# ─────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS
# ─────────────────────────────────────────────────────────────────


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/"""

    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user: User = serializer.save()

        # Сразу выдаём JWT-пару
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh["email"] = user.email

        return Response(
            {
                "user": UserMeSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/"""

    serializer_class = LoginSerializer
    permission_classes = (AllowAny,)


class RefreshView(TokenRefreshView):
    """POST /api/v1/auth/refresh/"""

    permission_classes = (AllowAny,)


class LogoutView(APIView):
    """POST /api/v1/auth/logout/  — blacklist refresh token."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "refresh token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception as exc:  # noqa: BLE001
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    """GET /api/v1/auth/me/  — текущий пользователь."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)


class ChangePasswordView(APIView):
    """POST /api/v1/auth/password/change/"""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Пароль обновлён."})


# ─────────────────────────────────────────────────────────────────
# PROFILE ENDPOINTS
# ─────────────────────────────────────────────────────────────────


class MyProfileView(generics.RetrieveUpdateAPIView):
    """
    GET    /api/v1/profiles/me/   — мой профиль
    PATCH  /api/v1/profiles/me/   — обновить
    """

    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        return (
            CompanyProfileSerializer
            if self.request.user.is_company
            else ProfileSerializer
        )

    def get_object(self):
        user = self.request.user
        if user.is_company:
            return get_object_or_404(CompanyProfile, user=user)
        return get_object_or_404(Profile, user=user)


class PublicProfileView(generics.RetrieveAPIView):
    """
    GET /api/v1/profiles/{user_id}/  — публичный профиль (студент / ментор).
    """

    serializer_class = ProfileSerializer
    permission_classes = (AllowAny,)
    queryset = Profile.objects.select_related("user").all()
    lookup_field = "user__id"
    lookup_url_kwarg = "user_id"


class MySkillsView(APIView):
    """
    POST   /api/v1/profiles/me/skills/    — добавить скилл
    DELETE /api/v1/profiles/me/skills/{skill_id}/  — удалить
    """

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        if request.user.is_company:
            return Response(
                {"detail": "Компании не имеют скиллов."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AddSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = request.user.profile
        skill = Skill.objects.get(id=serializer.validated_data["skill_id"])
        ps, created = ProfileSkill.objects.update_or_create(
            profile=profile,
            skill=skill,
            defaults={"proficiency": serializer.validated_data["proficiency"]},
        )
        return Response(
            {
                "skill_id": str(skill.id),
                "name": skill.name,
                "category": skill.category,
                "proficiency": ps.proficiency,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class RemoveSkillView(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, skill_id):
        if request.user.is_company:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = ProfileSkill.objects.filter(
            profile=request.user.profile, skill_id=skill_id
        ).delete()
        if not deleted:
            return Response(
                {"detail": "Скилл не привязан к профилю."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
