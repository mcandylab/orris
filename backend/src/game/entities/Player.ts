import { PlayerState, TankType, MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';
import { PlayerInput } from '../engine/types';
import { getTankDefinition } from './Tank';

export class Player {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  health: number;
  maxHealth: number;
  score: number = 0;
  level: number = 1;
  tankType: TankType;
  pendingInput: PlayerInput | null = null;
  alive: boolean = true;

  /** Aim direction — updated by PhysicsSystem on each move tick */
  lastAimDx: number = 1;
  lastAimDy: number = 0;

  /** Timestamp (ms) of the last bullet fired — used by CombatSystem for fire-rate cooldown */
  lastShootTime: number = 0;

  constructor(id: number, name: string, tankType: TankType = TankType.BASIC) {
    this.id = id;
    this.name = name;
    this.tankType = tankType;
    const def = getTankDefinition(tankType);
    this.maxHealth = def.maxHealth;
    this.health = def.maxHealth;
    // Spawn at a random position within the map
    this.x = 100 + Math.random() * (MAP_WIDTH - 200);
    this.y = 100 + Math.random() * (MAP_HEIGHT - 200);
  }

  /**
   * Reset the player to a fresh alive state for respawn.
   * Preserves level, tankType and score.
   */
  respawn(): void {
    const def = getTankDefinition(this.tankType);
    this.maxHealth = def.maxHealth;
    this.health = def.maxHealth;
    this.alive = true;
    this.pendingInput = null;
    this.x = 100 + Math.random() * (MAP_WIDTH - 200);
    this.y = 100 + Math.random() * (MAP_HEIGHT - 200);
  }

  toState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      health: this.health,
      maxHealth: this.maxHealth,
      score: this.score,
      level: this.level,
      tankType: this.tankType,
    };
  }
}
