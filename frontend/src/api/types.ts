export type User = { id: string; email: string; displayName: string };
export type Seat = { id: string; label: string; isReserved: boolean };
export type PaymentAttempt = { id: string; seatId: string; status: string };
export type Reservation = {
  id: string;
  seatId: string;
  seatLabel: string;
  status: string;
  confirmedAt: string | null;
};
