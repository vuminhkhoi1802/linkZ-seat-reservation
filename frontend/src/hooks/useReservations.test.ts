import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReservations } from './useReservations';
import * as client from '../api/client';

vi.mock('../api/client');

describe('useReservations hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches reservations', async () => {
    const reservations = [{ id: '1', seatId: 's1', seatLabel: 'A1', status: 'CONFIRMED', confirmedAt: null }];
    vi.mocked(client.api).mockResolvedValue(reservations);

    const { result } = renderHook(() => useReservations());

    await act(async () => {
      await result.current.refreshReservations();
    });

    expect(result.current.reservations).toEqual(reservations);
  });

  it('handles fetch reservations failure', async () => {
    vi.mocked(client.api).mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useReservations());

    await act(async () => {
      await result.current.refreshReservations();
    });

    expect(result.current.reservations).toEqual([]);
  });

  it('reserves a seat successfully', async () => {
    const payment = { id: 'p1', seatId: 's1', status: 'PENDING' };
    const reservation = { id: 'r1', seatId: 's1', seatLabel: 'A1', status: 'CONFIRMED', confirmedAt: null };
    
    vi.mocked(client.api)
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({ reservation });

    const { result } = renderHook(() => useReservations());

    await act(async () => {
      const confirmed = await result.current.reserveSeat('s1');
      expect(confirmed).toEqual(reservation);
    });

    expect(result.current.reservations).toContainEqual(reservation);
  });

  it('handles reserve seat failure', async () => {
    vi.mocked(client.api).mockRejectedValue(new Error('Conflict'));

    const { result } = renderHook(() => useReservations());

    await act(async () => {
      try {
        await result.current.reserveSeat('s1');
      } catch (e) {}
    });

    expect(result.current.reservations).toEqual([]);
  });

  it('clears reservations', async () => {
    const { result } = renderHook(() => useReservations());

    await act(async () => {
      result.current.setReservations([{ id: '1' } as any]);
    });
    expect(result.current.reservations.length).toBe(1);

    await act(async () => {
      result.current.clearReservations();
    });
    expect(result.current.reservations).toEqual([]);
  });
});
