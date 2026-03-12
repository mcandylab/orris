# Orris

> Real-time multiplayer browser IO game — tank evolution in the style of diep.io and arras.io.

Orris is a server-authoritative multiplayer game where players control tanks, earn XP by destroying enemies, level up, and choose tank evolutions. Up to 80 players per room with automatic scaling.

## Quick Start

```bash
# Clone and install dependencies
git clone https://github.com/mcandylab/orris.git
cd orris
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# Run database migration
cd backend && npx prisma migrate deploy && cd ..

# Start backend (port 3000)
npm run dev:backend

# Start frontend (port 3001)
npm run dev:frontend
```

## Key Features

- **Real-time multiplayer** — up to 80 players per room, auto-scaling
- **Tank evolution system** — choose evolution paths on level-up (arras.io style)
- **Server-authoritative** — all game logic validated server-side, anti-cheat built-in
- **JWT authentication** — player accounts with persistent stats and leaderboards
- **Binary WebSocket protocol** — minimal latency for game state updates
- **Modular monolith** — clean separation: game engine, API, WebSocket, DB layers

## Example: Auth API

```bash
# Register a player
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "tanker42", "password": "securepass"}'

# Response: { "token": "...", "user": { "id": "...", "username": "tanker42" } }
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Prerequisites, installation, first run |
| [Architecture](docs/architecture.md) | Monorepo structure, module boundaries, patterns |
| [API Reference](docs/api.md) | Auth endpoints, JWT format, error responses |
| [Configuration](docs/configuration.md) | Environment variables, database setup |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + Pixi.js (WebGL) |
| Backend HTTP | Fastify + @fastify/jwt |
| Backend WebSocket | uWebSockets.js |
| Database | PostgreSQL + Prisma ORM |
| Auth | bcryptjs + JWT |
| Testing | Vitest |

## License

MIT
