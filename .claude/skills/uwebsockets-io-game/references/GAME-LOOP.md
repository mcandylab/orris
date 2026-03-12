# Server Game Loop

## Fixed Tick Rate (20 TPS)

```typescript
const TICK_RATE = 20;           // ticks per second
const TICK_MS = 1000 / TICK_RATE; // 50ms per tick

function startGameLoop(room: Room): void {
  let lastTick = Date.now();

  room.loop = setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTick) / 1000; // delta in seconds
    lastTick = now;

    tick(room, dt);
  }, TICK_MS);
}
```

## Tick Function

```typescript
function tick(room: Room, dt: number): void {
  // 1. Process all queued inputs
  for (const player of room.players.values()) {
    if (player.pendingInput) {
      applyInput(player, player.pendingInput, dt);
      player.pendingInput = null;
    }
  }

  // 2. Update bullets
  updateBullets(room, dt);

  // 3. Collision detection
  resolveBulletHits(room);
  resolvePlayerCollisions(room);

  // 4. Update XP / level / death
  processGameEvents(room);

  // 5. Broadcast state snapshot
  const snapshot = encodeSnapshot(room);
  app.publish(room.id, snapshot, true, false);
}
```

## Physics Step

```typescript
const SPEED = 200; // pixels per second
const FRICTION = 0.85;

function applyInput(player: Player, input: PlayerInput, dt: number): void {
  if (player.health <= 0) return;

  // Acceleration
  player.vx += input.dx * SPEED * dt;
  player.vy += input.dy * SPEED * dt;

  // Friction
  player.vx *= FRICTION;
  player.vy *= FRICTION;

  // Clamp to max speed
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > SPEED) {
    player.vx = (player.vx / speed) * SPEED;
    player.vy = (player.vy / speed) * SPEED;
  }

  // Move
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Map boundary clamp
  player.x = Math.max(0, Math.min(MAP_WIDTH, player.x));
  player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y));
}
```

## XP and Leveling

```typescript
const XP_PER_LEVEL = [0, 100, 250, 500, 900, 1500, 2500]; // XP thresholds per level

function awardXP(killer: Player, victim: Player): void {
  killer.score += victim.level * 10 + 50;
  killer.xp += victim.level * 10 + 50;

  const nextThreshold = XP_PER_LEVEL[killer.level + 1];
  if (nextThreshold !== undefined && killer.xp >= nextThreshold) {
    levelUp(killer);
  }
}

function levelUp(player: Player): void {
  player.level += 1;
  const choices = getEvolutionChoices(player.tankType, player.level);

  // Send LEVEL_UP message with evolution choices
  sendLevelUp(player.ws, player.level, choices);
  // Wait for player's CHOOSE_EVOLUTION response before continuing
  player.pendingEvolution = true;
}
```

## Bullet Physics

```typescript
function updateBullets(room: Room, dt: number): void {
  for (const [id, bullet] of room.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.lifetime -= dt;

    if (
      bullet.lifetime <= 0 ||
      bullet.x < 0 || bullet.x > MAP_WIDTH ||
      bullet.y < 0 || bullet.y > MAP_HEIGHT
    ) {
      room.bullets.delete(id);
    }
  }
}

function resolveBulletHits(room: Room): void {
  for (const [bulletId, bullet] of room.bullets) {
    for (const [playerId, player] of room.players) {
      if (player.id === bullet.ownerId) continue;
      if (player.health <= 0) continue;

      const dx = player.x - bullet.x;
      const dy = player.y - bullet.y;
      const dist = Math.hypot(dx, dy);

      if (dist < player.radius + bullet.radius) {
        player.health -= bullet.damage;
        room.bullets.delete(bulletId);

        if (player.health <= 0) {
          handlePlayerDeath(room, player, bullet.ownerId);
        }
        break;
      }
    }
  }
}
```

## Performance Notes

- Pre-allocate entity arrays; avoid mid-tick allocations
- Use object pooling for bullets (high spawn/despawn rate)
- Spatial hash grid for collision detection once player count > 20
- Profile with Node.js `--prof` if tick time exceeds 20ms
- uWS is single-threaded — keep tick synchronous, no async/await in hot path
