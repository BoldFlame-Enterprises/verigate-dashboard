import { FormEvent, useState } from 'react';
import { api } from '../lib/api';

export default function ActivateAccountPage() {
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api.post('/auth/activate', {
      token: form.get('token'),
      password: form.get('password'),
    });
    setMessage('Account activated. You can now sign in.');
  };
  return (
    <main className="mx-auto mt-16 max-w-md rounded-xl border p-6">
      <h1 className="text-xl font-semibold">Activate account</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input name="token" required placeholder="Activation token" className="w-full rounded-md border p-2" />
        <input name="password" required type="password" minLength={15} maxLength={128} placeholder="New password (15+ characters)" className="w-full rounded-md border p-2" />
        <button className="rounded-md bg-brand-600 px-4 py-2 text-white">Activate</button>
      </form>
      {message && <p className="mt-3 text-sm">{message}</p>}
    </main>
  );
}
