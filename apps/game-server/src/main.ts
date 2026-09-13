import { createApplication } from './application.js';
import { loadConfig } from './platform/config.js';

try {
  const config = loadConfig(process.env);
  const app = await createApplication();
  await app.listen(config.PORT, config.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({ level: 'error', message: error instanceof Error ? error.message : 'Application startup failed' })}\n`,
  );
  process.exitCode = 1;
}
