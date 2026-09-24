import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { firstValueFrom, isObservable } from 'rxjs';
import { z } from 'zod';
import { AuthService } from '../../modules/auth/auth.service.js';
import { ACCESS_COOKIE_NAME, ACCESS_TOKEN_MAX_AGE_MS, REFRESH_COOKIE_NAME } from '../../modules/auth/auth.constants.js';
import { PUBLIC_KEY } from '../decorators/public.decorator.js';

const expiredAccessSchema = z.object({
  sub: z.number().int().positive(),
  tipo: z.literal('access'),
  exp: z.number(),
});

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  private async authorize(context: ExecutionContext): Promise<boolean> {
    const result = super.canActivate(context);
    return isObservable(result) ? firstValueFrom(result) : result;
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    try {
      return await this.authorize(context);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;

      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();
      const cookies = request.cookies as Record<string, unknown> | undefined;
      const refreshToken = cookies?.[REFRESH_COOKIE_NAME];
      if (typeof refreshToken !== 'string') throw error;

      const accessToken = cookies?.[ACCESS_COOKIE_NAME];
      let expiredAccessUserId: number | undefined;
      if (typeof accessToken === 'string') {
        let payload: z.infer<typeof expiredAccessSchema>;
        try {
          payload = expiredAccessSchema.parse(
            await this.jwt.verifyAsync(accessToken, { ignoreExpiration: true }),
          );
        } catch {
          throw error;
        }
        if (payload.exp > Math.floor(Date.now() / 1000)) throw error;
        expiredAccessUserId = payload.sub;
      }

      const renewedAccessToken = await this.auth.refresh(refreshToken);
      if (expiredAccessUserId !== undefined) {
        const renewedPayload = expiredAccessSchema.parse(
          await this.jwt.verifyAsync(renewedAccessToken),
        );
        if (renewedPayload.sub !== expiredAccessUserId) throw error;
      }

      request.cookies = { ...cookies, [ACCESS_COOKIE_NAME]: renewedAccessToken };
      const authorized = await this.authorize(context);
      response.cookie(ACCESS_COOKIE_NAME, renewedAccessToken, {
        httpOnly: true,
        secure: this.config.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE_MS,
      });
      return authorized;
    }
  }
}
