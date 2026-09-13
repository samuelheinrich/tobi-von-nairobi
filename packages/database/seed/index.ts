import { config } from 'dotenv';
import { createDatabase } from '../src/index.js';

config({ path: '../../apps/game-server/.env', quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const db = createDatabase(url);
try {
  // No shared demo password or fake accounts. Content remains versioned in game-data.
  await db.$queryRaw`SELECT 1`;
  process.stdout.write('Database ready. No account seed required for the technical prototype.\n');
} finally {
  await db.$disconnect();
}
