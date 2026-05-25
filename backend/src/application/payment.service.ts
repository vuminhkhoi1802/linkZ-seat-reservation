import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/db/database.service';
import { PaymentAttemptView } from '../domain/types';

@Injectable()
export class PaymentService {
  constructor(private readonly db: DatabaseService) {}

  async createPaymentAttempt(userId: string, seatId: string): Promise<PaymentAttemptView> {
    const reserved = await this.db.query<{ id: string }>(
      "SELECT id FROM reservations WHERE seat_id = $1 AND status = 'CONFIRMED'",
      [seatId],
    );
    if (reserved.rows[0]) {
      throw new BadRequestException('Seat is already reserved');
    }

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
      throw new NotFoundException('Seat not found');
    }
    return { id: row.id, seatId: row.seat_id, status: row.status };
  }
}
