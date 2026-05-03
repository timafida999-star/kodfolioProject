"""Signals: автоматически создаём Profile или CompanyProfile при создании User."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CompanyProfile, Profile, Role, User


@receiver(post_save, sender=User)
def create_user_profile(sender, instance: User, created: bool, **kwargs):
    if not created:
        return

    if instance.role == Role.COMPANY:
        CompanyProfile.objects.get_or_create(
            user=instance,
            defaults={"company_name": instance.email.split("@")[0]},
        )
    else:
        # Student / Mentor / Admin получают обычный Profile
        Profile.objects.get_or_create(user=instance)
