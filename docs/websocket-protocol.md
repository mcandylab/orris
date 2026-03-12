[← Architecture](architecture.md) · [Back to README](../README.md) · [API Reference →](api.md)

# WebSocket Protocol

The game uses a **binary WebSocket protocol** for real-time state synchronization. The server runs on a separate port (`WS_PORT`, default: 3002) using uWebSockets.js.

## Connecting

```javascript
const ws = new WebSocket('ws://localhost:3002/game');
ws.binaryType = 'arraybuffer';
```

After connection, the server immediately sends a `WELCOME` message with the player's ID. The client must then send a `JOIN` message with the player's display name.

---

## Message Formats

All messages are binary (`ArrayBuffer`). The first byte is always the **op-code**.

### Client → Server

| Op | Code | Format | Description |
|----|------|--------|-------------|
| `JOIN` | `0x01` | `[op:1][nameLen:1][name:N]` | Join with a display name |
| `INPUT` | `0x02` | `[op:1][dx:f32][dy:f32][shoot:1]` | Movement + shoot intent |
| `SPAWN` | `0x03` | `[op:1]` | Respawn after death |
| `CHOOSE_EVOLUTION` | `0x04` | `[op:1][tankType:1]` | Pick a tank evolution |

**INPUT fields:**
- `dx`, `dy` — normalized direction vector (-1..1), encoded as little-endian `float32`
- `shoot` — `0x01` = shooting, `0x00` = not shooting

### Server → Client

| Op | Code | Format | Description |
|----|------|--------|-------------|
| `WELCOME` | `0x01` | `[op:1][id:16 bytes]` | Your player ID |
| `SNAPSHOT` | `0x02` | see below | Full room state |
| `DEATH` | `0x03` | `[op:1][killedById:1]` | You died |
| `LEVEL_UP` | `0x04` | `[op:1][playerId:1][level:1][count:1][tankTypes...]` | Level up + evolution choices |
| `ROOM_FULL` | `0x05` | `[op:1]` | Room is full |
| `PLAYER_JOINED` | `0x06` | `[op:1][playerId:1][nameLen:1][name:N]` | Another player joined |
| `PLAYER_LEFT` | `0x07` | `[op:1][playerId:1]` | Another player left |

---

## SNAPSHOT Format

Sent at 20 TPS (every 50ms) to all players in a room. Contains full room state.

```
[op:1][tick:u32][playerCount:u16]
  [[player:44 bytes] × playerCount]
[bulletCount:u16]
  [[bullet:20 bytes] × bulletCount]
```

### Player entry (44 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 1 | `id` | u8 |
| 1 | 1 | `tankType` | u8 |
| 2 | 1 | `level` | u8 |
| 3 | 1 | _(pad)_ | — |
| 4 | 4 | `x` | f32 LE |
| 8 | 4 | `y` | f32 LE |
| 12 | 4 | `vx` | f32 LE |
| 16 | 4 | `vy` | f32 LE |
| 20 | 4 | `health` | f32 LE |
| 24 | 4 | `maxHealth` | f32 LE |
| 28 | 4 | `score` | u32 LE |
| 32 | 12 | `name` | ASCII, null-padded |

### Bullet entry (20 bytes)

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 2 | `id` | u16 LE |
| 2 | 1 | `ownerId` | u8 |
| 3 | 1 | _(reserved)_ | — |
| 4 | 4 | `x` | f32 LE |
| 8 | 4 | `y` | f32 LE |
| 12 | 4 | `vx` | f32 LE |
| 16 | 4 | `vy` | f32 LE |

---

## Room Management

### Auto-scaling

- Maximum **80 players** per room (`MAX_PLAYERS`)
- When a room reaches capacity → new room created automatically
- Empty rooms are destroyed automatically

### Room Lifecycle

```
connect → onOpen → join room → subscribe to room:${roomId} → start GameLoop
message → onMessage → dispatch (INPUT → player.pendingInput)
disconnect → onClose → PLAYER_LEFT broadcast → removePlayer → stop GameLoop if empty
```

### RoomManager API

| Method | Description |
|--------|-------------|
| `getOrCreateRoom()` | Returns available room or creates new one |
| `addPlayer(room, player)` | Adds player, sets room state to `running` |
| `removePlayer(room, playerId)` | Removes player, destroys room if empty |
| `getRoom(roomId)` | Lookup by ID |
| `listRooms()` | All active rooms |
| `listRoomInfos()` | Array of `RoomInfo` DTOs (for HTTP API) |

---

## Game Loop

- Tick rate: **20 TPS** (50ms interval)
- Server-authoritative: clients send inputs only, server computes all positions
- Map bounds: `4000 × 4000` pixels (`MAP_WIDTH`, `MAP_HEIGHT` from `@orris/shared`)

**Per-tick logic:**
1. Apply `player.pendingInput` → update position (`x += vx * dt`, clamped to map)
2. Update bullets (move + expire out-of-bounds)
3. Broadcast `SNAPSHOT` to all room subscribers via `app.publish('room:${roomId}', ...)`

---

## Tank Types

| Type | Code | Tier | Speed | Max HP |
|------|------|------|-------|--------|
| Basic | 0 | 1 | 200 | 100 |
| Twin | 1 | 2 | 190 | 110 |
| Sniper | 2 | 2 | 180 | 90 |
| Machine Gun | 3 | 2 | 195 | 100 |
| Flank Guard | 4 | 2 | 200 | 110 |
| Triple Shot | 5 | 3 | 185 | 120 |
| Assassin | 6 | 3 | 220 | 80 |
| Hunter | 7 | 3 | 185 | 95 |
| Destroyer | 8 | 3 | 160 | 130 |
| Overseer | 9 | 3 | 175 | 120 |

---

## Map Constants

```typescript
import { MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';
// MAP_WIDTH  = 4000
// MAP_HEIGHT = 4000
```

## See Also

- [Architecture](architecture.md) — module boundaries and dependency rules
- [API Reference](api.md) — GET /api/rooms and auth endpoints
- [Configuration](configuration.md) — WS_PORT setup
