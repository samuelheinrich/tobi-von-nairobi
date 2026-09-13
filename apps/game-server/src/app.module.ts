import { Module } from '@nestjs/common';
import { DatabaseService } from './platform/database.service.js';
import { HealthController } from './modules/health/health.controller.js';
import { ContentController } from './modules/content/content.controller.js';

@Module({ controllers: [HealthController, ContentController], providers: [DatabaseService] })
export class AppModule {}
