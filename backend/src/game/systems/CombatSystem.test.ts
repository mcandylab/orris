import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processShooting, resolveHits, updateBullets, calculateBulletAngles } from './CombatSystem';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Room, Logger } from '../engine/types';
import { TankType, FiringPattern } from '@orris/shared';
import { getTankDefinition } from '../entities/Tank';

function mockLogger(): Logger {
  return { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeRoom(): Room {
  return {
    id: 'test-room',
    players: new Map(),
    bullets: new Map(),
    tick: 0,
    state: 'running',
    nextBulletId: 1,
  };
}

function makePlayer(id: number, x = 500, y = 500): Player {
  const p = new Player(id, `Player${id}`, TankType.BASIC);
  p.x = x;
  p.y = y;
  return p;
}

describe('CombatSystem.processShooting', () => {
  it('creates a bullet when shoot=true and cooldown has passed', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(1);
  });

  it('does not create a second bullet before fireRate expires', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    const def = getTankDefinition(TankType.BASIC);
    const now = 10_000;
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = now - def.fireRate / 2; // half cooldown used

    processShooting(room, player, now, mockLogger());

    expect(room.bullets.size).toBe(0);
  });

  it('does not create a bullet when shoot=false', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.pendingInput = { dx: 1, dy: 0, shoot: false };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(0);
  });
});

describe('CombatSystem.resolveHits', () => {
  it('applies damage to a player hit by a bullet', () => {
    const logger = mockLogger();
    const room = makeRoom();
    const attacker = makePlayer(1, 200, 200);
    const victim = makePlayer(2, 200, 200); // same position as bullet
    room.players.set(attacker.id, attacker);
    room.players.set(victim.id, victim);

    const def = getTankDefinition(TankType.BASIC);
    const bullet = new Bullet(1, attacker.id, victim.x, victim.y, 0, 0, def.bulletDamage, 2);
    room.bullets.set(bullet.id, bullet);

    const kills = resolveHits(room, logger);

    expect(victim.health).toBeLessThan(victim.maxHealth);
    expect(kills).toHaveLength(0); // one hit, not dead yet
  });

  it('returns a KillEvent when a player is killed', () => {
    const logger = mockLogger();
    const room = makeRoom();
    const attacker = makePlayer(1, 200, 200);
    const victim = makePlayer(2, 200, 200);
    victim.health = 1; // one hit away from death
    room.players.set(attacker.id, attacker);
    room.players.set(victim.id, victim);

    const def = getTankDefinition(TankType.BASIC);
    const bullet = new Bullet(1, attacker.id, victim.x, victim.y, 0, 0, def.bulletDamage, 2);
    room.bullets.set(bullet.id, bullet);

    const kills = resolveHits(room, logger);

    expect(kills).toHaveLength(1);
    expect(kills[0]).toEqual({ killedId: victim.id, killerId: attacker.id });
    expect(victim.alive).toBe(false);
  });

  it('does not let players be hit by their own bullet', () => {
    const logger = mockLogger();
    const room = makeRoom();
    const player = makePlayer(1, 200, 200);
    room.players.set(player.id, player);

    const bullet = new Bullet(1, player.id, player.x, player.y, 0, 0, 50, 2);
    room.bullets.set(bullet.id, bullet);

    resolveHits(room, logger);

    expect(player.health).toBe(player.maxHealth);
  });
});

describe('CombatSystem.updateBullets', () => {
  it('removes a bullet whose lifetime has expired', () => {
    const room = makeRoom();
    const bullet = new Bullet(1, 1, 500, 500, 0, 0, 10, 0.01); // nearly expired
    room.bullets.set(bullet.id, bullet);

    updateBullets(room, 1); // 1s tick — well past lifetime

    expect(room.bullets.size).toBe(0);
  });
});

describe('CombatSystem.calculateBulletAngles', () => {
  it('returns single bullet for SINGLE pattern', () => {
    const params = calculateBulletAngles(FiringPattern.SINGLE);
    expect(params).toHaveLength(1);
    expect(params[0]).toEqual({ relativeDx: 0, relativeDy: 0, offsetX: 0, offsetY: 0 });
  });

  it('returns two bullets for TWIN pattern', () => {
    const params = calculateBulletAngles(FiringPattern.TWIN);
    expect(params).toHaveLength(2);
    expect(params[0].offsetX).toBeLessThan(params[1].offsetX); // -10 < 10
    expect(params[0].relativeDx).toBe(-0.1);
    expect(params[1].relativeDx).toBe(0.1);
  });

  it('returns two bullets with opposite directions for FLANK pattern', () => {
    const params = calculateBulletAngles(FiringPattern.FLANK);
    expect(params).toHaveLength(2);
    expect(params[0].relativeDy).toBe(-1); // forward
    expect(params[1].relativeDy).toBe(1);  // backward
    expect(params[0].offsetY).toBe(-15);
    expect(params[1].offsetY).toBe(15);
  });

  it('returns three bullets for TRIPLE_SPREAD pattern', () => {
    const params = calculateBulletAngles(FiringPattern.TRIPLE_SPREAD);
    expect(params).toHaveLength(3);
    expect(params[0].relativeDx).toBe(-0.15);
    expect(params[1].relativeDx).toBe(0);
    expect(params[2].relativeDx).toBe(0.15);
  });

  it('returns two angled bullets for DOUBLE_ANGLED pattern', () => {
    const params = calculateBulletAngles(FiringPattern.DOUBLE_ANGLED);
    expect(params).toHaveLength(2);
    expect(params[0].relativeDx).toBe(-0.2);
    expect(params[1].relativeDx).toBe(0.2);
  });
});

describe('CombatSystem.processShooting multi-cannon', () => {
  it('BASIC tank creates 1 bullet (SINGLE pattern)', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.tankType = TankType.BASIC;
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(1);
  });

  it('TWIN tank creates 2 bullets', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.tankType = TankType.TWIN;
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(2);
  });

  it('TRIPLE_SHOT tank creates 3 bullets', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.tankType = TankType.TRIPLE_SHOT;
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(3);
  });

  it('FLANK_GUARD tank creates 2 bullets in opposite directions', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.tankType = TankType.FLANK_GUARD;
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(2);
    const bullets = Array.from(room.bullets.values());
    const vySigns = bullets.map(b => Math.sign(b.vy));
    expect(vySigns[0]).not.toBe(vySigns[1]); // opposite directions
  });

  it('HUNTER tank creates 2 angled bullets', () => {
    const room = makeRoom();
    const player = makePlayer(1);
    player.tankType = TankType.HUNTER;
    player.pendingInput = { dx: 1, dy: 0, shoot: true };
    player.lastShootTime = 0;

    processShooting(room, player, 9999, mockLogger());

    expect(room.bullets.size).toBe(2);
  });
});
