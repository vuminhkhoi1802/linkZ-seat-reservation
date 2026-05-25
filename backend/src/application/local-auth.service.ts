import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordHasher } from '../infrastructure/security/password-hasher';
import { SessionService } from '../infrastructure/security/session.service';
import { IUserRepository } from '../domain/repositories';

@Injectable()
export class LocalAuthService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  async register(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await this.passwordHasher.hash(password);
    try {
      const user = await this.userRepo.createWithCredentials(
        normalizedEmail,
        displayName?.trim() || normalizedEmail,
        passwordHash,
      );
      const session = await this.sessions.createSession(user.id);
      return { user, session };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user || !(await this.passwordHasher.verify(user.password_hash, password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const session = await this.sessions.createSession(user.id);
    return { user: { id: user.id, email: user.email, display_name: user.display_name }, session };
  }

  async me(userId: string) {
    return this.userRepo.findById(userId);
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
