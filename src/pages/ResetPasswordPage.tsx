import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

export default function ResetPasswordPage() {
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
      await api.post('/auth/reset-password', {
        token: form.get('token'),
        password: form.get('password'),
      });
      setMessage('Password reset. Sign in with the new password.');
    } catch (resetError) {
      setError(getErrorMessage(
        resetError,
        'Reset link is invalid or expired',
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto mt-16 max-w-md rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Reset password</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input name="token" required placeholder="Reset token" className="w-full rounded-md border p-2" />
        <input name="password" required type="password" minLength={15} maxLength={128} placeholder="New password (15+ characters)" className="w-full rounded-md border p-2" />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-brand-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}
