import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';

import type { AdminDto, AdminLoginResponseDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminAuthService, type IssuedAdminTokens } from './auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { ADMIN_ACCESS_COOKIE } from './strategies/admin-jwt.strategy';
import type { AdminRequestUser } from './strategies/admin-jwt.strategy';
import { AdminLoginDto } from './dto/admin-login.dto';

const IS_PROD = process.env.NODE_ENV === 'production';

const ADMIN_THROTTLE = {
  default: {
    limit: IS_PROD ? 5 : 200,
    ttl: IS_PROD ? 15 * 60_000 : 60_000,
  },
};

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Public()
  @Throttle(ADMIN_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate an admin' })
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AdminLoginResponseDto> {
    const { admin, tokens } = await this.auth.login(dto);
    this.setAuthCookie(res, tokens);
    return { admin };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Clear admin session cookie' })
  logout(@Res({ passthrough: true }) res: FastifyReply): { loggedOut: true } {
    res.clearCookie(ADMIN_ACCESS_COOKIE, { path: '/' });
    return { loggedOut: true };
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Return the currently authenticated admin' })
  me(@CurrentAdmin() admin: AdminRequestUser): Promise<AdminDto> {
    return this.auth.getAdminDtoById(admin.id);
  }

  private setAuthCookie(res: FastifyReply, tokens: IssuedAdminTokens): void {
    res.setCookie(ADMIN_ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'strict',
      path: '/',
      maxAge: Math.floor(tokens.accessTtlMs / 1000),
    });
  }
}
