import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, CheckCircle2 } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { useEvent } from '../context/EventContext';
import { Event } from '../types';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Tooltip from '../components/Tooltip';

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function EventsPage() {
  const { events, selectedEvent, selectEvent, isLoading } = useEvent();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createEvent = useMutation({
    mutationFn: async () => {
      const res = await api.post<APIResponse<Event>>('/events', { name, slug: slugify(name), description });
      if (!res.data.success) throw new Error(res.data.error);
      return res.data.data;
    },
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setName('');
      setDescription('');
      if (event) selectEvent(event.id);
    },
    onError: (err: unknown) => setError(getErrorMessage(err)),
  });

  if (isLoading) return <LoadingSpinner label="Loading events..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">New event</h2>
            <Tooltip content="Close event form">
              <button
                type="button"
                aria-label="Close event form"
                onClick={() => setShowForm(false)}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setError(null); createEvent.mutate(); }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label htmlFor="event-name" className="grid gap-1 text-sm font-medium">Event name
              <input id="event-name" required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <label htmlFor="event-description" className="grid gap-1 text-sm font-medium">Description
              <input id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </label>
            <button type="submit" disabled={createEvent.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {createEvent.isPending ? 'Creating...' : 'Create event'}
            </button>
            {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2 dark:text-red-300">{error}</p>}
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState title="No events yet" description="Create your first event to start configuring areas and access." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => selectEvent(event.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selectedEvent?.id === event.id
                  ? 'border-brand-500 bg-brand-50 text-gray-900 dark:border-brand-400/60 dark:bg-brand-500/10 dark:text-gray-100'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">{event.name}</p>
                {selectedEvent?.id === event.id && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">/{event.slug}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
