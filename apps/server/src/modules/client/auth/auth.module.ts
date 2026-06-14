import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { MessagingModule } from '@/modules/client/messaging/messaging.module';

import { ChatPermissionsRepository } from '@/modules/client/messaging/repositories/chat-permissions.repository';

import { AuthController } from './controllers/auth.controller';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { AvatarsService } from './services/avatars.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserInviteRepository } from './repositories/user-invite.repository';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MessagingModule,
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
