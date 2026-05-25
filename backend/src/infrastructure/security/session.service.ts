import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { DatabaseService } from '../db/database.service';
import { AuthPrincipal } from '../../domain/types';

const SESSION_DAYS = 90;

@Injectable()
export class SessionService {
  readonly cookieName = 'sid';

  constructor(private readonly db: DatabaseService) {}

  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await this.db.query(
      'INSERT INTO sessions(user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt],
    );
    return { token, expiresAt };
  }

  async getPrincipal(token: string | undefined): Promise<AuthPrincipal | null> {
    if (!token) {
      return null;
    }
    const result = await this.db.query<{ id: string; email: string }>(
      `
        SELECT u.id, u.email
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now()
      `,
      [this.hashToken(token)],
    );
    const user = result.rows[0];
    return user ? { userId: user.id, email: user.email } : null;
  }

  async deleteSession(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [this.hashToken(token)]);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
