# Plan: Backend Foundation

**Branch:** `feature/backend-foundation`
**Created:** 2026-03-12
**Milestone:** Backend Foundation

## Settings

- **Testing:** no
- **Logging:** verbose (DEBUG-уровень на каждом ключевом шаге)
- **Docs:** yes — обязательный docs-чекпойнт в конце через `/aif-docs`

## Roadmap Linkage

**Milestone:** "Backend Foundation"
**Rationale:** Этот план реализует второй milestone из ROADMAP.md — Fastify HTTP сервер, структура проекта, pino логи, обработка ошибок.

## Context

**Что уже готово (Monorepo Setup):**
- TypeScript монорепо с `backend/`, `frontend/`, `shared/` пакетами
- `shared/src/index.ts` — все типы протокола, TankType, XP_THRESHOLDS, API-типы
- `backend/prisma/schema.prisma` — модели User и PlayerStats
- `backend/src/index.ts` — базовый Fastify сервер с `/health` и pino логером
- `backend/package.json` — зависимости: fastify, @fastify/cors, @fastify/jwt, @prisma/client, uWebSockets.js
- Scaffold-папки: `backend/src/api/`, `backend/src/db/`, `backend/src/game/`, `backend/src/ws/`

**Что нужно реализовать в этом milestone:**
- Централизованный config-модуль
- Prisma client singleton + управление подключением
- Fastify app factory с graceful shutdown
- Плагины: CORS, JWT, rate limiting
- Глобальная обработка ошибок
- Структура API роутов + улучшенный /health

## Architecture Notes

Следовать правилам из `.ai-factory/ARCHITECTURE.md`:
- `game/` — чистое ядро, 0 внешних зависимостей (этот план не трогает game/)
- `api/` → `db/` — HTTP слой использует репозитории
- Логи: structured JSON через pino (встроен в Fastify)
- Формат лог-сообщений: `LOG [module] description` / `ERROR [module] description` / `WARN [module] description`

---

## Phase 1: Config & DB

### Task 1 ✅ — Config-модуль

**Файл:** `backend/src/config.ts`

Централизованный модуль конфигурации из env-переменных.

- Парсить и валидировать: PORT, LOG_LEVEL, DATABASE_URL, JWT_SECRET, NODE_ENV
- Экспортировать типизированный объект `config` с дефолтами
- В production завершать процесс с ошибкой если отсутствуют DATABASE_URL или JWT_SECRET

**Логирование:**
- `DEBUG [config] config loaded: NODE_ENV=<>, PORT=<>, LOG_LEVEL=<>`
- `ERROR [config] missing required env var: <NAME>` → process.exit(1)

---

### Task 2 ✅ — Prisma client singleton

**Файл:** `backend/src/db/client.ts`

Singleton Prisma Client с управлением жизненным циклом подключения.

- Экспортировать `prisma` — единственный экземпляр PrismaClient
- `connectDB()` — connect + логи
- `disconnectDB()` — disconnect + логи

**Логирование:**
- `DEBUG [db] connecting to database`
- `INFO [db] database connected`
- `ERROR [db] database connection failed` + err
- `DEBUG [db] database disconnected`

---

## Phase 2: Fastify Foundation

### Task 3 ✅ — Fastify app factory *(заблокирован: Task 1, 2)*

**Файл:** `backend/src/index.ts` (рефакторинг)

Извлечь `createApp()` factory-функцию, добавить graceful shutdown.

- `createApp()` → настроенный Fastify instance (logger из config, trustProxy: true)
- `start()` → connectDB() → createApp() → регистрация плагинов → listen
- SIGTERM/SIGINT → app.close() → disconnectDB() → process.exit(0)

**Логирование:**
- `DEBUG [server] creating Fastify app`
- `INFO [server] server started on port <port>`
- `INFO [server] shutting down` при SIGTERM/SIGINT
- `ERROR [server] startup failed` + err

---

### Task 4 ✅ — Fastify плагины: CORS + JWT *(заблокирован: Task 3)*

**Файлы:**
- `backend/src/api/plugins/cors.ts`
- `backend/src/api/plugins/jwt.ts`

**cors.ts:**
- Зарегистрировать `@fastify/cors`
- Development: все origins; production: из env CORS_ORIGINS
- `DEBUG [cors] CORS plugin registered, origins: <value>`

**jwt.ts:**
- Зарегистрировать `@fastify/jwt` с secret из config
- Добавить декоратор `fastify.authenticate` (verify token → 401 если невалидный)
- `DEBUG [jwt] JWT plugin registered`
- `DEBUG [jwt] token verified, userId: <id>` при успехе
- `WARN [jwt] invalid token: <reason>` при ошибке

---

### Task 5 ✅ — Глобальная обработка ошибок *(заблокирован: Task 3)*

**Файлы:**
- `backend/src/api/errors.ts`
- Регистрация error handler в app factory

**errors.ts:**
- `AppError extends Error` с полями: statusCode, code, message
- Производные: `BadRequestError` (400), `UnauthorizedError` (401), `NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422)

**Error handler (`app.setErrorHandler`):**
- `AppError` → `{ error: { code, message, statusCode } }` с нужным HTTP-статусом
- Fastify validation error → 422 с деталями поля
- Прочие ошибки → 500, в production не раскрывать детали
- `ERROR [api] <message>` + err + statusCode для 5xx
- `WARN [api] <message>` + statusCode для 4xx

---

### Task 6 ✅ — Rate limiting плагин *(заблокирован: Task 3)*

**Изменения:**
- Добавить `@fastify/rate-limit` в `backend/package.json`
- Создать `backend/src/api/plugins/rateLimit.ts`

**rateLimit.ts:**
- Зарегистрировать `@fastify/rate-limit` глобально: 100 req / 1 min
- Rate limit exceeded → 429 с понятным сообщением
- `DEBUG [rateLimit] rate limit plugin registered, max: 100, window: 1m`
- `WARN [rateLimit] rate limit exceeded, ip: <ip>`

---

## Phase 3: API Structure

### Task 7 ✅ — API роуты + улучшенный /health *(заблокирован: Task 4, 5, 6)*

**Файлы:**
- `backend/src/api/routes/index.ts` — корневой регистратор роутов
- `backend/src/api/routes/health.ts` — улучшенный health endpoint

**routes/index.ts:**
- Fastify plugin, регистрирует роуты под `/api` prefix
- Подключать healthRoute + заглушки для будущих auth/stats/rooms
- `DEBUG [routes] registering API routes`

**health.ts:**
- `GET /health` — проверяет БД через `$queryRaw\`SELECT 1\``
- Ответ: `{ status: 'ok' | 'degraded', db: 'connected' | 'disconnected', uptime, timestamp }`
- Если БД недоступна → 503 + `status: 'degraded'`
- `DEBUG [health] health check requested`
- `WARN [health] database unavailable during health check`

---

## Commit Plan

**Checkpoint 1** (после Tasks 1–3):
```
feat(backend): add config module, Prisma client singleton, Fastify app factory
```

**Checkpoint 2** (после Tasks 4–6):
```
feat(backend): register CORS, JWT, rate-limit plugins and global error handler
```

**Checkpoint 3** (после Task 7):
```
feat(backend): add API route structure and improved health endpoint with DB check
```

**Docs checkpoint** (после всех задач):
```
/aif-docs — обновить документацию: API структура, конфигурация, error codes
```

---

## Dependency Graph

```
Task 1 (config) ──────────┐
                           ├──► Task 3 (app factory) ──┬──► Task 4 (CORS+JWT) ──┐
Task 2 (db client) ────────┘                           ├──► Task 5 (errors)      ├──► Task 7 (routes)
                                                        └──► Task 6 (rate limit) ─┘
```
