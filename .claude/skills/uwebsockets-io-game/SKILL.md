---
name: uwebsockets-io-game
description: >-
  Expert guide for building a server-authoritative browser IO game server using uWebSockets.js
  and TypeScript. Use when implementing: WebSocket game rooms, fixed-rate game loop, binary
  protocol for state broadcasting, player input validation, anti-cheat measures, room lifecycle
  (create/fill/destroy), delta snapshot broadcasting. Triggers: uWebSockets, game server,
  game loop, game room, server tick, binary protocol, IO game, arras.io, diep.io style.
license: MIT
metadata:
  author: orris-project
  version: "1.0.0"
  category: game-server
---

# uWebSockets.js IO Game Server

Expert guide for building a production-grade server-authoritative IO game server.

## Core Principles

1. **Server-authoritative**: ALL game state lives on the server. Clients send inputs only.
2. **Fixed tick rate**: Game loop runs at a fixed rate (20 TPS = 50ms/tick recommended).
3. **Binary protocol**: Use `ArrayBuffer` / `Uint8Array` for all game messages — never JSON for hot path.
4. **Validate everything**: Reject impossible inputs. Dead players can't shoot. Speed limits enforce physics.
5. **Room isolation**: Each room is an independent loop instance with its own state.

## uWebSockets.js Setup (TypeScript)

```typescript
import uWS from 'uWebSockets.js';

const app = uWS.App();

app.ws<PlayerData>('/game', {
  compression: uWS.DISABLED,      // game data already binary, no benefit
  maxPayloadLength: 64,            // limit client message size (anti-flood)
  idleTimeout: 30,                 // kick idle connections after 30s

  open(ws) {
    // Assign room, initialize player
  },
  message(ws, message, isBinary) {
    if (!isBinary) { ws.close(); return; } // reject non-binary
    handleInput(ws, new Uint8Array(message));
  },
  close(ws, code, message) {
    // Remove from room
  }
});

app.listen(3001, (token) => {
  if (token) console.log('Game server on :3001');
});
```

## Reference Files

Load detailed guidance based on task:

| Topic | File | When to Load |
|-------|------|--------------|
| Room lifecycle | `references/ROOM-MANAGER.md` | Creating/destroying rooms, auto-scaling |
| Binary protocol | `references/BINARY-PROTOCOL.md` | Designing message format, encoding/decoding |
| Game loop | `references/GAME-LOOP.md` | Fixed tick loop, delta broadcast, physics step |

## Input Message Types (Client → Server)

Define an enum for incoming message op-codes:

```typescript
export const enum ClientOp {
  JOIN   = 0x01,   // join room with player name
  INPUT  = 0x02,   // movement + shoot intent
  SPAWN  = 0x03,   // respawn after death
}
```

Input message layout (INPUT, 5 bytes):
```
[op:u8][dx:i8][dy:i8][shoot:u8][flags:u8]
```
- `dx`, `dy`: normalized direction (-127..127)
- `shoot`: 0 or 1
- `flags`: reserved for future use

## Server Message Types (Server → Client)

```typescript
export const enum ServerOp {
  WELCOME    = 0x01,   // player id + room metadata
  SNAPSHOT   = 0x02,   // full or delta state snapshot
  DEATH      = 0x03,   // player died
  LEVEL_UP   = 0x04,   // player leveled up, evolution choices
  ROOM_FULL  = 0x05,   // redirect to new room
}
```

## Anti-Cheat Validation

Always validate inputs on the server before applying to game state:

```typescript
function validateInput(player: Player, input: PlayerInput): boolean {
  // Dead players can't move or shoot
  if (player.health <= 0) return false;

  // Normalize direction vector — reject if magnitude too large
  const mag = Math.hypot(input.dx, input.dy);
  if (mag > 1.01) return false; // allow tiny float error

  // Rate-limit shooting
  const now = Date.now();
  if (input.shoot && now - player.lastShot < player.tank.fireRate) {
    input.shoot = false; // silently ignore, don't kick
  }

  return true;
}
```

## Constraints

- **Never** trust client-reported position, health, score, or level
- **Never** send game state directly from the client — always recompute on server
- **Always** validate array bounds before reading binary messages to avoid crashes
- **Always** clean up room resources (clearInterval, remove from map) when room empties
- Use `uWS.getParts()` for multipart data; avoid `JSON.parse` in the hot game loop path
- Keep message processing synchronous — uWS runs in a single thread
