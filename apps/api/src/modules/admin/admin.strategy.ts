import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { ApiEnv } from '@open-meet/config';
import { ApiErrorCode } from '@open-meet/types';

export const ADMIN_ACCESS_COOKIE = 'admin_access_token';

export interface AdminRequestUser {
  id: string;
  email: string;
  role: string;
}

interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService<ApiEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) =>
          (req.cookies?.[ADMIN_ACCESS_COOKIE] as string | undefined) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('ADMIN_JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: AdminJwtPayload): AdminRequestUser {
    if (! payload.sub) {
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Invalid admin token payload',
      });
    }

    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
