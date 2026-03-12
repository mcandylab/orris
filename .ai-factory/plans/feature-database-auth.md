# Database & Auth

**Branch:** `feature/database-auth`
**Created:** 2026-03-12

## Settings

- **Testing:** Yes — integration tests via Vitest + `app.inject()`
- **Logging:** Verbose — DEBUG-логи на каждую DB-операцию, JWT-операцию, ошибки валидации
- **Docs:** Yes — обязательный docs-checkpoint в конце через `/aif-docs`

## Roadmap Linkage

- **Milestone:** "Database & Auth"
- **Rationale:** Этот план напрямую реализует milestone "Database & Auth" из ROADMAP.md — Prisma схема, PostgreSQL, регистрация/вход игроков, JWT токены.

## Context

Базовая инфраструктура уже готова (Backend Foundation milestone):
- `backend/src/db/client.ts` — PrismaClient singleton с connectDB/disconnectDB
- `backend/src/api/plugins/jwt.ts` — `@fastify/jwt` плагин с декоратором `app.authenticate`
- `backend/src/api/errors.ts` — иерархия AppError (BadRequestError, UnauthorizedError, ConflictError...)
- `backend/src/config.ts` — DATABASE_URL и JWT_SECRET из env
- `backend/prisma/schema.prisma` — модели User и PlayerStats уже описаны, нет миграций

Нужно добавить: `bcryptjs`, `vitest`, выполнить миграцию, реализовать репозитории и auth-маршруты.

## Tasks

### Phase 1: Setup

#### Task 1 — Добавить зависимости (bcryptjs, vitest)

**Файлы:** `backend/package.json`

Добавить в `dependencies`:
- `bcryptjs` — хэширование паролей (pure JS, без нативной компиляции)

Добавить в `devDependencies`:
- `vitest` — тест-раннер
- `@types/bcryptjs` — типы

Установить зависимости (`npm install` из корня монорепо).

**Logging:**
- Никакого — это только изменение package.json

#### Task 2 — Prisma миграция: initial schema

**Файлы:** `backend/prisma/migrations/`

Выполнить:
```bash
cd backend && npx prisma migrate dev --name init
```

Если PostgreSQL недоступен — создать файл миграции вручную через `prisma migrate dev --create-only --name init`, чтобы SQL был готов.

**Logging:**
- Существующий `connectDB()` уже логирует `DEBUG [db] connecting to database`

---

### Phase 2: DB Layer

> **Commit checkpoint #1** после Phase 1+2: `chore(db): add bcryptjs dep and initial prisma migration`

#### Task 3 — Реализовать UserRepository

**Файл:** `backend/src/db/repositories/UserRepository.ts`

Методы:
```typescript
createUser(username: string, passwordHash: string): Promise<User>
findByUsername(username: string): Promise<User | null>
findById(id: string): Promise<User | null>
```

Использовать `prisma` из `db/client.ts`.

**Logging (verbose):**
- `DEBUG [db:users] createUser username=<username>`
- `DEBUG [db:users] findByUsername username=<username>, found=<true|false>`
- `DEBUG [db:users] findById id=<id>, found=<true|false>`
- При ошибке: `ERROR [db:users] <operation> failed: <err.message>`

#### Task 4 — Реализовать StatsRepository

**Файл:** `backend/src/db/repositories/StatsRepository.ts`

Методы:
```typescript
createStats(userId: string): Promise<PlayerStats>
findByUserId(userId: string): Promise<PlayerStats | null>
```

Использовать `prisma` из `db/client.ts`.

**Logging (verbose):**
- `DEBUG [db:stats] createStats userId=<userId>`
- `DEBUG [db:stats] findByUserId userId=<userId>, found=<true|false>`
- При ошибке: `ERROR [db:stats] <operation> failed: <err.message>`

---

### Phase 3: API Layer

> **Commit checkpoint #2** после Phase 2: `feat(db): implement UserRepository and StatsRepository`

#### Task 5 — Реализовать auth routes

**Файл:** `backend/src/api/routes/auth.ts`

Два эндпоинта:

**`POST /api/auth/register`**
- Body: `{ username: string, password: string }`
- Валидация: username 3–20 символов (alphanum + underscore), password 8–72 символов
- Алгоритм:
  1. `findByUsername` → если существует → `ConflictError('Username already taken')`
  2. `bcrypt.hash(password, 10)` → passwordHash
  3. `createUser(username, passwordHash)`
  4. `createStats(user.id)`
  5. Подписать JWT: `{ userId: user.id, username: user.username }`
  6. Вернуть `201 { token, user: { id, username, createdAt } }`
- **Logging (verbose):**
  - `DEBUG [auth] register attempt username=<username>`
  - `INFO [auth] user registered userId=<id>, username=<username>`
  - `WARN [auth] register conflict username=<username>`
  - `WARN [auth] register validation failed: <details>`

**`POST /api/auth/login`**
- Body: `{ username: string, password: string }`
- Алгоритм:
  1. `findByUsername` → если не найден → `UnauthorizedError('Invalid credentials')`
  2. `bcrypt.compare(password, user.passwordHash)` → если false → `UnauthorizedError('Invalid credentials')`
  3. Подписать JWT: `{ userId: user.id, username: user.username }`
  4. Вернуть `200 { token, user: { id, username } }`
- **Logging (verbose):**
  - `DEBUG [auth] login attempt username=<username>`
  - `INFO [auth] login success userId=<id>, username=<username>`
  - `WARN [auth] login failed (not found) username=<username>`
  - `WARN [auth] login failed (wrong password) username=<username>`

Использовать JSON Schema для валидации через Fastify (не Zod — следуем паттернам проекта).

#### Task 6 — Зарегистрировать auth routes

**Файл:** `backend/src/api/routes/index.ts`

Добавить import и register:
```typescript
import authRoutes from './auth';
await app.register(authRoutes, { prefix: '/api' });
```

**Logging:**
- `DEBUG [routes] auth routes registered` — добавить в auth.ts при регистрации плагина

---

### Phase 4: Tests

> **Commit checkpoint #3** после Phase 3: `feat(api): implement auth endpoints (register, login)`

#### Task 7 — Интеграционные тесты для auth

**Файл:** `backend/src/api/routes/auth.test.ts`

Использовать `vitest` + `app.inject()` (createApp из index.ts).

Тест-кейсы:
- `POST /api/auth/register` → 201 + token при валидных данных
- `POST /api/auth/register` → 409 при дублирующемся username
- `POST /api/auth/register` → 422 при слишком коротком username
- `POST /api/auth/register` → 422 при слишком коротком password
- `POST /api/auth/login` → 200 + token при корректных credentials
- `POST /api/auth/login` → 401 при несуществующем username
- `POST /api/auth/login` → 401 при неверном пароле

**Setup:**
- Мокировать `UserRepository` и `StatsRepository` через vitest mocks (без реального PostgreSQL в unit-тестах)
- Или использовать реальную test-базу через env `DATABASE_URL` (integration)

Добавить в `package.json`:
```json
"test": "vitest run"
```

---

### Phase 5: Docs

> **Commit checkpoint #4** после Phase 4: `test(auth): add integration tests for auth routes`

#### Task 8 — Docs checkpoint

Запустить `/aif-docs` для обновления документации:
- Описать auth API (register/login endpoints, JWT формат)
- Описать структуру DB (User, PlayerStats)
- Обновить README / docs/ с информацией о Database & Auth milestone

> **Final commit** после Phase 5: `docs: update docs for Database & Auth milestone`

---

## Commit Plan

| Checkpoint | Tasks | Commit message |
|---|---|---|
| #1 | Tasks 1–2 | `chore(db): add bcryptjs dep and initial prisma migration` |
| #2 | Tasks 3–4 | `feat(db): implement UserRepository and StatsRepository` |
| #3 | Tasks 5–6 | `feat(api): implement auth endpoints (register, login)` |
| #4 | Task 7 | `test(auth): add integration tests for auth routes` |
| Final | Task 8 | `docs: update docs for Database & Auth milestone` |
