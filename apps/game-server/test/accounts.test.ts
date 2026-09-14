import { randomUUID, createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../dist/application.js';
import { createDatabase } from '@tobi/database';
import type { Database } from '@tobi/database';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  welcomeToBali,
  baliEscape,
  beachBar,
  nightMarket,
  streetParade,
  thailandRailway,
} from '@tobi/game-data';

if (existsSync('apps/game-server/.env')) process.loadEnvFile('apps/game-server/.env');
const origin = process.env.CLIENT_URL ?? 'http://localhost:5173';
const password = 'Ein wirklich langes Testpasswort!';

describe('authenticated, durable campaign progress', () => {
  let app: NestFastifyApplication, db: Database;
  const users: string[] = [];
  beforeAll(async () => {
    db = createDatabase(process.env.DATABASE_URL!);
    app = await createApplication(false);
  });
  afterAll(async () => {
    if (db) {
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });
  async function register() {
    const username = `acct-${randomUUID().slice(0, 12)}`;
    const result = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      headers: { origin },
      payload: { username, password },
    });
    expect(result.statusCode, result.body).toBe(201);
    const body = result.json<{ user: { id: string }; csrfToken: string }>();
    users.push(body.user.id);
    const cookie = result.headers['set-cookie']?.toString().split(';')[0] ?? '';
    return {
      username,
      userId: body.user.id,
      cookie,
      csrf: body.csrfToken,
      headers: { origin, cookie, 'x-csrf-token': body.csrfToken },
    };
  }
  it('hashes passwords and session tokens, rotates login, rejects CSRF, and revokes logout', async () => {
    const user = await register();
    const record = await db.user.findUniqueOrThrow({ where: { id: user.userId } });
    expect(record.passwordHash).toMatch(/^\$argon2id\$/);
    expect(record.passwordHash).not.toContain(password);
    const session = await db.session.findFirstOrThrow({ where: { userId: user.userId } });
    const token = user.cookie.split('=')[1]!;
    expect(session.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    const read = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/session',
      headers: { cookie: user.cookie },
    });
    expect(read.headers['cache-control']).toBe('no-store');
    expect(read.json().user.id).toBe(user.userId);
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/v1/runs',
      headers: { origin, cookie: user.cookie },
      payload: { requestId: randomUUID(), levelId: welcomeToBali.id },
    });
    expect(rejected.statusCode).toBe(403);
    const crossOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { ...user.headers, origin: 'https://unrelated.example' },
      payload: {},
    });
    expect(crossOrigin.statusCode).toBe(403);
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: user.headers,
      payload: { username: user.username.toUpperCase(), password },
    });
    expect(login.statusCode).toBe(200);
    const newCookie = login.headers['set-cookie']?.toString() ?? '';
    expect(newCookie).toContain('HttpOnly');
    expect(newCookie).toContain('SameSite=Lax');
    expect(newCookie.split(';')[0]).not.toBe(user.cookie);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/auth/session',
          headers: { cookie: user.cookie },
        })
      ).json().user,
    ).toBeNull();
    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { origin, cookie: newCookie.split(';')[0]!, 'x-csrf-token': login.json().csrfToken },
      payload: {},
    });
    expect(logout.statusCode).toBe(204);
    expect(await db.session.count({ where: { userId: user.userId } })).toBe(0);
  });
  it('isolates accounts, deduplicates concurrent completions, and preserves results after restart', async () => {
    const user = await register(),
      stranger = await register();
    const startBody = { requestId: randomUUID(), levelId: welcomeToBali.id };
    const starts = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: '/api/v1/runs',
          headers: user.headers,
          payload: startBody,
        }),
      ),
    );
    expect(starts.every((r) => r.statusCode === 201)).toBe(true);
    const id = starts[0]!.json().id;
    expect(starts[1]!.json().id).toBe(id);
    const conflict = await app.inject({
      method: 'POST',
      url: '/api/v1/runs',
      headers: user.headers,
      payload: { ...startBody, requestId: randomUUID() },
    });
    expect(conflict.statusCode).toBe(409);
    // Supply a legitimate elapsed interval without making the integration suite sleep.
    await db.gameRun.update({ where: { id }, data: { startedAt: new Date(Date.now() - 10000) } });
    const result = {
      pickupIds: welcomeToBali.pickups.map((p) => p.id),
      elapsedMs: 8000,
      escapes: 0,
      debugUsed: false,
    };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/runs/${id}/complete`,
          headers: stranger.headers,
          payload: result,
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/runs/${id}/complete`,
          headers: user.headers,
          payload: { ...result, score: 999999 },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/runs/${id}/complete`,
          headers: user.headers,
          payload: { ...result, debugUsed: true },
        })
      ).statusCode,
    ).toBe(422);
    const completed = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: `/api/v1/runs/${id}/complete`,
          headers: user.headers,
          payload: result,
        }),
      ),
    );
    expect(completed.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(completed[0]!.json().score).toBe(1000);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/v1/runs/${id}/complete`,
          headers: user.headers,
          payload: { ...result, elapsedMs: 9000 },
        })
      ).statusCode,
    ).toBe(409);
    const progress = await app.inject({
      method: 'GET',
      url: '/api/v1/progress',
      headers: user.headers,
    });
    expect(progress.json()).toMatchObject({
      score: 1000,
      revision: 1,
      activeRun: null,
      levels: [{ completions: 1, bestScore: 1000 }],
    });
    const secondApp = await createApplication(false);
    try {
      expect(
        (
          await secondApp.inject({ method: 'GET', url: '/api/v1/progress', headers: user.headers })
        ).json(),
      ).toEqual(progress.json());
    } finally {
      await secondApp.close();
    }
    expect(
      (
        await app.inject({ method: 'GET', url: '/api/v1/progress', headers: stranger.headers })
      ).json().score,
    ).toBe(0);
  });
  it.each([baliEscape, beachBar, nightMarket, streetParade])(
    'requires an escape result before awarding $title progress',
    async (level) => {
      const user = await register();
      const start = await app.inject({
        method: 'POST',
        url: '/api/v1/runs',
        headers: user.headers,
        payload: { requestId: randomUUID(), levelId: level.id },
      });
      expect(start.statusCode).toBe(201);
      const id = start.json().id;
      await db.gameRun.update({ where: { id }, data: { startedAt: new Date(Date.now() - 40000) } });
      const result = {
        pickupIds: level.pickups.map((p) => p.id),
        elapsedMs: 35000,
        escapes: 0,
        debugUsed: false,
      };
      const incomplete = await app.inject({
        method: 'POST',
        url: `/api/v1/runs/${id}/complete`,
        headers: user.headers,
        payload: result,
      });
      expect(incomplete.statusCode).toBe(422);
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/progress', headers: user.headers })).json()
          .score,
      ).toBe(0);
      const complete = await app.inject({
        method: 'POST',
        url: `/api/v1/runs/${id}/complete`,
        headers: user.headers,
        payload: { ...result, escapes: 1 },
      });
      expect(complete.statusCode).toBe(200);
      expect(complete.json().score).toBe(level.pickups.length * 100 + 1000);
    },
  );

  it('stores a railway completion without requiring police and restores its own level result', async () => {
    const user = await register();
    const start = await app.inject({
      method: 'POST',
      url: '/api/v1/runs',
      headers: user.headers,
      payload: { requestId: randomUUID(), levelId: thailandRailway.id },
    });
    expect(start.statusCode).toBe(201);
    const id = start.json().id;
    await db.gameRun.update({ where: { id }, data: { startedAt: new Date(Date.now() - 40000) } });
    const complete = await app.inject({
      method: 'POST',
      url: `/api/v1/runs/${id}/complete`,
      headers: user.headers,
      payload: {
        pickupIds: thailandRailway.pickups.map((p) => p.id),
        elapsedMs: 35000,
        escapes: 0,
        debugUsed: false,
      },
    });
    expect(complete.statusCode, complete.body).toBe(200);
    expect(complete.json().score).toBe(1300);
    const read = await app.inject({
      method: 'GET',
      url: '/api/v1/progress',
      headers: user.headers,
    });
    expect(read.json().levels).toEqual([
      expect.objectContaining({ levelId: thailandRailway.id, bestScore: 1300, completions: 1 }),
    ]);
  });

  it('rejects expired sessions, weak passwords and invalid credentials', async () => {
    const user = await register();
    await db.session.updateMany({
      where: { userId: user.userId },
      data: { lastSeenAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/progress', headers: user.headers }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          headers: { origin },
          payload: { username: 'test', password: 'short' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          headers: { origin },
          payload: { username: user.username, password: 'Ein falsches langes Passwort' },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('rate limits authentication even when the query string changes', async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 13; index++) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/auth/login?attempt=${index}`,
        remoteAddress: '192.0.2.44',
        headers: { origin },
        payload: { username: 'test', password: 'short' },
      });
      statuses.push(response.statusCode);
    }
    expect(statuses.slice(0, 12)).toEqual(Array<number>(12).fill(400));
    expect(statuses[12]).toBe(429);
  });
});
