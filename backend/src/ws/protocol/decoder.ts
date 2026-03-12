/**
 * Binary protocol decoder — client → server messages
 *
 * Client message formats:
 *   JOIN:             [op:1][nameLen:1][name:N]
 *   INPUT:            [op:1][dx:f32][dy:f32][shoot:1]
 *   SPAWN:            [op:1]
 *   CHOOSE_EVOLUTION: [op:1][tankType:1]
 */

import { ClientOp, TankType } from '@orris/shared';

const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';
const DEBUG = LOG_LEVEL === 'debug';

export interface JoinMessage {
  op: ClientOp.JOIN;
  name: string;
}

export interface InputMessage {
  op: ClientOp.INPUT;
  dx: number;
  dy: number;
  shoot: boolean;
}

export interface SpawnMessage {
  op: ClientOp.SPAWN;
}

export interface ChooseEvolutionMessage {
  op: ClientOp.CHOOSE_EVOLUTION;
  tankType: TankType;
}

export type ClientMessage = JoinMessage | InputMessage | SpawnMessage | ChooseEvolutionMessage;

const dec = new TextDecoder();

/**
 * Decode a raw ArrayBuffer from the WebSocket.
 * Returns null if the message is malformed or the op is unknown.
 */
export function decode(raw: ArrayBuffer): ClientMessage | null {
  const bytes = new Uint8Array(raw);
  if (bytes.length === 0) {
    if (DEBUG) console.debug('DEBUG [decoder] empty message');
    return null;
  }

  const op = bytes[0] as ClientOp;
  const view = new DataView(raw);

  if (DEBUG) {
    console.debug(`DEBUG [decoder] op=0x${op.toString(16)} size=${bytes.length}`);
  }

  switch (op) {
    case ClientOp.JOIN: {
      if (bytes.length < 2) {
        console.warn(`WARN [decoder] JOIN: too short (${bytes.length} bytes)`);
        return null;
      }
      const nameLen = bytes[1];
      if (bytes.length < 2 + nameLen) {
        console.warn(`WARN [decoder] JOIN: buffer too short for name (need ${2 + nameLen}, got ${bytes.length})`);
        return null;
      }
      const name = dec.decode(bytes.slice(2, 2 + nameLen)).trim();
      if (DEBUG) console.debug(`DEBUG [decoder] JOIN name="${name}"`);
      return { op: ClientOp.JOIN, name };
    }

    case ClientOp.INPUT: {
      // op(1) + dx(4) + dy(4) + shoot(1) = 10
      if (bytes.length < 10) {
        console.warn(`WARN [decoder] INPUT: too short (${bytes.length} bytes)`);
        return null;
      }
      const dx = view.getFloat32(1, true);
      const dy = view.getFloat32(5, true);
      const shoot = bytes[9] !== 0;
      if (DEBUG) console.debug(`DEBUG [decoder] INPUT dx=${dx} dy=${dy} shoot=${shoot}`);
      return { op: ClientOp.INPUT, dx, dy, shoot };
    }

    case ClientOp.SPAWN: {
      if (DEBUG) console.debug('DEBUG [decoder] SPAWN');
      return { op: ClientOp.SPAWN };
    }

    case ClientOp.CHOOSE_EVOLUTION: {
      if (bytes.length < 2) {
        console.warn(`WARN [decoder] CHOOSE_EVOLUTION: too short (${bytes.length} bytes)`);
        return null;
      }
      const tankType = bytes[1] as TankType;
      if (DEBUG) console.debug(`DEBUG [decoder] CHOOSE_EVOLUTION tankType=${tankType}`);
      return { op: ClientOp.CHOOSE_EVOLUTION, tankType };
    }

    default: {
      console.warn(`WARN [decoder] unknown op=0x${(op as number).toString(16)}`);
      return null;
    }
  }
}
