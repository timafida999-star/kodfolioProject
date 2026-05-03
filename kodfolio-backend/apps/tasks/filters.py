"""Filters for task marketplace search."""
import django_filters
from django.db.models import Q

from .models import Task, TaskDifficulty, TaskStatus


class TaskFilter(django_filters.FilterSet):
    difficulty = django_filters.ChoiceFilter(choices=TaskDifficulty.choices)
    status = django_filters.ChoiceFilter(choices=TaskStatus.choices)
    min_budget = django_filters.NumberFilter(field_name="budget", lookup_expr="gte")
    max_budget = django_filters.NumberFilter(field_name="budget", lookup_expr="lte")
    max_hours = django_filters.NumberFilter(field_name="estimated_hours", lookup_expr="lte")
    skill = django_filters.UUIDFilter(field_name="skills_required__id")
    company = django_filters.UUIDFilter(field_name="company__id")
    q = django_filters.CharFilter(method="search_text", label="Search in title/description")

    class Meta:
        model = Task
        fields = ["difficulty", "status", "min_budget", "max_budget", "max_hours", "skill"]

    def search_text(self, queryset, name, value):
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )
