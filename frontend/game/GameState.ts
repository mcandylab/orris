import { PlayerState, BulletState, TankType, XP_THRESHOLDS, MAX_LEVEL } from '@orris/shared';

export interface GameState {
  connected: boolean;
  roomId: string | null;
  playerId: number | null;
  players: Map<number, PlayerState>;
  bullets: BulletState[];
  
  playerLevel: number;
  playerScore: number;
  
  showEvolutionModal: boolean;
  evolutionChoices: TankType[];
}

export function createInitialGameState(): GameState {
  return {
    connected: false,
    roomId: null,
    playerId: null,
    players: new Map(),
    bullets: [],
    playerLevel: 1,
    playerScore: 0,
    showEvolutionModal: false,
    evolutionChoices: [],
  };
}

export function getXpForLevel(level: number): number {
  if (level < 1 || level > MAX_LEVEL) return 0;
  return XP_THRESHOLDS[level] ?? 0;
}

export function getXpToNextLevel(currentLevel: number, currentScore: number): number {
  if (currentLevel >= MAX_LEVEL) return 0;
  const nextLevelThreshold = getXpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelThreshold - currentScore);
}

export function getXpProgress(currentLevel: number, currentScore: number): number {
  if (currentLevel >= MAX_LEVEL) return 1;
  const currentLevelThreshold = getXpForLevel(currentLevel);
  const nextLevelThreshold = getXpForLevel(currentLevel + 1);
  const progress = (currentScore - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold);
  return Math.min(1, Math.max(0, progress));
}
