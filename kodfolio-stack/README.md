# KODfolio — Full Stack

Полный проект KODfolio: Backend (Django) + Frontend (Angular).

## Структура

```
kodfolio-stack/
├── docker-compose.yml     # Запускает весь стек одной командой
├── kodfolio-backend/      # Django + DRF + PostgreSQL
└── kodfolio-frontend/     # Angular 17 SPA
```

## Запуск (один раз)

```bash
# 1. Настроить env для backend
cd kodfolio-backend
cp .env.example .env
cd ..

# 2. Запустить весь стек
docker compose up --build
```

После старта откроется:
- 🌐 **Frontend:** http://localhost:4200
- 🔧 **Backend API:** http://localhost:8000/api/v1/
- 📚 **Swagger:** http://localhost:8000/api/docs/
- 🛠 **Django Admin:** http://localhost:8000/admin/

## Создать суперпользователя (один раз)

В отдельном терминале:
```bash
docker compose exec backend python manage.py createsuperuser
```

## Тест happy-path

1. Открой http://localhost:4200
2. Нажми **"Get started"** в header
3. Выбери роль **Student** → email + пароль (минимум 8 символов)
4. После регистрации тебя редиректит в `/dashboard/student`
5. Меню слева → **My Profile** → можно заполнить full_name, bio, GitHub username

То же самое попробуй с ролями **Company** и **Mentor** — увидишь разные dashboards.

## Что готово

### Backend (Phase 1–5) ✅
- Auth: JWT с refresh-rotation, blacklisting
- 4 роли: Student, Company, Mentor, Admin
- Profiles + Skills (51 предзагруженная технология)
- Tasks Marketplace с фильтрами и поиском
- Submissions + Mentor Reviews (4 критерия)
- Auto Portfolio Builder (signal-driven)
- Escrow Payments (mock + live режимы)
- 35+ REST endpoints
- 105 интеграционных тестов

### Frontend (Phase 7.1–7.4) ✅ ПОЛНОСТЬЮ ГОТОВ
- **Phase 7.1:** Bootstrap, JWT auth, layouts, landing page, login/register с ролями
- **Phase 7.2:** Tasks Marketplace UI — список с фильтрами, детали, форма создания, apply flow
- **Phase 7.3:** Submissions & Reviews UI — сдача работы, mentor review queue, форма ревью с 4 критериями, approve/reject от компании
- **Phase 7.4:** Portfolio (public + own) с toggle visibility + Payments History с раскладкой splits и transaction log

## Полный E2E flow через UI

1. **Company** регистрируется → постит задачу → escrow $150 HELD
2. **Student** видит в marketplace → подаёт application → принят
3. **Student** жмёт "Submit work" → форма с PR + demo + описание
4. **Mentor** в своём dashboard видит pending queue → ревью с 4 критериями
5. **Company** approves → escrow RELEASED → split (10% платформа, 5% ментор, 85% студент)
6. **PortfolioEntry** создаётся автоматически
7. Любой может зайти на `http://localhost:4200/portfolio/{user_id}` и увидеть верифицированное портфолио без auth

## Полная документация

- `kodfolio-backend/README.md` — все API endpoints, миграции, структура
- `kodfolio-frontend/README.md` — структура frontend, скрипты сборки
- `KODfolio_Blueprint.md` — полный блюпринт продукта (use-cases, диаграммы, стат. анализ, бизнес-модель)
