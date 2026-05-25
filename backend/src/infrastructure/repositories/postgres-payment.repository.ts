import { Injectable } from '@nestjs/common';
import { IPaymentRepository } from '../../domain/repositories';
import { PaymentAttemptView } from '../../domain/types';
import { DatabaseService } from '../db/database.service';
import { PoolClient } from 'pg';

@Injectable()
export class PostgresPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, seatId: string): Promise<PaymentAttemptView> {
    const result = await this.db.query<{ id: string; seat_id: string; status: 'PENDING' }>(
      `
        INSERT INTO payment_attempts(user_id, seat_id, status)
        SELECT $1, id, 'PENDING'
        FROM seats
        WHERE id = $2
        RETURNING id, seat_id, status
      `,
      [userId, seatId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Seat not found');
    }
    return { id: row.id, seatId: row.seat_id, status: row.status };
  }

  async findByIdForUpdate(client: PoolClient, id: string): Promise<{
    id: string;
    user_id: string;
    seat_id: string;
    status: string;
  } | null> {
    const result = await client.query<{
      id: string;
      user_id: string;
      seat_id: string;
      status: string;
    }>('SELECT id, user_id, seat_id, status FROM payment_attempts WHERE id = $1 FOR UPDATE', [id]);
    return result.rows[0] ?? null;
  }

  async markAsCompleted(client: PoolClient, id: string): Promise<void> {
    await client.query(
      "UPDATE payment_attempts SET status = 'COMPLETED', completed_at = now() WHERE id = $1",
      [id],
    );
  }

  async markAsFailed(client: PoolClient, id: string): Promise<void> {
    await client.query(
      "UPDATE payment_attempts SET status = 'FAILED', completed_at = now() WHERE id = $1",
      [id],
    );
  }
}
