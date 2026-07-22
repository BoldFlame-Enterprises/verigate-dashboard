import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsPage from '../AnalyticsPage';

const useQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}));

vi.mock('../../context/EventContext', () => ({
  useEvent: () => ({ selectedEvent: { id: 7, name: 'Test event' } }),
}));

describe('AnalyticsPage live data', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === 'analytics-volume') {
        return {
          data: {
            hourly: [{ bucket: '2026-07-21T21:00:00.000Z', granted: 1, denied: 0 }],
            peak_hours: [],
          },
          isLoading: false,
        };
      }

      return {
        data: {
          overall: { total: 1, granted: 1, denied: 0, grant_rate: 1 },
          by_area: [],
          by_access_level: [],
          by_scanner: [],
        },
        isLoading: false,
        isError: false,
      };
    });
  });

  it('keeps scan volume and breakdown data on the live refresh cadence', () => {
    render(<AnalyticsPage />);

    expect(screen.getByText('Hourly granted and denied scans · refreshes every 10s')).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenCalledTimes(2);
    expect(useQueryMock.mock.calls[0][0]).toMatchObject({
      queryKey: ['analytics-volume', 7],
      refetchInterval: 10_000,
    });
    expect(useQueryMock.mock.calls[1][0]).toMatchObject({
      queryKey: ['analytics-breakdown', 7],
      refetchInterval: 10_000,
    });
  });
});
