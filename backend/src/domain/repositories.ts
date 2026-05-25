import { AuthPrincipal, PaymentAttemptView, ReservationView, SeatView } from './types';

export type TransactionalManager = any;

export interface ISeatRepository {
  findAll(): Promise<SeatView[]>;
  findByIdForUpdate(manager: TransactionalManager, id: string): Promise<void>;
  existsById(id: string): Promise<boolean>;
}

export interface IPaymentRepository {
  create(userId: string, seatId: string): Promise<PaymentAttemptView>;
  findByIdForUpdate(manager: TransactionalManager, id: string): Promise<{
    id: string;
    user_id: string;
    seat_id: string;
    status: string;
  } | null>;
  markAsCompleted(manager: TransactionalManager, id: string): Promise<void>;
  markAsFailed(manager: TransactionalManager, id: string): Promise<void>;
}

export interface IReservationRepository {
  findByPaymentAttemptId(manager: TransactionalManager, paymentAttemptId: string): Promise<ReservationView | null>;
  isSeatConfirmed(manager: TransactionalManager, seatId: string): Promise<boolean>;
  createConfirmed(manager: TransactionalManager, userId: string, seatId: string, paymentAttemptId: string): Promise<ReservationView>;
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
