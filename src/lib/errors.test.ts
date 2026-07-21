import { AxiosError, AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';

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
