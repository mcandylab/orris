import { XP_THRESHOLDS, MAX_LEVEL, EVOLUTION_LEVELS, TankType } from '@orris/shared';
import { Player } from '../entities/Player';
import { Logger } from '../engine/types';
import { getTankDefinition } from '../entities/Tank';

/** XP base reward for killing another player */
const BASE_KILL_XP = 50;

/** Emitted when a player reaches a new level */
export interface LevelUpEvent {
  playerId: number;
  newLevel: number;
  /** Non-empty only on evolution levels; otherwise [] */
  evolutionChoices: TankType[];
}

/**
 * Award XP to the killer after eliminating a victim.
 * The bonus scales with the victim's accumulated score so killing
 * higher-level players is always more rewarding.
 *
 * @returns The amount of XP awarded
 */
export function awardKillXp(killer: Player, victim: Player): number {
  const xp = BASE_KILL_XP + victim.score;
  killer.score += xp;
  return xp;
}

/**
 * Check whether the player has accumulated enough XP to level up.
 * Handles multi-level jumps (e.g. scoring a massive kill that skips levels).
 *
 * @returns A LevelUpEvent for the highest level reached, or null.
 */
export function checkLevelUp(player: Player, logger: Logger): LevelUpEvent | null {
  let levelled = false;

  while (player.level < MAX_LEVEL) {
    const threshold = XP_THRESHOLDS[player.level + 1];
    if (threshold === undefined || player.score < threshold) break;

    player.level++;
    levelled = true;

    logger.info(
      { event: 'level_up', playerId: player.id, newLevel: player.level, xp: player.score },
      'INFO [XpSystem] player levelled up',
    );
  }

  if (!levelled) return null;

  const evolutionChoices = EVOLUTION_LEVELS.includes(player.level)
    ? getTankDefinition(player.tankType).evolvesTo
    : [];

  return {
    playerId: player.id,
    newLevel: player.level,
    evolutionChoices,
  };
}
