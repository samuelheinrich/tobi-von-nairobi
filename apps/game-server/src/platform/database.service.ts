import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { createDatabase } from '@tobi/database';
import type { Database } from '@tobi/database';
import { loadConfig } from './config.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly client: Database = createDatabase(loadConfig(process.env).DATABASE_URL);
  public async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
