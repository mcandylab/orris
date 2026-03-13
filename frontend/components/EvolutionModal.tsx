'use client';

import { TankType, TANK_DEFINITIONS } from '@orris/shared';
import { CSSProperties, useState, useEffect } from 'react';
import { calculateStatsDelta, getStatColor } from '../game/StatsUtils';

interface EvolutionModalProps {
  choices: TankType[];
  onSelect: (tankType: TankType) => void;
  tankNames: Record<TankType, string>;
  currentTankType: TankType;
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
  position: 'relative',
});

const statsTooltipStyle: CSSProperties = {
  position: 'absolute',
  bottom: '-220px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  border: '1px solid #4ade80',
  borderRadius: '8px',
  padding: '12px',
  minWidth: '200px',
  fontSize: '12px',
  fontFamily: 'monospace',
  color: '#fff',
  whiteSpace: 'nowrap',
  zIndex: 1001,
  pointerEvents: 'none',
};

const statsRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const EVOLUTION_TIME_SECONDS = 15;

export function EvolutionModal({
  choices,
  onSelect,
  tankNames,
  currentTankType,
}: EvolutionModalProps) {
  const [timeLeft, setTimeLeft] = useState(EVOLUTION_TIME_SECONDS);
  const [selected, setSelected] = useState<TankType | null>(null);
  const [hoveredTank, setHoveredTank] = useState<TankType | null>(null);

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
          {choices.map((choice) => {
            const delta = calculateStatsDelta(currentTankType, choice);
            const isHovered = hoveredTank === choice;

            return (
              <div key={choice} style={{ position: 'relative' }}>
                <button
                  style={choiceButtonStyle(selected === choice)}
                  onClick={() => handleClick(choice)}
                  onMouseEnter={() => {
                    setHoveredTank(choice);
                    console.debug('DEBUG [EvolutionModal] hovering tank:', tankNames[choice]);
                  }}
                  onMouseLeave={() => setHoveredTank(null)}
                >
                  {tankNames[choice] || `Tank ${choice}`}
                </button>

                {isHovered && (
                  <div style={statsTooltipStyle}>
                    <div style={statsRowStyle}>
                      <span>HP:</span>
                      <span style={{ color: getStatColor(delta.health) }}>
                        {delta.health > 0 ? '+' : ''}{delta.health}
                      </span>
                    </div>
                    <div style={statsRowStyle}>
                      <span>Speed:</span>
                      <span style={{ color: getStatColor(delta.speed) }}>
                        {delta.speed > 0 ? '+' : ''}{delta.speed}
                      </span>
                    </div>
                    <div style={statsRowStyle}>
                      <span>Damage:</span>
                      <span style={{ color: getStatColor(delta.damage) }}>
                        {delta.damage > 0 ? '+' : ''}{delta.damage}
                      </span>
                    </div>
                    <div style={statsRowStyle}>
                      <span>RoF:</span>
                      <span style={{ color: getStatColor(delta.fireRate, true) }}>
                        {delta.fireRate > 0 ? '+' : ''}{delta.fireRate}ms
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
