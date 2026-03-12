import { WebSocket } from 'uWebSockets.js';
import { Player } from '../../game/entities/Player';
import { GameLoop } from '../../game/engine/GameLoop';
import { PlayerWsData } from '../types';
import { GameContext } from '../GameContext';
import {
  encodeWelcome,
  encodePlayerJoined,
  encodeSnapshot,
  encodeDeath,
  encodeLevelUp,
} from '../protocol/encoder';
import { TankType } from '@orris/shared';

/** Auto-increment player id (1–255 per room, wraps after 255) */
let _counter = 1;
function nextPlayerId(): number {
  const id = _counter;
  _counter = (_counter % 255) + 1;
  return id;
}

/**
 * Called when a new WebSocket connection is established.
 * Joins the player to a room, starts the GameLoop if this is the first connection.
 */
export function onOpen(ws: WebSocket<PlayerWsData>, ctx: GameContext): void {
  const { roomManager, app, loops, connections, logger } = ctx;

  const room = roomManager.getOrCreateRoom();
  const playerId = nextPlayerId();
  const name = `Player${playerId}`;

  const player = new Player(playerId, name);
  roomManager.addPlayer(room, player);

  // Attach player metadata to the WebSocket user data
  const data = ws.getUserData();
  data.playerId = playerId;
  data.roomId = room.id;
  data.name = name;

  // Register connection so game-event callbacks can reach this socket
  connections.set(playerId, ws);

  // Subscribe to the room's broadcast topic
  ws.subscribe(`room:${room.id}`);

  // Send WELCOME to the connecting player
  ws.send(encodeWelcome(room.id.slice(0, 16)), true);

  // Broadcast PLAYER_JOINED to everyone already in the room
  app.publish(`room:${room.id}`, encodePlayerJoined(playerId, name), true);

  logger.debug(
    { event: 'open', playerId, roomId: room.id, playerCount: room.players.size },
    'DEBUG [onOpen] player connected',
  );

  // Start the GameLoop for this room if not already running
  if (!loops.has(room.id)) {
    const loop = new GameLoop(
      room,
      ({ tick, players, bullets }) => {
        const snapshot = encodeSnapshot(tick, players, bullets);
        app.publish(`room:${room.id}`, snapshot, true);
      },
      logger,
      {
        onPlayerDied: (victimId: number, killerId: number) => {
          const victimWs = connections.get(victimId);
          if (victimWs) {
            victimWs.send(encodeDeath(killerId), true);
            logger.debug(
              { event: 'death_sent', victimId, killerId },
              'DEBUG [onOpen] DEATH sent to victim',
            );
          }
        },

        onPlayerLevelUp: (pid: number, level: number, choices: TankType[]) => {
          const playerWs = connections.get(pid);
          if (playerWs) {
            playerWs.send(encodeLevelUp(pid, level, choices), true);
            logger.debug(
              { event: 'level_up_sent', playerId: pid, newLevel: level, choices },
              'DEBUG [onOpen] LEVEL_UP sent to player',
            );
          }
        },
      },
    );
    loop.start();
    loops.set(room.id, loop);
    logger.debug({ event: 'loop_started', roomId: room.id }, 'DEBUG [onOpen] GameLoop started');
  }
}
