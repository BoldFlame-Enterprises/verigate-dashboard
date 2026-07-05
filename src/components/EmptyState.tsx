import { Inbox } from 'lucide-react';
import { ReactNode } from 'react';

export default function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
      <Inbox className="h-8 w-8 text-gray-400" />
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action}
    </div>
  );
}
