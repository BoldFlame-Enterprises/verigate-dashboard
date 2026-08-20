import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/api';
import SettingsPage from '../SettingsPage';

vi.mock('../../lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}));

const disabled = {
  v2_enabled: false,
  version: 1,
  changed_by: null,
  change_reason: 'Secure default',
  changed_at: '2026-08-20T00:00:00.000Z',
};

describe('global security settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: disabled } });
  });

  it('requires an explicit reason and confirmation before enabling QR v2', async () => {
    const user = userEvent.setup();
    vi.mocked(api.put).mockResolvedValue({
      data: { success: true, data: { ...disabled, v2_enabled: true, version: 2 } },
    });
    render(<SettingsPage />);

    expect(await screen.findByText('Disabled')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Enable legacy QR v2' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Reason'), 'Legacy device upgrade window');
    await user.type(
      screen.getByLabelText(/Type ENABLE QR V2 to confirm/),
      'ENABLE QR V2',
    );
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/qr-compatibility', {
      v2_enabled: true,
      expected_version: 1,
      reason: 'Legacy device upgrade window',
      confirmation: 'ENABLE QR V2',
    }));
    expect(await screen.findByText('Legacy QR v2 compatibility enabled.')).toBeInTheDocument();
  });
});
