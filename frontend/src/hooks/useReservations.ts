import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { Reservation, PaymentAttempt } from '../api/types';

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshReservations = useCallback(async () => {
    try {
      const data = await api<Reservation[]>('/reservations/me');
      setReservations(data);
    } catch (error) {
      setReservations([]);
    }
  }, []);

  const reserveSeat = async (seatId: string) => {
    setBusy(true);
    try {
      const payment = await api<PaymentAttempt>('/payments/create', {
        method: 'POST',
        body: JSON.stringify({ seatId }),
      });
      const confirmed = await api<Reservation>(`/payments/${payment.id}/complete`, {
        method: 'POST',
      });
      setReservations((current) => [confirmed, ...current.filter((item) => item.id !== confirmed.id)]);
      return confirmed;
    } catch (error) {
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const clearReservations = useCallback(() => {
    setReservations([]);
  }, []);

  return { reservations, busy, refreshReservations, reserveSeat, setReservations, clearReservations };
}
