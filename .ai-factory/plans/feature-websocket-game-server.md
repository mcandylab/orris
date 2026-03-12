# WebSocket Game Server

**Branch:** `feature/websocket-game-server`
**Created:** 2026-03-12
**Milestone:** WebSocket Game Server

## Settings

- **Testing:** Yes — Vitest unit tests (RoomManager, protocol) + integration tests (WebSocket, /rooms route)
- **Logging:** Verbose — детальные DEBUG-логи: подключение/отключение, join/leave комнаты, tick события, broadcast
- **Docs:** Yes — обязательный checkpoint через /aif-docs по завершении

## Roadmap Linkage

**Milestone:** "WebSocket Game Server"
**Rationale:** Следующий незавершённый milestone в ROADMAP.md — WebSocket Game Server (uWebSockets.js, менеджер комнат, бинарный протокол, auto-scaling)

## Context

Текущее состояние проекта:
- ✅ Fastify HTTP сервер, JWT-аутентификация, Prisma + PostgreSQL — готово
- ✅ Все типы протокола определены в `shared/src/index.ts` (ClientOp, ServerOp, PlayerState, BulletState, RoomInfo, TankType, XP_THRESHOLDS)
- ✅ uWebSockets.js установлен в dependencies, но не используется
- ❌ `backend/src/ws/` — пустая директория (.gitkeep)
- ❌ `backend/src/game/` — пустая директория (.gitkeep)

## Architecture Constraints

- `game/` — **чистое ядро**: 0 зависимостей от Fastify/uWebSockets.js/Prisma
- Логирование в `game/` только через инжекцию logger-интерфейса (не pino напрямую)
- Никакого JSON в горячем пути WebSocket — только `Uint8Array`/`ArrayBuffer`
- Нет `async/await` в game tick — строго синхронный цикл
- Pub/sub по топику `room:${roomId}` через `app.publish()`

## Scope Note

Этот milestone реализует WebSocket-инфраструктуру с минимальным игровым движком (позиционирование игроков). Полная физика, снаряды, коллизии, XP и урон — следующий milestone **Core Game Engine**.

---

## Tasks

### Phase 1: Protocol & Entities (параллельно)

#### Task 1 — Бинарный протокол
**Files:**
- `backend/src/ws/protocol/encoder.ts` — сериализация ServerOp → Uint8Array
- `backend/src/ws/protocol/decoder.ts` — парсинг ClientOp из ArrayBuffer

**Formats:**
- JOIN: `[op:1][nameLen:1][name:N]`
- INPUT: `[op:1][dx:f32][dy:f32][shoot:1]`
- CHOOSE_EVOLUTION: `[op:1][tankType:1]`
- WELCOME: `[op:1][playerId:16 bytes UUID]`
- SNAPSHOT: `[op:1][tick:u32][playerCount:u16][[player:40b]...][bulletCount:u16][[bullet:52b]...]`
- PLAYER_JOINED/LEFT/DEATH/LEVEL_UP/ROOM_FULL

**Logging:** DEBUG при каждом decode/encode (op type, payload size)

---

#### Task 2 — Game Entities и типы
**Files:**
- `backend/src/game/engine/types.ts` — Room, PlayerInput интерфейсы
- `backend/src/game/entities/Player.ts` — класс Player с pendingInput, applyInput(), toState()
- `backend/src/game/entities/Bullet.ts` — класс Bullet с toState()
- `backend/src/game/entities/Tank.ts` — функция getTankDefinition()

**Constraints:** Только `@orris/shared` и внутренние импорты. Нет логов внутри entities.

---

### Phase 2: Game Engine (последовательно, зависит от Phase 1)

#### Task 3 — RoomManager *(blocked by Task 2)*
**File:** `backend/src/game/engine/RoomManager.ts`

**API:**
- `getOrCreateRoom(): Room`
- `addPlayer(room, player): void`
- `removePlayer(room, playerId): void`
- `getRoom(roomId): Room | undefined`
- `listRooms(): Room[]`

**Auto-scaling:** MAX_PLAYERS=80. Полная комната → новая. Пустая → удалить.
**Logging:** Инжекция Logger-интерфейса. INFO при создании/удалении комнат. DEBUG при addPlayer/removePlayer.

---

#### Task 4 — GameLoop *(blocked by Tasks 2, 3)*
**File:** `backend/src/game/engine/GameLoop.ts`

**API:**
- `start(room, onSnapshot): void` — setInterval(50ms) = 20 TPS
- `stop(): void`

**Tick логика (минимальная):**
- Применить pendingInput → обновить позицию (x += dx*speed*dt, y += dy*speed*dt)
- Зафиксировать в границах MAP_WIDTH/MAP_HEIGHT
- Вызвать onSnapshot(room) callback

**Constraints:** Нет async/await в горячем пути. Logging каждые 100 тиков.

---

### Phase 3: WebSocket Layer (зависит от Phase 2)

#### Task 5 — GameServer *(blocked by Tasks 1, 3, 4)*
**File:** `backend/src/ws/GameServer.ts`

**Функциональность:**
- `uWS.App().ws<PlayerWs>('/game', { open, message, close })`
- `listen(port, callback)`
- Pub/sub: `app.publish('room:${roomId}', snapshot, true)`
- Инициализирует RoomManager с pino logger
- GameLoop onSnapshot → encode → publish

**Config:** добавить `WS_PORT` в `backend/src/config.ts`

---

#### Task 6 — WebSocket Handlers *(blocked by Task 5)*
**Files:**
- `backend/src/ws/handlers/onOpen.ts` — создать Player, join room, WELCOME msg, start GameLoop
- `backend/src/ws/handlers/onMessage.ts` — decode → INPUT/JOIN/CHOOSE_EVOLUTION
- `backend/src/ws/handlers/onClose.ts` — remove player, PLAYER_LEFT broadcast

**Logging (verbose):**
- DEBUG `{ event: 'open', playerId, roomId, playerCount }`
- DEBUG `{ event: 'message', op, playerId }`
- DEBUG `{ event: 'close', playerId, roomId }`
- WARN при неизвестном op или decode error

---

### Phase 4: HTTP Integration & Composition Root

#### Task 7 — GET /rooms + index.ts *(blocked by Tasks 5, 6)*
**Files:**
- `backend/src/api/routes/rooms.ts` — `GET /api/rooms` → `{ rooms: RoomInfo[] }`
- `backend/src/api/routes/index.ts` — регистрация нового маршрута
- `backend/src/config.ts` — добавить `WS_PORT`
- `backend/src/index.ts` — запуск GameServer после Fastify + graceful shutdown

**Flow:** `connectDB() → createApp() → createGameServer() → httpListen() → wsListen()`

---

### Phase 5: Tests

#### Task 8 — Tests *(blocked by Task 7)*
**Files:**
- `backend/src/game/engine/RoomManager.test.ts` — unit tests (auto-scaling, lifecycle)
- `backend/src/ws/protocol/encoder.test.ts` — encode roundtrip
- `backend/src/ws/protocol/decoder.test.ts` — decode roundtrip + invalid data → null
- `backend/src/api/routes/rooms.test.ts` — GET /rooms via app.inject()

---

## Commit Plan

### Commit 1 (после Tasks 1–2)
```
feat(ws): add binary protocol encoder/decoder and game entities
```
- ws/protocol/encoder.ts, decoder.ts
- game/engine/types.ts, game/entities/*

### Commit 2 (после Tasks 3–4)
```
feat(game): implement RoomManager with auto-scaling and GameLoop (20 TPS)
```
- game/engine/RoomManager.ts
- game/engine/GameLoop.ts

### Commit 3 (после Tasks 5–6)
```
feat(ws): implement GameServer (uWebSockets.js) with room pub/sub and handlers
```
- ws/GameServer.ts
- ws/handlers/onOpen.ts, onMessage.ts, onClose.ts

### Commit 4 (после Tasks 7–8)
```
feat: integrate GameServer into composition root, add /rooms route and tests
```
- api/routes/rooms.ts + tests
- index.ts (GameServer integration)
- All test files

---

## Docs Checkpoint

По завершении всех задач обязательно запустить `/aif-docs` для обновления документации:
- README.md — добавить секцию WebSocket Game Server
- docs/ — описать бинарный протокол, RoomManager API, конфигурацию WS_PORT
