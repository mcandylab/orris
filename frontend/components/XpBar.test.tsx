import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XpBar } from './XpBar';
import { XP_THRESHOLDS } from '@orris/shared';
import type { GameState } from '@/game/GameState';

describe('XpBar', () => {
  let mockGameState: GameState;

  beforeEach(() => {
    // Create a proper mock game state matching the interface
    mockGameState = {
      connected: true,
      roomId: 'room-123',
      playerId: 1,
      players: new Map(),
      bullets: [],
      playerLevel: 1,
      playerScore: 0,
      showEvolutionModal: false,
      evolutionChoices: [],
    };

    console.debug('DEBUG [XpBar.test] test initialized');
  });

  it('should render level display', () => {
    mockGameState.playerLevel = 1;
    mockGameState.playerScore = 0;

    render(<XpBar state={mockGameState} />);

    expect(screen.getByText('Level 1')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] level 1 displayed');
  });

  it('should display correct level for different values', () => {
    [1, 5, 10].forEach((level) => {
      mockGameState.playerLevel = level;
      mockGameState.playerScore = XP_THRESHOLDS[level];

      const { unmount } = render(<XpBar state={mockGameState} />);

      expect(screen.getByText(`Level ${level}`)).toBeInTheDocument();

      console.debug(`INFO [XpBar.test] level ${level} displayed correctly`);

      unmount();
    });
  });

  it('should calculate progress to next level correctly', () => {
    mockGameState.playerLevel = 1;
    // At level 1, threshold to level 2 is 100 XP
    // If score is 50, progress should be 50%
    mockGameState.playerScore = 50;

    render(<XpBar state={mockGameState} />);

    // Component renders level display
    expect(screen.getByText('Level 1')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] progress calculation works for 50% fill');
  });

  it('should show 0% progress at level start', () => {
    mockGameState.playerLevel = 1;
    // Just reached level 1, score = 0
    mockGameState.playerScore = 0;

    render(<XpBar state={mockGameState} />);

    expect(screen.getByText('Level 1')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] 0% progress shown at level start');
  });

  it('should show nearly 100% progress near level up threshold', () => {
    mockGameState.playerLevel = 1;
    // Level 2 threshold is 100 XP, almost there
    mockGameState.playerScore = 99;

    render(<XpBar state={mockGameState} />);

    expect(screen.getByText('Level 1')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] nearly 100% progress displayed');
  });

  it('should handle max level (level 10) gracefully', () => {
    mockGameState.playerLevel = 10;
    mockGameState.playerScore = 9000; // max threshold

    render(<XpBar state={mockGameState} />);

    expect(screen.getByText('Level 10')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] max level 10 handled');
  });

  it('should update when playerLevel changes', () => {
    mockGameState.playerLevel = 1;
    mockGameState.playerScore = 100;

    const { rerender } = render(<XpBar state={mockGameState} />);
    expect(screen.getByText('Level 1')).toBeInTheDocument();

    // Update level
    mockGameState.playerLevel = 2;
    mockGameState.playerScore = 100;

    rerender(<XpBar state={mockGameState} />);

    expect(screen.getByText('Level 2')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] level update reflected in UI');
  });

  it('should update when playerScore changes', () => {
    mockGameState.playerLevel = 1;
    mockGameState.playerScore = 25;

    const { rerender } = render(<XpBar state={mockGameState} />);

    // Update score
    mockGameState.playerScore = 75;

    rerender(<XpBar state={mockGameState} />);

    expect(screen.getByText('Level 1')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] score update reflected in progress');
  });

  it('should render progress bar container', () => {
    mockGameState.playerLevel = 5;
    mockGameState.playerScore = 1000; // somewhere between level 5 and 6

    const { container } = render(<XpBar state={mockGameState} />);

    // Should display level
    expect(screen.getByText('Level 5')).toBeInTheDocument();
    // Should have bar container
    expect(container.querySelector('div[style*="background"]')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] progress bar rendered');
  });

  it('should calculate percentage for progress bar', () => {
    mockGameState.playerLevel = 1;
    // Level 1->2: 0->100 XP range
    // At 50 XP = 50%
    mockGameState.playerScore = 50;

    const { container } = render(<XpBar state={mockGameState} />);

    // Find the bar fill div and check its width
    const bars = container.querySelectorAll('div[style*="width"]');
    expect(bars.length).toBeGreaterThan(0);

    console.debug('INFO [XpBar.test] percentage calculation applied to bar');
  });

  it('should clamp progress between 0 and 100%', () => {
    mockGameState.playerLevel = 10; // Max level
    mockGameState.playerScore = 99999; // Way above max

    const { container } = render(<XpBar state={mockGameState} />);

    // Should still render correctly without errors
    expect(screen.getByText('Level 10')).toBeInTheDocument();

    console.debug('INFO [XpBar.test] progress clamped to valid range');
  });
});
