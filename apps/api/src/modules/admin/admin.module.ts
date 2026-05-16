import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminRepository } from './admin.repository';
import { AdminJwtStrategy } from './admin.strategy';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsRepository } from './admin-stats.repository';
import { AdminStatsService } from './admin-stats.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController, AdminStatsController],
  providers: [
    AdminAuthService,
    AdminRepository,
    AdminJwtStrategy,
    AdminStatsService,
    AdminStatsRepository,
    AdminBootstrapService,
  ],
})
export class AdminModule {}
