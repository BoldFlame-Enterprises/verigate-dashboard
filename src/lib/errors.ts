import { AxiosError } from 'axios';

interface APIErrorBody {
  error?: string;
  data?: unknown;
}

function getValidationDetails(data: unknown): string | null {
  if (!Array.isArray(data)) return null;

  const messages = data.flatMap((issue) => {
    if (!issue || typeof issue !== 'object') return [];

    const { msg, path, param } = issue as { msg?: unknown; path?: unknown; param?: unknown };
    if (typeof msg !== 'string' || !msg.trim()) return [];

    const field = typeof path === 'string' ? path : typeof param === 'string' ? param : null;
    return [field && msg === 'Invalid value' ? `${field}: ${msg}` : msg];
  });

  const uniqueMessages = [...new Set(messages)];
  return uniqueMessages.length > 0 ? uniqueMessages.join('. ') : null;
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as APIErrorBody | undefined;
    const validationDetails = getValidationDetails(body?.data);

    if (body?.error && validationDetails) return `${body.error}: ${validationDetails}`;
    return body?.error || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
