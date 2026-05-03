# KODfolio — Frontend (Phase 7.1: Foundation)

Angular 17 SPA — фронтенд KODfolio. Подключается к бэкенду через REST API.

## Стек

- **Angular 17** (standalone components + signals — без NgModules)
- **TypeScript strict** (включены все strict-флаги)
- **Tailwind CSS 3** для стилей
- **RxJS** для асинхронной работы
- **Reactive Forms** для всех форм

## Что готово в Phase 7.1

- ✅ Bootstrap приложения, lazy-loaded роуты
- ✅ JWT auth: login, register, logout, refresh с автоматическим повтором
- ✅ HTTP-interceptor с auto-refresh токенов
- ✅ AuthGuard, RoleGuard, GuestGuard
- ✅ Все API-сервисы для backend endpoints (Profile, Skills, Tasks, Submissions, Portfolio, Payments)
- ✅ Все TypeScript-модели для API ответов
- ✅ Layouts: MainLayout (с header), AuthLayout (split-screen), DashboardLayout (sidebar)
- ✅ Landing page с hero, статистикой, "How it works", CTA
- ✅ Login + Register с выбором роли
- ✅ Dashboard skeletons для всех 4 ролей
- ✅ Profile edit (с реальным сохранением + управление скиллами)
- ✅ Toast-уведомления
- ✅ Брендовая палитра (navy + cyan accent)

## Запуск

### Через Docker (рекомендуется — вместе с backend)

В корневой папке проекта (где лежат и backend, и frontend), создай `docker-compose.yml` объединяющий оба, или запускай раздельно:

```bash
# 1. Backend (в отдельном терминале)
cd ../kodfolio-backend
cp .env.example .env
docker compose up

# 2. Frontend
cd ../kodfolio-frontend
docker build -t kodfolio-frontend .
docker run -p 4200:4200 -v $(pwd):/app kodfolio-frontend
```

### Через npm (быстрее для разработки)

```bash
npm install
npm start
```

После старта:
- **Frontend:** http://localhost:4200/
- **Backend:** http://localhost:8000/ (должен быть запущен отдельно)

## Структура

```
src/
├── app/
│   ├── core/                       # Singletons: services, guards, interceptors
│   │   ├── models/                 # TypeScript интерфейсы под API
│   │   ├── services/
│   │   │   ├── auth.service.ts     # JWT auth с signal-state
│   │   │   ├── profile.service.ts
│   │   │   ├── tasks.service.ts
│   │   │   ├── submissions.service.ts
│   │   │   ├── portfolio.service.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── skills.service.ts
│   │   │   └── toast.service.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts # Bearer + auto-refresh при 401
│   │   └── guards/
│   │       ├── auth.guard.ts
│   │       └── role.guard.ts
│   │
│   ├── shared/ui/                  # Reusable: spinner, toast-host
│   │
│   ├── layouts/
│   │   ├── main-layout/            # Public pages (header + footer)
│   │   ├── auth-layout/            # Login/register split-screen
│   │   └── dashboard-layout/       # Authenticated app (sidebar)
│   │
│   ├── features/
│   │   ├── home/                   # Landing
│   │   ├── auth/login/
│   │   ├── auth/register/
│   │   ├── dashboard/              # Per-role dashboards
│   │   └── profile/                # Profile editor с skills
│   │
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
│
├── environments/
├── styles.scss                     # Tailwind + reusable component classes
├── index.html
└── main.ts
```

## Что дальше

**Phase 7.2 — Tasks Marketplace:** список задач с фильтрами, страница задачи, форма создания (для компаний), apply-модалка.

**Phase 7.3 — Submissions Flow:** сдача работы, ментор-ревью UI, approve/reject от компании.

**Phase 7.4 — Portfolio + Payments:** публичная страница портфолио, transaction history, polish.

## CORS

В backend `.env`:
```
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

В development `CORS_ALLOW_ALL_ORIGINS=True` (уже настроено).
