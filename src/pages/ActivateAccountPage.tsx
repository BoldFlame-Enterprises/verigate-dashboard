import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

export default function ActivateAccountPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await api.post('/auth/activate', {
        token: form.get('token'),
        password: form.get('password'),
      });
      setMessage('Account activated. You can now sign in.');
    } catch (activationError) {
      setError(getErrorMessage(
        activationError,
        'Activation link is invalid or expired',
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto mt-16 max-w-md rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Activate account</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label htmlFor="activation-token" className="block text-sm font-medium">Activation token</label>
        <input id="activation-token" name="token" autoComplete="one-time-code" required className="w-full rounded-md border p-2" />
        <label htmlFor="activation-password" className="block text-sm font-medium">New password</label>
        <p id="activation-password-help" className="text-sm text-gray-600">Use 15–128 characters.</p>
        <input id="activation-password" aria-describedby="activation-password-help" name="password" autoComplete="new-password" required type="password" minLength={15} maxLength={128} className="w-full rounded-md border p-2" />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Activating...' : 'Activate'}
        </button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}
