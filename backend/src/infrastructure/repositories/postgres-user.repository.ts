import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories';
import { DatabaseService } from '../db/database.service';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string): Promise<{ id: string; email: string; display_name: string; password_hash: string } | null> {
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
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<{ id: string; email: string; display_name: string } | null> {
    const result = await this.db.query<{ id: string; email: string; display_name: string }>(
      'SELECT id, email, display_name FROM users WHERE id = $1',
      [id],
    );
    return result.rows[0] ?? null;
  }

  async createWithCredentials(
    email: string,
    displayName: string,
    passwordHash: string,
  ): Promise<{ id: string; email: string; display_name: string }> {
    return this.db.transaction(async (client) => {
      const userResult = await client.query<{ id: string; email: string; display_name: string }>(
        `
          INSERT INTO users(email, display_name)
          VALUES ($1, $2)
          RETURNING id, email, display_name
        `,
        [email, displayName],
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
  }
}
