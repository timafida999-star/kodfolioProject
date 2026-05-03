"""
python manage.py seed_skills — заполняет таблицу скиллов базовым набором.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.skills.models import Skill, SkillCategory

SEED = [
    # Languages
    ("Python", SkillCategory.LANGUAGE, "🐍"),
    ("JavaScript", SkillCategory.LANGUAGE, "📜"),
    ("TypeScript", SkillCategory.LANGUAGE, "📘"),
    ("Java", SkillCategory.LANGUAGE, "☕"),
    ("C#", SkillCategory.LANGUAGE, "🎯"),
    ("Go", SkillCategory.LANGUAGE, "🐹"),
    ("Rust", SkillCategory.LANGUAGE, "🦀"),
    ("PHP", SkillCategory.LANGUAGE, "🐘"),
    ("Kotlin", SkillCategory.LANGUAGE, "🟪"),
    ("Swift", SkillCategory.LANGUAGE, "🦅"),
    # Frontend
    ("Angular", SkillCategory.FRONTEND, "🅰️"),
    ("React", SkillCategory.FRONTEND, "⚛️"),
    ("Vue.js", SkillCategory.FRONTEND, "💚"),
    ("Svelte", SkillCategory.FRONTEND, "🟧"),
    ("Next.js", SkillCategory.FRONTEND, "▲"),
    ("HTML/CSS", SkillCategory.FRONTEND, "🎨"),
    ("Tailwind CSS", SkillCategory.FRONTEND, "💨"),
    # Backend
    ("Django", SkillCategory.BACKEND, "🎸"),
    ("Django REST Framework", SkillCategory.BACKEND, "🎯"),
    ("FastAPI", SkillCategory.BACKEND, "⚡"),
    ("Flask", SkillCategory.BACKEND, "🧪"),
    ("Node.js", SkillCategory.BACKEND, "🟩"),
    ("Express.js", SkillCategory.BACKEND, "🚂"),
    ("NestJS", SkillCategory.BACKEND, "🐱"),
    ("Spring Boot", SkillCategory.BACKEND, "🌱"),
    ("ASP.NET Core", SkillCategory.BACKEND, "🌐"),
    ("Laravel", SkillCategory.BACKEND, "🔺"),
    # Database
    ("PostgreSQL", SkillCategory.DATABASE, "🐘"),
    ("MySQL", SkillCategory.DATABASE, "🐬"),
    ("MongoDB", SkillCategory.DATABASE, "🍃"),
    ("Redis", SkillCategory.DATABASE, "🔴"),
    ("SQLite", SkillCategory.DATABASE, "📦"),
    ("Elasticsearch", SkillCategory.DATABASE, "🔍"),
    # DevOps
    ("Docker", SkillCategory.DEVOPS, "🐳"),
    ("Kubernetes", SkillCategory.DEVOPS, "☸️"),
    ("AWS", SkillCategory.DEVOPS, "☁️"),
    ("GCP", SkillCategory.DEVOPS, "🌥️"),
    ("Azure", SkillCategory.DEVOPS, "🔷"),
    ("CI/CD", SkillCategory.DEVOPS, "🔄"),
    ("GitHub Actions", SkillCategory.DEVOPS, "🐙"),
    ("Linux", SkillCategory.DEVOPS, "🐧"),
    ("Nginx", SkillCategory.DEVOPS, "🟢"),
    # Mobile
    ("React Native", SkillCategory.MOBILE, "📱"),
    ("Flutter", SkillCategory.MOBILE, "🎯"),
    ("iOS (SwiftUI)", SkillCategory.MOBILE, "🍎"),
    ("Android (Jetpack Compose)", SkillCategory.MOBILE, "🤖"),
    # Data / ML
    ("PyTorch", SkillCategory.DATA, "🔥"),
    ("TensorFlow", SkillCategory.DATA, "🧠"),
    ("Pandas", SkillCategory.DATA, "🐼"),
    ("scikit-learn", SkillCategory.DATA, "📊"),
    ("SQL", SkillCategory.DATA, "💾"),
]


class Command(BaseCommand):
    help = "Seed skills table with default technology list."

    def handle(self, *args, **options):
        created = 0
        for name, category, icon in SEED:
            slug = slugify(name).replace(".", "")
            _, was_created = Skill.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "category": category, "icon": icon},
            )
            if was_created:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Skills seeded. Created {created} new (total in DB: {Skill.objects.count()})"
            )
        )
