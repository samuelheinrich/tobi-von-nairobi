import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

/** Server-only client factory; connections are owned and disposed by the application. */
export function createDatabase(connectionString: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 3000 }),
  });
}

export type Database = PrismaClient;
