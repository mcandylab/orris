/**
 * Binary protocol encoder — server → client messages
 *
 * Snapshot player layout (40 bytes):
 *   [id:u8][tankType:u8][level:u8][pad:u8]
 *   [x:f32][y:f32][vx:f32][vy:f32]
 *   [health:f32][maxHealth:f32]
 *   [score:u32]
 *   [name:12 bytes, null-padded ASCII]
 *
 * Snapshot bullet layout (20 bytes):
 *   [id:u16][ownerId:u8][tankType:u8]
 *   [x:f32][y:f32][vx:f32][vy:f32]
 */

import { ServerOp, PlayerState, BulletState, RoomInfo } from '@orris/shared';

const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';
const DEBUG = LOG_LEVEL === 'debug';

/**
 * Bytes per player in a snapshot:
 *   [id:1][tankType:1][level:1][pad:1] = 4
 *   [x:4][y:4][vx:4][vy:4]            = 16
 *   [health:4][maxHealth:4]            = 8
 *   [score:4]                          = 4
 *   [name:12 ASCII, null-padded]       = 12
 *   Total: 44 bytes
 */
export const PLAYER_BYTES = 44;
/**
 * Bytes per bullet in a snapshot:
 *   [id:2][ownerId:1][reserved:1] = 4
 *   [x:4][y:4][vx:4][vy:4]       = 16
 *   Total: 20 bytes
 */
export const BULLET_BYTES = 20;

// ─── WELCOME ────────────────────────────────────────────────────────────────
// [op:1][playerId:16 bytes UUID as ASCII]
const WELCOME_SIZE = 1 + 16;

export function encodeWelcome(playerId: string): Uint8Array {
  const buf = new Uint8Array(WELCOME_SIZE);
  buf[0] = ServerOp.WELCOME;
  const idBytes = new TextEncoder().encode(playerId.replace(/-/g, '').slice(0, 16).padEnd(16, '0'));
  buf.set(idBytes.slice(0, 16), 1);

  if (DEBUG) {
    console.debug(`DEBUG [encoder] WELCOME playerId=${playerId} size=${WELCOME_SIZE}`);
  }
  return buf;
}

// ─── SNAPSHOT ───────────────────────────────────────────────────────────────
// [op:1][tick:u32][playerCount:u16][players...][bulletCount:u16][bullets...]

export function encodeSnapshot(
  tick: number,
  players: PlayerState[],
  bullets: BulletState[],
): Uint8Array {
  const size =
    1 + // op
    4 + // tick u32
    2 + // playerCount u16
    players.length * PLAYER_BYTES +
    2 + // bulletCount u16
    bullets.length * BULLET_BYTES;

  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  let offset = 0;

  view.setUint8(offset++, ServerOp.SNAPSHOT);
  view.setUint32(offset, tick, true); offset += 4;
  view.setUint16(offset, players.length, true); offset += 2;

  const enc = new TextEncoder();
  for (const p of players) {
    view.setUint8(offset, p.id); offset++;
    view.setUint8(offset, p.tankType); offset++;
    view.setUint8(offset, p.level); offset++;
    view.setUint8(offset, 0); offset++; // pad / flags
    view.setFloat32(offset, p.x, true); offset += 4;
    view.setFloat32(offset, p.y, true); offset += 4;
    view.setFloat32(offset, p.vx, true); offset += 4;
    view.setFloat32(offset, p.vy, true); offset += 4;
    view.setFloat32(offset, p.health, true); offset += 4;
    view.setFloat32(offset, p.maxHealth, true); offset += 4;
    view.setUint32(offset, p.score, true); offset += 4;
    // name: 12 bytes, null-padded ASCII
    const nameBytes = enc.encode(p.name.slice(0, 12));
    new Uint8Array(buf, offset, 12).set(nameBytes);
    offset += 12;
  }

  view.setUint16(offset, bullets.length, true); offset += 2;
  for (const b of bullets) {
    view.setUint16(offset, b.id, true); offset += 2;
    view.setUint8(offset, b.ownerId); offset++;
    view.setUint8(offset, 0); offset++; // tankType / reserved
    view.setFloat32(offset, b.x, true); offset += 4;
    view.setFloat32(offset, b.y, true); offset += 4;
    view.setFloat32(offset, b.vx, true); offset += 4;
    view.setFloat32(offset, b.vy, true); offset += 4;
  }

  if (DEBUG) {
    console.debug(
      `DEBUG [encoder] SNAPSHOT tick=${tick} players=${players.length} bullets=${bullets.length} size=${size}`,
    );
  }
  return new Uint8Array(buf);
}

// ─── PLAYER_JOINED ──────────────────────────────────────────────────────────
// [op:1][playerId:u8][nameLen:u8][name:N]

export function encodePlayerJoined(playerId: number, name: string): Uint8Array {
  const nameBytes = new TextEncoder().encode(name.slice(0, 32));
  const buf = new Uint8Array(1 + 1 + 1 + nameBytes.length);
  buf[0] = ServerOp.PLAYER_JOINED;
  buf[1] = playerId;
  buf[2] = nameBytes.length;
  buf.set(nameBytes, 3);

  if (DEBUG) {
    console.debug(`DEBUG [encoder] PLAYER_JOINED playerId=${playerId} name=${name} size=${buf.length}`);
  }
  return buf;
}

// ─── PLAYER_LEFT ────────────────────────────────────────────────────────────
// [op:1][playerId:u8]

export function encodePlayerLeft(playerId: number): Uint8Array {
  if (DEBUG) {
    console.debug(`DEBUG [encoder] PLAYER_LEFT playerId=${playerId} size=2`);
  }
  return new Uint8Array([ServerOp.PLAYER_LEFT, playerId]);
}

// ─── DEATH ──────────────────────────────────────────────────────────────────
// [op:1][killedById:u8]

export function encodeDeath(killedById: number): Uint8Array {
  if (DEBUG) {
    console.debug(`DEBUG [encoder] DEATH killedById=${killedById} size=2`);
  }
  return new Uint8Array([ServerOp.DEATH, killedById]);
}

// ─── LEVEL_UP ───────────────────────────────────────────────────────────────
// [op:1][playerId:u8][newLevel:u8][evolutionCount:u8][tankType...]

export function encodeLevelUp(
  playerId: number,
  newLevel: number,
  evolutionChoices: number[],
): Uint8Array {
  const buf = new Uint8Array(1 + 1 + 1 + 1 + evolutionChoices.length);
  buf[0] = ServerOp.LEVEL_UP;
  buf[1] = playerId;
  buf[2] = newLevel;
  buf[3] = evolutionChoices.length;
  buf.set(evolutionChoices, 4);

  if (DEBUG) {
    console.debug(
      `DEBUG [encoder] LEVEL_UP playerId=${playerId} level=${newLevel} choices=${evolutionChoices} size=${buf.length}`,
    );
  }
  return buf;
}

// ─── ROOM_FULL ──────────────────────────────────────────────────────────────
// [op:1]

export function encodeRoomFull(): Uint8Array {
  if (DEBUG) {
    console.debug('DEBUG [encoder] ROOM_FULL size=1');
  }
  return new Uint8Array([ServerOp.ROOM_FULL]);
}
