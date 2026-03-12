import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../index';
import { RoomManager } from '../../game/engine/RoomManager';
import { Player } from '../../game/entities/Player';
import { Logger } from '../../game/engine/types';
import { TankType } from '@orris/shared';

// Mock DB connection
vi.mock('../../db/client', () => ({
  prisma: {},
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
}));

// Mock config — avoids real servers being started by start()
vi.mock('../../config', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-32-chars-long-enough!!',
    PORT: 3099,
    WS_PORT: 3098,
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    CORS_ORIGINS: [],
  },
}));

const noopLogger: Logger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
};

describe('GET /api/rooms', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager(noopLogger);
  });

  it('returns empty rooms array when no rooms exist', async () => {
    const app = await createApp(roomManager);
    const res = await app.inject({ method: 'GET', url: '/api/rooms' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ rooms: unknown[] }>();
    expect(body.rooms).toEqual([]);

    await app.close();
  });

  it('returns list of active rooms', async () => {
    const room = roomManager.getOrCreateRoom();
    roomManager.addPlayer(room, new Player(1, 'TestPlayer', TankType.BASIC));

    const app = await createApp(roomManager);
    const res = await app.inject({ method: 'GET', url: '/api/rooms' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      rooms: Array<{ id: string; playerCount: number; maxPlayers: number; state: string }>;
    }>();
    expect(body.rooms.length).toBe(1);
    expect(body.rooms[0]!.id).toBe(room.id);
    expect(body.rooms[0]!.playerCount).toBe(1);
    expect(body.rooms[0]!.maxPlayers).toBe(80);
    expect(body.rooms[0]!.state).toBe('running');

    await app.close();
  });
});
