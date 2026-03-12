# Project: Orris

## Overview
Orris is a real-time multiplayer browser-based IO game inspired by diep.io and arras.io. Players control tanks on a shared map, earn XP by destroying enemies, level up to unlock tank evolutions, and compete with up to 80 players per room. When a room fills up, a new one is automatically created. All game logic and validation is server-authoritative to prevent cheating.

## Core Features
- Real-time multiplayer with up to 80 players per room
- Auto-scaling rooms — new room created when current one fills up
- Multiple tank types, each with unique projectiles and stats
- XP and leveling system — gain XP to level up
- Tank evolution system — on level-up, choose a new tank evolution path (like arras.io)
- Server-side validation for all game state (anti-cheat)
- Map with boundaries and obstacles
- Player accounts with persistent stats and leaderboards

## Tech Stack
- **Language:** TypeScript (monorepo: `backend/` and `frontend/`)
- **Frontend:** Next.js + Pixi.js (WebGL rendering for game canvas)
- **Backend HTTP:** Fastify (REST API, auth, room management)
- **Backend WebSocket:** uWebSockets.js (ultra-fast real-time game communication)
- **Database:** PostgreSQL + Prisma ORM
- **Real-time Protocol:** Binary WebSocket messages (efficient for game loop)

## Project Structure
```
orris/
├── backend/          # Fastify HTTP + uWebSockets.js game server
│   ├── src/
│   │   ├── game/     # Game logic: rooms, tanks, bullets, physics
│   │   ├── api/      # REST routes: auth, stats, leaderboard
│   │   ├── ws/       # WebSocket handlers and room manager
│   │   └── db/       # Prisma client and migrations
│   └── prisma/
├── frontend/         # Next.js app
│   ├── app/          # Next.js App Router pages
│   ├── components/   # UI components (lobby, HUD, menus)
│   └── game/         # Pixi.js game canvas and rendering
└── shared/           # Shared TypeScript types (protocol, tank definitions)
```

## Architecture Notes
- **Server-authoritative model**: game state lives exclusively on the server; clients send inputs only (move direction, shoot intent), server computes and broadcasts state
- **Game loop**: server runs at fixed tick rate (e.g., 20 TPS), broadcasts delta snapshots to all clients in a room
- **Room isolation**: each room is an independent game loop instance, rooms are garbage-collected when empty
- **Binary protocol**: use `ArrayBuffer` / typed arrays for WebSocket messages to minimize latency
- **Anti-cheat**: server validates all inputs, ignores impossible deltas (speed hacks, teleports)

## Architecture
See `.ai-factory/ARCHITECTURE.md` for detailed architecture guidelines.
Pattern: Modular Monolith (backend) — game engine isolated as pure core, ws/api/db as separate modules.

## Non-Functional Requirements
- Logging: structured JSON logs via Fastify's built-in pino logger
- Error handling: structured error responses with HTTP status codes
- Security: server-side validation of all game actions, rate limiting on API endpoints
- Performance: target 20 TPS server tick rate, < 100ms round-trip latency for game messages
- Scalability: horizontal scaling via multiple game server instances with a lobby coordinator
