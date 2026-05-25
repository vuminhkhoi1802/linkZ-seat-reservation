import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { LocalAuthService } from '../../application/local-auth.service';
import { SessionService } from '../../infrastructure/security/session.service';
import { AuthPrincipal } from '../../domain/types';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: LocalAuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(body.email, body.password, body.displayName);
    this.setSessionCookie(response, result.session.token, result.session.expiresAt);
    return { user: this.toUserResponse(result.user) };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body.email, body.password);
    this.setSessionCookie(response, result.session.token, result.session.expiresAt);
    return { user: this.toUserResponse(result.user) };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.sessions.deleteSession(request.cookies?.[this.sessions.cookieName]);
    response.clearCookie(this.sessions.cookieName);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() principal: AuthPrincipal) {
    const user = await this.auth.me(principal.userId);
    return { user: user ? this.toUserResponse(user) : null };
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date): void {
    response.cookie(this.sessions.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      expires: expiresAt,
      path: '/',
    });
  }

  private toUserResponse(user: { id: string; email: string; display_name: string }) {
    return { id: user.id, email: user.email, displayName: user.display_name };
  }
}
