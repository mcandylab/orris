import { describe, it, expect } from 'vitest';
import { applyMovement } from './PhysicsSystem';
import { Player } from '../entities/Player';
import { TankType, MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';
import { getTankDefinition } from '../entities/Tank';

function makePlayer(): Player {
  const p = new Player(1, 'TestPlayer', TankType.BASIC);
  // Place at centre so boundary tests are unambiguous
  p.x = MAP_WIDTH / 2;
  p.y = MAP_HEIGHT / 2;
  return p;
}

describe('PhysicsSystem.applyMovement', () => {
  const dt = 1 / 20; // one tick at 20 TPS

  it('moves the player right when dx=1', () => {
    const player = makePlayer();
    const startX = player.x;
    applyMovement(player, { dx: 1, dy: 0, shoot: false }, dt);
    expect(player.x).toBeGreaterThan(startX);
    expect(player.y).toBeCloseTo(MAP_HEIGHT / 2);
  });

  it('normalises diagonal movement — speed does not exceed base speed', () => {
    const player = makePlayer();
    applyMovement(player, { dx: 1, dy: 1, shoot: false }, dt);
    const speed = Math.hypot(player.vx, player.vy);
    const expectedSpeed = getTankDefinition(TankType.BASIC).speed;
    expect(speed).toBeCloseTo(expectedSpeed);
  });

  it('clamps player to left boundary (x >= radius)', () => {
    const player = makePlayer();
    player.x = 0;
    applyMovement(player, { dx: -1, dy: 0, shoot: false }, dt);
    const radius = getTankDefinition(TankType.BASIC).radius;
    expect(player.x).toBeGreaterThanOrEqual(radius);
  });

  it('clamps player to right boundary (x <= MAP_WIDTH - radius)', () => {
    const player = makePlayer();
    player.x = MAP_WIDTH;
    applyMovement(player, { dx: 1, dy: 0, shoot: false }, dt);
    const radius = getTankDefinition(TankType.BASIC).radius;
    expect(player.x).toBeLessThanOrEqual(MAP_WIDTH - radius);
  });

  it('updates lastAimDx/lastAimDy when player moves', () => {
    const player = makePlayer();
    applyMovement(player, { dx: 1, dy: 0, shoot: false }, dt);
    expect(player.lastAimDx).toBeCloseTo(1);
    expect(player.lastAimDy).toBeCloseTo(0);
  });

  it('preserves lastAimDx/lastAimDy when player has zero input', () => {
    const player = makePlayer();
    player.lastAimDx = 0.707;
    player.lastAimDy = 0.707;
    applyMovement(player, { dx: 0, dy: 0, shoot: false }, dt);
    expect(player.lastAimDx).toBeCloseTo(0.707);
    expect(player.lastAimDy).toBeCloseTo(0.707);
  });
});
