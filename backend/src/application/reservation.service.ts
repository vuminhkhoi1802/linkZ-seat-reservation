import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/db/database.service';
import { ReservationView } from '../domain/types';

@Injectable()
export class ReservationService {
  constructor(private readonly db: DatabaseService) {}

  async completePaymentAndReserve(userId: string, paymentAttemptId: string): Promise<ReservationView> {
    return this.db.transaction(async (client) => {
      const paymentResult = await client.query<{
        id: string;
        user_id: string;
        seat_id: string;
        status: string;
      }>('SELECT id, user_id, seat_id, status FROM payment_attempts WHERE id = $1 FOR UPDATE', [
        paymentAttemptId,
      ]);
      const payment = paymentResult.rows[0];
      if (!payment) {
        throw new NotFoundException('Payment attempt not found');
      }
      if (payment.user_id !== userId) {
        throw new ForbiddenException('Payment attempt belongs to another user');
      }

      const existingReservation = await client.query<ReservationRow>(
        `
          SELECT r.id, r.seat_id, s.label AS seat_label, r.status, r.confirmed_at
          FROM reservations r
          JOIN seats s ON s.id = r.seat_id
          WHERE r.payment_attempt_id = $1
        `,
        [paymentAttemptId],
      );
      if (existingReservation.rows[0]) {
        return this.mapReservation(existingReservation.rows[0]);
      }

      await client.query('SELECT id FROM seats WHERE id = $1 FOR UPDATE', [payment.seat_id]);
      const taken = await client.query<{ id: string }>(
        "SELECT id FROM reservations WHERE seat_id = $1 AND status = 'CONFIRMED'",
        [payment.seat_id],
      );
      if (taken.rows[0]) {
        await client.query(
          "UPDATE payment_attempts SET status = 'FAILED', completed_at = now() WHERE id = $1",
          [paymentAttemptId],
        );
        throw new ConflictException('Seat was reserved before this payment completed');
      }

      await client.query(
        "UPDATE payment_attempts SET status = 'COMPLETED', completed_at = now() WHERE id = $1",
        [paymentAttemptId],
      );
      const reservation = await client.query<ReservationRow>(
        `
          INSERT INTO reservations(user_id, seat_id, payment_attempt_id, status, confirmed_at)
          VALUES ($1, $2, $3, 'CONFIRMED', now())
          RETURNING id,
                    seat_id,
                    (SELECT label FROM seats WHERE id = $2) AS seat_label,
                    status,
                    confirmed_at
        `,
        [userId, payment.seat_id, paymentAttemptId],
      );
      return this.mapReservation(reservation.rows[0]);
    });
  }

  async listMyReservations(userId: string): Promise<ReservationView[]> {
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
