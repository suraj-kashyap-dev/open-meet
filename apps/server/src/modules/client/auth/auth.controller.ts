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
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiErrorCode, type AuthResponseDto, type UserDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';

import { AuthService, type IssuedTokens } from './auth.service';
import { AvatarsService } from './avatars.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const IS_PROD = process.env.NODE_ENV === 'production';
const AUTH_THROTTLE = {
  default: {
    limit: IS_PROD ? 5 : 200,
    ttl: IS_PROD ? 15 * 60_000 : 60_000,
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly avatars: AvatarsService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'Create a new account' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.register(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with email + password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.login(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ refreshed: true }> {
    const refresh = req.cookies?.[REFRESH_COOKIE];
    if (!refresh) {
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'No refresh token present',
      });
    }
    const tokens = await this.auth.refresh(refresh);
    this.setAuthCookies(res, tokens);
    return { refreshed: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate refresh token and clear cookies' })
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ loggedOut: true }> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearAuthCookies(res);
    return { loggedOut: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  async me(@CurrentUser() user: RequestUser): Promise<UserDto> {
    return this.auth.getUserDtoById(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.auth.updateProfile(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/password')
  @ApiOperation({ summary: "Change the authenticated user's password" })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ changed: true }> {
    const result = await this.auth.changePassword(user.id, dto);

    this.clearAuthCookies(res);
    return result;
  }

  @Post('me/avatar')
  @ApiOperation({ summary: "Upload (or replace) the authenticated user's profile image" })
  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
  ): Promise<UserDto> {
    if (! req.isMultipart()) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Expected multipart/form-data',
      });
    }

    const part = await req.file();

    if (! part) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'No file provided',
      });
    }

    const buffer = await part.toBuffer();

    await this.avatars.upload({
      userId: user.id,
      buffer,
      mime: part.mimetype || 'application/octet-stream',
    });

    return this.auth.getUserDtoById(user.id);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove the authenticated user's avatar" })
  async deleteAvatar(@CurrentUser() user: RequestUser): Promise<UserDto> {
    await this.avatars.remove(user.id);

    return this.auth.getUserDtoById(user.id);
  }

  private setAuthCookies(res: FastifyReply, tokens: IssuedTokens): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.setCookie(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: Math.floor(tokens.accessTtlMs / 1000),
    });
    res.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: Math.floor(tokens.refreshTtlMs / 1000),
    });
  }

  private clearAuthCookies(res: FastifyReply): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }
}
