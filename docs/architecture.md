[← Getting Started](getting-started.md) · [Back to README](../README.md) · [WebSocket Protocol →](websocket-protocol.md)

# Architecture

Orris uses a **Modular Monolith** for the backend — single deployment with clear boundaries between four independent modules.

## Monorepo Structure

```
orris/
├── backend/          # Fastify HTTP + uWebSockets.js game server
│   └── src/
│       ├── config.ts             # Env vars (single source of truth)
│       ├── index.ts              # Composition root: createApp(), start()
│       ├── api/                  # HTTP layer (Fastify)
│       │   ├── errors.ts         # AppError hierarchy
│       │   ├── plugins/jwt.ts    # @fastify/jwt plugin + app.authenticate
│       │   └── routes/
│       │       ├── index.ts      # Route registration
│       │       └── auth.ts       # POST /api/auth/register, /api/auth/login
│       ├── db/                   # Database layer (Prisma)
│       │   ├── client.ts         # PrismaClient singleton, connectDB/disconnectDB
│       │   └── repositories/
│       │       ├── UserRepository.ts
│       │       └── StatsRepository.ts
│       ├── game/                 # ⚡ PURE CORE — zero external dependencies
│       │   ├── engine/
│       │   │   ├── types.ts      # Room, PlayerInput, Logger interfaces
│       │   │   ├── RoomManager.ts # Auto-scaling room lifecycle
│       │   │   └── GameLoop.ts   # Fixed-tick loop (20 TPS)
│       │   └── entities/
│       │       ├── Player.ts     # Player state + applyInput()
│       │       ├── Bullet.ts     # Bullet movement + expiry
│       │       └── Tank.ts       # getTankDefinition() for all 10 tank types
│       └── ws/                   # WebSocket layer (uWebSockets.js)
│           ├── GameServer.ts     # uWS App, listen, pub/sub
│           ├── GameContext.ts    # Shared context for handlers
│           ├── types.ts          # PlayerWsData
│           ├── handlers/         # onOpen, onMessage, onClose
│           └── protocol/         # Binary encoder/decoder
├── frontend/         # Next.js + Pixi.js web client
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React UI (lobby, HUD, menus)
│   └── game/         # Pixi.js canvas rendering
└── shared/           # Shared TypeScript types
    └── src/index.ts  # ClientOp, ServerOp, PlayerState, TankType, XP_THRESHOLDS
```

## Dependency Rules

```
game/    ──────────────────► nothing (pure core)
ws/      ──────────────────► game/ only
api/     ──────────────────► db/ only
db/      ──────────────────► Prisma Client
index.ts ─────────────────► ws/, api/, db/ (composition root)
all      ──────────────────► @orris/shared (types)
```

**Forbidden dependencies:**
- ❌ `game/` → Fastify / uWebSockets.js / Prisma
- ❌ `api/` → `game/` (HTTP does not call game engine directly)
- ❌ `ws/` → `api/` (WebSocket does not call HTTP layer)

## Key Patterns

### Server-Authoritative Model

Clients send **inputs only** (move direction, shoot intent). The server computes all game state and broadcasts delta snapshots.

```
Client ──(input)──► server ──(validated state)──► all clients in room
```

### Tank Firing Patterns

Each tank type has a `FiringPattern` that determines how bullets are spawned:

| Pattern | Tanks | Description |
|---------|-------|-------------|
| `SINGLE` | Basic, Sniper, Machine Gun, Assassin, Destroyer, Overseer | One centered bullet |
| `TWIN` | Twin | Two forward-facing bullets |
| `FLANK` | Flank Guard | Front + back bullets |
| `TRIPLE_SPREAD` | Triple Shot | Three bullets in a spread |
| `DOUBLE_ANGLED` | Hunter | Two angled bullets |

Implementation in `CombatSystem.processShooting()`:
1. Get `firingPattern` from `TankDefinition`
2. Call `calculateBulletAngles(pattern)` to get spawn parameters
3. Create multiple bullets based on the pattern

```typescript
// Example: Twin tank fires 2 bullets
const params = calculateBulletAngles(FiringPattern.TWIN);
// Returns: [{offsetX: -10}, {offsetX: 10}]
```

### Error Handling

All application errors extend `AppError`:

```typescript
// api/errors.ts
BadRequestError  → 400
UnauthorizedError → 401
ConflictError    → 409
NotFoundError    → 404
```

Fastify's `setErrorHandler` catches them and returns structured JSON:

```json
{ "error": "CONFLICT", "message": "Username already taken", "statusCode": 409 }
```

### Logging

Structured JSON logs via Fastify's built-in pino logger. Format:

```
INFO  [server]        — HTTP + WebSocket server lifecycle
DEBUG [config]        — config loading
DEBUG [db]            — database connections
DEBUG [db:users]      — UserRepository operations
DEBUG [db:stats]      — StatsRepository operations
DEBUG [auth]          — auth route operations
WARN  [auth]          — failed attempts, conflicts
INFO  [auth]          — successful register/login
WARN  [jwt]           — token verification failures
INFO  [GameServer]    — WebSocket server listen / close
INFO  [RoomManager]   — room created / destroyed
DEBUG [RoomManager]   — player add/remove
INFO  [GameLoop]      — loop start / stop
DEBUG [GameLoop]      — periodic tick summary (every 100 ticks)
DEBUG [onOpen]        — player connected
DEBUG [onMessage]     — client message received
DEBUG [onClose]       — player disconnected
WARN  [onMessage]     — unknown op or decode error
DEBUG [encoder]       — encode op type + size
DEBUG [decoder]       — decode op type + size
```

Log level is controlled by `LOG_LEVEL` env var (default: `info`). Set to `debug` for verbose DB logs.

### Testing

Tests use `vitest` + Fastify's `app.inject()`. Repositories and DB connection are mocked — no real PostgreSQL needed:

```typescript
vi.mock('../../db/repositories/UserRepository');
const app = await createApp();
const response = await app.inject({ method: 'POST', url: '/api/auth/register', ... });
```

## See Also

- [Getting Started](getting-started.md) — setup and first run
- [WebSocket Protocol](websocket-protocol.md) — binary protocol and GameServer details
- [API Reference](api.md) — endpoint contracts
- [Configuration](configuration.md) — env vars
