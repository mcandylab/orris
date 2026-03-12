import { MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';
import { Player } from '../entities/Player';
import { PlayerInput } from '../engine/types';
import { getTankDefinition } from '../entities/Tank';

/**
 * Apply movement for a single player tick.
 * Normalises diagonal direction, scales by tank speed, clamps to map bounds.
 * Updates player.lastAimDx/lastAimDy when the player is actually moving.
 *
 * @param player - The player to move (must be alive and have a pending input)
 * @param input  - Validated, clamped input from InputSystem
 * @param dt     - Delta time in seconds
 */
export function applyMovement(player: Player, input: PlayerInput, dt: number): void {
  const def = getTankDefinition(player.tankType);
  const { dx, dy } = input;

  // Normalise diagonal movement so speed is consistent in all directions
  const len = Math.hypot(dx, dy);
  const ndx = len > 0 ? dx / len : 0;
  const ndy = len > 0 ? dy / len : 0;

  player.vx = ndx * def.speed;
  player.vy = ndy * def.speed;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Remember last non-zero movement direction for shooting aim
  if (len > 0) {
    player.lastAimDx = ndx;
    player.lastAimDy = ndy;
  }

  // Clamp within map bounds (tank edge touches wall, doesn't overlap)
  const r = def.radius;
  player.x = Math.max(r, Math.min(MAP_WIDTH - r, player.x));
  player.y = Math.max(r, Math.min(MAP_HEIGHT - r, player.y));
}
