import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ApiEnv } from '@open-meet/config';
import {
  ApiErrorCode,
  AuthResponseDto,
  GoogleAuthStatusDto,
  UserDto,
  type UserInviteLookupDto,
  type UserMeResponseDto,
} from '@open-meet/types';

import {
  CurrentUser,
  type RequestUser,
} from '../../../../common/decorators/current-user.decorator';
import { Public } from '../../../../common/decorators/public.decorator';

import { AuthService, type IssuedTokens } from '../services/auth.service';
import { AvatarsService } from '../services/avatars.service';
import { AcceptUserInviteDto } from '../dto/accept-user-invite.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { GoogleOAuthService } from '../services/google-oauth.service';
import { LoginDto } from '../dto/login.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const OAUTH_STATE_COOKIE = 'oauth_state';

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
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly avatars: AvatarsService,
    private readonly google: GoogleOAuthService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  @Public()
  @Get('invite/:token')
  @ApiOperation({ summary: 'Look up a pending user invite by its token' })
  lookupInvite(@Param('token') token: string): Promise<UserInviteLookupDto> {
    return this.auth.lookupUserInvite(token);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('invite/accept')
  @ApiOperation({ summary: 'Accept an invite: set a password and sign in' })
  async acceptInvite(
    @Body() dto: AcceptUserInviteDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.auth.acceptUserInvite(dto);
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

  @Public()
  @Get('google/status')
  @ApiOperation({ summary: 'Report whether Google sign-in is configured on this server' })
  googleStatus(): GoogleAuthStatusDto {
    return { enabled: this.google.isConfigured() };
  }

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Begin Google OAuth - redirects to Google consent screen' })
  async googleStart(@Res() res: FastifyReply): Promise<void> {
    const { url, state } = await this.google.buildAuthorizationUrl();

    res.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 600,
    });

    await res.redirect(url, HttpStatus.FOUND);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback - exchanges code, issues cookies, redirects' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];

    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/auth' });

    if (error) {
      this.logger.warn(`Google OAuth callback returned error: ${error}`);
      await res.redirect(this.frontendErrorUrl(frontendUrl, 'google_denied'), HttpStatus.FOUND);
      return;
    }

    if (!state || !cookieState || state !== cookieState) {
      this.logger.warn('Google OAuth state mismatch between query and cookie');
      await res.redirect(this.frontendErrorUrl(frontendUrl, 'state_mismatch'), HttpStatus.FOUND);
      return;
    }

    if (!code) {
      await res.redirect(this.frontendErrorUrl(frontendUrl, 'missing_code'), HttpStatus.FOUND);
      return;
    }

    try {
      await this.google.consumeState(state);
      const profile = await this.google.exchangeCodeForProfile(code);
      const { tokens } = await this.auth.loginWithGoogle(profile);
      this.setAuthCookies(res, tokens);
    } catch (err) {
      this.logger.warn(`Google OAuth login failed: ${(err as Error).message}`);
      await res.redirect(this.frontendErrorUrl(frontendUrl, 'login_failed'), HttpStatus.FOUND);
      return;
    }

    await res.redirect(frontendUrl, HttpStatus.FOUND);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate refresh token and clear cookies' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ loggedOut: true }> {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE], user.id);
    this.clearAuthCookies(res);
    return { loggedOut: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the currently authenticated user + RBAC context' })
  async me(@CurrentUser() user: RequestUser): Promise<UserMeResponseDto> {
    return this.auth.getMe(user.id);
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

  private frontendErrorUrl(frontendUrl: string, reason: string): string {
    const target = new URL('/login', frontendUrl);
    target.searchParams.set('error', reason);
    return target.toString();
  }
}
