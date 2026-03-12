import { TemplatedApp, WebSocket } from 'uWebSockets.js';
import { RoomManager } from '../game/engine/RoomManager';
import { GameLoop } from '../game/engine/GameLoop';
import { Logger } from '../game/engine/types';
import { PlayerWsData } from './types';

/**
 * Shared context passed to all WebSocket event handlers.
 * Keeps transport-layer state out of the game engine.
 */
export interface GameContext {
  app: TemplatedApp;
  roomManager: RoomManager;
  loops: Map<string, GameLoop>;     // roomId → GameLoop
  connections: Map<number, WebSocket<PlayerWsData>>; // playerId → WebSocket
  logger: Logger;
}
