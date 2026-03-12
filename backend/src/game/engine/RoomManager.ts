import { randomUUID } from 'crypto';
import { Room, Logger, MAX_PLAYERS, roomToInfo } from './types';
import { Player } from '../entities/Player';
import { RoomInfo } from '@orris/shared';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Returns an existing room with available space, or creates a new one.
   * Auto-scaling: when all rooms are full, a new room is created.
   */
  getOrCreateRoom(): Room {
    for (const room of this.rooms.values()) {
      if (room.state !== 'closing' && room.players.size < MAX_PLAYERS) {
        return room;
      }
    }
    return this.createRoom();
  }

  private createRoom(): Room {
    const id = randomUUID();
    const room: Room = {
      id,
      players: new Map(),
      bullets: new Map(),
      tick: 0,
      state: 'waiting',
      nextBulletId: 1,
    };
    this.rooms.set(id, room);
    this.logger.info({ roomId: id }, 'INFO [RoomManager] room created');
    return room;
  }

  addPlayer(room: Room, player: Player): void {
    room.players.set(player.id, player);
    if (room.state === 'waiting' && room.players.size >= 1) {
      room.state = 'running';
    }
    this.logger.debug(
      { roomId: room.id, playerId: player.id, playerCount: room.players.size },
      'DEBUG [RoomManager] player added',
    );
  }

  removePlayer(room: Room, playerId: number): void {
    room.players.delete(playerId);
    this.logger.debug(
      { roomId: room.id, playerId, playerCount: room.players.size },
      'DEBUG [RoomManager] player removed',
    );

    if (room.players.size === 0) {
      this.destroyRoom(room.id);
    }
  }

  private destroyRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.logger.info({ roomId }, 'INFO [RoomManager] room destroyed (empty)');
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  listRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  listRoomInfos(): RoomInfo[] {
    return this.listRooms().map(roomToInfo);
  }
}
