import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentsPage from '../IncidentsPage';

const {
  apiGetMock,
  invalidateQueriesMock,
  mutateMock,
  mutationOptions,
  useMutationMock,
  useQueryMock,
} = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  mutateMock: vi.fn(),
  mutationOptions: [] as Array<{
    onError?: (error: unknown, input: unknown) => Promise<void> | void;
  }>,
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    get: apiGetMock,
    post: vi.fn(),
  },
}));

vi.mock('../../context/EventContext', () => ({
  useEvent: () => ({ selectedEvent: { id: 7, name: 'Test event' } }),
}));

const incident = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  event_id: 7,
  reporter_user_id: 3,
  reporter_name: 'Scanner',
  area_id: 4,
  area_name: 'Gate',
  category: 'security',
  description: 'Suspicious access attempt',
  status: 'open',
  assigned_to: 11,
  assigned_to_name: 'Assigned Admin',
  decision_by: null,
  decision_by_name: null,
  decision_note: null,
  version: 1,
  created_at: '2026-07-27T12:00:00.000Z',
  updated_at: '2026-07-27T12:00:00.000Z',
  resolved_at: null,
  ...overrides,
});

const overrideCase = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  event_id: 7,
  user_id: 5,
  user_name: 'Attendee',
  area_id: 4,
  area_name: 'Gate',
  scanner_user_id: 3,
  scanner_name: 'Scanner',
  access_granted: true,
  reason: 'Badge damaged',
  review_status: 'reviewing',
  review_outcome: null,
  assigned_to: 11,
  assigned_to_name: 'Assigned Admin',
  reviewed_at: null,
  reviewed_by: null,
  reviewed_by_name: null,
  decision_note: null,
  legacy_outcome_unknown: false,
  version: 2,
  created_at: '2026-07-27T12:00:00.000Z',
  updated_at: '2026-07-27T12:00:00.000Z',
  ...overrides,
});

function installQueries(incidents = [incident()], overrides = [overrideCase()]) {
  useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'incidents') return { data: incidents, isLoading: false, isError: false };
    if (queryKey[0] === 'overrides') return { data: overrides, isLoading: false, isError: false };
    if (queryKey[0] === 'case-administrators') {
      return {
        data: [{ id: 11, name: 'Assigned Admin' }, { id: 22, name: 'Decision Admin' }],
        isLoading: false,
        isError: false,
      };
    }
    return { data: [], isLoading: false, isError: false };
  });
}

describe('IncidentsPage reviewed operational interactions', () => {
  beforeEach(() => {
    mutationOptions.length = 0;
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    invalidateQueriesMock.mockReset();
    mutateMock.mockReset();
    apiGetMock.mockReset();
    installQueries();
    useMutationMock.mockImplementation((options) => {
      mutationOptions.push(options);
      return { mutate: mutateMock, isPending: false };
    });
  });

  it('renders only valid next actions for incident and override states', () => {
    installQueries(
      [
        incident({ id: 1, status: 'open' }),
        incident({ id: 2, status: 'reviewing', version: 2 }),
        incident({ id: 3, status: 'dismissed', version: 4 }),
      ],
      [
        overrideCase({ id: 9, review_status: 'reviewing' }),
        overrideCase({ id: 10, review_status: 'reviewed', review_outcome: 'justified', version: 3 }),
      ]
    );

    render(<IncidentsPage />);

    expect(screen.getByTestId('incident-actions-1')).toHaveTextContent('Begin review');
    expect(screen.getByTestId('incident-actions-1')).not.toHaveTextContent('Resolve');
    expect(screen.getByTestId('incident-actions-2')).toHaveTextContent('Resolve');
    expect(screen.getByTestId('incident-actions-2')).toHaveTextContent('Dismiss');
    expect(screen.getByTestId('incident-actions-3')).toHaveTextContent('Reopen');
    expect(screen.getByTestId('override-actions-9')).toHaveTextContent('Complete review');
    expect(screen.getByTestId('override-actions-10')).toHaveTextContent('Reopen');
  });

  it('validates mandatory decision notes before submitting a terminal action', () => {
    installQueries([incident({ status: 'reviewing', version: 2 })], []);
    render(<IncidentsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm action' }));

    expect(screen.getByText('A note is required for this action.')).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('displays assignment separately from the actual decision-maker and outcome', () => {
    installQueries(
      [incident({
        status: 'resolved',
        decision_by: 22,
        decision_by_name: 'Decision Admin',
        decision_note: 'Verified',
        version: 3,
      })],
      [overrideCase({
        review_status: 'reviewed',
        review_outcome: 'rejected',
        reviewed_by: 22,
        reviewed_by_name: 'Decision Admin',
        decision_note: 'Policy not met',
        version: 3,
      })]
    );

    render(<IncidentsPage />);

    expect(screen.getAllByText('Assigned to Assigned Admin')).toHaveLength(2);
    expect(screen.getAllByText('Decided by Decision Admin')).toHaveLength(2);
    expect(screen.getByText('Outcome: Rejected')).toBeInTheDocument();
  });

  it('keeps all reads event-qualified and polls only the selected event', async () => {
    render(<IncidentsPage />);

    expect(useQueryMock.mock.calls.slice(0, 3).map(([options]) => options.queryKey)).toEqual([
      ['incidents', 7],
      ['overrides', 7],
      ['case-administrators', 7],
    ]);
    expect(useQueryMock.mock.calls[0][0]).toMatchObject({ enabled: true, refetchInterval: 10_000 });
    apiGetMock.mockResolvedValue({ data: { data: [] } });
    await useQueryMock.mock.calls[0][0].queryFn();
    expect(apiGetMock).toHaveBeenCalledWith('/incidents', { params: { event_id: 7 } });
  });

  it('refreshes the event case lists after an optimistic conflict', async () => {
    render(<IncidentsPage />);
    const actionMutation = mutationOptions[0];

    await actionMutation.onError?.(
      { response: { status: 409 } },
      { kind: 'incident', id: 1, action: 'resolve', expectedVersion: 2, note: 'Done' }
    );

    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['incidents', 7] });
    expect(screen.getByText(/changed while you were reviewing it/i)).toBeInTheDocument();
  });

  it('loads an ordered activity timeline on demand', () => {
    render(<IncidentsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: 'View activity' })[0]);

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['incident-activity', 7, 1],
      enabled: true,
    }));
  });
});
