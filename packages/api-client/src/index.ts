import {
  healthSchema,
  levelSchema,
  authSchema,
  progressSchema,
  runSchema,
  receiptSchema,
} from '@tobi/contracts';
import type { Credentials, Completion } from '@tobi/contracts';

export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Validates network responses; session secrets never enter browser storage. */
export function createApiClient(baseUrl = '/api/v1', request: typeof fetch = fetch) {
  let csrfToken: string | null = null;
  let authGeneration = 0;
  async function send(
    path: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await request(`${baseUrl}${path}`, {
      method,
      signal: signal ?? AbortSignal.timeout(10000),
      credentials: 'same-origin',
      headers:
        method === 'GET'
          ? {}
          : {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
    });
    if (!response.ok) {
      const error: unknown = await response.json().catch(() => null);
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : `Anfrage fehlgeschlagen (${response.status}).`;
      throw new ApiError(response.status, message);
    }
    return response.status === 204 ? null : (response.json() as Promise<unknown>);
  }
  return {
    health: async (signal?: AbortSignal) =>
      healthSchema.parse(await send('/health/live', 'GET', undefined, signal)),
    tutorial: async (signal?: AbortSignal) =>
      levelSchema.parse(await send('/content/tutorial', 'GET', undefined, signal)),
    session: async () => {
      const generation = authGeneration;
      const data = authSchema.parse(await send('/auth/session'));
      if (generation === authGeneration) csrfToken = data.csrfToken;
      return data;
    },
    authenticate: async (mode: 'login' | 'register', credentials: Credentials) => {
      const generation = ++authGeneration;
      const data = authSchema.parse(await send(`/auth/${mode}`, 'POST', credentials));
      if (generation === authGeneration) csrfToken = data.csrfToken;
      return data;
    },
    logout: async () => {
      const generation = ++authGeneration;
      await send('/auth/logout', 'POST');
      if (generation === authGeneration) csrfToken = null;
    },
    progress: async () => progressSchema.parse(await send('/progress')),
    start: async (levelId: string, requestId: string) =>
      runSchema.parse(await send('/runs', 'POST', { levelId, requestId })),
    abandon: async (id: string) => {
      await send(`/runs/${id}/abandon`, 'POST');
    },
    complete: async (id: string, result: Completion) =>
      receiptSchema.parse(await send(`/runs/${id}/complete`, 'POST', result)),
  };
}
