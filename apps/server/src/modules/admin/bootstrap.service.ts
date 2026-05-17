import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import type { ApiEnv } from '@open-meet/config';

import { type PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.prisma.admin.count();

    if (count > 0) {
      return;
    }

    const email = this.config.getOrThrow<string>('DEFAULT_ADMIN_EMAIL').toLowerCase();
    const password = this.config.getOrThrow<string>('DEFAULT_ADMIN_PASSWORD');
    const name = this.config.getOrThrow<string>('DEFAULT_ADMIN_NAME');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    await this.prisma.admin.create({
      data: { email, name, passwordHash, role: 'SUPERADMIN' },
    });

    const isProd = this.config.get<string>('NODE_ENV') === 'production';

    if (isProd) {
      this.logger.warn(
        `Bootstrapped default admin "${email}". Change the password immediately via the console.`,
      );
    } else {
      this.logger.log(
        `Bootstrapped default admin — email="${email}" password="${password}" (configure via DEFAULT_ADMIN_* env vars).`,
      );
    }
  }
}
