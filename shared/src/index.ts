// ─── WebSocket Protocol Op-codes ─────────────────────────────────────────────

/** Messages sent from client to server */
export enum ClientOp {
  JOIN  = 0x01, // join a room with a player name
  INPUT = 0x02, // movement + shoot intent
  SPAWN = 0x03, // respawn after death
  CHOOSE_EVOLUTION = 0x04, // choose a tank evolution after level-up
}

/** Messages sent from server to client */
export enum ServerOp {
  WELCOME    = 0x01, // player id + room metadata
  SNAPSHOT   = 0x02, // full or delta state snapshot
  DEATH      = 0x03, // this player died
  LEVEL_UP   = 0x04, // player leveled up — includes evolution choices
  ROOM_FULL  = 0x05, // current room is full, redirect to new one
  PLAYER_JOINED = 0x06, // another player joined this room
  PLAYER_LEFT   = 0x07, // another player left this room
}

// ─── Game State Types ─────────────────────────────────────────────────────────

export interface PlayerState {
  id: number;       // numeric id (1-byte, 0-255 per room)
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  score: number;
  level: number;
  tankType: TankType;
}

export interface BulletState {
  id: number;       // u16
  ownerId: number;  // numeric player id
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface RoomInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  state: 'waiting' | 'running' | 'closing';
}

// ─── Tank Definitions ─────────────────────────────────────────────────────────

export enum TankType {
  // Tier 1 (starting tank)
  BASIC        = 0,

  // Tier 2 evolutions
  TWIN         = 1,  // two front cannons
  SNIPER       = 2,  // single long-range cannon
  MACHINE_GUN  = 3,  // rapid-fire single cannon
  FLANK_GUARD  = 4,  // front + back cannon

  // Tier 3 evolutions
  TRIPLE_SHOT  = 5,
  ASSASSIN     = 6,
  HUNTER       = 7,
  DESTROYER    = 8,
  OVERSEER     = 9,  // spawns drones
}

/** Firing pattern for tanks - determines how bullets are spread */
export enum FiringPattern {
  SINGLE = 0,       // one central bullet
  TWIN = 1,         // two front-facing bullets
  FLANK = 2,        // front + back bullet (Flank Guard)
  TRIPLE_SPREAD = 3, // three bullets in a spread
  DOUBLE_ANGLED = 4, // two angled bullets (Hunter)
}

export interface TankDefinition {
  type: TankType;
  name: string;
  maxHealth: number;
  speed: number;         // pixels per second
  radius: number;        // collision radius
  cannonCount: number;
  fireRate: number;      // ms between shots
  bulletSpeed: number;
  bulletDamage: number;
  bulletLifetime: number; // seconds
  evolvesFrom: TankType | null;
  evolvesTo: TankType[];
  firingPattern: FiringPattern;
}

// ─── XP & Leveling ────────────────────────────────────────────────────────────

/** XP required to reach each level. Index = level (1-based). */
export const XP_THRESHOLDS: readonly number[] = [
  0,     // level 0 (unused)
  0,     // level 1 (starting)
  100,   // level 2
  250,   // level 3
  500,   // level 4
  900,   // level 5
  1500,  // level 6
  2500,  // level 7
  4000,  // level 8
  6000,  // level 9
  9000,  // level 10
];

export const MAX_LEVEL = XP_THRESHOLDS.length - 1;

/** Levels at which the player may evolve their tank */
export const EVOLUTION_LEVELS: readonly number[] = [3, 6, 9];

// ─── Map Constants ────────────────────────────────────────────────────────────

export const MAP_WIDTH  = 4000; // pixels
export const MAP_HEIGHT = 4000;

// ─── API Types ────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface PlayerStats {
  userId: string;
  username: string;
  totalKills: number;
  totalDeaths: number;
  bestScore: number;
  totalGamesPlayed: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  bestScore: number;
  totalKills: number;
}
