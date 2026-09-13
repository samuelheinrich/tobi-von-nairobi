import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module.js';

export async function createApplication(logging = true): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: logging
        ? { level: 'info', redact: ['req.headers.cookie', 'req.headers.authorization'] }
        : false,
      bodyLimit: 65536,
      requestTimeout: 10000,
    }),
    { logger: logging ? ['error', 'warn'] : false },
  );
  app.setGlobalPrefix('api/v1');
  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, {
    max: (request) =>
      /\/auth\/(login|register)$/.test(request.url.split('?')[0] ?? '') ? 12 : 300,
    timeWindow: '1 minute',
    keyGenerator: (request) =>
      `${request.ip}:${/\/auth\/(login|register)$/.test(request.url.split('?')[0] ?? '') ? 'auth' : 'api'}`,
  });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook(
      'onRequest',
      async (_request: unknown, reply: { header(name: string, value: string): unknown }) => {
        reply.header('Cache-Control', 'no-store');
      },
    );
  app.enableShutdownHooks();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
