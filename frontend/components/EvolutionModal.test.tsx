import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TankType } from '@orris/shared';
import { EvolutionModal } from './EvolutionModal';

describe('EvolutionModal', () => {
  const mockOnSelect = vi.fn();
  const tankNames: Record<TankType, string> = {
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

  beforeEach(() => {
    mockOnSelect.mockClear();
    console.debug('DEBUG [EvolutionModal.test] test started');
  });

  it('should render modal with correct title', () => {
    const choices = [TankType.TWIN, TankType.SNIPER];

    render(
      <EvolutionModal
        choices={choices}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    expect(screen.getByText('Level Up!')).toBeInTheDocument();
    expect(screen.getByText('Choose your evolution')).toBeInTheDocument();

    console.debug('INFO [EvolutionModal.test] title rendered correctly');
  });

  it('should render all evolution choices as buttons', () => {
    const choices = [TankType.TWIN, TankType.SNIPER, TankType.MACHINE_GUN];

    render(
      <EvolutionModal
        choices={choices}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    choices.forEach((tankType) => {
      const button = screen.getByRole('button', {
        name: tankNames[tankType],
      });
      expect(button).toBeInTheDocument();
    });

    console.debug('INFO [EvolutionModal.test] all choice buttons rendered');
  });

  it('should display timer and countdown', async () => {
    const choices = [TankType.TWIN];

    render(
      <EvolutionModal
        choices={choices}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    const timer = screen.getByText(/Time: \d+s/);
    expect(timer).toBeInTheDocument();
    expect(timer).toHaveTextContent('Time: 15s');

    console.debug('INFO [EvolutionModal.test] timer initialized to 15s');

    // Wait for timer to decrement
    await waitFor(
      () => {
        expect(timer).toHaveTextContent('Time: 14s');
      },
      { timeout: 2000 },
    );

    console.debug('INFO [EvolutionModal.test] timer counts down');
  });

  it('should call onSelect when button is clicked', async () => {
    const choices = [TankType.TWIN, TankType.SNIPER];

    render(
      <EvolutionModal
        choices={choices}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    const twinButton = screen.getByRole('button', { name: 'Twin' });
    fireEvent.click(twinButton);

    expect(mockOnSelect).toHaveBeenCalledWith(TankType.TWIN);
    expect(mockOnSelect).toHaveBeenCalledTimes(1);

    console.debug('INFO [EvolutionModal.test] onSelect callback fired on click');
  });

  it(
    'should auto-select first choice when timer expires',
    { timeout: 10000 },
    async () => {
      vi.useFakeTimers();

      const choices = [TankType.SNIPER, TankType.MACHINE_GUN];

      render(
        <EvolutionModal
          choices={choices}
          onSelect={mockOnSelect}
          tankNames={tankNames}
          currentTankType={TankType.BASIC}
        />,
      );

      // Advance timer to 0 - wrap in act() to ensure React state updates are flushed
      act(() => {
        vi.advanceTimersByTime(15 * 1000 + 100); // 15 seconds + buffer
      });

      expect(mockOnSelect).toHaveBeenCalledWith(TankType.SNIPER); // first choice

      console.debug('INFO [EvolutionModal.test] auto-select triggered on timeout');

      vi.useRealTimers();
    },
  );

  it('should highlight selected choice', () => {
    const choices = [TankType.TWIN, TankType.SNIPER];

    const { rerender } = render(
      <EvolutionModal
        choices={choices}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    const twinButton = screen.getByRole('button', { name: 'Twin' });

    // Initially not selected (white text)
    expect(twinButton).toHaveStyle({ color: '#fff' });

    // Click to select
    fireEvent.click(twinButton);

    // Rerender to trigger state update
    rerender(
      <EvolutionModal
        choices={choices}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    // After selection, should have green highlight
    expect(twinButton).toHaveStyle({
      backgroundColor: '#4ade80',
      color: '#000',
    });

    console.debug('INFO [EvolutionModal.test] selection highlight works');
  });

  it(
    'should show stats preview on hover',
    { timeout: 10000 },
    async () => {
      const choices = [TankType.TWIN];

      render(
        <EvolutionModal
          choices={choices}
          onSelect={mockOnSelect}
          tankNames={tankNames}
          currentTankType={TankType.BASIC}
        />,
      );

      const button = screen.getByRole('button', { name: 'Twin' });

      // Hover to show stats
      fireEvent.mouseEnter(button);

      // Should show stats comparison (BASIC -> TWIN)
      // HP: 100 -> 110 = +10
      expect(screen.getByText('+10')).toBeInTheDocument();

      console.debug('INFO [EvolutionModal.test] stats preview shows on hover');

      // Unhover to hide stats
      fireEvent.mouseLeave(button);

      expect(screen.queryByText('+10')).not.toBeInTheDocument();

      console.debug('INFO [EvolutionModal.test] stats preview hides on unhover');
    },
  );

  it('should handle empty choices gracefully', () => {
    render(
      <EvolutionModal
        choices={[]}
        onSelect={mockOnSelect}
        tankNames={tankNames}
        currentTankType={TankType.BASIC}
      />,
    );

    expect(screen.getByText('Level Up!')).toBeInTheDocument();
    // No buttons should be rendered
    expect(screen.queryByRole('button', { name: /Twin|Sniper/ })).not.toBeInTheDocument();

    console.debug('INFO [EvolutionModal.test] empty choices handled');
  });
});
