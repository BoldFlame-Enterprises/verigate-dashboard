import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errors';

export default function ChangePasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api.post('/users/change-password', {
        current_password: form.get('current_password'),
        password: form.get('password'),
      });
      setMessage('Password changed. Sign in again on every device.');
      formElement.reset();
    } catch (changeError) {
      setError(getErrorMessage(changeError, 'Password could not be changed. Check your current password and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="max-w-md rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Change password</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label htmlFor="current-password" className="block text-sm font-medium">Current password</label>
        <input id="current-password" name="current_password" autoComplete="current-password" required type="password" className="w-full rounded-md border p-2" />
        <label htmlFor="new-password" className="block text-sm font-medium">New password</label>
        <p id="new-password-help" className="text-sm text-gray-600 dark:text-gray-300">Use 15–128 characters.</p>
        <input id="new-password" aria-describedby="new-password-help" name="password" autoComplete="new-password" required type="password" minLength={15} maxLength={128} className="w-full rounded-md border p-2" />
        <button disabled={isSubmitting} className="rounded-md bg-brand-600 px-4 py-2 text-white disabled:opacity-60">{isSubmitting ? 'Changing password…' : 'Change password'}</button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
