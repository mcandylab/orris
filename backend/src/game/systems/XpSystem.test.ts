import { describe, it, expect, vi } from 'vitest';
import { awardKillXp, checkLevelUp } from './XpSystem';
import { Player } from '../entities/Player';
import { TankType, XP_THRESHOLDS, EVOLUTION_LEVELS } from '@orris/shared';
import { Logger } from '../engine/types';

function mockLogger(): Logger {
  return { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makePlayer(id: number): Player {
  return new Player(id, `Player${id}`, TankType.BASIC);
}

describe('XpSystem.awardKillXp', () => {
  it('increases killer score by base + victim score', () => {
    const killer = makePlayer(1);
    const victim = makePlayer(2);
    victim.score = 200;

    const xp = awardKillXp(killer, victim);

    expect(xp).toBe(50 + 200); // BASE_KILL_XP + victim.score
    expect(killer.score).toBe(xp);
  });

  it('awards base XP even when victim has 0 score', () => {
    const killer = makePlayer(1);
    const victim = makePlayer(2);
    const xp = awardKillXp(killer, victim);
    expect(xp).toBe(50);
  });
});

describe('XpSystem.checkLevelUp', () => {
  it('returns null when XP is below threshold', () => {
    const player = makePlayer(1);
    player.score = 0;
    const event = checkLevelUp(player, mockLogger());
    expect(event).toBeNull();
    expect(player.level).toBe(1);
  });

  it('levels up when score reaches threshold for level 2', () => {
    const player = makePlayer(1);
    player.score = XP_THRESHOLDS[2]; // exactly the threshold for level 2
    const event = checkLevelUp(player, mockLogger());
    expect(event).not.toBeNull();
    expect(player.level).toBe(2);
    expect(event?.newLevel).toBe(2);
  });

  it('handles multi-level jumps in one call', () => {
    const player = makePlayer(1);
    player.score = XP_THRESHOLDS[4]; // enough for level 4
    const event = checkLevelUp(player, mockLogger());
    expect(player.level).toBe(4);
    expect(event?.newLevel).toBe(4);
  });

  it('provides evolution choices on an evolution level', () => {
    const player = makePlayer(1);
    const evoLevel = EVOLUTION_LEVELS[0]; // first evolution level (3)
    player.score = XP_THRESHOLDS[evoLevel];
    // Jump straight to just below evo level so we hit it
    player.level = evoLevel - 1;
    const event = checkLevelUp(player, mockLogger());
    expect(event?.evolutionChoices.length).toBeGreaterThan(0);
  });

  it('provides empty evolution choices on a non-evolution level', () => {
    const player = makePlayer(1);
    // Level up to level 2 (not in EVOLUTION_LEVELS)
    player.score = XP_THRESHOLDS[2];
    const event = checkLevelUp(player, mockLogger());
    expect(event?.evolutionChoices).toEqual([]);
  });
});
