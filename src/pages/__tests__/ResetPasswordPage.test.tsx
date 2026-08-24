import { AxiosError, AxiosResponse } from 'axios';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import ResetPasswordPage from '../ResetPasswordPage';

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

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('renders an invalid-token failure and leaves the form retryable', async () => {
    vi.mocked(api.post).mockRejectedValue(
      apiError('Reset link is invalid or expired'),
    );
    const user = userEvent.setup();

    render(<ResetPasswordPage />);
    await user.type(screen.getByLabelText('Reset token'), 'used-token');
    await user.type(
      screen.getByLabelText('New password'),
      'Unique test passphrase 42!',
    );
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reset link is invalid or expired',
    );
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeEnabled();
  });
});
