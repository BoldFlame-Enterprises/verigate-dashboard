import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Tooltip from '../Tooltip';

describe('delayed contextual control guidance', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reveals guidance after a short pointer dwell and hides it on leave', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="Close event form">
        <button type="button" aria-label="Close event form">×</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Close event form' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Close event form');

    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Close event form' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('provides the same delayed guidance for keyboard focus', () => {
    vi.useFakeTimers();
    render(
      <Tooltip content="View authority history">
        <button type="button" aria-label="View device history">History</button>
      </Tooltip>
    );

    fireEvent.focus(screen.getByRole('button', { name: 'View device history' }));
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('View authority history');
  });

  it('dismisses visible guidance with Escape without activating its control', () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(
      <Tooltip content="Deactivate area">
        <button type="button" aria-label="Deactivate area" onClick={onClick}>Delete</button>
      </Tooltip>
    );

    const control = screen.getByRole('button', { name: 'Deactivate area' });
    fireEvent.focus(control);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    fireEvent.keyDown(control, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });
});
