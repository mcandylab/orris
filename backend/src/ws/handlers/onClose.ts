import { WebSocket } from 'uWebSockets.js';
import { PlayerWsData } from '../types';
import { GameContext } from '../GameContext';
import { encodePlayerLeft } from '../protocol/encoder';

/**
 * Called when a WebSocket connection closes (error, timeout, or graceful close).
 * Removes the player from the room, cleans up connections map, and broadcasts PLAYER_LEFT.
 * Stops the GameLoop if the room becomes empty.
 */
export function onClose(
  ws: WebSocket<PlayerWsData>,
  ctx: GameContext,
  code: number,
): void {
  const { roomManager, app, loops, connections, logger } = ctx;
  const data = ws.getUserData();
  const { playerId, roomId } = data;

  logger.debug(
    { event: 'close', playerId, roomId, code },
    'DEBUG [onClose] player disconnected',
  );

  // Remove from connection registry so death/level-up events are no longer sent
  connections.delete(playerId);

  const room = roomManager.getRoom(roomId);
  if (!room) return;

  // Broadcast PLAYER_LEFT before removing the player
  app.publish(`room:${roomId}`, encodePlayerLeft(playerId), true);

  roomManager.removePlayer(room, playerId);

  // Stop and clean up the GameLoop if the room is now empty
  if (room.players.size === 0) {
    const loop = loops.get(roomId);
    if (loop) {
      loop.stop();
      loops.delete(roomId);
      logger.debug({ event: 'loop_stopped', roomId }, 'DEBUG [onClose] GameLoop stopped (room empty)');
    }
  }
}
