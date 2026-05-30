import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { MessagingModule } from '../messaging/messaging.module';
import { ClientRbacModule } from '../rbac/rbac.module';

import { ChatPermissionsRepository } from '../messaging/chat-permissions.repository';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AvatarsService } from './avatars.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserInviteRepository } from './user-invite.repository';
import { UsersController } from './users.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MessagingModule,
    ClientRbacModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    AuthRepository,
    AvatarsService,
    GoogleOAuthService,
    JwtStrategy,
    UserInviteRepository,
    ChatPermissionsRepository,
  ],
  exports: [AuthService, AvatarsService, AuthRepository],
})
export class AuthModule {}
