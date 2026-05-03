"""Role-based permissions."""
from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    message = "Доступно только для студентов."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_student)


class IsCompany(BasePermission):
    message = "Доступно только для компаний."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_company)


class IsMentor(BasePermission):
    message = "Доступно только для менторов."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_mentor)


class IsOwnerOrReadOnly(BasePermission):
    """
    Чтение разрешено любому аутентифицированному пользователю,
    запись — только владельцу объекта.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        # У объекта должно быть поле user или owner
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user
