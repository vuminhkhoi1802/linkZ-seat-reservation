import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { Seat } from '../api/types';

export function useSeats() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshSeats = useCallback(async () => {
    setBusy(true);
    try {
      const data = await api<Seat[]>('/seats');
      setSeats(data);
    } catch (error) {
      console.error('Failed to fetch seats', error);
    } finally {
      setBusy(false);
    }
  }, []);

  const clearSeats = useCallback(() => {
    setSeats([]);
  }, []);

  return { seats, busy, refreshSeats, clearSeats };
}
