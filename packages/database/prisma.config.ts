import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../apps/game-server/.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx seed/index.ts' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://tobi:unused@localhost:5432/tobi' },
});
