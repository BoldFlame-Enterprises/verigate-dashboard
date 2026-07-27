import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { useEvent } from '../context/EventContext';
import {
  CaseAdministrator,
  EmergencyOverride,
  Incident,
  OperationalCaseActivity,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

type CaseKind = 'incident' | 'override';
type CaseAction = 'assign' | 'begin-review' | 'resolve' | 'dismiss' | 'complete-review' | 'reopen';
type Outcome = 'justified' | 'rejected' | 'follow_up_required';

interface PendingAction {
  kind: CaseKind;
  id: number;
  action: CaseAction;
  expectedVersion: number;
  note?: string;
  assigneeId?: number;
  outcome?: Outcome;
}

interface ActionDraft extends PendingAction {
  title: string;
}

const actionLabels: Record<CaseAction, string> = {
  assign: 'Assign administrator',
  'begin-review': 'Begin review',
  resolve: 'Resolve incident',
  dismiss: 'Dismiss incident',
  'complete-review': 'Complete review',
  reopen: 'Reopen case',
};

const noteRequired = new Set<CaseAction>([
  'resolve',
  'dismiss',
  'complete-review',
  'reopen',
]);

function titleCase(value: string): string {
  return value.split('_').join(' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function actionButton(
  label: string,
  onClick: () => void,
  emphasis: 'primary' | 'danger' | 'neutral' = 'neutral'
) {
  const tones = {
    primary: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    danger: 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30',
    neutral: 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${tones[emphasis]}`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ value }: { value: string }) {
  const terminal = ['resolved', 'dismissed', 'reviewed'].includes(value);
  const active = ['reviewing'].includes(value);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
      terminal
        ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
        : active
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
    }`}>
      {titleCase(value)}
    </span>
  );
}

function ActivityPanel({
  eventId,
  kind,
  caseId,
  onClose,
}: {
  eventId: number;
  kind: CaseKind;
  caseId: number;
  onClose: () => void;
}) {
  const queryKey = [`${kind}-activity`, eventId, caseId];
  const { data = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const path = kind === 'incident'
        ? `/incidents/${caseId}/activity`
        : `/incidents/overrides/${caseId}/activity`;
      const response = await api.get<APIResponse<OperationalCaseActivity[]>>(path);
      return response.data.data ?? [];
    },
    enabled: true,
  });

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Immutable record</p>
          <h2 className="text-lg font-semibold">Activity timeline</h2>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
          Close
        </button>
      </div>
      {isLoading ? <LoadingSpinner /> : isError ? <ErrorState /> : data.length === 0 ? (
        <p className="text-sm text-gray-500">No actions have been recorded yet.</p>
      ) : (
        <ol className="space-y-4">
          {data.map((item) => (
            <li key={item.id} className="relative border-l border-gray-200 pl-5 dark:border-gray-700">
              <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-emerald-500" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{titleCase(item.action)}</span>
                <span className="text-xs text-gray-400">v{item.version}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {item.actor_name ?? `Administrator ${item.actor_user_id}`} · {new Date(item.created_at).toLocaleString()}
              </p>
              {item.note && <p className="mt-1 text-sm text-gray-500">“{item.note}”</p>}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

export default function IncidentsPage() {
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ActionDraft | null>(null);
  const [note, setNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('justified');
  const [formError, setFormError] = useState('');
  const [conflictNotice, setConflictNotice] = useState('');
  const [activity, setActivity] = useState<{ kind: CaseKind; id: number } | null>(null);

  const { data: incidents, isLoading: incidentsLoading, isError: incidentsError } = useQuery({
    queryKey: ['incidents', eventId],
    queryFn: async () => {
      const response = await api.get<APIResponse<Incident[]>>('/incidents', {
        params: { event_id: eventId },
      });
      return response.data.data ?? [];
    },
    enabled: !!eventId,
    refetchInterval: 10_000,
  });

  const { data: overrides, isLoading: overridesLoading, isError: overridesError } = useQuery({
    queryKey: ['overrides', eventId],
    queryFn: async () => {
      const response = await api.get<APIResponse<EmergencyOverride[]>>('/incidents/overrides', {
        params: { event_id: eventId },
      });
      return response.data.data ?? [];
    },
    enabled: !!eventId,
    refetchInterval: 10_000,
  });

  const { data: administrators = [] } = useQuery({
    queryKey: ['case-administrators', eventId],
    queryFn: async () => {
      const response = await api.get<APIResponse<CaseAdministrator[]>>('/incidents/administrators', {
        params: { event_id: eventId },
      });
      return response.data.data ?? [];
    },
    enabled: !!eventId,
  });

  const actionMutation = useMutation({
    mutationFn: async (input: PendingAction) => {
      const path = input.kind === 'incident'
        ? `/incidents/${input.id}/actions/${input.action}`
        : `/incidents/overrides/${input.id}/actions/${input.action}`;
      return api.post(path, {
        expected_version: input.expectedVersion,
        ...(input.note ? { note: input.note } : {}),
        ...(input.assigneeId ? { assignee_id: input.assigneeId } : {}),
        ...(input.outcome ? { outcome: input.outcome } : {}),
      });
    },
    onSuccess: async (_response, input) => {
      setDraft(null);
      setConflictNotice('');
      await queryClient.invalidateQueries({
        queryKey: [input.kind === 'incident' ? 'incidents' : 'overrides', eventId],
      });
      if (activity?.kind === input.kind && activity.id === input.id) {
        await queryClient.invalidateQueries({
          queryKey: [`${input.kind}-activity`, eventId, input.id],
        });
      }
    },
    onError: async (error: unknown, input: PendingAction) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setConflictNotice('This case changed while you were reviewing it. The latest event data has been loaded.');
        await queryClient.invalidateQueries({
          queryKey: [input.kind === 'incident' ? 'incidents' : 'overrides', eventId],
        });
        return;
      }
      setFormError(error instanceof Error ? error.message : 'The case action could not be completed.');
    },
  });

  const openAction = (
    kind: CaseKind,
    id: number,
    action: CaseAction,
    expectedVersion: number,
    currentAssignee?: number | null
  ) => {
    setDraft({ kind, id, action, expectedVersion, title: actionLabels[action] });
    setNote('');
    setAssigneeId(currentAssignee ? String(currentAssignee) : '');
    setOutcome('justified');
    setFormError('');
  };

  const submitAction = () => {
    if (!draft) return;
    const cleanNote = note.trim();
    if (noteRequired.has(draft.action) && !cleanNote) {
      setFormError('A note is required for this action.');
      return;
    }
    if (draft.action === 'assign' && !assigneeId) {
      setFormError('Choose an event administrator.');
      return;
    }
    actionMutation.mutate({
      kind: draft.kind,
      id: draft.id,
      action: draft.action,
      expectedVersion: draft.expectedVersion,
      note: cleanNote || undefined,
      assigneeId: draft.action === 'assign' ? Number(assigneeId) : undefined,
      outcome: draft.action === 'complete-review' ? outcome : undefined,
    });
  };

  if (!selectedEvent) return <EmptyState title="No event selected" />;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {selectedEvent.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Operational review</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Assign ownership, make explicit decisions, and preserve who actually completed each review.
            </p>
          </div>
        </div>
      </header>

      {conflictNotice && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {conflictNotice}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reported issues</p>
            <h2 className="text-xl font-semibold">Incidents</h2>
          </div>
          <span className="text-sm text-gray-500">{incidents?.length ?? 0} cases</span>
        </div>
        {incidentsLoading ? <LoadingSpinner /> : incidentsError ? <ErrorState /> : !incidents?.length ? (
          <EmptyState title="No incidents reported" description="Suspicious activity or technical issues reported from VeriGate Scan will appear here." />
        ) : (
          <div className="grid gap-4">
            {incidents.map((incident) => (
              <article key={incident.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={incident.status} />
                      <span className="text-xs text-gray-400">Case #{incident.id} · v{incident.version}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{titleCase(incident.category)} {incident.area_name ? `· ${incident.area_name}` : ''}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{incident.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                      <span>Reported by {incident.reporter_name ?? 'Unknown scanner'}</span>
                      <span>{new Date(incident.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 dark:bg-gray-800">
                        <Users className="h-4 w-4" />
                        {incident.assigned_to_name ? `Assigned to ${incident.assigned_to_name}` : 'Unassigned'}
                      </span>
                      {incident.decision_by_name && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <CheckCircle2 className="h-4 w-4" />
                          Decided by {incident.decision_by_name}
                        </span>
                      )}
                    </div>
                    {incident.decision_note && <p className="text-sm italic text-gray-500">“{incident.decision_note}”</p>}
                  </div>
                  <div data-testid={`incident-actions-${incident.id}`} className="flex max-w-md flex-wrap gap-2 lg:justify-end">
                    {actionButton(incident.assigned_to ? 'Reassign' : 'Assign', () => openAction('incident', incident.id, 'assign', Number(incident.version), incident.assigned_to))}
                    {incident.status === 'open' && actionButton('Begin review', () => openAction('incident', incident.id, 'begin-review', Number(incident.version)), 'primary')}
                    {incident.status === 'reviewing' && actionButton('Resolve', () => openAction('incident', incident.id, 'resolve', Number(incident.version)), 'primary')}
                    {incident.status === 'reviewing' && actionButton('Dismiss', () => openAction('incident', incident.id, 'dismiss', Number(incident.version)), 'danger')}
                    {(incident.status === 'resolved' || incident.status === 'dismissed') && actionButton('Reopen', () => openAction('incident', incident.id, 'reopen', Number(incident.version)))}
                    {actionButton('View activity', () => setActivity({ kind: 'incident', id: incident.id }))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Manual access decisions</p>
            <h2 className="text-xl font-semibold">Emergency overrides</h2>
          </div>
          <span className="text-sm text-gray-500">{overrides?.length ?? 0} cases</span>
        </div>
        {overridesLoading ? <LoadingSpinner /> : overridesError ? <ErrorState /> : !overrides?.length ? (
          <EmptyState title="No manual overrides" description="Manual access decisions from VeriGate Scan will appear here for review." />
        ) : (
          <div className="grid gap-4">
            {overrides.map((overrideCase) => (
              <article key={overrideCase.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={overrideCase.review_status} />
                      <span className="text-xs text-gray-400">Override #{overrideCase.id} · v{overrideCase.version}</span>
                      {overrideCase.access_granted
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{overrideCase.user_name ?? 'Unknown attendee'} · {overrideCase.area_name}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{overrideCase.reason}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                      <span>Recorded by {overrideCase.scanner_name ?? 'Unknown scanner'}</span>
                      <span>{new Date(overrideCase.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 dark:bg-gray-800">
                        <Users className="h-4 w-4" />
                        {overrideCase.assigned_to_name ? `Assigned to ${overrideCase.assigned_to_name}` : 'Unassigned'}
                      </span>
                      {overrideCase.reviewed_by_name && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <CheckCircle2 className="h-4 w-4" />
                          Decided by {overrideCase.reviewed_by_name}
                        </span>
                      )}
                    </div>
                    {overrideCase.review_outcome && <p className="text-sm font-medium">Outcome: {titleCase(overrideCase.review_outcome)}</p>}
                    {overrideCase.legacy_outcome_unknown && <p className="text-sm text-amber-700 dark:text-amber-300">Historical review · outcome not recorded</p>}
                    {overrideCase.decision_note && <p className="text-sm italic text-gray-500">“{overrideCase.decision_note}”</p>}
                  </div>
                  <div data-testid={`override-actions-${overrideCase.id}`} className="flex max-w-md flex-wrap gap-2 lg:justify-end">
                    {actionButton(overrideCase.assigned_to ? 'Reassign' : 'Assign', () => openAction('override', overrideCase.id, 'assign', Number(overrideCase.version), overrideCase.assigned_to))}
                    {overrideCase.review_status === 'pending' && actionButton('Begin review', () => openAction('override', overrideCase.id, 'begin-review', Number(overrideCase.version)), 'primary')}
                    {overrideCase.review_status === 'reviewing' && actionButton('Complete review', () => openAction('override', overrideCase.id, 'complete-review', Number(overrideCase.version)), 'primary')}
                    {overrideCase.review_status === 'reviewed' && actionButton('Reopen', () => openAction('override', overrideCase.id, 'reopen', Number(overrideCase.version)))}
                    {actionButton('View activity', () => setActivity({ kind: 'override', id: overrideCase.id }))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {draft && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Case action</p>
              <h2 className="text-lg font-semibold">{draft.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Case #{draft.id} · expected version {draft.expectedVersion}</p>
            </div>
            <button type="button" onClick={() => setDraft(null)} className="text-sm text-gray-500">Cancel</button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {draft.action === 'assign' && (
              <label className="text-sm font-medium">
                Event administrator
                <select
                  aria-label="Event administrator"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="">Choose administrator</option>
                  {administrators.map((administrator) => (
                    <option key={administrator.id} value={administrator.id}>
                      {administrator.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {draft.action === 'complete-review' && (
              <label className="text-sm font-medium">
                Review outcome
                <select
                  aria-label="Review outcome"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value as Outcome)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="justified">Justified</option>
                  <option value="rejected">Rejected</option>
                  <option value="follow_up_required">Follow-up required</option>
                </select>
              </label>
            )}
            {draft.action !== 'begin-review' && draft.action !== 'assign' && (
              <label className="text-sm font-medium md:col-span-2">
                Decision note
                <textarea
                  aria-label="Decision note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                  placeholder="Record the evidence or reason for this decision"
                />
              </label>
            )}
          </div>
          {formError && <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{formError}</p>}
          <button
            type="button"
            onClick={submitAction}
            disabled={actionMutation.isLoading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Confirm action
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {activity && eventId && (
        <ActivityPanel
          eventId={eventId}
          kind={activity.kind}
          caseId={activity.id}
          onClose={() => setActivity(null)}
        />
      )}

      <footer className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> Refreshes every 10 seconds</span>
        <span className="inline-flex items-center gap-1.5"><History className="h-4 w-4" /> Every action is retained in event history</span>
      </footer>
    </div>
  );
}
