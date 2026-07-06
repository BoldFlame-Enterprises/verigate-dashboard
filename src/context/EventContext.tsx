import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, APIResponse } from '../lib/api';
import { Event } from '../types';
import { useAuth } from './AuthContext';

interface EventContextValue {
  events: Event[];
  selectedEvent: Event | null;
  selectEvent: (eventId: number) => void;
  isLoading: boolean;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

const SELECTED_EVENT_KEY = 'verigate_selected_event_id';

export function EventProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(() => {
    const stored = localStorage.getItem(SELECTED_EVENT_KEY);
    return stored ? Number(stored) : null;
  });

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await api.get<APIResponse<Event[]>>('/events');
      return res.data.data ?? [];
    },
    enabled: !!user,
  });

  const events = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (events.length === 0) return;
    const stillValid = events.some((e) => e.id === selectedEventId);
    if (!selectedEventId || !stillValid) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    localStorage.setItem(SELECTED_EVENT_KEY, String(eventId));
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  return (
    <EventContext.Provider value={{ events, selectedEvent, selectEvent, isLoading }}>
      {children}
    </EventContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export function useEvent(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
}
