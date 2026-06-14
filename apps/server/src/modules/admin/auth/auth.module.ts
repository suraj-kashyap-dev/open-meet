import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AdminCoreModule } from '../core/core.module';
import { AdminRbacModule } from '../rbac/rbac.module';

import { AdminAuthController } from './controllers/auth.controller';
import { AdminAuthService } from './services/auth.service';
import { AdminAvatarsService } from './services/admin-avatars.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), AdminCoreModule, AdminRbacModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAvatarsService, AdminJwtStrategy],
})
export class AdminAuthModule {}
