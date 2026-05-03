# KODfolio — Backend (Phase 1)

> Backend-фундамент платформы KODfolio: аутентификация (JWT), пользователи и профили, роли (Student / Company / Mentor / Admin), управление навыками.
> Этап Phase 1 — Auth & Users. Дальше будут Tasks, Submissions, Payments.

## Стек

- **Python 3.12** + **Django 5** + **Django REST Framework**
- **PostgreSQL 16** (через Docker)
- **Redis 7** (для Celery, появится позднее)
- **JWT** (`djangorestframework-simplejwt`) с refresh-token rotation и blacklisting
- **drf-spectacular** — OpenAPI/Swagger автодокументация

---

## Быстрый старт (Docker — рекомендуется)

### 1. Клонировать и подготовить env

```bash
cd kodfolio-backend
cp .env.example .env
# В .env поменяй SECRET_KEY на любой длинный случайный текст
```

### 2. Запустить

```bash
docker compose up --build
```

Первый запуск сделает:
- Поднимет PostgreSQL и Redis
- Поставит зависимости в Docker-образ
- Применит миграции
- Засеет таблицу скиллов (Python, Django, React и т.п.)

После старта:
- API: <http://localhost:8000/api/v1/>
- Admin: <http://localhost:8000/admin/>
- Swagger docs: <http://localhost:8000/api/docs/>
- Health check: <http://localhost:8000/health/>

### 3. Создать суперпользователя (один раз)

```bash
docker compose exec backend python manage.py createsuperuser
```

Вводишь email и пароль (поле "username" не запросит — мы используем email).

---

## Альтернатива: запуск без Docker

```bash
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements/dev.txt

# В .env поменяй POSTGRES_HOST=db → POSTGRES_HOST=localhost
# и убедись что у тебя запущен локальный Postgres + Redis

python manage.py migrate
python manage.py seed_skills
python manage.py createsuperuser
python manage.py runserver
```

---

## Что уже реализовано

### Phase 1 — Authentication & Users

| Endpoint | Метод | Описание | Кто |
|---|---|---|---|
| `/api/v1/auth/register/` | POST | Регистрация (email, password, role) | Все |
| `/api/v1/auth/login/` | POST | Логин по email + password → JWT pair | Все |
| `/api/v1/auth/refresh/` | POST | Обновить access-token | Все |
| `/api/v1/auth/logout/` | POST | Blacklist refresh-token | Auth |
| `/api/v1/auth/me/` | GET | Текущий пользователь + профиль | Auth |
| `/api/v1/auth/password/change/` | POST | Сменить пароль | Auth |
| `/api/v1/profiles/me/` | GET, PATCH | Свой профиль (студент/ментор) или компания | Auth |
| `/api/v1/profiles/{user_id}/` | GET | Публичный профиль | Все |
| `/api/v1/profiles/me/skills/` | POST | Добавить навык | Student/Mentor |
| `/api/v1/profiles/me/skills/{skill_id}/` | DELETE | Удалить навык | Student/Mentor |
| `/api/v1/skills/` | GET | Список всех навыков (для UI-автокомплита) | Все |

### Phase 2 — Tasks Marketplace

| Endpoint | Метод | Описание | Кто |
|---|---|---|---|
| `/api/v1/tasks/` | GET | Список задач + фильтры | Все |
| `/api/v1/tasks/` | POST | Создать задачу | Company |
| `/api/v1/tasks/{id}/` | GET | Детали задачи | Все |
| `/api/v1/tasks/{id}/` | PATCH | Изменить задачу | Owner Company |
| `/api/v1/tasks/{id}/` | DELETE | Отменить задачу (soft delete) | Owner Company |
| `/api/v1/tasks/my/` | GET | Мои задачи (зависит от роли) | Auth |
| `/api/v1/tasks/{task_id}/apply/` | POST | Откликнуться на задачу | Student |
| `/api/v1/tasks/{task_id}/applications/` | GET | Список откликов | Owner Company |
| `/api/v1/tasks/{task_id}/applications/{id}/accept/` | POST | Принять кандидата | Owner Company |
| `/api/v1/tasks/{task_id}/applications/{id}/reject/` | POST | Отклонить отклик | Owner Company |
| `/api/v1/applications/my/` | GET | Свои отклики | Student |
| `/api/v1/applications/{id}/withdraw/` | POST | Отозвать отклик | Student |

### Phase 3 — Submissions & Reviews

| Endpoint | Метод | Описание | Кто |
|---|---|---|---|
| `/api/v1/tasks/{task_id}/submissions/` | POST | Сдать решение (PR + demo + описание) | Student-assignee |
| `/api/v1/tasks/{task_id}/submissions/` | GET | Все submissions задачи | Assignee / Owner / Mentor |
| `/api/v1/submissions/{id}/` | GET | Детали submission + все ревью | Связанные стороны |
| `/api/v1/submissions/my/` | GET | Свои сдачи | Student |
| `/api/v1/submissions/pending-review/` | GET | Очередь на ревью | Mentor |
| `/api/v1/submissions/{id}/reviews/` | POST | Оставить ревью (4 критерия + feedback) | Mentor |
| `/api/v1/submissions/{id}/approve/` | POST | Одобрить → task: completed | Owner Company |
| `/api/v1/submissions/{id}/reject/` | POST | Отклонить → task: in_progress | Owner Company |
| `/api/v1/reviews/my/` | GET | Свои ревью | Mentor |

**Workflow submission:**
```
Student submits → status: IN_REVIEW, task: REVIEW
   ├→ Mentor reviews (без revision)
   │     └→ Company approves → APPROVED, task: COMPLETED, PortfolioEntry создан
   │     └→ Company rejects → REJECTED, task: IN_PROGRESS (студент может re-submit)
   └→ Mentor reviews (requested_revision=True) → task: IN_PROGRESS
```

**Авто-расчёт overall_score:** среднее от code_quality + architecture + correctness + documentation (1–5 каждый).

**Авто-обновление student rating:** при approve пересчитывается среднее по всем approved submissions.

### Phase 4 — Portfolio Builder

| Endpoint | Метод | Описание | Кто |
|---|---|---|---|
| `/api/v1/portfolio/me/` | GET | Своё портфолио (включая скрытые) | Auth |
| `/api/v1/portfolio/{user_id}/` | GET | Публичное портфолио (только is_public=True) | Все |
| `/api/v1/portfolio/entries/{id}/` | GET | Детали записи | Все |
| `/api/v1/portfolio/entries/{id}/` | PATCH | Скрыть/показать запись | Owner |

### Phase 5 — Payments & Escrow

| Endpoint | Метод | Описание | Кто |
|---|---|---|---|
| `/api/v1/payments/` | GET | Свои платежи + транзакции | Auth (любая роль) |
| `/api/v1/payments/transactions/` | GET | Лента транзакций | Auth |
| `/api/v1/payments/splits-preview/` | POST | Расчёт раскладки (для UI) | Все |
| `/api/v1/payments/webhooks/stripe/` | POST | Webhook receiver (заглушка для live-mode) | Stripe |

**Как работает escrow (в mock-режиме — по умолчанию):**

```
1. Company создаёт Task ($150)
   → signal: fund_escrow() → Payment(status=HELD, $150)
   → Transaction: escrow_fund $150

2. Student submits → Mentor reviews → Company approves
   → signal: release_escrow() → split:
       Platform fee:  $15.00  (10%)  → Transaction: platform_fee
       Mentor fee:    $7.50   (5%)   → Transaction: mentor_payout
       Student:       $127.50         → Transaction: student_payout
   → Payment(status=RELEASED)

3. Если Task → CANCELLED
   → signal: refund_escrow() → Payment(status=REFUNDED)
   → Transaction: refund $150 → Company
```

**Mock vs Live режим:**
По умолчанию `STRIPE_MODE=mock` — escrow симулируется (никаких реальных API-вызовов). Все статусы, транзакции и расчёты как в production. Когда захочешь подключить настоящий Stripe — поменяй на `STRIPE_MODE=live` и заполни ключи.

**Splits настраиваются в `.env`:**
```env
PLATFORM_FEE_PERCENT=10
MENTOR_FEE_PERCENT=5
```

---

---

## Как тестировать вручную

### Через Swagger UI (проще всего)

Открой <http://localhost:8000/api/docs/> — там все endpoints с возможностью отправлять запросы прямо из браузера.

### Через curl

#### Регистрация студента

```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aigerim@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "role": "student"
  }'
```

Ответ:
```json
{
  "user": { "id": "...", "email": "aigerim@example.com", "role": "student", ... },
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc..."
}
```

#### Логин

```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "aigerim@example.com", "password": "SecurePass123!"}'
```

#### Получить мой профиль

```bash
curl http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Обновить профиль

```bash
curl -X PATCH http://localhost:8000/api/v1/profiles/me/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Aigerim K.", "bio": "Junior Python developer", "experience_years": 1, "github_username": "aigerim"}'
```

#### Список навыков (для выбора)

```bash
curl http://localhost:8000/api/v1/skills/
```

#### Добавить навык в профиль

```bash
curl -X POST http://localhost:8000/api/v1/profiles/me/skills/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"skill_id": "<UUID_SKILL>", "proficiency": 4}'
```

#### Создать задачу (от лица компании)

```bash
curl -X POST http://localhost:8000/api/v1/tasks/ \
  -H "Authorization: Bearer <COMPANY_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build REST API for inventory",
    "description": "Need a Django REST endpoint for product CRUD.",
    "difficulty": "medium",
    "budget": 150,
    "estimated_hours": 8,
    "skill_ids": ["<UUID_PYTHON>", "<UUID_DJANGO>"]
  }'
```

#### Список задач + фильтры

```bash
# Все открытые
curl http://localhost:8000/api/v1/tasks/

# Medium difficulty, бюджет 100-300
curl "http://localhost:8000/api/v1/tasks/?difficulty=medium&min_budget=100&max_budget=300"

# Поиск
curl "http://localhost:8000/api/v1/tasks/?q=django"
```

#### Откликнуться (от лица студента)

```bash
curl -X POST http://localhost:8000/api/v1/tasks/<TASK_ID>/apply/ \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cover_letter": "I have Django experience..."}'
```

#### Принять кандидата (от лица компании)

```bash
curl -X POST http://localhost:8000/api/v1/tasks/<TASK_ID>/applications/<APP_ID>/accept/ \
  -H "Authorization: Bearer <COMPANY_TOKEN>"
```

После accept: `task.status = in_progress`, `task.assignee = student`, остальные отклики автоматически отклоняются.

### Через Django Admin

Открой <http://localhost:8000/admin/> и логинься суперпользователем.
Там можешь:
- Создавать пользователей с любой ролью
- Видеть всех Profiles и CompanyProfiles
- Помечать компании как verified
- Видеть все скиллы

---

## Структура проекта

```
kodfolio-backend/
├── config/               # Django project (settings, urls, wsgi)
│   └── settings/
│       ├── base.py       # общие настройки
│       ├── development.py
│       ├── production.py
│       └── test.py       # SQLite in-memory для интеграционных тестов
├── apps/
│   ├── accounts/         # User, Profile, CompanyProfile, Auth (Phase 1)
│   ├── skills/           # Skill, ProfileSkill (Phase 1)
│   ├── tasks/            # Task, Application — Marketplace (Phase 2)
│   ├── submissions/      # Submission, Review (Phase 3)
│   │   ├── models.py     # Submission state machine + Review с авто-overall_score
│   │   ├── services.py   # approve/reject/request_revision + rating recalculation
│   │   ├── signals.py    # auto-create PortfolioEntry при approve
│   │   ├── views.py
│   │   ├── urls.py                       # /submissions/
│   │   ├── urls_reviews.py               # /reviews/
│   │   └── urls_task_submissions.py      # /tasks/{id}/submissions/
│   ├── portfolio/        # PortfolioEntry — auto-built portfolio (Phase 4)
│   └── payments/         # Payment, Transaction — Escrow (Phase 5)
│       ├── models.py     # Payment lifecycle: PENDING→HELD→RELEASED/REFUNDED
│       ├── services.py   # fund/release/refund + StripeClient (mock+live)
│       └── signals.py    # auto-fund / auto-release / auto-refund
├── core/                 # общие helpers
│   ├── pagination.py
│   └── exceptions.py
├── scripts/
│   └── entrypoint.sh
├── requirements/
│   ├── base.txt
│   └── dev.txt
├── docker-compose.yml
├── Dockerfile
├── manage.py
├── integration_test.py   # запускает 33 проверки всего user-flow
└── .env.example
```

---

## Запуск интеграционных тестов

Чтобы убедиться что всё работает корректно — есть готовый интеграционный тест, который проходит весь user-flow на SQLite (без Docker, без Postgres):

```bash
pip install -r requirements/dev.txt
python integration_test.py
```

Он проверяет 33 кейса: регистрация студента и компании, login, обновление профиля, добавление скиллов, создание задачи, фильтры, поиск, отклик студента, принятие/отклонение кандидата, переход состояний задачи и т.д.

---

## Что дальше

Backend MVP **полностью готов** — все 6 функциональностей из брифа реализованы:
✅ Authentication & Authorization
✅ User Profile System
✅ Task Marketplace
✅ Automatic Portfolio Builder
✅ Mentor Review System
✅ Escrow Payment System

**Опциональные улучшения:**
- **Notifications** — in-app + email через Celery (новый отклик, готовое ревью, успешная оплата)
- **GitHub OAuth** — login через GitHub + auto-import репозиториев в портфолио
- **Real Stripe integration** — переключить `STRIPE_MODE=live` и подставить ключи

**Frontend Phase 7** — Angular SPA поверх готового API.

---

## Troubleshooting

**`role "kodfolio" does not exist`** — Postgres ещё не успел создать пользователя. Подожди 5 сек или сделай `docker compose down -v && docker compose up`.

**`SECRET_KEY environment variable not set`** — забыл скопировать `.env.example` в `.env`.

**Порт 8000 занят** — поменяй в `docker-compose.yml`: `"8001:8000"`.

**Хочу пересоздать БД** — `docker compose down -v` (удалит volume) → `docker compose up`.
