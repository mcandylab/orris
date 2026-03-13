import { ClientOp, ServerOp, PlayerState, BulletState, TankType } from '@orris/shared';
import { GameState, createInitialGameState } from './GameState';

export type GameStateListener = (state: GameState) => void;
export type LevelUpListener = (level: number, choices: TankType[]) => void;
export type DeathListener = () => void;

export class GameClient {
  private ws: WebSocket | null = null;
  private state: GameState;
  private stateListeners: GameStateListener[] = [];
  private levelUpListeners: LevelUpListener[] = [];
  private deathListeners: DeathListener[] = [];
  private serverUrl: string;

  constructor(serverUrl: string = 'ws://localhost:3002') {
    this.serverUrl = serverUrl;
    this.state = createInitialGameState();
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => {
      this.state.connected = true;
      this.notifyStateChange();
      console.debug('DEBUG [GameClient] connected to', this.serverUrl);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(new Uint8Array(event.data));
    };

    this.ws.onclose = () => {
      this.state.connected = false;
      this.notifyStateChange();
      console.debug('DEBUG [GameClient] disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('ERROR [GameClient] WebSocket error:', error);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.state = createInitialGameState();
  }

  join(name: string): void {
    this.sendJoin(name);
  }

  sendInput(dx: number, dy: number, shoot: boolean): void {
    if (!this.state.connected || this.ws?.readyState !== WebSocket.OPEN) return;
    
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint8(0, ClientOp.INPUT);
    view.setInt8(1, Math.round(dx * 127));
    view.setInt8(2, Math.round(dy * 127));
    view.setUint8(3, shoot ? 1 : 0);
    
    this.ws.send(buffer);
  }

  sendEvolutionChoice(tankType: TankType): void {
    if (!this.state.connected || this.ws?.readyState !== WebSocket.OPEN) return;

    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, ClientOp.CHOOSE_EVOLUTION);
    view.setUint8(1, tankType);

    this.ws.send(buffer);

    this.state.showEvolutionModal = false;
    this.notifyStateChange();

    console.debug('DEBUG [GameClient] CHOOSE_EVOLUTION sent', tankType);
  }

  spawn(): void {
    if (!this.state.connected || this.ws?.readyState !== WebSocket.OPEN) return;

    const buffer = new ArrayBuffer(1);
    new DataView(buffer).setUint8(0, ClientOp.SPAWN);
    this.ws.send(buffer);

    console.debug('DEBUG [GameClient] SPAWN sent');
  }

  onStateChange(listener: GameStateListener): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  onLevelUp(listener: LevelUpListener): () => void {
    this.levelUpListeners.push(listener);
    return () => {
      this.levelUpListeners = this.levelUpListeners.filter(l => l !== listener);
    };
  }

  onDeath(listener: DeathListener): () => void {
    this.deathListeners.push(listener);
    return () => {
      this.deathListeners = this.deathListeners.filter(l => l !== listener);
    };
  }

  getState(): GameState {
    return this.state;
  }

  private sendJoin(name: string): void {
    if (!this.state.connected || this.ws?.readyState !== WebSocket.OPEN) return;

    const nameBytes = new TextEncoder().encode(name);
    const buffer = new ArrayBuffer(1 + nameBytes.length);
    const view = new DataView(buffer);
    view.setUint8(0, ClientOp.JOIN);
    for (let i = 0; i < nameBytes.length; i++) {
      view.setUint8(1 + i, nameBytes[i]);
    }

    this.ws.send(buffer);
    console.debug('DEBUG [GameClient] JOIN sent', name);
  }

  private handleMessage(data: Uint8Array): void {
    if (data.length < 1) return;

    const op = data[0] as ServerOp;
    console.debug('DEBUG [GameClient] received op=', op);

    switch (op) {
      case ServerOp.WELCOME:
        this.handleWelcome(data);
        break;
      case ServerOp.SNAPSHOT:
        this.handleSnapshot(data);
        break;
      case ServerOp.LEVEL_UP:
        this.handleLevelUp(data);
        break;
      case ServerOp.DEATH:
        this.handleDeath(data);
        break;
      case ServerOp.PLAYER_JOINED:
      case ServerOp.PLAYER_LEFT:
      case ServerOp.ROOM_FULL:
        break;
    }
  }

  private handleWelcome(data: Uint8Array): void {
    if (data.length < 3) return;

    const view = new DataView(data.buffer, data.byteOffset);
    this.state.playerId = view.getUint8(1);
    
    const nameLen = data.length - 2;
    const nameBytes = data.slice(2, 2 + nameLen);
    const roomId = new TextDecoder().decode(nameBytes);

    this.state.roomId = roomId;
    this.notifyStateChange();

    console.debug('DEBUG [GameClient] WELCOME playerId=', this.state.playerId, 'roomId=', roomId);
  }

  private handleSnapshot(data: Uint8Array): void {
    const view = new DataView(data.buffer, data.byteOffset);
    let offset = 1;

    if (offset + 1 > data.length) return;
    const playerCount = view.getUint8(offset++);
    
    this.state.players.clear();
    
    for (let i = 0; i < playerCount; i++) {
      if (offset + 20 > data.length) break;
      
      const id = view.getUint8(offset++);
      const x = view.getInt16(offset); offset += 2;
      const y = view.getInt16(offset); offset += 2;
      const vx = view.getInt8(offset++);
      const vy = view.getInt8(offset++);
      const health = view.getUint8(offset++);
      const maxHealth = view.getUint8(offset++);
      const score = view.getUint16(offset); offset += 2;
      const level = view.getUint8(offset++);
      const tankType = view.getUint8(offset++);
      
      const nameLen = view.getUint8(offset++);
      if (offset + nameLen > data.length) break;
      const nameBytes = data.slice(offset, offset + nameLen);
      const name = new TextDecoder().decode(nameBytes);
      offset += nameLen;

      const player: PlayerState = { id, name, x, y, vx, vy, health, maxHealth, score, level, tankType };
      this.state.players.set(id, player);

      if (id === this.state.playerId) {
        this.state.playerLevel = level;
        this.state.playerScore = score;
      }
    }

    if (offset + 1 > data.length) {
      this.state.bullets = [];
      return;
    }

    const bulletCount = view.getUint8(offset++);
    this.state.bullets = [];

    for (let i = 0; i < bulletCount; i++) {
      if (offset + 9 > data.length) break;
      
      const id = view.getUint16(offset); offset += 2;
      const ownerId = view.getUint8(offset++);
      const x = view.getInt16(offset); offset += 2;
      const y = view.getInt16(offset); offset += 2;
      const vx = view.getInt8(offset++);
      const vy = view.getInt8(offset++);

      this.state.bullets.push({ id, ownerId, x, y, vx, vy });
    }

    this.notifyStateChange();
  }

  private handleLevelUp(data: Uint8Array): void {
    if (data.length < 3) return;

    const view = new DataView(data.buffer, data.byteOffset);
    const newLevel = view.getUint8(1);
    const choiceCount = view.getUint8(2);
    
    const choices: TankType[] = [];
    for (let i = 0; i < choiceCount; i++) {
      if (3 + i >= data.length) break;
      choices.push(data[3 + i] as TankType);
    }

    this.state.playerLevel = newLevel;
    this.state.evolutionChoices = choices;
    this.state.showEvolutionModal = choices.length > 0;
    
    this.notifyStateChange();

    for (const listener of this.levelUpListeners) {
      listener(newLevel, choices);
    }

    console.debug('DEBUG [GameClient] LEVEL_UP level=', newLevel, 'choices=', choices);
  }

  private handleDeath(_data: Uint8Array): void {
    this.state.showEvolutionModal = false;
    this.notifyStateChange();

    for (const listener of this.deathListeners) {
      listener();
    }

    console.debug('DEBUG [GameClient] DEATH received');
  }

  private notifyStateChange(): void {
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }
}
