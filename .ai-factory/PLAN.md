# Plan: Monorepo Setup

**Mode:** Fast
**Created:** 2026-03-12
**Feature:** TypeScript монорепо с `backend/`, `frontend/`, `shared/` пакетами

## Settings

- **Testing:** no
- **Logging:** standard (INFO, ERROR в точках запуска)
- **Docs:** no (warn-only)

## Roadmap Linkage

- **Milestone:** "Monorepo Setup"
- **Rationale:** Этот план реализует первый milestone — настройку структуры монорепо, без которой невозможны все последующие milestones.

## Overview

Превратить существующий пустой TypeScript-проект в монорепо с тремя пакетами:

| Пакет | Назначение | Стек |
|-------|------------|------|
| `shared/` | Общие TypeScript-типы (протокол, игровые типы, API) | TypeScript |
| `backend/` | HTTP API + WebSocket игровой сервер | Fastify, uWebSockets.js, Prisma |
| `frontend/` | Веб-клиент с игровым canvas | Next.js, Pixi.js |

Монорепо использует **npm workspaces**. Каждый пакет — независимый TypeScript-проект с composite mode (кроме frontend — Next.js несовместим).

## Tasks

### Phase 1: Root Configuration

**Task 1** ✅ — Обновить корневую конфигурацию workspace
- `package.json`: `"workspaces": ["backend", "frontend", "shared"]`, root-скрипты, убрать `"main"`
- `tsconfig.json`: project references к backend/, frontend/, shared/; убрать `"include": ["src"]`
- Удалить `src/` boilerplate

### Phase 2: Packages (can run after Task 1)

**Task 2** ✅ — Создать пакет `shared/` *(блокирован Task 1)*
- `shared/package.json`, `shared/tsconfig.json` (composite: true)
- `shared/src/index.ts`: ClientOp/ServerOp enums, PlayerState/BulletState/RoomInfo types, API request/response types

**Task 3** ✅ — Создать скелет `backend/` *(блокирован Task 2)*
- `backend/package.json`: fastify, uWebSockets.js, @prisma/client, @orris/shared
- `backend/tsconfig.json`: composite, references shared
- `backend/src/index.ts`: Fastify app, порт 3000, логи startup
- Структура папок: `src/game/`, `src/api/`, `src/ws/`, `src/db/`
- `backend/prisma/schema.prisma`: datasource PostgreSQL + generator

**Task 4** ✅ — Создать скелет `frontend/` *(блокирован Task 2)*
- `frontend/package.json`: next, react, react-dom, pixi.js, @orris/shared
- `frontend/tsconfig.json`: без composite, transpilePackages для shared
- `frontend/next.config.js`
- `frontend/app/page.tsx` (лобби placeholder), `frontend/app/layout.tsx`
- Структура: `components/`, `game/`

### Phase 3: Verification

**Task 5** ✅ — Добавить root-скрипты и проверить workspace *(блокирован Task 3, Task 4)*
- `npm install` — проверить резолюцию воркспейсов
- `.gitignore`: `**/dist/`, `**/node_modules/`, `.env*`
- `.env.example`: DATABASE_URL, JWT_SECRET, PORT
- `AGENTS.md`: карта монорепо для AI-агентов

## Commit Plan

```
После Task 1+2:   chore: initialize npm workspaces monorepo with shared package
После Task 3+4:   chore: add backend and frontend package skeletons
После Task 5:     chore: add root scripts, env config and AGENTS.md
```

## Dependency Graph

```
Task 1 (root config)
    └── Task 2 (shared/)
            ├── Task 3 (backend/)
            │       └── Task 5 (verify)
            └── Task 4 (frontend/)
                    └── Task 5 (verify)
```
