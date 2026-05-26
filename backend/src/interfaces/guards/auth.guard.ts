import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ExternalAuthService } from '../../application/external-auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: ExternalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractBearerToken(request);
    const principal = await this.auth.authenticateBearerToken(token);
    if (!principal) {
      throw new UnauthorizedException('Authentication required');
    }
    request.user = principal;
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
