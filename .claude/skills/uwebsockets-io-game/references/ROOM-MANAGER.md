# Room Manager

## Room Data Structure

```typescript
interface Room {
  id: string;
  players: Map<string, Player>;    // playerId → Player
  maxPlayers: number;              // 80
  loop: NodeJS.Timeout | null;     // fixed-tick interval handle
  state: 'waiting' | 'running' | 'closing';
  createdAt: number;
}

const rooms = new Map<string, Room>();
```

## Auto-Scaling: Room Creation on Fill

```typescript
const MAX_PLAYERS_PER_ROOM = 80;

function getOrCreateRoom(): Room {
  // Find a room with space
  for (const room of rooms.values()) {
    if (room.players.size < MAX_PLAYERS_PER_ROOM && room.state === 'running') {
      return room;
    }
  }
  // All full — create a new room
  return createRoom();
}

function createRoom(): Room {
  const id = crypto.randomUUID();
  const room: Room = {
    id,
    players: new Map(),
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    loop: null,
    state: 'running',
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  startGameLoop(room);
  console.log(`Room ${id} created. Total rooms: ${rooms.size}`);
  return room;
}
```

## Player Join / Leave

```typescript
function joinRoom(ws: PlayerWs, name: string): void {
  const room = getOrCreateRoom();
  const player = createPlayer(ws, name, room.id);
  room.players.set(player.id, player);
  ws.subscribe(room.id);                  // uWS pub/sub topic = room id
  sendWelcome(ws, player, room);

  // If room just hit capacity, broadcast ROOM_FULL to late joiners
  if (room.players.size >= room.maxPlayers) {
    room.state = 'closing'; // stop accepting new players
  }
}

function leaveRoom(ws: PlayerWs): void {
  const player = ws.getUserData();
  const room = rooms.get(player.roomId);
  if (!room) return;

  room.players.delete(player.id);
  ws.unsubscribe(player.roomId);

  if (room.players.size === 0) {
    destroyRoom(room);
  } else if (room.state === 'closing') {
    // Allow new players again if someone left
    room.state = 'running';
  }
}
```

## Room Destruction

```typescript
function destroyRoom(room: Room): void {
  if (room.loop) {
    clearInterval(room.loop);
    room.loop = null;
  }
  rooms.delete(room.id);
  console.log(`Room ${room.id} destroyed. Total rooms: ${rooms.size}`);
}
```

## Room Metadata for Lobby API

```typescript
// Fastify REST endpoint for lobby
app.get('/rooms', async () => {
  return Array.from(rooms.values()).map(r => ({
    id: r.id,
    players: r.players.size,
    maxPlayers: r.maxPlayers,
    state: r.state,
  }));
});
```
