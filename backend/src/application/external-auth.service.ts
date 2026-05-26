import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { IUserRepository } from '../domain/repositories';
import { AuthPrincipal } from '../domain/types';
import { Inject } from '@nestjs/common';

interface ExternalIdentity {
  provider: 'clerk';
  providerUserId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class ExternalAuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
  ) {}

  async authenticateBearerToken(token: string | undefined): Promise<AuthPrincipal | null> {
    if (!token) {
      return null;
    }

    const identity = await this.verifyExternalIdentity(token);
    const user = await this.userRepo.upsertExternalIdentity(
      identity.provider,
      identity.providerUserId,
      identity.email,
      identity.displayName,
    );

    return { userId: user.id, email: user.email };
  }

  async me(userId: string) {
    return this.userRepo.findById(userId);
  }

  private async verifyExternalIdentity(token: string): Promise<ExternalIdentity> {
    if (process.env.AUTH_PROVIDER === 'mock') {
      return this.verifyMockIdentity(token);
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new UnauthorizedException('Clerk is not configured');
    }

    try {
      const payload = await verifyToken(token, { secretKey });
      const providerUserId = String(payload.sub);
      const claims = payload as Record<string, unknown>;
      const email =
        this.stringClaim(claims.email) ??
        this.stringClaim(claims.primary_email_address) ??
        `${providerUserId}@clerk.local`;
      const displayName =
        this.stringClaim(claims.name) ??
        this.stringClaim(claims.full_name) ??
        this.stringClaim(claims.username) ??
        email;

      return {
        provider: 'clerk',
        providerUserId,
        email: email.trim().toLowerCase(),
        displayName,
      };
    } catch {
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }

  private verifyMockIdentity(token: string): ExternalIdentity {
    const [, providerUserId = 'dev-user', email = 'reviewer@example.com', displayName = 'Reviewer'] =
      token.split(':');

    return {
      provider: 'clerk',
      providerUserId,
      email: email.trim().toLowerCase(),
      displayName,
    };
  }

  private stringClaim(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
  }
}
