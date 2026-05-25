export type ReservationStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface AuthPrincipal {
  userId: string;
  email: string;
}

export interface SeatView {
  id: string;
  label: string;
  isReserved: boolean;
}

export interface PaymentAttemptView {
  id: string;
  seatId: string;
  status: PaymentStatus;
}

export interface ReservationView {
  id: string;
  seatId: string;
  seatLabel: string;
  status: ReservationStatus;
  confirmedAt: string | null;
}
