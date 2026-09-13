import { Controller, Get } from '@nestjs/common';
import { contentVersion, welcomeToBali } from '@tobi/game-data';
import type { LevelDefinition } from '@tobi/contracts';

@Controller('content')
export class ContentController {
  @Get('tutorial')
  public tutorial(): LevelDefinition {
    return welcomeToBali;
  }

  @Get('manifest')
  public manifest() {
    return { contentVersion, levels: [welcomeToBali.id], stage: 'technical-prototype' };
  }
}
