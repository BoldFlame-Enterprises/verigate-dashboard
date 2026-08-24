import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from '../Layout';
import LoginPage from '../../pages/LoginPage';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../context/EventContext', () => ({ useEvent: vi.fn() }));

describe('dashboard accessibility contracts', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Global Admin', email: 'admin@example.com', role: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    } as never);
    vi.mocked(useEvent).mockReturnValue({
      events: [{ id: 2, name: 'Operations Event' }],
      selectedEvent: { id: 2, name: 'Operations Event' },
      selectEvent: vi.fn(),
      hasCapability: vi.fn(() => true),
    } as never);
  });

  it('provides skip navigation and keyboard-operable compact navigation without axe violations', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<h1>Overview content</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('link', { name: 'Overview' })).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    const result = await axe.run(container);
    expect(result.violations).toEqual([]);
  });

  it('associates login labels and announcements without axe violations', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    } as never);
    const { container } = render(
      <MemoryRouter><LoginPage /></MemoryRouter>
    );

    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    const result = await axe.run(container);
    expect(result.violations).toEqual([]);
  });
});
