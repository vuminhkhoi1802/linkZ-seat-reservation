import { Injectable } from '@nestjs/common';
import { SeatView } from '../domain/types';
import { DatabaseService } from '../infrastructure/db/database.service';

@Injectable()
export class SeatService {
  constructor(private readonly db: DatabaseService) {}

  async listSeats(): Promise<SeatView[]> {
    const result = await this.db.query<{ id: string; label: string; is_reserved: boolean }>(
      `
        SELECT s.id,
               s.label,
               EXISTS (
                 SELECT 1 FROM reservations r
                 WHERE r.seat_id = s.id AND r.status = 'CONFIRMED'
               ) AS is_reserved
        FROM seats s
        ORDER BY s.label ASC
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      label: row.label,
      isReserved: row.is_reserved,
    }));
  }
}
