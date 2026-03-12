import { BulletState, MAP_WIDTH, MAP_HEIGHT } from '@orris/shared';

export class Bullet {
  id: number;
  ownerId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetime: number; // remaining lifetime in seconds
  alive: boolean = true;

  constructor(
    id: number,
    ownerId: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    lifetime: number,
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.lifetime = lifetime;
  }

  /**
   * Advance bullet position. Returns false if bullet should be removed.
   */
  update(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    if (
      this.lifetime <= 0 ||
      this.x < 0 ||
      this.x > MAP_WIDTH ||
      this.y < 0 ||
      this.y > MAP_HEIGHT
    ) {
      this.alive = false;
    }

    return this.alive;
  }

  toState(): BulletState {
    return {
      id: this.id,
      ownerId: this.ownerId,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
    };
  }
}
