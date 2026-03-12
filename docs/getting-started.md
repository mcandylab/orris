[Back to README](../README.md) · [Architecture →](architecture.md)

# Getting Started

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| npm | 10+ | Package manager (workspaces) |
| PostgreSQL | 14+ | Database |

## Installation

```bash
git clone https://github.com/mcandylab/orris.git
cd orris
npm install
```

`npm install` installs all workspaces (`backend`, `frontend`, `shared`) in one step.

## Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and set the required variables:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/orris?schema=public"
JWT_SECRET="your-secret-min-32-chars"
```

See [Configuration](configuration.md) for all available variables.

## Database Migration

```bash
cd backend
npx prisma migrate deploy
```

This creates the `users` and `player_stats` tables.

To open Prisma Studio (DB browser):

```bash
npx prisma studio
```

## Running the Project

```bash
# Backend (Fastify on port 3000)
npm run dev:backend

# Frontend (Next.js on port 3001, in a separate terminal)
npm run dev:frontend
```

## Verify It Works

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testplayer","password":"password123"}'
# → {"token":"...","user":{"id":"...","username":"testplayer","createdAt":"..."}}
```

## Running Tests

```bash
cd backend
npm test
# → 7 passed
```

## Build for Production

```bash
npm run build        # builds all workspaces
```

## See Also

- [Configuration](configuration.md) — all environment variables
- [API Reference](api.md) — auth endpoints
- [Architecture](architecture.md) — project structure
