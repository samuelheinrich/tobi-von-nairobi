import { healthSchema, levelSchema } from '@tobi/contracts';

/** Validates network responses, supports cancellation and keeps HTTP outside the game loop. */
export function createApiClient(baseUrl = '/api/v1', request: typeof fetch = fetch) {
  async function read(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await request(`${baseUrl}${path}`, {
      signal: signal ?? AbortSignal.timeout(5000),
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.json() as Promise<unknown>;
  }
  return {
    health: async (signal?: AbortSignal) => healthSchema.parse(await read('/health/live', signal)),
    tutorial: async (signal?: AbortSignal) =>
      levelSchema.parse(await read('/content/tutorial', signal)),
  };
}
