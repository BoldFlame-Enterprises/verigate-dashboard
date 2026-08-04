import { AxiosError, AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiSupportReference, getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('includes actionable field validation details from an API response', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: {
        success: false,
        error: 'Validation failed',
        data: [{
          type: 'field',
          path: 'password',
          location: 'body',
          msg: 'Password must be between 8 and 128 characters',
        }],
      },
    } as AxiosResponse;

    expect(getErrorMessage(error)).toBe(
      'Validation failed: Password must be between 8 and 128 characters'
    );
  });
});

describe('getApiSupportReference', () => {
  it('prefers safe response headers and falls back to the response body', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      headers: {
        'x-request-id': 'request-123',
        'x-correlation-id': 'unsafe support value',
      },
      data: { correlation_id: 'operation-456' },
    } as unknown as AxiosResponse;

    expect(getApiSupportReference(error)).toEqual({
      requestId: 'request-123',
      correlationId: 'operation-456',
    });
  });
});
