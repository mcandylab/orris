import { TankType } from '@orris/shared';
import { Room, Logger } from './types';
import { PlayerState, BulletState } from '@orris/shared';
import { validateAndClampInput, applyValidatedInput } from '../systems/InputSystem';
import { applyMovement } from '../systems/PhysicsSystem';
import { processShooting, updateBullets, resolveHits } from '../systems/CombatSystem';
import { awardKillXp, checkLevelUp } from '../systems/XpSystem';

const TICK_INTERVAL_MS = 50; // 20 TPS
const LOG_EVERY_N_TICKS = 100;

export interface SnapshotPayload {
  tick: number;
  players: PlayerState[];
  bullets: BulletState[];
}

export interface GameLoopCallbacks {
  /** Fired after a player's health reaches 0 */
  onPlayerDied?: (victimId: number, killerId: number) => void;
  /** Fired when a player reaches a new level; choices is non-empty only on evolution levels */
  onPlayerLevelUp?: (playerId: number, level: number, choices: TankType[]) => void;
}

export class GameLoop {
  private interval: ReturnType<typeof setInterval> | null = null;
  private room: Room;
  private onSnapshot: (payload: SnapshotPayload) => void;
  private callbacks: GameLoopCallbacks;
  private logger: Logger;
  private lastTickTime: number = 0;

  constructor(
    room: Room,
    onSnapshot: (payload: SnapshotPayload) => void,
    logger: Logger,
    callbacks: GameLoopCallbacks = {},
  ) {
    this.room = room;
    this.onSnapshot = onSnapshot;
    this.logger = logger;
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.interval !== null) return;

    this.lastTickTime = Date.now();
    this.interval = setInterval(() => this.tick(), TICK_INTERVAL_MS);

    this.logger.info(
      { roomId: this.room.id, tickIntervalMs: TICK_INTERVAL_MS },
      'INFO [GameLoop] loop started',
    );
  }

  stop(): void {
    if (this.interval === null) return;
    clearInterval(this.interval);
    this.interval = null;
    this.logger.info({ roomId: this.room.id }, 'INFO [GameLoop] loop stopped');
  }

  private tick(): void {
    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000; // seconds
    this.lastTickTime = now;

    const room = this.room;
    room.tick++;

    // ── 1. Input validation + movement ──────────────────────────────────────
    for (const player of room.players.values()) {
      if (!player.alive) continue;

      if (player.pendingInput) {
        const validated = validateAndClampInput(player.pendingInput, player.id, this.logger);
        if (validated) {
          applyValidatedInput(player, validated);
          applyMovement(player, validated, dt);
        }
        player.pendingInput = null;
      }
    }

    // ── 2. Combat: shooting ─────────────────────────────────────────────────
    for (const player of room.players.values()) {
      if (player.alive) {
        processShooting(room, player, now, this.logger);
      }
    }

    // ── 3. Combat: bullet movement + collision ───────────────────────────────
    updateBullets(room, dt);
    const kills = resolveHits(room, this.logger);

    // ── 4. XP + level-up ────────────────────────────────────────────────────
    for (const kill of kills) {
      const killer = room.players.get(kill.killerId);
      const victim = room.players.get(kill.killedId);

      if (killer && victim) {
        awardKillXp(killer, victim);
        const levelUp = checkLevelUp(killer, this.logger);

        if (levelUp) {
          this.callbacks.onPlayerLevelUp?.(
            levelUp.playerId,
            levelUp.newLevel,
            levelUp.evolutionChoices,
          );
        }
      }

      this.callbacks.onPlayerDied?.(kill.killedId, kill.killerId);
    }

    // ── 5. Periodic debug log ────────────────────────────────────────────────
    if (room.tick % LOG_EVERY_N_TICKS === 0) {
      this.logger.debug(
        {
          roomId: room.id,
          tick: room.tick,
          players: room.players.size,
          alivePlayers: [...room.players.values()].filter(p => p.alive).length,
          bullets: room.bullets.size,
        },
        'DEBUG [GameLoop] tick',
      );
    }

    // ── 6. Snapshot (alive players only) ────────────────────────────────────
    const players = Array.from(room.players.values())
      .filter(p => p.alive)
      .map(p => p.toState());
    const bullets = Array.from(room.bullets.values()).map(b => b.toState());

    this.onSnapshot({ tick: room.tick, players, bullets });
  }
}
