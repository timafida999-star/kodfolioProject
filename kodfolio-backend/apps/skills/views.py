from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Skill
from .serializers import SkillSerializer


class SkillListView(generics.ListAPIView):
    """GET /api/v1/skills/  — список всех навыков (для автокомплита в UI)."""

    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = (AllowAny,)
    pagination_class = None  # отдаём все скиллы единым списком
    filterset_fields = ["category"]
    search_fields = ["name", "slug"]
