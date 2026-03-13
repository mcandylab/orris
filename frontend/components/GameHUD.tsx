'use client';

import { GameState } from '@/game/GameState';
import { XpBar } from './XpBar';
import { EvolutionModal } from './EvolutionModal';
import { TankNameDisplay } from './TankNameDisplay';
import { TankType } from '@orris/shared';
import { CSSProperties } from 'react';

interface GameHUDProps {
  state: GameState;
  onEvolutionSelect: (tankType: TankType) => void;
}

const TANK_NAMES: Record<TankType, string> = {
  [TankType.BASIC]: 'Basic',
  [TankType.TWIN]: 'Twin',
  [TankType.SNIPER]: 'Sniper',
  [TankType.MACHINE_GUN]: 'Machine Gun',
  [TankType.FLANK_GUARD]: 'Flank Guard',
  [TankType.TRIPLE_SHOT]: 'Triple Shot',
  [TankType.ASSASSIN]: 'Assassin',
  [TankType.HUNTER]: 'Hunter',
  [TankType.DESTROYER]: 'Destroyer',
  [TankType.OVERSEER]: 'Overseer',
};

const hudStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
};

export function GameHUD({ state, onEvolutionSelect }: GameHUDProps) {
  const myPlayer = state.playerId !== null ? state.players.get(state.playerId) : null;

  if (!myPlayer) {
    console.debug('DEBUG [GameHUD] myPlayer not found, skipping render');
    return null;
  }

  const currentTankName = TANK_NAMES[myPlayer.tankType];

  console.debug('DEBUG [GameHUD] rendering with tank:', currentTankName);

  return (
    <div style={hudStyle}>
      <TankNameDisplay tankName={currentTankName} />

      <XpBar state={state} />

      {state.showEvolutionModal && myPlayer && (
        <EvolutionModal
          choices={state.evolutionChoices}
          onSelect={onEvolutionSelect}
          tankNames={TANK_NAMES}
          currentTankType={myPlayer.tankType}
        />
      )}
    </div>
  );
}
