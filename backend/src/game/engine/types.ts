import { RoomInfo, TankType } from '@orris/shared';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';

/** Input received from a client for the next tick */
export interface PlayerInput {
  dx: number;    // -1..1 normalized direction
  dy: number;    // -1..1 normalized direction
  shoot: boolean;
}

/** A live game room */
export interface Room {
  id: string;
  players: Map<number, Player>;   // playerId → Player
  bullets: Map<number, Bullet>;   // bulletId → Bullet
  tick: number;
  state: 'waiting' | 'running' | 'closing';
  nextBulletId: number;
}

/** Minimal logger interface injected into game/ layer (no direct pino dependency) */
export interface Logger {
  info(obj: Record<string, unknown>, msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

/** Convert Room to the shared RoomInfo DTO */
export function roomToInfo(room: Room): RoomInfo {
  return {
    id: room.id,
    playerCount: room.players.size,
    maxPlayers: MAX_PLAYERS,
    state: room.state,
  };
}

export const MAX_PLAYERS = 80;
