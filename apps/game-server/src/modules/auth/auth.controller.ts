import { Inject } from '@nestjs/common';
import { Body, Controller, Get, Post, Req, Res, HttpCode } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { credentialsSchema } from '@tobi/contracts';
import { validate } from '../../platform/validate.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  public constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Get('session') public session(@Req() request: FastifyRequest) {
    return this.auth.session(request);
  }
  @Post('register') public register(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.auth.authenticate(validate(credentialsSchema, body), true, req, reply);
  }
  @Post('login') @HttpCode(200) public login(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.auth.authenticate(validate(credentialsSchema, body), false, req, reply);
  }
  @Post('logout') @HttpCode(204) public logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.auth.logout(req, reply);
  }
}
