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
      const result = await api<{ reservation?: Reservation }>(`/payments/${payment.id}/mock-provider-complete`, {
        method: 'POST',
      });
      const confirmed = result.reservation;
      if (!confirmed) {
        throw new Error('Payment completed without a confirmed reservation');
      }
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
