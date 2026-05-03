"""Portfolio views — public profile pages + own management."""
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User

from .models import PortfolioEntry
from .serializers import PortfolioEntrySerializer, PortfolioEntryUpdateSerializer


def _base_qs():
    return (
        PortfolioEntry.objects.select_related(
            "task",
            "task__company",
            "submission",
            "student",
        )
        .prefetch_related("task__skills_required", "submission__reviews", "submission__reviews__mentor")
    )


class MyPortfolioView(generics.ListAPIView):
    """GET /api/v1/portfolio/me/  — все записи (включая скрытые), для самого студента."""

    serializer_class = PortfolioEntrySerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return _base_qs().filter(student=self.request.user)


class PublicPortfolioView(generics.ListAPIView):
    """
    GET /api/v1/portfolio/{user_id}/  — публичное портфолио по user_id.
    Видны только is_public=True. Каждый запрос инкрементит views_count.
    """

    serializer_class = PortfolioEntrySerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        user_id = self.kwargs["user_id"]
        # Проверка что юзер существует
        get_object_or_404(User, id=user_id)
        qs = _base_qs().filter(student_id=user_id, is_public=True)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        # Инкрементим views (только если кто-то отличный от хозяина смотрит)
        if request.user.is_authenticated and str(request.user.id) == str(self.kwargs["user_id"]):
            pass  # сам себя — не считаем
        else:
            qs.update(views_count=F("views_count") + 1)
            qs = self.get_queryset()  # перезапрос для актуальных counts
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(self.get_serializer(qs, many=True).data)


class PortfolioEntryDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/portfolio/entries/{id}/  — детали (любой)
    PATCH /api/v1/portfolio/entries/{id}/  — toggle is_public (только владелец)
    """

    permission_classes = (IsAuthenticated,)
    lookup_field = "id"

    def get_queryset(self):
        return _base_qs()

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return PortfolioEntryUpdateSerializer
        return PortfolioEntrySerializer

    def update(self, request, *args, **kwargs):
        entry = self.get_object()
        if entry.student_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # После апдейта возвращаем полный detail
        return Response(PortfolioEntrySerializer(entry).data)
