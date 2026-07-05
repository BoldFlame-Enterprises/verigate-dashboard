import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Download, Trash2, X } from 'lucide-react';
import { api, API_BASE_URL, tokenStorage, APIResponse } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { User, UserRole } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

interface NewUserForm {
  email: string;
  name: string;
  phone: string;
  password: string;
  role: UserRole;
}

const emptyForm: NewUserForm = { email: '', name: '', phone: '', password: '', role: 'user' };

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<APIResponse<User[]>>('/users');
      return res.data.data ?? [];
    },
  });

  const createUser = useMutation({
    mutationFn: async (payload: NewUserForm) => {
      const res = await api.post<APIResponse<User>>('/users', payload);
      if (!res.data.success) throw new Error(res.data.error);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (err: unknown) => setFormError(getErrorMessage(err)),
  });

  const deactivateUser = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const handleExport = () => {
    const token = tokenStorage.getAccessToken();
    fetch(`${API_BASE_URL}/users/export/csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users-export.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  const handleImport = async (file: File) => {
    const csv = await file.text();
    const res = await api.post<APIResponse<{ imported: number; skipped: number; errors: string[] }>>('/users/bulk-import', { csv });
    const result = res.data.data;
    setImportResult(`Imported ${result?.imported ?? 0}, skipped ${result?.skipped ?? 0}${result?.errors.length ? `, ${result.errors.length} errors` : ''}`);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  if (isLoading) return <LoadingSpinner label="Loading users..." />;
  if (isError) return <ErrorState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Add user
          </button>
        </div>
      </div>

      {importResult && (
        <div className="flex items-center justify-between rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          {importResult}
          <button onClick={() => setImportResult(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">New user</h2>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              createUser.mutate(form);
            }}
            className="grid grid-cols-2 gap-3"
          >
            <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <option value="user">User</option>
              <option value="scanner">Scanner</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={createUser.isPending} className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
              {createUser.isPending ? 'Creating...' : 'Create user'}
            </button>
            {formError && <p className="col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
          </form>
        </div>
      )}

      {!users || users.length === 0 ? (
        <EmptyState title="No users yet" description="Add a user manually or import a CSV." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {u.is_active && (
                      <button onClick={() => deactivateUser.mutate(u.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
