import { describe, it, expect, vi } from 'vitest';
import { validateAndClampInput } from './InputSystem';
import { Logger } from '../engine/types';

function mockLogger(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('InputSystem.validateAndClampInput', () => {
  it('passes a normal in-range input unchanged', () => {
    const logger = mockLogger();
    const result = validateAndClampInput({ dx: 0.5, dy: -0.5, shoot: false }, 1, logger);
    expect(result).toEqual({ dx: 0.5, dy: -0.5, shoot: false });
  });

  it('clamps dx > 1 to 1', () => {
    const logger = mockLogger();
    const result = validateAndClampInput({ dx: 2, dy: 0, shoot: false }, 1, logger);
    expect(result?.dx).toBe(1);
  });

  it('clamps dy < -1 to -1', () => {
    const logger = mockLogger();
    const result = validateAndClampInput({ dx: 0, dy: -99, shoot: false }, 1, logger);
    expect(result?.dy).toBe(-1);
  });

  it('returns null for NaN dx', () => {
    const logger = mockLogger();
    const result = validateAndClampInput({ dx: NaN, dy: 0, shoot: false }, 1, logger);
    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'non-finite', playerId: 1 }),
      expect.any(String),
    );
  });

  it('returns null for Infinity dy', () => {
    const logger = mockLogger();
    const result = validateAndClampInput({ dx: 0, dy: Infinity, shoot: false }, 1, logger);
    expect(result).toBeNull();
  });

  it('returns null for non-boolean shoot', () => {
    const logger = mockLogger();
    const result = validateAndClampInput(
      { dx: 0, dy: 0, shoot: 1 as unknown as boolean },
      1,
      logger,
    );
    expect(result).toBeNull();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'invalid_shoot' }),
      expect.any(String),
    );
  });
});
