import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './main';
import { setAccessTokenProvider } from './api/client';

const seats = [
  { id: 'seat-a', label: 'Seat A', isReserved: false },
  { id: 'seat-b', label: 'Seat B', isReserved: false },
  { id: 'seat-c', label: 'Seat C', isReserved: false },
];

const user = { id: 'user-1', email: 'reviewer.a@example.com', displayName: 'Reviewer A' };

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  if (init.status === 204) {
    return new Response(null, init);
  }
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('App external authentication', () => {
  afterEach(() => {
    setAccessTokenProvider(null);
    vi.unstubAllGlobals();
  });

  it('does not render password fields and signs in with a bearer-token identity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const path = String(input);
      if (path === '/api/seats') return jsonResponse(seats);
      if (path === '/api/auth/me') {
        const headers = (options?.headers ?? {}) as Record<string, string>;
        if (!headers.Authorization) {
          return jsonResponse({ user: null }, { status: 401 });
        }
        return jsonResponse({ user });
      }
      if (path === '/api/reservations/me') return jsonResponse([]);
      throw new Error(`Unhandled request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Continue as Reviewer A' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer mock:') }),
        }),
      );
    });
    expect(await screen.findByText('Signed in as reviewer.a@example.com')).toBeInTheDocument();
  });
});

describe('App reservations panel', () => {
  afterEach(() => {
    setAccessTokenProvider(null);
    vi.unstubAllGlobals();
  });

  it('renders all confirmed reserved seats for the signed-in user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input);
        if (path === '/api/seats') {
          return jsonResponse([
            { id: 'seat-a', label: 'Seat A', isReserved: true },
            { id: 'seat-b', label: 'Seat B', isReserved: true },
            { id: 'seat-c', label: 'Seat C', isReserved: false },
          ]);
        }
        if (path === '/api/auth/me') return jsonResponse({ user });
        if (path === '/api/reservations/me') {
          return jsonResponse([
            {
              id: 'reservation-b',
              seatId: 'seat-b',
              seatLabel: 'Seat B',
              status: 'CONFIRMED',
              confirmedAt: '2026-05-26T01:47:02.000Z',
            },
            {
              id: 'reservation-a',
              seatId: 'seat-a',
              seatLabel: 'Seat A',
              status: 'CONFIRMED',
              confirmedAt: '2026-05-25T01:47:02.000Z',
            },
          ]);
        }
        throw new Error(`Unhandled request: ${path}`);
      }),
    );

    render(<App />);

    const reservationHeading = await screen.findByRole('heading', { name: 'Your reserved seats' });
    const panel = reservationHeading.closest('.panel');

    expect(panel).toBeInTheDocument();
    expect(await within(panel as HTMLElement).findByText('Seat B')).toBeInTheDocument();
    expect(await within(panel as HTMLElement).findByText('Seat A')).toBeInTheDocument();
    expect(within(panel as HTMLElement).getAllByText('CONFIRMED')).toHaveLength(2);
  });

  it('clears reservations from UI on sign out', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/seats') return jsonResponse(seats);
      if (path === '/api/auth/me') return jsonResponse({ user });
      if (path === '/api/reservations/me') {
        return jsonResponse([
          { id: 'r1', seatId: 's1', seatLabel: 'Seat A', status: 'CONFIRMED', confirmedAt: null },
        ]);
      }
      throw new Error(`Unhandled request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const reservationHeading = await screen.findByText('Your reserved seats');
    const reservationPanel = reservationHeading.closest('.panel')!;
    expect(await within(reservationPanel as HTMLElement).findByText('Seat A')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await screen.findByRole('button', { name: 'Continue as Reviewer A' });
    expect(screen.queryByText('Seat A')).not.toBeInTheDocument();
  });
});
