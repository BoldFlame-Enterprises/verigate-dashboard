import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Ban,
  History,
  LogOut,
  RotateCcw,
  Smartphone,
  X,
} from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { useEvent } from '../context/EventContext';
import {
  DeviceRegistration,
  DeviceRegistrationAction,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

type DeviceAction = 'deregister' | 'blacklist' | 'unblacklist';

const syncStatusColor: Record<DeviceRegistration['sync_status'], string> = {
  online: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  stale: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  offline: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const registrationStateColor: Record<DeviceRegistration['state'], string> = {
  active: 'text-emerald-700 dark:text-emerald-300',
  deregistered: 'text-amber-700 dark:text-amber-300',
  blacklisted: 'text-red-700 dark:text-red-300',
};

function timestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : 'Never';
}

function actionCopy(action: DeviceAction) {
  if (action === 'deregister') {
    return {
      title: 'Deregister device',
      field: 'Reason for deregistration',
      confirm: 'Confirm deregistration',
      warning: 'This signs the app out. The person must log in again to re-register this installation.',
      tone: 'amber',
    };
  }
  if (action === 'blacklist') {
    return {
      title: 'Blacklist device',
      field: 'Reason for blacklisting',
      confirm: 'Confirm blacklisting',
      warning: 'This signs the app out immediately. No final upload will be accepted, and re-registration stays blocked until an event admin removes the device from the blacklist.',
      tone: 'red',
    };
  }
  return {
    title: 'Remove from blacklist',
    field: 'Reason for removing from blacklist',
    confirm: 'Confirm removal from blacklist',
    warning: 'This permits a future login and registration. It does not restore the previous session.',
    tone: 'amber',
  };
}

function conflictMessage(error: unknown): string | null {
  const candidate = error as {
    response?: { status?: number; data?: { error?: string } };
  };
  return candidate.response?.status === 409
    ? 'This registration changed by another administrator. The latest state has been refreshed; review it before trying again.'
    : null;
}

export default function SyncMonitorPage() {
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{
    registration: DeviceRegistration;
    action: DeviceAction;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [historyRegistration, setHistoryRegistration] = useState<DeviceRegistration | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const {
    data: registrations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['device-registrations', eventId],
    queryFn: async () => {
      const response = await api.get<APIResponse<DeviceRegistration[]>>(
        `/devices/events/${eventId}`
      );
      return response.data.data ?? [];
    },
    enabled: !!eventId,
    refetchInterval: 10_000,
  });

  const history = useQuery({
    queryKey: ['device-registration-actions', eventId, historyRegistration?.id],
    queryFn: async () => {
      const response = await api.get<APIResponse<DeviceRegistrationAction[]>>(
        `/devices/events/${eventId}/registrations/${historyRegistration!.id}/actions`
      );
      return response.data.data ?? [];
    },
    enabled: !!eventId && !!historyRegistration,
  });

  const control = useMutation({
    mutationFn: async ({
      registration,
      action,
      actionReason,
    }: {
      registration: DeviceRegistration;
      action: DeviceAction;
      actionReason: string;
    }) => api.post(
      `/devices/events/${eventId}/registrations/${registration.id}/${action}`,
      {
        reason: actionReason,
        expected_version: registration.version,
        expected_generation: registration.session_generation,
      }
    ),
    onSuccess: async () => {
      setPendingAction(null);
      setReason('');
      setFeedback('Device state updated and its existing session authority was revoked.');
      await queryClient.invalidateQueries({ queryKey: ['device-registrations', eventId] });
    },
    onError: async (error) => {
      setFeedback(
        conflictMessage(error) ??
        'The device action could not be completed. Check the reason and current registration state, then try again.'
      );
      await queryClient.invalidateQueries({ queryKey: ['device-registrations', eventId] });
    },
  });

  if (!selectedEvent) return <EmptyState title="No event selected" />;
  if (isLoading) return <LoadingSpinner label="Loading registered devices..." />;
  if (isError) return <ErrorState />;

  const openAction = (registration: DeviceRegistration, action: DeviceAction) => {
    setPendingAction({ registration, action });
    setReason('');
    setFeedback(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Device control</h1>
          <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Registered Pass and Scan installations for {selectedEvent.name}. Status refreshes every 10 seconds.
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {registrations?.length ?? 0} event-scoped registration{registrations?.length === 1 ? '' : 's'}
        </p>
      </header>

      {feedback && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <span>{feedback}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setFeedback(null)}
            className="rounded-md p-1 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 dark:hover:bg-amber-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!registrations || registrations.length === 0 ? (
        <EmptyState
          title="No registered devices"
          description="Pass and Scan installations appear here after login and event registration."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Registration</th>
                  <th className="px-4 py-3 font-medium">Application</th>
                  <th className="px-4 py-3 font-medium">Authority</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {registrations.map((registration) => (
                  <tr key={registration.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-950 dark:text-white">
                        {registration.user_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {registration.user_email}
                      </p>
                      <code className="mt-2 block max-w-xs break-all text-xs text-gray-500 dark:text-gray-400">
                        {registration.installation_id}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-gray-400" />
                        <span className="font-medium capitalize">{registration.app}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {[registration.platform, registration.app_version].filter(Boolean).join(' · ') || 'Version unknown'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className={`font-medium capitalize ${registrationStateColor[registration.state]}`}>
                        {registration.state}
                      </p>
                      {registration.state_reason && (
                        <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                          {registration.state_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs capitalize ${syncStatusColor[registration.sync_status]}`}>
                        {registration.sync_status}
                      </span>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Last sync: {timestamp(registration.last_sync_at)}
                      </p>
                      {registration.last_scan_upload_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Scan upload: {timestamp(registration.last_scan_upload_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          aria-label="View device history"
                          onClick={() => setHistoryRegistration(registration)}
                          className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        {registration.state === 'active' && (
                          <button
                            type="button"
                            aria-label="Deregister device"
                            onClick={() => openAction(registration, 'deregister')}
                            className="rounded-md border border-amber-300 p-2 text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                        )}
                        {registration.state !== 'blacklisted' ? (
                          <button
                            type="button"
                            aria-label="Blacklist device"
                            onClick={() => openAction(registration, 'blacklist')}
                            className="rounded-md border border-red-300 p-2 text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Remove device from blacklist"
                            onClick={() => openAction(registration, 'unblacklist')}
                            className="rounded-md border border-amber-300 p-2 text-amber-700 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingAction && (() => {
        const copy = actionCopy(pendingAction.action);
        const isDanger = copy.tone === 'red';
        return (
          <section
            aria-labelledby="device-action-title"
            className={`rounded-xl p-5 ${isDanger
              ? 'bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100'
              : 'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
              <div className="min-w-0 flex-1">
                <h2 id="device-action-title" className="font-semibold">{copy.title}</h2>
                <p className="mt-1 max-w-2xl text-sm">{copy.warning}</p>
                <label className="mt-4 block max-w-xl text-sm font-medium">
                  {copy.field}
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-current/20 bg-white px-3 py-2 text-gray-950 focus:outline-none focus:ring-2 focus:ring-current dark:bg-gray-950 dark:text-white"
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reason.trim().length < 3 || control.isPending}
                    onClick={() => control.mutate({
                      registration: pendingAction.registration,
                      action: pendingAction.action,
                      actionReason: reason.trim(),
                    })}
                    className={`rounded-md px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isDanger ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-700 hover:bg-amber-800'
                    }`}
                  >
                    {control.isPending ? 'Applying…' : copy.confirm}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAction(null);
                      setReason('');
                    }}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {historyRegistration && (
        <section
          aria-labelledby="device-history-title"
          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="device-history-title" className="font-semibold">Device activity</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Immutable authority changes for {historyRegistration.installation_id}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close device history"
              onClick={() => setHistoryRegistration(null)}
              className="rounded-md p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-600 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {history.isLoading ? (
            <div className="py-6"><LoadingSpinner /></div>
          ) : history.isError ? (
            <div className="py-4"><ErrorState /></div>
          ) : !history.data?.length ? (
            <p className="py-6 text-sm text-gray-500">No authority changes recorded.</p>
          ) : (
            <ol className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
              {history.data.map((action) => (
                <li key={action.id} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr_auto] sm:gap-4">
                  <span className="font-medium capitalize">{action.action.replace('-', ' ')}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {action.reason || 'No reason recorded'} · {action.actor_email || 'System'}
                  </span>
                  <time className="text-xs text-gray-500">{timestamp(action.created_at)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
