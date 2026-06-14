import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AdminDto, AdminLoginResponseDto, AdminMeResponseDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { Public } from '@/common/decorators/public.decorator';

import { AdminAvatarsService } from '@/modules/admin/auth/services/admin-avatars.service';
import { AdminAuthGuard } from '@/modules/admin/auth/guards/admin-auth.guard';
import {
  AdminAuthService,
  type IssuedAdminTokens,
} from '@/modules/admin/auth/services/auth.service';
import { CurrentAdmin } from '@/modules/admin/auth/decorators/current-admin.decorator';
import { ADMIN_ACCESS_COOKIE } from '@/modules/admin/auth/strategies/admin-jwt.strategy';
import type { AdminRequestUser } from '@/modules/admin/auth/strategies/admin-jwt.strategy';
import { AdminLoginDto } from '@/modules/admin/auth/dto/admin-login.dto';
import { ChangeAdminPasswordDto } from '@/modules/admin/auth/dto/change-admin-password.dto';
import { UpdateAdminProfileDto } from '@/modules/admin/auth/dto/update-admin-profile.dto';

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
  constructor(
    private readonly auth: AdminAuthService,
    private readonly avatars: AdminAvatarsService,
  ) {}

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
  @ApiOperation({ summary: 'Return the currently authenticated admin + RBAC context' })
  me(@CurrentAdmin() admin: AdminRequestUser): Promise<AdminMeResponseDto> {
    return this.auth.getMe(admin.id);
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: "Update the authenticated admin's own profile" })
  updateMe(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: UpdateAdminProfileDto,
  ): Promise<AdminDto> {
    return this.auth.updateProfile(admin.id, dto);
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Patch('me/password')
  @ApiOperation({ summary: "Change the authenticated admin's own password" })
  async changePassword(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: ChangeAdminPasswordDto,
  ): Promise<{ changed: true }> {
    await this.auth.changePassword(admin.id, dto);

    return { changed: true };
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Post('me/avatar')
  @ApiOperation({ summary: "Upload (or replace) the authenticated admin's profile image" })
  async uploadAvatar(
    @CurrentAdmin() admin: AdminRequestUser,
    @Req() req: FastifyRequest,
  ): Promise<AdminDto> {
    if (!req.isMultipart()) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Expected multipart/form-data',
      });
    }

    const part = await req.file();

    if (!part) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'No file provided',
      });
    }

    const buffer = await part.toBuffer();

    await this.avatars.upload({
      adminId: admin.id,
      buffer,
      mime: part.mimetype || 'application/octet-stream',
    });

    return this.auth.getAdminDtoById(admin.id);
  }

  @Public()
  @UseGuards(AdminAuthGuard)
  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove the authenticated admin's avatar" })
  async deleteAvatar(@CurrentAdmin() admin: AdminRequestUser): Promise<AdminDto> {
    await this.avatars.remove(admin.id);

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
