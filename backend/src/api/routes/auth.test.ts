import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../index';

// Mock repositories
vi.mock('../../db/repositories/UserRepository', () => ({
  findByUsername: vi.fn(),
  createUser: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../../db/repositories/StatsRepository', () => ({
  createStats: vi.fn(),
  findByUserId: vi.fn(),
}));

// Mock DB connection — avoid real PostgreSQL in unit tests
vi.mock('../../db/client', () => ({
  prisma: {},
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
}));

// Mock config to avoid missing env vars
vi.mock('../../config', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-32-chars-long-enough!!',
    PORT: 3000,
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
  },
}));

import * as UserRepo from '../../db/repositories/UserRepository';
import * as StatsRepo from '../../db/repositories/StatsRepository';

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  passwordHash: '$2a$10$abcdefghijklmnopqrstuuVUt1fH.NfHsE5K7HxVyNvjqUsPO5lnO', // bcrypt hash for 'password123'
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 + token on valid registration', async () => {
    vi.mocked(UserRepo.findByUsername).mockResolvedValue(null);
    vi.mocked(UserRepo.createUser).mockResolvedValue(mockUser);
    vi.mocked(StatsRepo.createStats).mockResolvedValue({
      id: 'stats-123',
      userId: mockUser.id,
      totalKills: 0,
      totalDeaths: 0,
      bestScore: 0,
      totalGamesPlayed: 0,
    });

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'testuser', password: 'password123' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe('testuser');
    await app.close();
  });

  it('returns 409 when username already taken', async () => {
    vi.mocked(UserRepo.findByUsername).mockResolvedValue(mockUser);

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'testuser', password: 'password123' },
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBe('CONFLICT');
    await app.close();
  });

  it('returns 400 when username is too short', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'ab', password: 'password123' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 when password is too short', async () => {
    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: 'testuser', password: 'short' },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 + token on valid credentials', async () => {
    // Use actual bcrypt hash for 'password123'
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 10);
    vi.mocked(UserRepo.findByUsername).mockResolvedValue({ ...mockUser, passwordHash });

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'testuser', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.token).toBeTruthy();
    expect(body.user.username).toBe('testuser');
    await app.close();
  });

  it('returns 401 when username does not exist', async () => {
    vi.mocked(UserRepo.findByUsername).mockResolvedValue(null);

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'unknown', password: 'password123' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
    await app.close();
  });

  it('returns 401 when password is wrong', async () => {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 10);
    vi.mocked(UserRepo.findByUsername).mockResolvedValue({ ...mockUser, passwordHash });

    const app = await createApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'testuser', password: 'wrongpassword' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toBe('UNAUTHORIZED');
    await app.close();
  });
});
