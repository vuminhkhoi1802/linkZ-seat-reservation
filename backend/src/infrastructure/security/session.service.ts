import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../db/entities/session.entity';
import { AuthPrincipal } from '../../domain/types';

const SESSION_DAYS = 90;

@Injectable()
export class SessionService {
  readonly cookieName = 'sid';

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    
    const session = this.sessionRepo.create({
      userId,
      tokenHash,
      expiresAt,
    });
    await this.sessionRepo.save(session);
    
    return { token, expiresAt };
  }

  async getPrincipal(token: string | undefined): Promise<AuthPrincipal | null> {
    if (!token) {
      return null;
    }
    const tokenHash = this.hashToken(token);
    const session = await this.sessionRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return { userId: session.userId, email: session.user.email };
  }

  async deleteSession(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    const tokenHash = this.hashToken(token);
    await this.sessionRepo.delete({ tokenHash });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
