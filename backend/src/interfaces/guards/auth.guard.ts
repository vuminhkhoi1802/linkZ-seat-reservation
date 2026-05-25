import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../../infrastructure/security/session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = request.cookies?.[this.sessions.cookieName];
    const principal = await this.sessions.getPrincipal(token);
    if (!principal) {
      throw new UnauthorizedException('Authentication required');
    }
    request.user = principal;
    return true;
  }
}
