import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/db/database.service';
import { PasswordHasher } from '../infrastructure/security/password-hasher';
import { SessionService } from '../infrastructure/security/session.service';

@Injectable()
export class LocalAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  async register(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await this.passwordHasher.hash(password);
    try {
      const user = await this.db.transaction(async (client) => {
        const userResult = await client.query<{ id: string; email: string; display_name: string }>(
          `
            INSERT INTO users(email, display_name)
            VALUES ($1, $2)
            RETURNING id, email, display_name
          `,
          [normalizedEmail, displayName?.trim() || normalizedEmail],
        );
        const createdUser = userResult.rows[0];
        await client.query(
          `
            INSERT INTO auth_identities(user_id, provider, provider_user_id, email)
            VALUES ($1, 'local', $2, $2)
          `,
          [createdUser.id, createdUser.email],
        );
        await client.query('INSERT INTO local_credentials(user_id, password_hash) VALUES ($1, $2)', [
          createdUser.id,
          passwordHash,
        ]);
        return createdUser;
      });
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
    const result = await this.db.query<{
      id: string;
      email: string;
      display_name: string;
      password_hash: string;
    }>(
      `
        SELECT u.id, u.email, u.display_name, lc.password_hash
        FROM users u
        JOIN local_credentials lc ON lc.user_id = u.id
        WHERE u.email = $1
      `,
      [normalizedEmail],
    );
    const user = result.rows[0];
    if (!user || !(await this.passwordHasher.verify(user.password_hash, password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const session = await this.sessions.createSession(user.id);
    return { user: { id: user.id, email: user.email, display_name: user.display_name }, session };
  }

  async me(userId: string) {
    const result = await this.db.query<{ id: string; email: string; display_name: string }>(
      'SELECT id, email, display_name FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0] ?? null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
