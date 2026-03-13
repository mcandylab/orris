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

/** Tank definitions used by both backend and frontend */
export const TANK_DEFINITIONS: Record<TankType, TankDefinition> = {
  [TankType.BASIC]: {
    type: TankType.BASIC,
    name: 'Basic',
    maxHealth: 100,
    speed: 200,
    radius: 20,
    cannonCount: 1,
    fireRate: 600,
    bulletSpeed: 400,
    bulletDamage: 20,
    bulletLifetime: 2,
    evolvesFrom: null,
    evolvesTo: [TankType.TWIN, TankType.SNIPER, TankType.MACHINE_GUN, TankType.FLANK_GUARD],
    firingPattern: FiringPattern.SINGLE,
  },
  [TankType.TWIN]: {
    type: TankType.TWIN,
    name: 'Twin',
    maxHealth: 110,
    speed: 190,
    radius: 20,
    cannonCount: 2,
    fireRate: 400,
    bulletSpeed: 380,
    bulletDamage: 15,
    bulletLifetime: 2,
    evolvesFrom: TankType.BASIC,
    evolvesTo: [TankType.TRIPLE_SHOT],
    firingPattern: FiringPattern.TWIN,
  },
  [TankType.SNIPER]: {
    type: TankType.SNIPER,
    name: 'Sniper',
    maxHealth: 90,
    speed: 180,
    radius: 18,
    cannonCount: 1,
    fireRate: 1200,
    bulletSpeed: 700,
    bulletDamage: 50,
    bulletLifetime: 3,
    evolvesFrom: TankType.BASIC,
    evolvesTo: [TankType.ASSASSIN, TankType.HUNTER],
    firingPattern: FiringPattern.SINGLE,
  },
  [TankType.MACHINE_GUN]: {
    type: TankType.MACHINE_GUN,
    name: 'Machine Gun',
    maxHealth: 100,
    speed: 195,
    radius: 20,
    cannonCount: 1,
    fireRate: 150,
    bulletSpeed: 350,
    bulletDamage: 8,
    bulletLifetime: 1.5,
    evolvesFrom: TankType.BASIC,
    evolvesTo: [TankType.DESTROYER],
    firingPattern: FiringPattern.SINGLE,
  },
  [TankType.FLANK_GUARD]: {
    type: TankType.FLANK_GUARD,
    name: 'Flank Guard',
    maxHealth: 110,
    speed: 200,
    radius: 20,
    cannonCount: 2,
    fireRate: 600,
    bulletSpeed: 380,
    bulletDamage: 18,
    bulletLifetime: 2,
    evolvesFrom: TankType.BASIC,
    evolvesTo: [TankType.OVERSEER],
    firingPattern: FiringPattern.FLANK,
  },
  [TankType.TRIPLE_SHOT]: {
    type: TankType.TRIPLE_SHOT,
    name: 'Triple Shot',
    maxHealth: 120,
    speed: 185,
    radius: 22,
    cannonCount: 3,
    fireRate: 500,
    bulletSpeed: 360,
    bulletDamage: 14,
    bulletLifetime: 2,
    evolvesFrom: TankType.TWIN,
    evolvesTo: [],
    firingPattern: FiringPattern.TRIPLE_SPREAD,
  },
  [TankType.ASSASSIN]: {
    type: TankType.ASSASSIN,
    name: 'Assassin',
    maxHealth: 80,
    speed: 220,
    radius: 16,
    cannonCount: 1,
    fireRate: 900,
    bulletSpeed: 800,
    bulletDamage: 60,
    bulletLifetime: 3.5,
    evolvesFrom: TankType.SNIPER,
    evolvesTo: [],
    firingPattern: FiringPattern.SINGLE,
  },
  [TankType.HUNTER]: {
    type: TankType.HUNTER,
    name: 'Hunter',
    maxHealth: 95,
    speed: 185,
    radius: 19,
    cannonCount: 2,
    fireRate: 800,
    bulletSpeed: 650,
    bulletDamage: 40,
    bulletLifetime: 3,
    evolvesFrom: TankType.SNIPER,
    evolvesTo: [],
    firingPattern: FiringPattern.DOUBLE_ANGLED,
  },
  [TankType.DESTROYER]: {
    type: TankType.DESTROYER,
    name: 'Destroyer',
    maxHealth: 130,
    speed: 160,
    radius: 25,
    cannonCount: 1,
    fireRate: 1500,
    bulletSpeed: 300,
    bulletDamage: 100,
    bulletLifetime: 2,
    evolvesFrom: TankType.MACHINE_GUN,
    evolvesTo: [],
    firingPattern: FiringPattern.SINGLE,
  },
  [TankType.OVERSEER]: {
    type: TankType.OVERSEER,
    name: 'Overseer',
    maxHealth: 120,
    speed: 175,
    radius: 22,
    cannonCount: 0,
    fireRate: 1000,
    bulletSpeed: 300,
    bulletDamage: 15,
    bulletLifetime: 5,
    evolvesFrom: TankType.FLANK_GUARD,
    evolvesTo: [],
    firingPattern: FiringPattern.SINGLE,
  },
};

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
