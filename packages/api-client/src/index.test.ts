import { expect, it, vi } from 'vitest';
import { createApiClient } from './index.js';

it('keeps the new login CSRF token when an older session response arrives late', async () => {
  let resolveSession!: (response: Response) => void;
  const user = { id: '11d93871-7a10-49bb-b051-54154a0e7242', username: 'tobi' };
  const request = vi.fn<typeof fetch>();
  request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
  );
  request.mockResolvedValueOnce(Response.json({ user, csrfToken: 'a'.repeat(64) }));
  request.mockResolvedValueOnce(new Response(null, { status: 204 }));
  const api = createApiClient('/api/v1', request);
  const oldSession = api.session();
  await api.authenticate('login', { username: 'tobi', password: 'long-enough-test-password' });
  resolveSession(Response.json({ user: null, csrfToken: null }));
  await oldSession;
  await api.logout();
  expect(request.mock.calls[2]?.[1]?.headers).toMatchObject({ 'X-CSRF-Token': 'a'.repeat(64) });
});
