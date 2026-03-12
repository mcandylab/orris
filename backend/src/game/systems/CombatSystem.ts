import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Room, Logger } from '../engine/types';
import { getTankDefinition } from '../entities/Tank';
import { FiringPattern } from '@orris/shared';

/** Radius used for bullet collision checks (pixels) */
const BULLET_RADIUS = 4;

/** Parameters for spawning a single bullet */
export interface BulletSpawnParams {
  relativeDx: number;  // direction offset from aim (-1 to 1)
  relativeDy: number;  // direction offset from aim (-1 to 1)
  offsetX: number;     // spawn position offset X
  offsetY: number;     // spawn position offset Y
}

/** Fired when a player is killed */
export interface KillEvent {
  killedId: number;
  killerId: number;
}

/**
 * Calculate bullet spawn parameters based on firing pattern.
 * Returns array of spawn params for each bullet to fire.
 */
export function calculateBulletAngles(pattern: FiringPattern): BulletSpawnParams[] {
  switch (pattern) {
    case FiringPattern.SINGLE:
      return [{ relativeDx: 0, relativeDy: 0, offsetX: 0, offsetY: 0 }];

    case FiringPattern.TWIN:
      return [
        { relativeDx: -0.1, relativeDy: 0, offsetX: -10, offsetY: 0 },
        { relativeDx: 0.1, relativeDy: 0, offsetX: 10, offsetY: 0 },
      ];

    case FiringPattern.FLANK:
      return [
        { relativeDx: 0, relativeDy: -1, offsetX: 0, offsetY: -15 }, // forward
        { relativeDx: 0, relativeDy: 1, offsetX: 0, offsetY: 15 },  // backward
      ];

    case FiringPattern.TRIPLE_SPREAD:
      return [
        { relativeDx: -0.15, relativeDy: 0, offsetX: -8, offsetY: 0 },
        { relativeDx: 0, relativeDy: 0, offsetX: 0, offsetY: 0 },
        { relativeDx: 0.15, relativeDy: 0, offsetX: 8, offsetY: 0 },
      ];

    case FiringPattern.DOUBLE_ANGLED:
      return [
        { relativeDx: -0.2, relativeDy: 0, offsetX: -10, offsetY: 0 },
        { relativeDx: 0.2, relativeDy: 0, offsetX: 10, offsetY: 0 },
      ];

    default:
      return [{ relativeDx: 0, relativeDy: 0, offsetX: 0, offsetY: 0 }];
  }
}

/**
 * Attempt to fire bullets for a player based on tank's firing pattern.
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

  const spawnParams = calculateBulletAngles(def.firingPattern);
  const bulletIds: number[] = [];

  const aimDx = player.lastAimDx;
  const aimDy = player.lastAimDy;

  for (const params of spawnParams) {
    const bulletId = room.nextBulletId++;

    let vx: number;
    let vy: number;

    if (params.relativeDx === 0 && params.relativeDy === 0) {
      vx = aimDx * def.bulletSpeed;
      vy = aimDy * def.bulletSpeed;
    } else {
      const combinedDx = aimDx + params.relativeDx;
      const combinedDy = aimDy + params.relativeDy;
      const len = Math.sqrt(combinedDx * combinedDx + combinedDy * combinedDy);
      vx = (combinedDx / len) * def.bulletSpeed;
      vy = (combinedDy / len) * def.bulletSpeed;
    }

    const bullet = new Bullet(
      bulletId,
      player.id,
      player.x + params.offsetX,
      player.y + params.offsetY,
      vx,
      vy,
      def.bulletDamage,
      def.bulletLifetime,
    );
    room.bullets.set(bulletId, bullet);
    bulletIds.push(bulletId);
  }

  player.lastShootTime = now;

  logger.debug(
    {
      event: 'shoot',
      playerId: player.id,
      tankType: player.tankType,
      firingPattern: def.firingPattern,
      bulletCount: bulletIds.length,
      bulletIds,
      x: player.x,
      y: player.y,
    },
    'DEBUG [CombatSystem] bullets spawned',
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
