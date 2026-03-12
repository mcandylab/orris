import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processShooting, resolveHits, updateBullets } from './CombatSystem';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { Room, Logger } from '../engine/types';
import { TankType } from '@orris/shared';
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
