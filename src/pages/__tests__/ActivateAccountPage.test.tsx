import { AxiosError, AxiosResponse } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import ActivateAccountPage from '../ActivateAccountPage';

vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function apiError(error: string): AxiosError {
  const failure = new AxiosError('Request failed with status code 400');
  failure.response = {
    status: 400,
    data: { success: false, error },
  } as AxiosResponse;
  return failure;
}

describe('ActivateAccountPage', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('renders a consumed-token failure and leaves the form retryable', async () => {
    vi.mocked(api.post).mockRejectedValue(
      apiError('Activation link is invalid or expired'),
    );
    const user = userEvent.setup();

    render(<ActivateAccountPage />);
    await user.type(screen.getByPlaceholderText('Activation token'), 'used-token');
    await user.type(
      screen.getByPlaceholderText('New password (15+ characters)'),
      'Unique test passphrase 42!',
    );
    await user.click(screen.getByRole('button', { name: 'Activate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Activation link is invalid or expired',
    );
    expect(screen.getByRole('button', { name: 'Activate' })).toBeEnabled();
  });

  it('prevents duplicate submission while activation is pending', async () => {
    let complete!: () => void;
    vi.mocked(api.post).mockImplementation(
      () => new Promise((resolve) => {
        complete = () => resolve({} as never);
      }),
    );
    const user = userEvent.setup();

    render(<ActivateAccountPage />);
    await user.type(screen.getByPlaceholderText('Activation token'), 'fresh-token');
    await user.type(
      screen.getByPlaceholderText('New password (15+ characters)'),
      'Unique test passphrase 42!',
    );
    await user.click(screen.getByRole('button', { name: 'Activate' }));

    expect(screen.getByRole('button', { name: 'Activating...' })).toBeDisabled();
    complete();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Account activated. You can now sign in.',
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Activate' })).toBeEnabled();
    });
  });
});
