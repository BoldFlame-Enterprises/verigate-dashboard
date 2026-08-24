import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ApiSupportReference, formatApiSupportReference } from '../lib/errors';

export function SupportReference({ reference }: { reference: ApiSupportReference }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const value = formatApiSupportReference(reference);
  if (!value) return null;

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value!);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
      <span>Support reference</span>
      <code className="min-w-0 break-all rounded bg-gray-100 px-2 py-1 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-10 items-center gap-1 rounded px-3 py-1 font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
        aria-label="Copy support reference"
      >
        {copyStatus === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span aria-live="polite">{
          copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Select to copy' : 'Copy'
        }</span>
      </button>
    </div>
  );
}
