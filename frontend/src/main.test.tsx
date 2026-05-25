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

    const heading = await screen.findByRole('heading', { name: 'Your reserved seats' });
    const panel = heading.closest('.panel');

    expect(panel).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByText('Seat B')).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByText('Seat A')).toBeInTheDocument();
    expect(within(panel as HTMLElement).getAllByText('CONFIRMED')).toHaveLength(2);
  });
});
