import { HttpException, Inject } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Credentials, PublicUser } from '@tobi/contracts';
import { DatabaseService } from '../../platform/database.service.js';
import { loadConfig } from '../../platform/config.js';
import { hashPassword, verifyPassword } from './passwords.js';

const digest = (token: string): string => createHash('sha256').update(token).digest('hex');
const idleMs = 24 * 60 * 60 * 1000,
  absoluteMs = 7 * idleMs;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly config = loadConfig(process.env);
  private dummyHash = '';
  private readonly attempts = new Map<string, { count: number; expires: number }>();
  public readonly cookieName =
    this.config.NODE_ENV === 'production' ? '__Host-tobi_session' : 'tobi_session_dev';
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  public async onModuleInit(): Promise<void> {
    this.dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  }
  public token(request: FastifyRequest): string | null {
    const value = request.cookies[this.cookieName];
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
  }
  public origin(request: FastifyRequest): void {
    if (
      request.headers.origin !== new URL(this.config.CLIENT_URL).origin ||
      !request.headers['content-type']?.startsWith('application/json')
    )
      throw new ForbiddenException('Nicht erlaubter Ursprung.');
  }
  private csrf(token: string): string {
    return createHmac('sha256', this.config.SESSION_SECRET).update(token).digest('hex');
  }
  public async identity(request: FastifyRequest, mutate = false): Promise<PublicUser | null> {
    if (mutate) this.origin(request);
    const token = this.token(request);
    if (!token) return null;
    const session = await this.database.client.session.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: { select: { id: true, username: true } } },
    });
    const now = Date.now();
    if (
      !session ||
      session.expiresAt.getTime() <= now ||
      session.lastSeenAt.getTime() + idleMs <= now
    )
      return null;
    if (mutate) {
      const csrf = request.headers['x-csrf-token'];
      if (
        typeof csrf !== 'string' ||
        !/^[a-f0-9]{64}$/.test(csrf) ||
        !timingSafeEqual(Buffer.from(csrf), Buffer.from(this.csrf(token)))
      )
        throw new ForbiddenException('Ungültiger Sitzungsschutz.');
    }
    if (now - session.lastSeenAt.getTime() > 5 * 60 * 1000)
      await this.database.client.session.updateMany({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now) },
      });
    return session.user;
  }
  public async require(request: FastifyRequest, mutate = false): Promise<PublicUser> {
    const user = await this.identity(request, mutate);
    if (!user) throw new UnauthorizedException('Bitte anmelden.');
    return user;
  }
  public async session(request: FastifyRequest) {
    const user = await this.identity(request),
      token = this.token(request);
    return { user, csrfToken: user && token ? this.csrf(token) : null };
  }
  public async authenticate(
    credentials: Credentials,
    register: boolean,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    this.origin(request);
    const db = this.database.client,
      normalized = credentials.username.toLowerCase();
    const now = Date.now(),
      key = digest(normalized);
    for (const [id, attempt] of this.attempts) if (attempt.expires <= now) this.attempts.delete(id);
    const attempt = this.attempts.get(key) ?? { count: 0, expires: now + 15 * 60 * 1000 };
    if (attempt.count >= 30 || (!this.attempts.has(key) && this.attempts.size >= 5000))
      throw new HttpException('Zu viele Anmeldeversuche. Bitte später versuchen.', 429);
    attempt.count++;
    this.attempts.set(key, attempt);
    let user = await db.user.findUnique({ where: { usernameNormalized: normalized } });
    if (register) {
      const passwordHash = await hashPassword(credentials.password);
      if (user) throw new ConflictException('Benutzername nicht verfügbar.');
      try {
        user = await db.user.create({
          data: {
            username: credentials.username,
            usernameNormalized: normalized,
            passwordHash,
            saves: { create: { currentLevel: 'welcome_to_bali_prototype' } },
          },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        )
          throw new ConflictException('Benutzername nicht verfügbar.');
        throw error;
      }
    } else {
      const valid = await verifyPassword(
        user?.passwordHash ?? this.dummyHash,
        credentials.password,
      );
      if (!valid || !user)
        throw new UnauthorizedException('Benutzername oder Passwort stimmt nicht.');
    }
    if (!user) throw new UnauthorizedException();
    const token = randomBytes(32).toString('hex'),
      previous = this.token(request);
    await db.$transaction(async (tx) => {
      if (previous) await tx.session.deleteMany({ where: { tokenHash: digest(previous) } });
      await tx.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + absoluteMs),
        },
      });
      await tx.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    });
    reply.setCookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: absoluteMs / 1000,
    });
    return { user: { id: user.id, username: user.username }, csrfToken: this.csrf(token) };
  }
  public async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await this.require(request, true);
    const token = this.token(request);
    if (token)
      await this.database.client.session.deleteMany({ where: { tokenHash: digest(token) } });
    reply.clearCookie(this.cookieName, {
      path: '/',
      secure: this.config.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    });
  }
}
