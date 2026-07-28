import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export default function ChangePasswordPage() {
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.post('/users/change-password', {
      current_password: form.get('current_password'),
      password: form.get('password'),
    });
    setMessage('Password changed. Sign in again on every device.');
  };
  return (
    <div className="max-w-md rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Change password</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input name="current_password" required type="password" placeholder="Current password" className="w-full rounded-md border p-2" />
        <input name="password" required type="password" minLength={15} maxLength={128} placeholder="New password (15+ characters)" className="w-full rounded-md border p-2" />
        <button className="rounded-md bg-brand-600 px-4 py-2 text-white">Change password</button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </div>
  );
}
