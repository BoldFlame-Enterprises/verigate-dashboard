import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-12 text-center dark:border-red-900 dark:bg-red-950/40">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <p className="font-medium text-red-700 dark:text-red-300">Something went wrong</p>
      {message && <p className="max-w-sm text-sm text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}
