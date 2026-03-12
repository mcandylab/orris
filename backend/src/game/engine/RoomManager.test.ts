import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './RoomManager';
import { Player } from '../entities/Player';
import { Logger, MAX_PLAYERS } from './types';
import { TankType } from '@orris/shared';

const noopLogger: Logger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
};

describe('RoomManager', () => {
  let rm: RoomManager;

  beforeEach(() => {
    rm = new RoomManager(noopLogger);
  });

  it('creates a new room when none exists', () => {
    const room = rm.getOrCreateRoom();
    expect(room).toBeDefined();
    expect(room.id).toBeTruthy();
    expect(room.state).toBe('waiting');
  });

  it('returns the same room for second call when not full', () => {
    const r1 = rm.getOrCreateRoom();
    const r2 = rm.getOrCreateRoom();
    expect(r1.id).toBe(r2.id);
  });

  it('adds and removes players', () => {
    const room = rm.getOrCreateRoom();
    const player = new Player(1, 'Alice', TankType.BASIC);

    rm.addPlayer(room, player);
    expect(room.players.size).toBe(1);
    expect(room.state).toBe('running');

    rm.removePlayer(room, 1);
    expect(room.players.size).toBe(0);
  });

  it('auto-scales: creates a new room when current one is full', () => {
    const room = rm.getOrCreateRoom();

    // Fill the room to capacity
    for (let i = 1; i <= MAX_PLAYERS; i++) {
      const p = new Player(i, `P${i}`, TankType.BASIC);
      rm.addPlayer(room, p);
    }
    expect(room.players.size).toBe(MAX_PLAYERS);

    // Next call should return a different room
    const room2 = rm.getOrCreateRoom();
    expect(room2.id).not.toBe(room.id);
  });

  it('destroys empty room after all players leave', () => {
    const room = rm.getOrCreateRoom();
    const player = new Player(1, 'Alice', TankType.BASIC);

    rm.addPlayer(room, player);
    expect(rm.getRoom(room.id)).toBeDefined();

    rm.removePlayer(room, 1);
    // Room should be removed once empty
    expect(rm.getRoom(room.id)).toBeUndefined();
  });

  it('getRoom returns undefined for unknown id', () => {
    expect(rm.getRoom('non-existent-id')).toBeUndefined();
  });

  it('listRooms returns all active rooms', () => {
    const r1 = rm.getOrCreateRoom();
    rm.addPlayer(r1, new Player(1, 'P1', TankType.BASIC));

    // Fill r1 and force creation of r2
    for (let i = 2; i <= MAX_PLAYERS; i++) {
      rm.addPlayer(r1, new Player(i, `P${i}`, TankType.BASIC));
    }
    rm.getOrCreateRoom(); // creates r2

    expect(rm.listRooms().length).toBe(2);
  });
});
