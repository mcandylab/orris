import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Room, Logger } from '../engine/types';
import { getTankDefinition } from '../entities/Tank';

/** Radius used for bullet collision checks (pixels) */
const BULLET_RADIUS = 4;

/** Fired when a player is killed */
export interface KillEvent {
  killedId: number;
  killerId: number;
}

/**
 * Attempt to fire a bullet for a player.
 * Respects the tank's fireRate cooldown.
 * Direction comes from player.lastAimDx/lastAimDy so the aim
 * persists even when the player isn't moving.
 */
export function processShooting(
  room: Room,
  player: Player,
  now: number,
  logger: Logger,
): void {
  if (!player.alive || !player.pendingInput?.shoot) return;

  const def = getTankDefinition(player.tankType);
  const elapsed = now - player.lastShootTime;

  if (elapsed < def.fireRate) return;

  // Spawn bullet at player centre, aimed in lastAim direction
  const bulletId = room.nextBulletId++;
  const bullet = new Bullet(
    bulletId,
    player.id,
    player.x,
    player.y,
    player.lastAimDx * def.bulletSpeed,
    player.lastAimDy * def.bulletSpeed,
    def.bulletDamage,
    def.bulletLifetime,
  );
  room.bullets.set(bulletId, bullet);
  player.lastShootTime = now;

  logger.debug(
    {
      event: 'shoot',
      playerId: player.id,
      bulletId,
      x: player.x,
      y: player.y,
      vx: bullet.vx,
      vy: bullet.vy,
    },
    'DEBUG [CombatSystem] bullet spawned',
  );
}

/**
 * Advance all bullets and remove those that have expired or left the map.
 */
export function updateBullets(room: Room, dt: number): void {
  for (const [bulletId, bullet] of room.bullets) {
    if (!bullet.update(dt)) {
      room.bullets.delete(bulletId);
    }
  }
}

/**
 * Check every live bullet against every live player.
 * Applies damage and returns KillEvents for any players that die.
 * A bullet is removed on first hit.
 * Owners cannot be hit by their own bullets.
 */
export function resolveHits(room: Room, logger: Logger): KillEvent[] {
  const kills: KillEvent[] = [];

  for (const [bulletId, bullet] of room.bullets) {
    if (!bullet.alive) continue;

    for (const player of room.players.values()) {
      if (!player.alive) continue;
      if (player.id === bullet.ownerId) continue; // no self-damage

      const def = getTankDefinition(player.tankType);
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const distSq = dx * dx + dy * dy;
      const minDist = BULLET_RADIUS + def.radius;

      if (distSq > minDist * minDist) continue;

      // Hit — apply damage and consume bullet
      player.health -= bullet.damage;
      bullet.alive = false;
      room.bullets.delete(bulletId);

      if (player.health <= 0) {
        player.health = 0;
        player.alive = false;

        logger.warn(
          {
            event: 'player_killed',
            victimId: player.id,
            killerId: bullet.ownerId,
            finalHealth: 0,
          },
          'WARN [CombatSystem] player killed',
        );

        kills.push({ killedId: player.id, killerId: bullet.ownerId });
      }

      break; // bullet consumed — move to next bullet
    }
  }

  return kills;
}
