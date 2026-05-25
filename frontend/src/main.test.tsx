import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './main';

const seats = [
  { id: 'seat-a', label: 'Seat A', isReserved: false },
  { id: 'seat-b', label: 'Seat B', isReserved: false },
  { id: 'seat-c', label: 'Seat C', isReserved: false },
];

const user = { id: 'user-1', email: 'reviewer@example.com', displayName: 'Reviewer' };

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

function requestBody(call: unknown[]) {
  const options = call[1] as RequestInit;
  return JSON.parse(options.body as string) as Record<string, unknown>;
}

describe('App authentication requests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/seats') {
        return jsonResponse(seats);
      }
      if (path === '/api/auth/me') {
        return jsonResponse({ user: null }, { status: 401 });
      }
      if (path === '/api/auth/register' || path === '/api/auth/login') {
        return jsonResponse({ user });
      }
      if (path === '/api/reservations/me') {
        return jsonResponse([]);
      }
      throw new Error(`Unhandled request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends displayName when registering', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.any(Object));
    });
    const registerCall = fetchMock.mock.calls.find(([path]) => path === '/api/auth/register');

    expect(registerCall).toBeDefined();
    expect(requestBody(registerCall!)).toEqual({
      email: 'reviewer@example.com',
      password: 'password123',
      displayName: 'Reviewer',
    });
  });

  it('does not send displayName when logging in', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: 'Login' }));
    const authForm = screen.getByLabelText('Email').closest('form');
    const submitButton = authForm?.querySelector('button:not([type="button"])');
    await userEvent.click(submitButton as HTMLButtonElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    });
    const loginCall = fetchMock.mock.calls.find(([path]) => path === '/api/auth/login');

    expect(loginCall).toBeDefined();
    expect(requestBody(loginCall!)).toEqual({
      email: 'reviewer@example.com',
      password: 'password123',
    });
  });
});

describe('App reservations panel', () => {
  afterEach(() => {
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
        if (path === '/api/auth/me') {
          return jsonResponse({ user });
        }
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
      if (path === '/api/auth/logout') return jsonResponse({}, { status: 204 });
      if (path === '/api/reservations/me') {
        return jsonResponse([
          { id: 'r1', seatId: 's1', seatLabel: 'Seat A', status: 'CONFIRMED', confirmedAt: null },
        ]);
      }
      throw new Error(`Unhandled request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    // Wait for authenticated view
    const reservationHeading = await screen.findByText('Your reserved seats');
    const reservationPanel = reservationHeading.closest('.panel')!;
    expect(await within(reservationPanel as HTMLElement).findByText('Seat A')).toBeInTheDocument();

    // Sign out
    const signOutBtn = screen.getByRole('button', { name: 'Sign out' });
    await userEvent.click(signOutBtn);

    // Wait for auth panel
    await screen.findByRole('button', { name: 'Create account' });

    // Verify reservations are gone (implicitly by checking they aren't in the document anymore since the panel is hidden)
    // But more importantly, if we log back in as someone else (who has no reservations)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/seats') return jsonResponse(seats);
      if (path === '/api/auth/login') return jsonResponse({ user: { ...user, id: 'user-2' } });
      if (path === '/api/reservations/me') return jsonResponse([]);
      return jsonResponse({});
    });

    await userEvent.click(screen.getByRole('button', { name: 'Login', type: 'button' }));
    const authForm = screen.getByLabelText('Email').closest('form');
    const submitButton = authForm?.querySelector('button:not([type="button"])');
    await userEvent.click(submitButton as HTMLButtonElement);

    const newReservationHeading = await screen.findByText('Your reserved seats');
    const newReservationPanel = newReservationHeading.closest('.panel')!;
    expect(within(newReservationPanel as HTMLElement).queryByText('Seat A')).not.toBeInTheDocument();
    expect(within(newReservationPanel as HTMLElement).getByText('No confirmed seats yet.')).toBeInTheDocument();
  });
});
