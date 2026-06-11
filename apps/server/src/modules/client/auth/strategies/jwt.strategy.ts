import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { ApiEnv } from '@open-meet/config';
import { ApiErrorCode } from '@open-meet/types';

import type { RequestUser } from '../../../../common/decorators/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  guest?: boolean;
  guestMeetingCode?: string;
}

const ACCESS_COOKIE = 'access_token';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<ApiEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) =>
          (req.cookies?.[ACCESS_COOKIE] as string | undefined) ??
          (ExtractJwt.fromAuthHeaderAsBearerToken()(
            req as unknown as Parameters<
              ReturnType<typeof ExtractJwt.fromAuthHeaderAsBearerToken>
            >[0],
          ) as string | null),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub) {
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Invalid token payload',
      });
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isGuest: payload.guest === true,
      guestMeetingCode: payload.guestMeetingCode ?? null,
    };
  }
}

export const ACCESS_TOKEN_COOKIE = ACCESS_COOKIE;
