import { AxiosError } from 'axios';

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof AxiosError) {
    return (err.response?.data as { error?: string } | undefined)?.error || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
