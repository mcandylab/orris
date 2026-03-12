import { Player } from '../entities/Player';
import { PlayerInput, Logger } from '../engine/types';

const CLAMP_MAX = 1.0;

/**
 * Validate and clamp a raw PlayerInput from the network.
 * Returns null if the input is malformed (NaN, Infinity, wrong types).
 * Clamps dx/dy to [-1..1] to prevent speed exploits.
 */
export function validateAndClampInput(
  input: PlayerInput,
  playerId: number,
  logger: Logger,
): PlayerInput | null {
  const { dx, dy, shoot } = input;

  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    logger.debug(
      { event: 'input_rejected', playerId, reason: 'non-finite', rawDx: dx, rawDy: dy },
      'DEBUG [InputSystem] rejected non-finite input',
    );
    return null;
  }

  if (typeof shoot !== 'boolean') {
    logger.debug(
      { event: 'input_rejected', playerId, reason: 'invalid_shoot', shoot },
      'DEBUG [InputSystem] rejected invalid shoot value',
    );
    return null;
  }

  return {
    dx: Math.max(-CLAMP_MAX, Math.min(CLAMP_MAX, dx)),
    dy: Math.max(-CLAMP_MAX, Math.min(CLAMP_MAX, dy)),
    shoot,
  };
}

/**
 * Apply a validated input to the player's pendingInput slot.
 * Called after validateAndClampInput — do not call with raw network data.
 */
export function applyValidatedInput(player: Player, input: PlayerInput): void {
  player.pendingInput = input;
}
