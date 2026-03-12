# Core Game Engine

**Branch:** `feature/core-game-engine`
**Created:** 2026-03-13
**Milestone:** Core Game Engine

## Settings

- **Testing:** Yes — Vitest unit tests для всех 4 игровых систем
- **Logging:** Verbose — DEBUG при reject инпута, shoot, death; INFO при level-up
- **Docs:** Yes — обязательный checkpoint через /aif-docs по завершении

## Roadmap Linkage

**Milestone:** "Core Game Engine"
**Rationale:** Следующий незавершённый milestone в ROADMAP.md — фиксированный tick loop (20 TPS), физика движения, коллизии, границы карты, система снарядов

## Context

Текущее состояние проекта (что уже реализовано):
- ✅ Все shared типы: ClientOp, ServerOp, PlayerState, BulletState, TankType, XP_THRESHOLDS, EVOLUTION_LEVELS
- ✅ `game/entities/Player.ts` — класс со spawn, applyInput() (физика встроена), toState()
- ✅ `game/entities/Bullet.ts` — класс с update() (lifetime, bounds check), toState()
- ✅ `game/entities/Tank.ts` — getTankDefinition(), все 10 TankDefinition записей
- ✅ `game/engine/types.ts` — Room, PlayerInput, Logger интерфейсы
- ✅ `game/engine/GameLoop.ts` — 20 TPS tick, вызывает player.applyInput() и bullet.update()
- ✅ `game/engine/RoomManager.ts` — auto-scaling, lifecycle комнат
- ✅ `ws/protocol/encoder.ts` — encodeDeath(), encodeLevelUp() уже реализованы
- ✅ `ws/handlers/onMessage.ts` — SPAWN и CHOOSE_EVOLUTION помечены TODO
- ❌ `game/systems/` — директория отсутствует, все 4 системы нужно создать
- ❌ GameLoop не интегрирует системы (нет CombatSystem, XpSystem)
- ❌ ws-слой не отправляет DEATH/LEVEL_UP события

## Architecture Constraints

- `game/` — **чистое ядро**: 0 зависимостей от Fastify/uWebSockets.js/Prisma
- Нет async/await в game tick — строго синхронный путь
- Logging в `game/` только через инжекцию Logger-интерфейса
- Shoot direction = последнее направление движения (lastAimDx/lastAimDy) — протокол не меняем
- Bullet-player collision: circle overlap (distance < bulletRadius(4) + tank.radius)

---

## Tasks

### Phase 1 — Game Systems (параллельные, Tasks 1–4)

#### Task 1 — InputSystem *(нет зависимостей)*
**File:** `backend/src/game/systems/InputSystem.ts`

- `validateAndClampInput(input): PlayerInput | null` — clamp dx/dy в [-1..1], reject NaN/Infinity
- `applyValidatedInput(player, input): void` — сохранить в player.pendingInput
- **Logging:** DEBUG при reject: `{ playerId, reason, rawDx, rawDy }`

---

#### Task 2 — PhysicsSystem *(нет зависимостей)*
**File:** `backend/src/game/systems/PhysicsSystem.ts`

- `applyMovement(player, input, dt): void`
  - Нормализация вектора, скорость из TankDefinition, обновление vx/vy/x/y
  - Clamp к MAP bounds с учётом tank.radius
  - Сохранить lastAimDx/lastAimDy если len > 0
- **Logging:** нет (горячий путь)

---

#### Task 3 — CombatSystem *(нет зависимостей)*
**File:** `backend/src/game/systems/CombatSystem.ts`

- `processShooting(room, player, dt): void` — создать Bullet если cooldown прошёл
- `updateBullets(room, dt): void` — удалить expired/out-of-bounds пули
- `resolveHits(room): KillEvent[]` — circle collision, урон, death, возврат KillEvent[]
- **Logging:** DEBUG при shoot; WARN при смерти игрока

---

#### Task 4 — XpSystem *(нет зависимостей)*
**File:** `backend/src/game/systems/XpSystem.ts`

- `awardKillXp(killer, victim): number` — score убийцы += xp
- `checkLevelUp(player): LevelUpEvent | null` — проверка XP_THRESHOLDS, рекурсивно
- `LevelUpEvent { playerId, newLevel, evolutionChoices: TankType[] }`
- **Logging:** INFO при level-up: `{ event: 'level_up', playerId, newLevel, xp }`

---

### Phase 2 — Entity & Engine Update (Tasks 5–6, blocked by Phase 1)

#### Task 5 — Обновить Player *(blocked by Tasks 2, 3, 4)*
**File:** `backend/src/game/entities/Player.ts`

- Добавить поля: `lastShootTime: number = 0`, `lastAimDx: number = 1`, `lastAimDy: number = 0`
- Убрать физику из `applyInput()` — PhysicsSystem теперь отвечает за движение
- Метод можно удалить (GameLoop переключится на PhysicsSystem в Task 6)

---

#### Task 6 — Обновить GameLoop *(blocked by Tasks 1, 2, 3, 4, 5)*
**File:** `backend/src/game/engine/GameLoop.ts`

Добавить callbacks в конструктор:
```typescript
interface GameLoopCallbacks {
  onPlayerDied?: (victimId: number, killerId: number) => void;
  onPlayerLevelUp?: (playerId: number, level: number, choices: TankType[]) => void;
}
```

Порядок в tick():
1. InputSystem.validateAndClampInput + applyValidatedInput
2. PhysicsSystem.applyMovement (живые игроки с pendingInput)
3. CombatSystem.processShooting
4. CombatSystem.updateBullets
5. CombatSystem.resolveHits → KillEvent[]
6. XpSystem.awardKillXp + checkLevelUp → вызвать callbacks
7. Snapshot только живых игроков

---

### Phase 3 — WebSocket Integration (Task 7, blocked by Task 6)

#### Task 7 — Обновить ws-слой *(blocked by Task 6)*
**Files:**
- `backend/src/ws/GameContext.ts` — добавить `connections: Map<number, WebSocket<PlayerWsData>>`
- `backend/src/ws/handlers/onOpen.ts` — передать callbacks в GameLoop, добавить в connections
- `backend/src/ws/handlers/onClose.ts` — удалить из connections
- `backend/src/ws/handlers/onMessage.ts` — реализовать SPAWN (респавн) и CHOOSE_EVOLUTION (выбор танка)

SPAWN: player.alive = false → alive = true, health = maxHealth, случайная позиция
CHOOSE_EVOLUTION: валидировать evolvesTo → player.tankType = newType, обновить maxHealth

---

### Phase 4 — Tests (Task 8, blocked by Tasks 1–4)

#### Task 8 — Unit тесты *(blocked by Tasks 1, 2, 3, 4)*
**Files:**
- `backend/src/game/systems/InputSystem.test.ts`
- `backend/src/game/systems/PhysicsSystem.test.ts`
- `backend/src/game/systems/CombatSystem.test.ts`
- `backend/src/game/systems/XpSystem.test.ts`

---

## Commit Plan

### Commit 1 (после Tasks 1–4)
```
feat(game): add InputSystem, PhysicsSystem, CombatSystem, XpSystem
```
- game/systems/InputSystem.ts
- game/systems/PhysicsSystem.ts
- game/systems/CombatSystem.ts
- game/systems/XpSystem.ts

### Commit 2 (после Tasks 5–6)
```
feat(game): integrate game systems into GameLoop, update Player entity
```
- game/entities/Player.ts
- game/engine/GameLoop.ts

### Commit 3 (после Task 7)
```
feat(ws): handle SPAWN/CHOOSE_EVOLUTION, broadcast DEATH/LEVEL_UP events
```
- ws/GameContext.ts
- ws/handlers/onOpen.ts, onClose.ts, onMessage.ts

### Commit 4 (после Task 8)
```
test(game): add unit tests for game engine systems
```
- game/systems/*.test.ts

---

## Docs Checkpoint

По завершении всех задач обязательно запустить `/aif-docs`:
- README.md — обновить статус milestone Core Game Engine
- docs/ — описать игровые системы, архитектуру, callback-модель GameLoop
