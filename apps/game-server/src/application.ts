import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
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
  app.enableShutdownHooks();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
