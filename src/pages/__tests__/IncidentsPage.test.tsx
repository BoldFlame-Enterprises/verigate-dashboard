import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentsPage from '../IncidentsPage';

const { useQueryMock, useMutationMock, invalidateQueriesMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock('../../context/EventContext', () => ({
  useEvent: () => ({ selectedEvent: { id: 7, name: 'Test event' } }),
}));

describe('IncidentsPage live data', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    invalidateQueriesMock.mockReset();
    useQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    useMutationMock.mockReturnValue({ mutate: vi.fn() });
  });

  it('polls event incidents and emergency overrides every 10 seconds', () => {
    render(<IncidentsPage />);

    expect(screen.getByText('No incidents reported')).toBeInTheDocument();
    expect(screen.getByText('No manual overrides')).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenCalledTimes(2);
    expect(useQueryMock.mock.calls[0][0]).toMatchObject({
      queryKey: ['incidents', 7],
      enabled: true,
      refetchInterval: 10_000,
    });
    expect(useQueryMock.mock.calls[1][0]).toMatchObject({
      queryKey: ['overrides', 7],
      enabled: true,
      refetchInterval: 10_000,
    });
  });
});
