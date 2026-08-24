import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportReference } from '../SupportReference';

describe('SupportReference', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('displays and copies the safe server trace', async () => {
    render(<SupportReference reference={{
      requestId: 'request-123', correlationId: 'operation-456',
    }} />);

    expect(screen.getByText(/request_id=request-123/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy support reference' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(
      'request_id=request-123 correlation_id=operation-456',
    ));
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });
});
