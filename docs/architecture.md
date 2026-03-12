[← Getting Started](getting-started.md) · [Back to README](../README.md) · [API Reference →](api.md)

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
│       │   ├── engine/           # RoomManager, GameLoop
│       │   ├── entities/         # Player, Tank, Bullet
│       │   └── systems/          # PhysicsSystem, CombatSystem, XpSystem
│       └── ws/                   # WebSocket layer (uWebSockets.js)
│           ├── GameServer.ts
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
game/   ──────────────────► nothing (pure core)
ws/     ──────────────────► game/ only
api/    ──────────────────► db/ only
db/     ──────────────────► Prisma Client
index.ts ─────────────────► api/, db/ (composition root)
all     ──────────────────► @orris/shared (types)
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
INFO  [backend]   — server lifecycle
DEBUG [db]        — database connections
DEBUG [db:users]  — UserRepository operations
DEBUG [db:stats]  — StatsRepository operations
DEBUG [auth]      — auth route operations
WARN  [auth]      — failed attempts, conflicts
INFO  [auth]      — successful register/login
WARN  [jwt]       — token verification failures
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
- [API Reference](api.md) — endpoint contracts
- [Configuration](configuration.md) — env vars
