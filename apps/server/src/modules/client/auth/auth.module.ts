import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AvatarsService } from './avatars.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserInviteRepository } from './user-invite.repository';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AvatarsService,
    GoogleOAuthService,
    JwtStrategy,
    UserInviteRepository,
  ],
  exports: [AuthService, AvatarsService, AuthRepository],
})
export class AuthModule {}
