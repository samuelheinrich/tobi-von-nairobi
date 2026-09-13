import { Inject } from '@nestjs/common';
import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { completionSchema, startRunSchema } from '@tobi/contracts';
import { AuthService } from '../auth/auth.service.js';
import { validate } from '../../platform/validate.js';
import { ProgressService } from './progress.service.js';

@Controller()
export class ProgressController {
  public constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ProgressService) private readonly progress: ProgressService,
  ) {}
  @Get('progress') public async read(@Req() request: FastifyRequest) {
    return this.progress.read((await this.auth.require(request)).id);
  }
  @Post('runs') public async start(@Req() request: FastifyRequest, @Body() body: unknown) {
    const user = await this.auth.require(request, true),
      input = validate(startRunSchema, body);
    return this.progress.start(user.id, input.requestId, input.levelId);
  }
  @Post('runs/:id/complete') @HttpCode(200) public async complete(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const user = await this.auth.require(request, true);
    return this.progress.complete(
      user.id,
      validate(z.string().uuid(), id),
      validate(completionSchema, body),
    );
  }
  @Post('runs/:id/abandon') @HttpCode(204) public async abandon(
    @Req() request: FastifyRequest,
    @Param('id') id: string,
  ) {
    return this.progress.abandon(
      (await this.auth.require(request, true)).id,
      validate(z.string().uuid(), id),
    );
  }
}
