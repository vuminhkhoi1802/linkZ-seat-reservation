import { PoolClient } from 'pg';
import { AuthPrincipal, PaymentAttemptView, ReservationView, SeatView } from './types';

export interface ISeatRepository {
  findAll(): Promise<SeatView[]>;
  findByIdForUpdate(client: PoolClient, id: string): Promise<void>;
  existsById(id: string): Promise<boolean>;
}

export interface IPaymentRepository {
  create(userId: string, seatId: string): Promise<PaymentAttemptView>;
  findByIdForUpdate(client: PoolClient, id: string): Promise<{
    id: string;
    user_id: string;
    seat_id: string;
    status: string;
  } | null>;
  markAsCompleted(client: PoolClient, id: string): Promise<void>;
  markAsFailed(client: PoolClient, id: string): Promise<void>;
}

export interface IReservationRepository {
  findByPaymentAttemptId(client: PoolClient, paymentAttemptId: string): Promise<ReservationView | null>;
  isSeatConfirmed(client: PoolClient, seatId: string): Promise<boolean>;
  createConfirmed(client: PoolClient, userId: string, seatId: string, paymentAttemptId: string): Promise<ReservationView>;
  listByUserId(userId: string): Promise<ReservationView[]>;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<{ id: string; email: string; display_name: string; password_hash: string } | null>;
  findById(id: string): Promise<{ id: string; email: string; display_name: string } | null>;
  createWithCredentials(
    email: string,
    displayName: string,
    passwordHash: string,
  ): Promise<{ id: string; email: string; display_name: string }>;
}
