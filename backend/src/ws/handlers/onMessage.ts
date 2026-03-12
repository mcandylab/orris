import { WebSocket } from 'uWebSockets.js';
import { ClientOp, MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';
import { PlayerWsData } from '../types';
import { GameContext } from '../GameContext';
import { decode, InputMessage, JoinMessage, ChooseEvolutionMessage } from '../protocol/decoder';
import { getTankDefinition } from '../../game/entities/Tank';

/**
 * Called when a message is received from a client.
 * Decodes the binary payload and dispatches to the appropriate game handler.
 */
export function onMessage(
  ws: WebSocket<PlayerWsData>,
  raw: ArrayBuffer,
  _isBinary: boolean,
  ctx: GameContext,
): void {
  const { roomManager, logger } = ctx;
  const data = ws.getUserData();

  const msg = decode(raw);
  if (!msg) {
    logger.warn(
      { event: 'message', playerId: data.playerId, size: raw.byteLength },
      'WARN [onMessage] decode failed or unknown op',
    );
    return;
  }

  logger.debug(
    { event: 'message', op: msg.op, playerId: data.playerId },
    'DEBUG [onMessage] received',
  );

  switch (msg.op) {
    case ClientOp.INPUT: {
      const inputMsg = msg as InputMessage;
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;
      const player = room.players.get(data.playerId);
      if (!player || !player.alive) return;
      // Store input — GameLoop validates and picks it up on the next tick
      player.pendingInput = { dx: inputMsg.dx, dy: inputMsg.dy, shoot: inputMsg.shoot };
      break;
    }

    case ClientOp.JOIN: {
      // JOIN is handled via onOpen. If received here, update the display name.
      const joinMsg = msg as JoinMessage;
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;
      const player = room.players.get(data.playerId);
      if (!player) return;
      player.name = joinMsg.name.trim().slice(0, 16) || player.name;
      data.name = player.name;
      break;
    }

    case ClientOp.SPAWN: {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;
      const player = room.players.get(data.playerId);
      if (!player || player.alive) return; // ignore if already alive

      player.respawn();

      logger.debug(
        { event: 'spawn', playerId: data.playerId, roomId: data.roomId, x: player.x, y: player.y },
        'DEBUG [onMessage] player respawned',
      );
      break;
    }

    case ClientOp.CHOOSE_EVOLUTION: {
      const evoMsg = msg as ChooseEvolutionMessage;
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;
      const player = room.players.get(data.playerId);
      if (!player) return;

      const currentDef = getTankDefinition(player.tankType);
      if (!currentDef.evolvesTo.includes(evoMsg.tankType)) {
        logger.warn(
          {
            event: 'invalid_evolution',
            playerId: data.playerId,
            currentTank: player.tankType,
            requestedTank: evoMsg.tankType,
          },
          'WARN [onMessage] invalid evolution choice — ignoring',
        );
        return;
      }

      const newDef = getTankDefinition(evoMsg.tankType);
      player.tankType = evoMsg.tankType;
      player.maxHealth = newDef.maxHealth;
      // Keep HP proportion on evolution (don't full-heal, don't over-heal)
      player.health = Math.min(player.health, newDef.maxHealth);

      logger.debug(
        { event: 'evolve', playerId: data.playerId, newTankType: evoMsg.tankType },
        'DEBUG [onMessage] player evolved tank',
      );
      break;
    }

    default: {
      logger.warn(
        { event: 'message', playerId: data.playerId },
        'WARN [onMessage] unhandled op',
      );
    }
  }
}
