import { AxiosError } from 'axios';

interface APIErrorBody {
  error?: string;
  data?: unknown;
  request_id?: string;
  correlation_id?: string;
}

export interface ApiSupportReference {
  requestId?: string;
  correlationId?: string;
}

const SAFE_TRACE_ID = /^[A-Za-z0-9._:-]{1,64}$/;

function safeTraceId(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_TRACE_ID.test(value) ? value : undefined;
}

export function getApiSupportReference(err: unknown): ApiSupportReference {
  if (!(err instanceof AxiosError)) return {};
  const body = err.response?.data as APIErrorBody | undefined;
  return {
    requestId: safeTraceId(err.response?.headers?.['x-request-id'])
      ?? safeTraceId(body?.request_id),
    correlationId: safeTraceId(err.response?.headers?.['x-correlation-id'])
      ?? safeTraceId(body?.correlation_id),
  };
}

export function formatApiSupportReference(reference: ApiSupportReference): string | null {
  const fields = [
    reference.requestId ? `request_id=${reference.requestId}` : null,
    reference.correlationId ? `correlation_id=${reference.correlationId}` : null,
  ].filter((value): value is string => Boolean(value));
  return fields.length > 0 ? fields.join(' ') : null;
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
