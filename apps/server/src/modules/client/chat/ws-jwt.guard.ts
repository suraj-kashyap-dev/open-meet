import { type CanActivate, Injectable, Logger, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import type { ApiEnv } from '@open-meet/config';

import { extractAccessTokenFromSocket } from './ws-auth.util';
import type { SocketUser } from './ws-auth.util';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const socket = context.switchToWs().getClient<Socket & { data: { user?: SocketUser } }>();

    if (socket.data?.user) {
      return true;
    }

    const token = extractAccessTokenFromSocket(socket);
    if (!token) {
      throw new WsException('Unauthenticated');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; name: string }>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') },
      );
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
      return true;
    } catch (err) {
      this.logger.warn(`WS auth failed: ${(err as Error).message}`);
      throw new WsException('Unauthenticated');
    }
  }
}
