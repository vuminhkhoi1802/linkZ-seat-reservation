import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  async query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number | null }> {
    const result = await this.dataSource.query(text, params);
    return {
      rows: Array.isArray(result) ? result : [result],
      rowCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
    };
  }

  async transaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }

  async migrateAndSeed(): Promise<void> {
    // We keep the manual migration logic for now as requested to ensure everything works
    // But we use the dataSource to execute it
    await this.dataSource.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS auth_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(provider, provider_user_id)
      );

      CREATE TABLE IF NOT EXISTS local_credentials (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS seats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS payment_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
        payment_attempt_id UUID NOT NULL UNIQUE REFERENCES payment_attempts(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'FAILED', 'EXPIRED')),
        confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_reservation_per_seat
        ON reservations(seat_id)
        WHERE status = 'CONFIRMED';
    `);

    await this.dataSource.query(`
      INSERT INTO seats(label)
      VALUES ('Seat A'), ('Seat B'), ('Seat C')
      ON CONFLICT (label) DO NOTHING;
    `);
    this.logger.log('Database migrated and seeded');
  }

  async onModuleDestroy(): Promise<void> {
    // TypeOrmModule handles dataSource closing
  }
}
