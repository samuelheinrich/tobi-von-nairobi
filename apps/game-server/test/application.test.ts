import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApplication } from '../dist/application.js';
import { createDatabase } from '@tobi/database';
import type { Database } from '@tobi/database';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

if (existsSync('apps/game-server/.env')) process.loadEnvFile('apps/game-server/.env');

describe('API and real PostgreSQL boundary', () => {
  let app: NestFastifyApplication;
  let db: Database;
  const users: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('Integration tests require DATABASE_URL and migrated PostgreSQL');
    db = createDatabase(process.env.DATABASE_URL);
    app = await createApplication(false);
  });
  afterAll(async () => {
    if (db) {
      await db.user.deleteMany({ where: { id: { in: users } } });
      await db.$disconnect();
    }
    await app?.close();
  });

  it('serves liveness, migration-aware readiness and validated content', async () => {
    for (const path of ['/health/live', '/health/ready']) {
      const response = await app.inject({ method: 'GET', url: `/api/v1${path}` });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ok', service: 'tobi-api' });
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    }
    const content = await app.inject({ method: 'GET', url: '/api/v1/content/tutorial' });
    expect(content.statusCode).toBe(200);
    expect(content.json()).toMatchObject({ maxWanted: 0 });
    expect(content.json().pickups).toHaveLength(5);
  });

  it('enforces per-user slot uniqueness and nonnegative balances in PostgreSQL', async () => {
    const username = `test-${randomUUID().slice(0, 12)}`;
    const user = await db.user.create({
      data: {
        username,
        usernameNormalized: username,
        passwordHash: 'database-fixture-not-a-login-account',
      },
    });
    users.push(user.id);
    await db.saveGame.create({ data: { userId: user.id, slot: 1 } });
    await expect(db.saveGame.create({ data: { userId: user.id, slot: 1 } })).rejects.toThrow();
    await expect(
      db.saveGame.create({ data: { userId: user.id, slot: 2, money: -1 } }),
    ).rejects.toThrow();
  });

  it('rolls back partial writes and rejects a stale revision under concurrent updates', async () => {
    const username = `test-${randomUUID().slice(0, 12)}`;
    const user = await db.user.create({
      data: {
        username,
        usernameNormalized: username,
        passwordHash: 'database-fixture-not-a-login-account',
      },
    });
    users.push(user.id);
    const save = await db.saveGame.create({ data: { userId: user.id } });
    await expect(
      db.$transaction(async (tx) => {
        await tx.saveGame.update({ where: { id: save.id }, data: { money: 99 } });
        throw new Error('simulated failure');
      }),
    ).rejects.toThrow('simulated failure');
    expect((await db.saveGame.findUniqueOrThrow({ where: { id: save.id } })).money).toBe(0);
    const results = await Promise.all(
      [1, 2].map(() =>
        db.saveGame.updateMany({
          where: { id: save.id, revision: 0 },
          data: { revision: { increment: 1 }, money: { increment: 1 } },
        }),
      ),
    );
    expect(results.map((result) => result.count).sort()).toEqual([0, 1]);
    expect((await db.saveGame.findUniqueOrThrow({ where: { id: save.id } })).money).toBe(1);
  });
});
