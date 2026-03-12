import { describe, it, expect } from 'vitest';
import { decode, JoinMessage, InputMessage, ChooseEvolutionMessage } from './decoder';
import { ClientOp, TankType } from '@orris/shared';

function makeBuffer(...bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('decoder', () => {
  it('returns null for empty buffer', () => {
    expect(decode(new ArrayBuffer(0))).toBeNull();
  });

  it('returns null for unknown op', () => {
    expect(decode(makeBuffer(0xff))).toBeNull();
  });

  it('decodes JOIN message', () => {
    const name = 'Alice';
    const nameBytes = new TextEncoder().encode(name);
    const buf = new Uint8Array([ClientOp.JOIN, nameBytes.length, ...nameBytes]);
    const msg = decode(buf.buffer) as JoinMessage | null;

    expect(msg).not.toBeNull();
    expect(msg!.op).toBe(ClientOp.JOIN);
    expect(msg!.name).toBe(name);
  });

  it('returns null for JOIN with missing name bytes', () => {
    // says nameLen=10 but only 3 name bytes follow
    const buf = makeBuffer(ClientOp.JOIN, 10, 65, 66, 67);
    expect(decode(buf)).toBeNull();
  });

  it('decodes INPUT message', () => {
    const buf = new ArrayBuffer(10);
    const view = new DataView(buf);
    new Uint8Array(buf)[0] = ClientOp.INPUT;
    view.setFloat32(1, 0.5, true);   // dx
    view.setFloat32(5, -0.5, true);  // dy
    new Uint8Array(buf)[9] = 1;      // shoot = true

    const msg = decode(buf) as InputMessage | null;
    expect(msg).not.toBeNull();
    expect(msg!.op).toBe(ClientOp.INPUT);
    expect(msg!.dx).toBeCloseTo(0.5);
    expect(msg!.dy).toBeCloseTo(-0.5);
    expect(msg!.shoot).toBe(true);
  });

  it('returns null for INPUT with too few bytes', () => {
    const buf = makeBuffer(ClientOp.INPUT, 1, 2, 3); // only 4 bytes
    expect(decode(buf)).toBeNull();
  });

  it('decodes SPAWN message', () => {
    const buf = makeBuffer(ClientOp.SPAWN);
    const msg = decode(buf);
    expect(msg).not.toBeNull();
    expect(msg!.op).toBe(ClientOp.SPAWN);
  });

  it('decodes CHOOSE_EVOLUTION message', () => {
    const buf = makeBuffer(ClientOp.CHOOSE_EVOLUTION, TankType.SNIPER);
    const msg = decode(buf) as ChooseEvolutionMessage | null;
    expect(msg).not.toBeNull();
    expect(msg!.op).toBe(ClientOp.CHOOSE_EVOLUTION);
    expect(msg!.tankType).toBe(TankType.SNIPER);
  });

  it('returns null for CHOOSE_EVOLUTION with no tankType byte', () => {
    const buf = makeBuffer(ClientOp.CHOOSE_EVOLUTION);
    expect(decode(buf)).toBeNull();
  });
});
