# Architecture: Modular Monolith

## Overview

Orris использует **Modular Monolith** для бэкенда — единый деплой с чёткими границами между четырьмя независимыми модулями. Это оптимальный выбор для real-time IO-игры с небольшой командой: простота деплоя и операций, но без монолитного хаоса.

Ключевая особенность: **модуль `game/` — это чистое ядро без единой внешней зависимости**. Он не знает о Fastify, uWebSockets.js или Prisma. Это позволяет тестировать игровую логику изолированно и портировать её при необходимости.

## Decision Rationale

- **Тип проекта:** Real-time multiplayer IO-игра
- **Стек:** TypeScript, Fastify, uWebSockets.js, Prisma, PostgreSQL
- **Ключевой фактор:** Game engine должен быть фреймворк-независимым — это критично для тестируемости и корректности игровой логики
- **Команда:** Малая → простота > гибкость деплоя

## Folder Structure

```
backend/src/
├── game/                    # ⚡ ЧИСТОЕ ЯДРО — 0 внешних зависимостей
│   ├── engine/
│   │   ├── RoomManager.ts   # Создание/уничтожение комнат, auto-scaling
│   │   ├── GameLoop.ts      # Fixed-tick loop (20 TPS), tick orchestration
│   │   └── types.ts         # Внутренние типы движка
│   ├── entities/
│   │   ├── Player.ts        # Состояние игрока, HP, XP, уровень
│   │   ├── Tank.ts          # Характеристики танка по TankType
│   │   └── Bullet.ts        # Снаряд: позиция, скорость, урон
│   └── systems/
│       ├── PhysicsSystem.ts # Движение, friction, столкновения со стенами
│       ├── CombatSystem.ts  # Урон, смерть, пули
│       ├── XpSystem.ts      # Начисление XP, level-up, evolution
│       └── InputSystem.ts   # Применение инпутов, анти-чит валидация
│
├── ws/                      # WebSocket слой (uWebSockets.js)
│   ├── GameServer.ts        # uWS App, listen, pub/sub
│   ├── handlers/
│   │   ├── onOpen.ts        # Новое подключение → join room
│   │   ├── onMessage.ts     # Парсинг бинарных инпутов → передача в game/
│   │   └── onClose.ts       # Отключение → remove from room
│   └── protocol/
│       ├── encoder.ts       # Сериализация snapshot → Uint8Array
│       └── decoder.ts       # Парсинг клиентских сообщений
│
├── api/                     # HTTP слой (Fastify)
│   ├── routes/
│   │   ├── auth.ts          # POST /auth/register, POST /auth/login
│   │   ├── rooms.ts         # GET /rooms — список активных комнат
│   │   └── stats.ts         # GET /stats/:userId, GET /leaderboard
│   └── middleware/
│       ├── authenticate.ts  # JWT verifier плагин Fastify
│       └── rateLimit.ts     # Rate limiting плагин
│
├── db/                      # Database слой (Prisma)
│   ├── client.ts            # Singleton Prisma Client
│   └── repositories/
│       ├── UserRepository.ts
│       └── StatsRepository.ts
│
└── index.ts                 # Composition root — запуск Fastify + GameServer

frontend/
├── app/                     # Next.js App Router (лобби, UI)
├── components/              # React UI (формы, HUD, меню)
└── game/                    # Pixi.js рендеринг (canvas-только код)
    ├── GameCanvas.tsx       # React компонент с Pixi Application
    ├── Renderer.ts          # Отрисовка игрового состояния
    ├── Camera.ts            # Следование камеры за игроком
    └── InputManager.ts      # Клавиатура/мышь → бинарные инпуты → ws

shared/src/index.ts          # Общие типы: ClientOp, ServerOp, PlayerState, TankType, XP_THRESHOLDS
```

## Dependency Rules

### Backend

```
game/ ────────────────────────────────► ничего (чистое ядро)
ws/  ──────────────────────────────────► game/ (вызывает engine, передаёт инпуты)
api/ ──────────────────────────────────► db/ (запросы к БД)
db/  ──────────────────────────────────► Prisma Client
index.ts ─────────────────────────────► ws/, api/ (composition root)
```

- ✅ `ws/` → `game/` — WebSocket слой управляет game engine
- ✅ `api/` → `db/` — HTTP маршруты используют репозитории
- ✅ `ws/` → `db/` — запись статистики после смерти/конца игры
- ✅ все модули → `@orris/shared` — общие типы
- ❌ `game/` → любой другой модуль — game engine изолирован
- ❌ `game/` → Fastify/uWebSockets/Prisma — никаких фреймворков в ядре
- ❌ `api/` → `game/` — HTTP не вызывает game engine напрямую
- ❌ `ws/` → `api/` — WebSocket не вызывает HTTP-слой

### Frontend

- ✅ `app/` (Next.js pages) → `components/` — страницы используют компоненты
- ✅ `components/` → `game/` — React компонент оборачивает Pixi canvas
- ✅ `game/` → `@orris/shared` — типы протокола для WebSocket
- ❌ `game/` (Pixi код) → Next.js функции — canvas код не зависит от фреймворка
- ❌ `game/` → `app/` — нет обратных зависимостей

## Layer/Module Communication

### WebSocket → Game Engine

```
WebSocket message → decoder.ts → InputSystem.applyInput(player, input)
                                           ↓
                              GameLoop.tick() → PhysicsSystem + CombatSystem + XpSystem
                                           ↓
                              Encoder.encodeSnapshot(room) → ws publish
```

### HTTP API → DB

```
Fastify route → authenticate middleware → Repository method → Prisma → PostgreSQL
```

### Frontend WebSocket Client

```
InputManager (keyboard/mouse) → binaryEncode → WebSocket → server
WebSocket message → binaryDecode → Renderer.update(snapshot) → Pixi stage
```

## Key Principles

1. **Game engine — чистое ядро**: `game/` не импортирует ничего кроме `@orris/shared`. Вся ввод/вывод проходит через `ws/` слой.
2. **Server-authoritative**: Клиент отправляет только инпуты (dx, dy, shoot). Сервер вычисляет всё остальное.
3. **Детерминированный tick**: `GameLoop` вызывает системы в фиксированном порядке каждые 50ms. Нет `async/await` в горячем пути.
4. **Pub/sub по room id**: Все клиенты в одной комнате подписаны на топик = `room.id`. Бродкаст через `app.publish()`.
5. **Shared типы — единственная правда**: Все типы протокола, игровые константы и enums определяются в `shared/src/index.ts`.

## Code Examples

### Правильная структура game engine (нет зависимостей)

```typescript
// backend/src/game/engine/GameLoop.ts
// ✅ ПРАВИЛЬНО: только @orris/shared и внутренние типы
import { XP_THRESHOLDS, MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';
import { Room } from './types';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { CombatSystem } from '../systems/CombatSystem';

export function tick(room: Room, dt: number): void {
  for (const player of room.players.values()) {
    if (player.pendingInput) {
      PhysicsSystem.applyInput(player, player.pendingInput, dt);
      player.pendingInput = null;
    }
  }
  CombatSystem.updateBullets(room, dt);
  CombatSystem.resolveHits(room);
}

// ❌ НЕПРАВИЛЬНО: import uWS from 'uWebSockets.js' — нельзя в game/
```

### WebSocket слой вызывает game engine

```typescript
// backend/src/ws/handlers/onMessage.ts
import { decode } from '../protocol/decoder';
import { ClientOp } from '@orris/shared';
import { rooms } from '../../game/engine/RoomManager';

export function onMessage(ws: PlayerWs, raw: ArrayBuffer): void {
  const msg = decode(new Uint8Array(raw));
  if (!msg) return;

  const player = ws.getUserData();
  const room = rooms.get(player.roomId);
  if (!room) return;

  if (msg.op === ClientOp.INPUT) {
    player.pendingInput = msg.input; // game loop picks it up on next tick
  }
}
```

### Frontend: Pixi canvas без Next.js зависимостей

```typescript
// frontend/game/Renderer.ts
// ✅ Только Pixi.js и @orris/shared — нет импортов из next/
import { Application, Graphics } from 'pixi.js';
import type { PlayerState, BulletState } from '@orris/shared';

export class Renderer {
  private app: Application;

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application({ view: canvas, resizeTo: canvas });
  }

  update(players: PlayerState[], bullets: BulletState[]): void {
    // re-draw entities
  }
}
```

## Anti-Patterns

- ❌ **Импорт Fastify/uWS/Prisma в `game/`** — game engine должен быть портируемым
- ❌ **Async/await в game loop** — tick синхронный, uWS однопоточный
- ❌ **Валидация на фронтенде** — клиент рисует, сервер считает. Никогда не доверяй клиенту
- ❌ **JSON в горячем пути WebSocket** — только бинарный протокол (`Uint8Array`)
- ❌ **Глобальный мутабельный стейт** — состояние игры хранится в `Room` объектах, изолированных по room id
- ❌ **Direct Prisma вызовы в `ws/` handlers** — только через `db/repositories/`
- ❌ **Pixi.js код в Next.js pages** — весь canvas код в `frontend/game/`, страницы только монтируют компонент
