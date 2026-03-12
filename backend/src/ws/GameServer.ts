import uWS, { TemplatedApp, WebSocket } from 'uWebSockets.js';
import { Logger } from '../game/engine/types';
import { RoomManager } from '../game/engine/RoomManager';
import { GameLoop } from '../game/engine/GameLoop';
import { GameContext } from './GameContext';
import { PlayerWsData } from './types';
import { onOpen } from './handlers/onOpen';
import { onMessage } from './handlers/onMessage';
import { onClose } from './handlers/onClose';

export class GameServer {
  private app: TemplatedApp;
  private ctx: GameContext;
  private listenSocket: uWS.us_listen_socket | null = null;

  constructor(logger: Logger) {
    const roomManager = new RoomManager(logger);
    const loops = new Map<string, GameLoop>();
    const connections = new Map<number, WebSocket<PlayerWsData>>();

    this.app = uWS.App();
    this.ctx = { app: this.app, roomManager, loops, connections, logger };

    this.setupRoutes();
  }

  private setupRoutes(): void {
    const ctx = this.ctx;

    this.app.ws<PlayerWsData>('/game', {
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 128,
      idleTimeout: 60,

      open: (ws: WebSocket<PlayerWsData>) => {
        onOpen(ws, ctx);
      },

      message: (ws: WebSocket<PlayerWsData>, message: ArrayBuffer, isBinary: boolean) => {
        onMessage(ws, message, isBinary, ctx);
      },

      close: (ws: WebSocket<PlayerWsData>, code: number, _message: ArrayBuffer) => {
        onClose(ws, ctx, code);
      },
    });

    this.ctx.logger.info({}, 'INFO [GameServer] WebSocket route configured on /game');
  }

  getRoomManager(): RoomManager {
    return this.ctx.roomManager;
  }

  listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.app.listen(port, (socket) => {
        if (socket) {
          this.listenSocket = socket;
          this.ctx.logger.info({ port }, 'INFO [GameServer] WebSocket server listening');
          resolve();
        } else {
          const err = new Error(`Failed to listen on WebSocket port ${port}`);
          this.ctx.logger.error({ port }, 'ERROR [GameServer] failed to bind WS port');
          reject(err);
        }
      });
    });
  }

  close(): void {
    // Stop all active game loops
    for (const loop of this.ctx.loops.values()) {
      loop.stop();
    }
    this.ctx.loops.clear();

    if (this.listenSocket) {
      uWS.us_listen_socket_close(this.listenSocket);
      this.listenSocket = null;
      this.ctx.logger.info({}, 'INFO [GameServer] WebSocket server closed');
    }
  }
}
