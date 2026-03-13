'use client';

import { TankType } from '@orris/shared';
import { CSSProperties, useState, useEffect } from 'react';

interface EvolutionModalProps {
  choices: TankType[];
  onSelect: (tankType: TankType) => void;
  tankNames: Record<TankType, string>;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: CSSProperties = {
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '500px',
  width: '90%',
  textAlign: 'center',
};

const titleStyle: CSSProperties = {
  color: '#fff',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '8px',
};

const subtitleStyle: CSSProperties = {
  color: '#aaa',
  fontSize: '14px',
  marginBottom: '24px',
};

const timerStyle: CSSProperties = {
  color: '#f87171',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
};

const choicesContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const choiceButtonStyle: (isSelected: boolean) => CSSProperties = (isSelected) => ({
  backgroundColor: isSelected ? '#4ade80' : '#333',
  border: `2px solid ${isSelected ? '#4ade80' : '#555'}`,
  borderRadius: '8px',
  padding: '16px 24px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  color: isSelected ? '#000' : '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  minWidth: '120px',
});

const EVOLUTION_TIME_SECONDS = 15;

export function EvolutionModal({ choices, onSelect, tankNames }: EvolutionModalProps) {
  const [timeLeft, setTimeLeft] = useState(EVOLUTION_TIME_SECONDS);
  const [selected, setSelected] = useState<TankType | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (choices.length > 0) {
        onSelect(choices[0]);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, choices, onSelect]);

  const handleClick = (tankType: TankType) => {
    setSelected(tankType);
    onSelect(tankType);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={titleStyle}>Level Up!</h2>
        <p style={subtitleStyle}>Choose your evolution</p>
        
        <div style={timerStyle}>Time: {timeLeft}s</div>
        
        <div style={choicesContainerStyle}>
          {choices.map((choice) => (
            <button
              key={choice}
              style={choiceButtonStyle(selected === choice)}
              onClick={() => handleClick(choice)}
            >
              {tankNames[choice] || `Tank ${choice}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
