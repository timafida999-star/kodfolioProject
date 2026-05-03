"""
Интеграционная проверка KODfolio backend.
Запускается с SQLite, проходит весь user-flow:
  1. Регистрация студента
  2. Регистрация компании
  3. Login обоих
  4. Студент обновляет профиль + добавляет скиллы
  5. Компания создаёт задачу
  6. Студент видит задачу в /tasks/
  7. Студент откликается
  8. Компания видит отклик
  9. Компания принимает кандидата
 10. Проверяем что task.status = in_progress, assignee = student
"""
import os
import sys

# Test settings (SQLite in-memory)
os.environ["SECRET_KEY"] = "test-key-for-integration-test"
os.environ["DEBUG"] = "True"
os.environ["POSTGRES_DB"] = "test"
os.environ["POSTGRES_USER"] = "test"
os.environ["POSTGRES_PASSWORD"] = "test"
os.environ["POSTGRES_HOST"] = "localhost"
os.environ["POSTGRES_PORT"] = "5432"
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.test"

import django
django.setup()

# Run migrations
from django.core.management import call_command
print("→ Running migrations...")
call_command("migrate", verbosity=0)
print("✓ Migrations applied")

print("→ Seeding skills...")
call_command("seed_skills", verbosity=0)
print("✓ Skills seeded")

# Test client
from rest_framework.test import APIClient
from apps.skills.models import Skill

GREEN, RED, RESET, YELLOW = "\033[92m", "\033[91m", "\033[0m", "\033[93m"

def check(name, condition, detail=""):
    status = f"{GREEN}✓{RESET}" if condition else f"{RED}✗{RESET}"
    print(f"  {status} {name}" + (f"  ({detail})" if detail else ""))
    if not condition:
        print(f"     {RED}DETAIL: {detail}{RESET}")
        sys.exit(1)

print()
print(f"{YELLOW}━━━ Phase 1: Auth ━━━{RESET}")

client_student = APIClient()
client_company = APIClient()

# 1. Регистрация студента
r = client_student.post("/api/v1/auth/register/", {
    "email": "aigerim@test.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "student",
}, format="json")
check("Student register", r.status_code == 201, f"got {r.status_code}: {r.content[:200]}")
student_token = r.json()["access"]
student_id = r.json()["user"]["id"]
client_student.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")

# 2. Регистрация компании
r = client_company.post("/api/v1/auth/register/", {
    "email": "acme@test.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "company",
}, format="json")
check("Company register", r.status_code == 201, f"got {r.status_code}: {r.content[:200]}")
company_token = r.json()["access"]
client_company.credentials(HTTP_AUTHORIZATION=f"Bearer {company_token}")

# 3. /me/
r = client_student.get("/api/v1/auth/me/")
check("Student /me/", r.status_code == 200 and r.json()["role"] == "student")

r = client_company.get("/api/v1/auth/me/")
check("Company /me/", r.status_code == 200 and r.json()["role"] == "company")
check("Company has company_profile auto-created", r.json().get("company_profile") is not None)

# 4. Profile update
r = client_student.patch("/api/v1/profiles/me/", {
    "full_name": "Aigerim K.",
    "bio": "Junior Python dev",
    "experience_years": 1,
    "github_username": "aigerim",
}, format="json")
check("Student updates profile", r.status_code == 200 and r.json()["full_name"] == "Aigerim K.")

# Update company profile
r = client_company.patch("/api/v1/profiles/me/", {
    "company_name": "Acme Inc.",
    "industry": "SaaS",
}, format="json")
check("Company updates profile", r.status_code == 200 and r.json()["company_name"] == "Acme Inc.")

# 5. Skills list
r = client_student.get("/api/v1/skills/")
check("Skills list", r.status_code == 200 and len(r.json()) > 30)
python_skill = next(s for s in r.json() if s["name"] == "Python")
django_skill = next(s for s in r.json() if s["name"] == "Django")

# 6. Add skills to student
r = client_student.post("/api/v1/profiles/me/skills/", {
    "skill_id": python_skill["id"],
    "proficiency": 4,
}, format="json")
check("Add skill Python", r.status_code in (200, 201))

r = client_student.post("/api/v1/profiles/me/skills/", {
    "skill_id": django_skill["id"],
    "proficiency": 3,
}, format="json")
check("Add skill Django", r.status_code in (200, 201))

r = client_student.get("/api/v1/profiles/me/")
check("Profile shows 2 skills", len(r.json()["skills"]) == 2)

print()
print(f"{YELLOW}━━━ Phase 2: Tasks Marketplace ━━━{RESET}")

# 7. Company creates task
r = client_company.post("/api/v1/tasks/", {
    "title": "Build REST API for inventory",
    "description": "Need a Django REST endpoint for product CRUD.",
    "difficulty": "medium",
    "budget": 150,
    "estimated_hours": 8,
    "skill_ids": [python_skill["id"], django_skill["id"]],
}, format="json")
check("Company creates task", r.status_code == 201, f"got {r.status_code}: {r.content[:300]}")
task_id = r.json()["id"]
check("Task has correct status", r.json()["status"] == "open")
check("Task has skills", len(r.json()["skills_required"]) == 2)

# 8. Student tries to create task (should fail)
r = client_student.post("/api/v1/tasks/", {
    "title": "Hack",
    "description": "...",
    "difficulty": "easy",
    "budget": 10,
}, format="json")
check("Student CANNOT create task (403)", r.status_code == 403)

# 9. Student lists tasks
r = client_student.get("/api/v1/tasks/")
check("Student sees task list", r.status_code == 200 and r.json()["count"] >= 1)

# 10. Filter tasks by difficulty
r = client_student.get("/api/v1/tasks/?difficulty=medium")
check("Filter by difficulty=medium", r.status_code == 200 and r.json()["count"] >= 1)

r = client_student.get("/api/v1/tasks/?difficulty=hard")
check("Filter by difficulty=hard returns empty", r.status_code == 200 and r.json()["count"] == 0)

# 11. Filter by budget
r = client_student.get("/api/v1/tasks/?min_budget=100&max_budget=200")
check("Filter by budget range", r.status_code == 200 and r.json()["count"] >= 1)

# 12. Search by text
r = client_student.get("/api/v1/tasks/?q=inventory")
check("Search 'inventory'", r.status_code == 200 and r.json()["count"] >= 1)

r = client_student.get("/api/v1/tasks/?q=nonexistent_xyz")
check("Search nonexistent → empty", r.status_code == 200 and r.json()["count"] == 0)

# 13. Get task detail
r = client_student.get(f"/api/v1/tasks/{task_id}/")
check("Task detail", r.status_code == 200 and r.json()["title"] == "Build REST API for inventory")
check("Task has_applied=False initially", r.json()["has_applied"] is False)

# 14. Student applies
r = client_student.post(f"/api/v1/tasks/{task_id}/apply/", {
    "cover_letter": "I have Django experience and built similar APIs.",
}, format="json")
check("Student applies", r.status_code == 201)
application_id = r.json()["id"]

# 15. Cannot apply twice
r = client_student.post(f"/api/v1/tasks/{task_id}/apply/", {
    "cover_letter": "again",
}, format="json")
check("Cannot apply twice (400)", r.status_code == 400)

# 16. has_applied = True now
r = client_student.get(f"/api/v1/tasks/{task_id}/")
check("has_applied=True after apply", r.json()["has_applied"] is True)

# 17. Student sees their applications
r = client_student.get("/api/v1/applications/my/")
check("Student lists own applications", r.status_code == 200 and r.json()["count"] == 1)

# 18. Company views applications
r = client_company.get(f"/api/v1/tasks/{task_id}/applications/")
check("Company sees applicants", r.status_code == 200 and r.json()["count"] == 1)
check("Application shows student email", r.json()["results"][0]["student"]["email"] == "aigerim@test.com")

# 19. Student CANNOT view applications of someone else's task
r = client_student.get(f"/api/v1/tasks/{task_id}/applications/")
check("Student CANNOT see applicants list (403)", r.status_code == 403)

# 20. Company accepts the application
r = client_company.post(
    f"/api/v1/tasks/{task_id}/applications/{application_id}/accept/",
    {}, format="json"
)
check("Company accepts application", r.status_code == 200)
check("Task status now 'in_progress'", r.json()["task"]["status"] == "in_progress")
check("Task has assignee", r.json()["task"]["assignee"] == student_id)

# 21. Task no longer appears in default list (default filter = open)
r = client_student.get("/api/v1/tasks/")
check("Accepted task hidden from default list", r.json()["count"] == 0)

# 22. But appears in my tasks (student)
r = client_student.get("/api/v1/tasks/my/")
check("Student sees task in /tasks/my/", r.status_code == 200 and r.json()["count"] == 1)

# 23. Company also sees in /tasks/my/
r = client_company.get("/api/v1/tasks/my/")
check("Company sees task in /tasks/my/", r.status_code == 200 and r.json()["count"] == 1)

# 24. Cannot apply to in_progress task
client_student2 = APIClient()
r2 = client_student2.post("/api/v1/auth/register/", {
    "email": "daniyar@test.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "student",
}, format="json")
client_student2.credentials(HTTP_AUTHORIZATION=f"Bearer {r2.json()['access']}")
r = client_student2.post(f"/api/v1/tasks/{task_id}/apply/", {"cover_letter": "..."}, format="json")
check("Cannot apply to in_progress task (400)", r.status_code == 400)

# 25. Company cancels another task
r = client_company.post("/api/v1/tasks/", {
    "title": "Another task to cancel",
    "description": "test",
    "difficulty": "easy",
    "budget": 50,
    "estimated_hours": 2,
}, format="json")
task2_id = r.json()["id"]
r = client_company.delete(f"/api/v1/tasks/{task2_id}/")
check("Company cancels task (soft delete)", r.status_code == 200)
check("Task status = cancelled", r.json()["status"] == "cancelled")

print()
print(f"{YELLOW}━━━ Phase 3: Submissions & Reviews ━━━{RESET}")

# Регистрируем ментора
client_mentor = APIClient()
r = client_mentor.post("/api/v1/auth/register/", {
    "email": "bauyrzhan@test.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "mentor",
}, format="json")
check("Mentor register", r.status_code == 201)
mentor_token = r.json()["access"]
client_mentor.credentials(HTTP_AUTHORIZATION=f"Bearer {mentor_token}")

# Студент сдаёт работу
r = client_student.post(f"/api/v1/tasks/{task_id}/submissions/", {
    "github_pr_url": "https://github.com/aigerim/inventory/pull/1",
    "demo_url": "https://loom.com/demo123",
    "description": "Implemented full CRUD with tests. Coverage 92%.",
}, format="json")
check("Student submits work", r.status_code == 201, f"got {r.status_code}: {r.content[:300]}")
submission_id = r.json()["id"]
check("Submission status = in_review", r.json()["status"] == "in_review")
check("Submission revision_number = 1", r.json()["revision_number"] == 1)

# Task переходит в REVIEW
r = client_student.get(f"/api/v1/tasks/{task_id}/")
check("Task status now 'review'", r.json()["status"] == "review")

# Cannot submit twice
r = client_student.post(f"/api/v1/tasks/{task_id}/submissions/", {
    "github_pr_url": "https://github.com/x/y/pull/2",
    "description": "again",
}, format="json")
check("Cannot submit twice while in_review (400)", r.status_code == 400)

# Mentor видит submission в pending-review
r = client_mentor.get("/api/v1/submissions/pending-review/")
check("Mentor sees pending review", r.status_code == 200 and r.json()["count"] >= 1)

# Студент НЕ может видеть pending-review
r = client_student.get("/api/v1/submissions/pending-review/")
check("Student cannot access mentor queue (403)", r.status_code == 403)

# Mentor оставляет ревью
r = client_mentor.post(f"/api/v1/submissions/{submission_id}/reviews/", {
    "code_quality": 4,
    "architecture": 5,
    "correctness": 5,
    "documentation": 4,
    "feedback": "Strong work overall. Tests are excellent. Minor naming in `views.py` could improve.",
    "requested_revision": False,
}, format="json")
check("Mentor leaves review", r.status_code == 201, f"got {r.status_code}: {r.content[:300]}")
check("overall_score = 4.5", float(r.json()["overall_score"]) == 4.5)

# Student CANNOT review
r = client_student.post(f"/api/v1/submissions/{submission_id}/reviews/", {
    "code_quality": 5, "architecture": 5, "correctness": 5, "documentation": 5,
    "feedback": "self-review hack",
}, format="json")
check("Student CANNOT review (403)", r.status_code == 403)

# Submission detail показывает ревью
r = client_company.get(f"/api/v1/submissions/{submission_id}/")
check("Company sees submission detail", r.status_code == 200)
check("Submission has 1 review", len(r.json()["reviews"]) == 1)
check("Review feedback is in detail", "Strong work" in r.json()["reviews"][0]["feedback"])

# Student НЕ может approve (только Company)
r = client_student.post(f"/api/v1/submissions/{submission_id}/approve/", {}, format="json")
check("Student CANNOT approve (403)", r.status_code == 403)

# Mentor НЕ может approve
r = client_mentor.post(f"/api/v1/submissions/{submission_id}/approve/", {}, format="json")
check("Mentor CANNOT approve (403)", r.status_code == 403)

# Company approves
r = client_company.post(f"/api/v1/submissions/{submission_id}/approve/", {}, format="json")
check("Company approves submission", r.status_code == 200, f"got {r.status_code}: {r.content[:300]}")
check("Submission status = approved", r.json()["status"] == "approved")

# Task переходит в COMPLETED
r = client_student.get(f"/api/v1/tasks/{task_id}/")
check("Task status = completed", r.json()["status"] == "completed")

# Cannot approve twice
r = client_company.post(f"/api/v1/submissions/{submission_id}/approve/", {}, format="json")
check("Cannot approve twice (400)", r.status_code == 400)

# Student rating обновился
r = client_student.get("/api/v1/auth/me/")
check("Student rating updated to 4.5", float(r.json()["profile"]["rating"]) == 4.5,
      f"got rating={r.json()['profile']['rating']}")

# Mentor видит свои review в /reviews/my/
r = client_mentor.get("/api/v1/reviews/my/")
check("Mentor sees own reviews", r.status_code == 200 and r.json()["count"] == 1)

# Student видит submissions в /submissions/my/
r = client_student.get("/api/v1/submissions/my/")
check("Student sees own submissions", r.status_code == 200 and r.json()["count"] == 1)

print()
print(f"{YELLOW}━━━ Phase 4: Portfolio ━━━{RESET}")

# Portfolio entry создалась автоматически
r = client_student.get("/api/v1/portfolio/me/")
check("Student has 1 portfolio entry (auto-created)", r.status_code == 200 and r.json()["count"] == 1)
entry = r.json()["results"][0]
check("Portfolio shows task title", entry["task_title"] == "Build REST API for inventory")
check("Portfolio shows skills (2)", len(entry["skills_used"]) == 2)
check("Portfolio shows mentor review", entry["review"] is not None)
check("Portfolio review score = 4.5", float(entry["review"]["overall_score"]) == 4.5)
check("Portfolio shows GitHub PR URL", entry["github_pr_url"].startswith("https://github.com/"))
check("Portfolio is_public default True", entry["is_public"] is True)
entry_id = entry["id"]

# Public portfolio (без авторизации)
public_client = APIClient()
r = public_client.get(f"/api/v1/portfolio/{student_id}/")
check("Public portfolio accessible without auth", r.status_code == 200)
check("Public portfolio shows the entry", r.json()["count"] == 1)
check("Views count = 1 after first public view", r.json()["results"][0]["views_count"] == 1)

# Студент скрывает entry
r = client_student.patch(f"/api/v1/portfolio/entries/{entry_id}/", {
    "is_public": False,
}, format="json")
check("Student can hide entry", r.status_code == 200 and r.json()["is_public"] is False)

# После скрытия — на public странице её нет
r = public_client.get(f"/api/v1/portfolio/{student_id}/")
check("Hidden entry NOT in public list", r.json()["count"] == 0)

# В /portfolio/me/ всё равно видно (свой)
r = client_student.get("/api/v1/portfolio/me/")
check("Hidden entry STILL in own list", r.json()["count"] == 1)

# Возвращаем обратно
r = client_student.patch(f"/api/v1/portfolio/entries/{entry_id}/", {
    "is_public": True,
}, format="json")
check("Restore public", r.status_code == 200 and r.json()["is_public"] is True)

# Другой студент НЕ может изменить чужую entry
r = client_student2.patch(f"/api/v1/portfolio/entries/{entry_id}/", {
    "is_public": False,
}, format="json")
check("Other student cannot modify entry (403)", r.status_code == 403)

print()
print(f"{YELLOW}━━━ Phase 3+4: Rejection & Revision flow ━━━{RESET}")

# Создаём вторую задачу для теста rejection-flow
r = client_company.post("/api/v1/tasks/", {
    "title": "Second task to reject",
    "description": "test",
    "difficulty": "easy",
    "budget": 50,
    "estimated_hours": 2,
}, format="json")
task3_id = r.json()["id"]

# Student2 откликается и принимается
r = client_student2.post(f"/api/v1/tasks/{task3_id}/apply/", {"cover_letter": "test"}, format="json")
app_id = r.json()["id"]
client_company.post(f"/api/v1/tasks/{task3_id}/applications/{app_id}/accept/", {}, format="json")

# Student2 сдаёт первую попытку
r = client_student2.post(f"/api/v1/tasks/{task3_id}/submissions/", {
    "github_pr_url": "https://github.com/x/y/pull/1",
    "description": "v1 — incomplete",
}, format="json")
sub1_id = r.json()["id"]

# Company rejects
r = client_company.post(f"/api/v1/submissions/{sub1_id}/reject/", {
    "reason": "Tests are missing.",
}, format="json")
check("Company rejects submission", r.status_code == 200 and r.json()["status"] == "rejected")

# Task откатился в IN_PROGRESS
r = client_student2.get(f"/api/v1/tasks/{task3_id}/")
check("Task back to in_progress after reject", r.json()["status"] == "in_progress")

# Student2 пробует снова — revision_number растёт
r = client_student2.post(f"/api/v1/tasks/{task3_id}/submissions/", {
    "github_pr_url": "https://github.com/x/y/pull/2",
    "description": "v2 — added tests, fixed bugs",
}, format="json")
check("Re-submit allowed after rejection", r.status_code == 201)
check("revision_number incremented to 2", r.json()["revision_number"] == 2)

print()
print(f"{YELLOW}━━━ Phase 5: Payments & Escrow ━━━{RESET}")

# Splits preview (utility — без авторизации)
public_client_p = APIClient()
r = public_client_p.post("/api/v1/payments/splits-preview/", {
    "amount": "100.00",
    "has_reviews": True,
}, format="json")
check("Splits preview accessible", r.status_code == 200)
check("Platform fee = 10.00 (10%)", r.json()["platform_fee"] == "10.00")
check("Mentor fee = 5.00 (5%)", r.json()["mentor_fee"] == "5.00")
check("Student payout = 85.00", r.json()["student_payout"] == "85.00")

# Без mentor fee
r = public_client_p.post("/api/v1/payments/splits-preview/", {
    "amount": "200.00",
    "has_reviews": False,
}, format="json")
check("No mentor fee when no reviews", r.json()["mentor_fee"] == "0.00")
check("Student gets 90% when no reviews", r.json()["student_payout"] == "180.00")

# Company видит свой Payment (auto-funded при создании task)
# Помним: первая задача (task_id) уже approved — escrow released
# Проверяем что у первой задачи Payment в статусе RELEASED
r = client_company.get("/api/v1/payments/")
check("Company sees payments", r.status_code == 200 and r.json()["count"] >= 1)

# Найти платёж по первой задаче (она была approved, ожидаем released)
released_payment = next(
    (p for p in r.json()["results"] if p["task_id"] == task_id),
    None
)
check("Payment for completed task exists", released_payment is not None)
check("Payment status = released", released_payment["status"] == "released")
check("Payment platform_fee = 15.00 (10% от $150)", released_payment["platform_fee"] == "15.00")
check("Payment mentor_fee = 7.50 (5% от $150)", released_payment["mentor_fee"] == "7.50")
check("Payment student_payout = 127.50", released_payment["student_payout"] == "127.50")
check("Payment is_mock = True", released_payment["is_mock"] is True)

# Транзакции созданы
transactions = released_payment["transactions"]
check("Has escrow_fund transaction", any(t["type"] == "escrow_fund" for t in transactions))
check("Has platform_fee transaction", any(t["type"] == "platform_fee" for t in transactions))
check("Has mentor_payout transaction", any(t["type"] == "mentor_payout" for t in transactions))
check("Has student_payout transaction", any(t["type"] == "student_payout" for t in transactions))

# Student видит свои поступления
r = client_student.get("/api/v1/payments/")
check("Student sees their payment", r.status_code == 200 and r.json()["count"] >= 1)

# Mentor видит свой mentor_payout
r = client_mentor.get("/api/v1/payments/")
check("Mentor sees payment with mentor_payout", r.status_code == 200 and r.json()["count"] >= 1)

# Проверяем refund flow: cancelled task должна была получить refund
# (помним: task2_id был отменён на Phase 2)
# task2 был создан БЕЗ apply→submission, значит просто HELD → REFUNDED при cancel
r = client_company.get("/api/v1/payments/")
all_payments = r.json()["results"]
refunded = [p for p in all_payments if p["status"] == "refunded"]
check(f"At least 1 refunded payment (cancelled tasks)", len(refunded) >= 1,
      f"got {len(refunded)} refunded out of {len(all_payments)}")

# Webhook stub отвечает 200
r = public_client_p.post("/api/v1/payments/webhooks/stripe/", {}, format="json")
check("Stripe webhook stub responds 200", r.status_code == 200)

print()
print(f"{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
print(f"{GREEN}✅ ALL INTEGRATION TESTS PASSED{RESET}")
print(f"{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
