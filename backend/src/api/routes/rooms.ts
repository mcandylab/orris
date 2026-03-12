import { FastifyInstance } from 'fastify';
import { RoomManager } from '../../game/engine/RoomManager';

/**
 * Factory: returns a Fastify plugin (no fp) that serves GET /rooms.
 * NOT wrapped with fastify-plugin to preserve encapsulation and prefix support.
 */
export function createRoomsRoute(roomManager: RoomManager) {
  return async function roomsRoute(app: FastifyInstance) {
    app.get('/rooms', async (_request, reply) => {
      const rooms = roomManager.listRoomInfos();

      app.log.debug({ roomCount: rooms.length }, 'DEBUG [rooms] GET /rooms');

      return reply.send({ rooms });
    });
  };
}
