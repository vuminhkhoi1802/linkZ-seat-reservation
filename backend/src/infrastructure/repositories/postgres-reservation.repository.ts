import { Injectable } from '@nestjs/common';
import { IReservationRepository } from '../../domain/repositories';
import { ReservationView } from '../../domain/types';
import { DatabaseService } from '../db/database.service';
import { PoolClient } from 'pg';

@Injectable()
export class PostgresReservationRepository implements IReservationRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByPaymentAttemptId(client: PoolClient, paymentAttemptId: string): Promise<ReservationView | null> {
    const result = await client.query<ReservationRow>(
      `
        SELECT r.id, r.seat_id, s.label AS seat_label, r.status, r.confirmed_at
        FROM reservations r
        JOIN seats s ON s.id = r.seat_id
        WHERE r.payment_attempt_id = $1
      `,
      [paymentAttemptId],
    );
    return result.rows[0] ? this.mapReservation(result.rows[0]) : null;
  }

  async isSeatConfirmed(client: PoolClient, seatId: string): Promise<boolean> {
    const result = await client.query<{ id: string }>(
      "SELECT id FROM reservations WHERE seat_id = $1 AND status = 'CONFIRMED'",
      [seatId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async createConfirmed(client: PoolClient, userId: string, seatId: string, paymentAttemptId: string): Promise<ReservationView> {
    const result = await client.query<ReservationRow>(
      `
        INSERT INTO reservations(user_id, seat_id, payment_attempt_id, status, confirmed_at)
        VALUES ($1, $2, $3, 'CONFIRMED', now())
        RETURNING id,
                  seat_id,
                  (SELECT label FROM seats WHERE id = $2) AS seat_label,
                  status,
                  confirmed_at
      `,
      [userId, seatId, paymentAttemptId],
    );
    return this.mapReservation(result.rows[0]);
  }

  async listByUserId(userId: string): Promise<ReservationView[]> {
    const result = await this.db.query<ReservationRow>(
      `
        SELECT r.id, r.seat_id, s.label AS seat_label, r.status, r.confirmed_at
        FROM reservations r
        JOIN seats s ON s.id = r.seat_id
        WHERE r.user_id = $1 AND r.status = 'CONFIRMED'
        ORDER BY r.confirmed_at DESC
      `,
      [userId],
    );
    return result.rows.map((row) => this.mapReservation(row));
  }

  private mapReservation(row: ReservationRow): ReservationView {
    return {
      id: row.id,
      seatId: row.seat_id,
      seatLabel: row.seat_label,
      status: row.status,
      confirmedAt: row.confirmed_at ? row.confirmed_at.toISOString() : null,
    };
  }
}

interface ReservationRow {
  id: string;
  seat_id: string;
  seat_label: string;
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  confirmed_at: Date | null;
}
