import { Injectable } from '@nestjs/common';
import { ISeatRepository } from '../../domain/repositories';
import { SeatView } from '../../domain/types';
import { DatabaseService } from '../db/database.service';
import { PoolClient } from 'pg';

@Injectable()
export class PostgresSeatRepository implements ISeatRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<SeatView[]> {
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

  async findByIdForUpdate(client: PoolClient, id: string): Promise<void> {
    await client.query('SELECT id FROM seats WHERE id = $1 FOR UPDATE', [id]);
  }

  async existsById(id: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM seats WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
