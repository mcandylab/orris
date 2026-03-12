import { describe, it, expect } from 'vitest';
import {
  encodeWelcome,
  encodeSnapshot,
  encodePlayerJoined,
  encodePlayerLeft,
  encodeDeath,
  encodeLevelUp,
  encodeRoomFull,
  PLAYER_BYTES,
  BULLET_BYTES,
} from './encoder';
import { ServerOp, TankType } from '@orris/shared';
import type { PlayerState, BulletState } from '@orris/shared';

const mockPlayer: PlayerState = {
  id: 1,
  name: 'Alice',
  x: 100,
  y: 200,
  vx: 10,
  vy: -5,
  health: 80,
  maxHealth: 100,
  score: 500,
  level: 3,
  tankType: TankType.TWIN,
};

const mockBullet: BulletState = {
  id: 42,
  ownerId: 1,
  x: 150,
  y: 250,
  vx: 400,
  vy: 0,
};

describe('encoder', () => {
  it('encodeWelcome produces correct op byte', () => {
    const buf = encodeWelcome('room-1234-00000001');
    expect(buf[0]).toBe(ServerOp.WELCOME);
    expect(buf.length).toBe(17);
  });

  it('encodeSnapshot produces correct structure', () => {
    const buf = encodeSnapshot(42, [mockPlayer], [mockBullet]);
    const view = new DataView(buf.buffer);

    expect(buf[0]).toBe(ServerOp.SNAPSHOT);

    // tick at offset 1
    expect(view.getUint32(1, true)).toBe(42);

    // playerCount at offset 5
    expect(view.getUint16(5, true)).toBe(1);

    // First player id at offset 7
    expect(buf[7]).toBe(1); // id
    expect(buf[8]).toBe(TankType.TWIN); // tankType
    expect(buf[9]).toBe(3); // level

    // x at offset 11
    expect(view.getFloat32(11, true)).toBeCloseTo(100, 1);

    const bulletOffset = 1 + 4 + 2 + PLAYER_BYTES; // op + tick + playerCount + players
    // bulletCount
    expect(view.getUint16(bulletOffset, true)).toBe(1);

    // total size
    const expectedSize = 1 + 4 + 2 + PLAYER_BYTES + 2 + BULLET_BYTES;
    expect(buf.length).toBe(expectedSize);
  });

  it('encodeSnapshot with no players or bullets', () => {
    const buf = encodeSnapshot(1, [], []);
    expect(buf[0]).toBe(ServerOp.SNAPSHOT);
    const view = new DataView(buf.buffer);
    expect(view.getUint16(5, true)).toBe(0); // playerCount
    expect(view.getUint16(7, true)).toBe(0); // bulletCount
  });

  it('encodePlayerJoined encodes op and name', () => {
    const buf = encodePlayerJoined(5, 'Bob');
    expect(buf[0]).toBe(ServerOp.PLAYER_JOINED);
    expect(buf[1]).toBe(5);
    expect(new TextDecoder().decode(buf.slice(3))).toBe('Bob');
  });

  it('encodePlayerLeft encodes op and id', () => {
    const buf = encodePlayerLeft(7);
    expect(buf.length).toBe(2);
    expect(buf[0]).toBe(ServerOp.PLAYER_LEFT);
    expect(buf[1]).toBe(7);
  });

  it('encodeDeath produces correct bytes', () => {
    const buf = encodeDeath(3);
    expect(buf[0]).toBe(ServerOp.DEATH);
    expect(buf[1]).toBe(3);
  });

  it('encodeLevelUp encodes evolution choices', () => {
    const buf = encodeLevelUp(2, 5, [TankType.TWIN, TankType.SNIPER]);
    expect(buf[0]).toBe(ServerOp.LEVEL_UP);
    expect(buf[1]).toBe(2); // playerId
    expect(buf[2]).toBe(5); // level
    expect(buf[3]).toBe(2); // count
    expect(buf[4]).toBe(TankType.TWIN);
    expect(buf[5]).toBe(TankType.SNIPER);
  });

  it('encodeRoomFull produces 1 byte', () => {
    const buf = encodeRoomFull();
    expect(buf.length).toBe(1);
    expect(buf[0]).toBe(ServerOp.ROOM_FULL);
  });
});
