import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { api, APIResponse } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

interface QrCompatibilitySetting {
  v2_enabled: boolean;
  version: number;
  changed_by: number | null;
  change_reason: string;
  changed_at: string;
}

export default function SettingsPage() {
  const [setting, setSetting] = useState<QrCompatibilitySetting | null>(null);
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await api.get<APIResponse<QrCompatibilitySetting>>('/admin/qr-compatibility');
      setSetting(response.data.data || null);
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load global security settings'));
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!setting) return;
    const nextEnabled = !setting.v2_enabled;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.put<APIResponse<QrCompatibilitySetting>>('/admin/qr-compatibility', {
        v2_enabled: nextEnabled,
        expected_version: setting.version,
        reason,
        confirmation,
      });
      setSetting(response.data.data || null);
      setReason('');
      setConfirmation('');
      setSuccess(nextEnabled ? 'Legacy QR v2 compatibility enabled.' : 'Legacy QR v2 compatibility disabled.');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update QR compatibility'));
      await load();
    } finally {
      setSaving(false);
    }
  }

  const nextEnabled = !(setting?.v2_enabled ?? false);
  const requiredConfirmation = nextEnabled ? 'ENABLE QR V2' : 'DISABLE QR V2';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Global settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Service-wide security controls available only to global administrators.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-600 dark:text-brand-400" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Legacy QR v2 compatibility</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  QR v3 remains the default. Enable v2 only while a known legacy Pass installation is being upgraded.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${setting?.v2_enabled
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200'}`}>
                {setting?.v2_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {setting && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                Version {setting.version} · Last changed {new Date(setting.changed_at).toLocaleString()} · {setting.change_reason}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              {nextEnabled && (
                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p>v2 credentials contain identity details. Keep this exception brief and disable it after legacy usage reaches zero.</p>
                </div>
              )}
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={3}
                  maxLength={500}
                  required
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type <span className="font-mono">{requiredConfirmation}</span> to confirm
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              {success && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>}
              <button
                type="submit"
                disabled={!setting || saving || confirmation !== requiredConfirmation || reason.trim().length < 3}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${nextEnabled
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-brand-600 hover:bg-brand-700'}`}
              >
                {saving ? 'Saving…' : nextEnabled ? 'Enable legacy QR v2' : 'Disable legacy QR v2'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
