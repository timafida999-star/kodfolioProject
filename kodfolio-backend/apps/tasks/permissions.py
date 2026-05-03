"""Permissions specific to tasks."""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsTaskOwnerOrReadOnly(BasePermission):
    """Чтение — всем; модификация — только владельцу-компании."""

    message = "Только владелец задачи может её изменять."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return (
            request.user.is_authenticated
            and request.user.is_company
            and obj.company.user == request.user
        )


class IsTaskOwner(BasePermission):
    """Только владелец может видеть приватные данные (например, applications)."""

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and request.user.is_company
            and obj.company.user == request.user
        )
