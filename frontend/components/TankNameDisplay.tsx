'use client';

import { CSSProperties } from 'react';

interface TankNameDisplayProps {
  tankName: string;
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  top: 20,
  left: 50,
  padding: '8px 16px',
  backgroundColor: 'rgba(26, 26, 46, 0.85)',
  borderRadius: '8px',
  border: '2px solid #4ade80',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  fontFamily: 'Arial, sans-serif',
  pointerEvents: 'none',
  zIndex: 100,
};

const labelStyle: CSSProperties = {
  color: '#aaa',
  fontSize: '12px',
  fontWeight: 'normal',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '2px',
};

const nameStyle: CSSProperties = {
  color: '#4ade80',
  fontSize: '16px',
  fontWeight: 'bold',
};

export function TankNameDisplay({ tankName }: TankNameDisplayProps) {
  return (
    <div style={containerStyle}>
      <div style={labelStyle}>Tank</div>
      <div style={nameStyle}>{tankName}</div>
    </div>
  );
}
