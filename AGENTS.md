# AGENTS.md

> Карта проекта для AI-агентов. Обновляй этот файл при значительных изменениях структуры.

## Обзор проекта

Orris — real-time multiplayer браузерная IO-игра в стиле diep.io/arras.io. Игроки управляют танками на общей карте, зарабатывают XP, повышают уровень и выбирают эволюцию танка. До 80 игроков в комнате, комнаты создаются автоматически.

## Стек

| Часть | Технология |
|-------|-----------|
| Язык | TypeScript (монорепо) |
| Frontend | Next.js + Pixi.js (WebGL рендеринг) |
| Backend HTTP | Fastify |
| Backend WebSocket | uWebSockets.js |
| База данных | PostgreSQL + Prisma ORM |
| Протокол | Бинарные WebSocket сообщения |

## Структура проекта

```
orris/
├── backend/                    # Fastify HTTP + uWebSockets.js игровой сервер
│   ├── src/
│   │   ├── index.ts            # Точка входа, запуск Fastify
│   │   ├── api/                # REST маршруты: auth, stats, leaderboard
│   │   ├── db/                 # Prisma client и хелперы
│   │   ├── game/               # Игровая логика: комнаты, танки, снаряды, физика
│   │   └── ws/                 # WebSocket обработчики и менеджер комнат
│   ├── prisma/
│   │   └── schema.prisma       # Схема БД (User, PlayerStats)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Next.js веб-клиент
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Страница лобби
│   │   └── globals.css
│   ├── components/             # UI компоненты (лобби, HUD, меню)
│   ├── game/                   # Pixi.js игровой canvas и рендеринг
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                     # Общие TypeScript типы
│   └── src/
│       └── index.ts            # ClientOp/ServerOp, PlayerState, TankType, XP_THRESHOLDS и т.д.
│
├── .ai-factory/
│   ├── DESCRIPTION.md          # Описание проекта и стека
│   ├── ROADMAP.md              # Стратегические milestones
│   ├── PLAN.md                 # Текущий активный план
│   └── ARCHITECTURE.md        # Архитектурные правила (создаётся /aif-architecture)
│
├── .env.example                # Пример переменных окружения
├── package.json                # Root workspace config (npm workspaces)
└── tsconfig.json               # Root tsconfig с project references
```

## Ключевые точки входа

| Файл | Назначение |
|------|-----------|
| `backend/src/index.ts` | Запуск Fastify HTTP сервера |
| `backend/src/ws/` | uWebSockets.js игровой сервер и комнаты |
| `backend/prisma/schema.prisma` | Схема базы данных |
| `frontend/app/page.tsx` | Лобби страница |
| `frontend/game/` | Pixi.js рендеринг игры |
| `shared/src/index.ts` | Все общие типы протокола и игры |

## Переменные окружения

Смотри `.env.example`. Ключевые:
- `DATABASE_URL` — строка подключения PostgreSQL
- `JWT_SECRET` — секрет для JWT токенов
- `PORT` — порт Fastify HTTP сервера (default: 3000)
- `LOG_LEVEL` — уровень логирования (debug/info/warn/error)

## AI Контекст

| Файл | Назначение |
|------|-----------|
| `AGENTS.md` | Этот файл — карта проекта |
| `.ai-factory/DESCRIPTION.md` | Спецификация проекта и стека |
| `.ai-factory/ROADMAP.md` | Стратегические milestones |
| `.ai-factory/ARCHITECTURE.md` | Архитектурные решения |

## Правила для агентов

- Не объединяй shell команды через `&&`, `||`, `;` — выполняй каждую как отдельный вызов
- Вся игровая логика и валидация — только на сервере, клиент отправляет только инпуты
- Типы протокола определяются в `shared/src/index.ts` и импортируются в оба пакета
- Backend — CommonJS (`module: commonjs`), Frontend — ESM через Next.js bundler
