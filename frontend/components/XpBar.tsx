'use client';

import { GameState, getXpProgress } from '../game/GameState';
import { CSSProperties } from 'react';

interface XpBarProps {
  state: GameState;
}

const xpBarContainerStyle: CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '300px',
  padding: '8px 12px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '8px',
  fontFamily: 'sans-serif',
};

const levelStyle: CSSProperties = {
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  marginBottom: '4px',
};

const barBackgroundStyle: CSSProperties = {
  width: '100%',
  height: '12px',
  backgroundColor: '#333',
  borderRadius: '6px',
  overflow: 'hidden',
};

const barFillStyle: CSSProperties = {
  height: '100%',
  backgroundColor: '#4ade80',
  borderRadius: '6px',
  transition: 'width 0.3s ease',
};

export function XpBar({ state }: XpBarProps) {
  const progress = getXpProgress(state.playerLevel, state.playerScore);
  const percentage = Math.round(progress * 100);

  return (
    <div style={xpBarContainerStyle}>
      <div style={levelStyle}>Level {state.playerLevel}</div>
      <div style={barBackgroundStyle}>
        <div
          style={{
            ...barFillStyle,
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}
