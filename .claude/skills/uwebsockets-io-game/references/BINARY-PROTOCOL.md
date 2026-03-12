# Binary Protocol Design

## Why Binary Over JSON

For a game loop at 20 TPS with 80 players, a JSON snapshot could be 10-50KB per tick.
Binary format reduces this to 1-3KB — critical for latency and bandwidth.

## Message Framing

Every message starts with a 1-byte op-code:

```
[op: u8][payload...]
```

## Snapshot Format (Server → All clients in room)

Full snapshot sent to new joiners or on reconnect:
```
[op:u8=0x02][type:u8=0x01][playerCount:u8][...players][bulletCount:u16][...bullets]

Per player (32 bytes):
  [id:u8][x:f32][y:f32][vx:f32][vy:f32][health:u8][maxHealth:u8][score:u32][level:u8][tankType:u8][flags:u8][pad:u8]

Per bullet (16 bytes):
  [id:u16][ownerId:u8][x:f32][y:f32][vx:f32][vy:f32][pad:u8]
```

Delta snapshot (sent every tick to existing clients):
```
[op:u8=0x02][type:u8=0x02][timestamp:u32][deltaCount:u8][...deltas]

Per delta (variable):
  [entityId:u8][changedFlags:u8][...changed fields only]
```

## Encoding Helpers (TypeScript)

```typescript
// Pre-allocated buffer pool to avoid GC pressure
const BUFFER_SIZE = 8192;
const sharedBuffer = new ArrayBuffer(BUFFER_SIZE);
const view = new DataView(sharedBuffer);

function encodeSnapshot(room: Room): Uint8Array {
  let offset = 0;
  view.setUint8(offset++, ServerOp.SNAPSHOT);
  view.setUint8(offset++, 0x01); // full snapshot

  const players = Array.from(room.players.values());
  view.setUint8(offset++, players.length);

  for (const p of players) {
    view.setUint8(offset++, p.numericId);
    view.setFloat32(offset, p.x, true); offset += 4;
    view.setFloat32(offset, p.y, true); offset += 4;
    view.setFloat32(offset, p.vx, true); offset += 4;
    view.setFloat32(offset, p.vy, true); offset += 4;
    view.setUint8(offset++, p.health);
    view.setUint8(offset++, p.maxHealth);
    view.setUint32(offset, p.score, true); offset += 4;
    view.setUint8(offset++, p.level);
    view.setUint8(offset++, p.tankType);
    view.setUint8(offset++, 0); // flags
    view.setUint8(offset++, 0); // padding
  }

  return new Uint8Array(sharedBuffer, 0, offset);
}
```

## Decoding Client Input (TypeScript)

```typescript
function decodeInput(data: Uint8Array): PlayerInput | null {
  if (data.length < 5) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const op = view.getUint8(0);

  if (op !== ClientOp.INPUT) return null;

  return {
    dx: view.getInt8(1) / 127,   // normalize to -1..1
    dy: view.getInt8(2) / 127,
    shoot: view.getUint8(3) === 1,
    flags: view.getUint8(4),
  };
}
```

## uWS Publishing (Broadcast to Room)

```typescript
// Broadcast to all players in a room using uWS pub/sub
function broadcastSnapshot(app: uWS.TemplatedApp, room: Room, data: Uint8Array): void {
  app.publish(
    room.id,              // topic = room id (all players subscribed)
    data,
    true,                 // isBinary = true
    false                 // compress = false (already binary)
  );
}
```

## LEVEL_UP Message

When a player levels up, send available evolution choices:

```
[op:u8=0x04][newLevel:u8][choiceCount:u8][...choices]

Per choice (2 bytes):
  [tankTypeId:u8][flags:u8]
```

Client receives this, shows UI with N choices. Player picks one, sends:
```
[op:u8=0x06][chosenTankTypeId:u8]
```
Server validates and applies the evolution.
