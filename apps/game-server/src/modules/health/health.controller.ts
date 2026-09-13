import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@tobi/contracts';
import { DatabaseService } from '../../platform/database.service.js';

@Controller('health')
export class HealthController {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get('live')
  public live(): HealthResponse {
    return { status: 'ok', service: 'tobi-api', version: '0.1.0' };
  }

  @Get('ready')
  public async ready(): Promise<HealthResponse> {
    try {
      await this.database.client.user.count();
    } catch {
      throw new ServiceUnavailableException('Database or migrations are not ready');
    }
    return this.live();
  }
}
