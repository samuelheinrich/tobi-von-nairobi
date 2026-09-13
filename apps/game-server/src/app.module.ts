import { AuthController } from './modules/auth/auth.controller.js';
import { AuthService } from './modules/auth/auth.service.js';
import { ProgressController } from './modules/progress/progress.controller.js';
import { ProgressService } from './modules/progress/progress.service.js';
import { Module } from '@nestjs/common';
import { DatabaseService } from './platform/database.service.js';
import { HealthController } from './modules/health/health.controller.js';
import { ContentController } from './modules/content/content.controller.js';

@Module({
  controllers: [HealthController, ContentController, AuthController, ProgressController],
  providers: [DatabaseService, AuthService, ProgressService],
})
export class AppModule {}
