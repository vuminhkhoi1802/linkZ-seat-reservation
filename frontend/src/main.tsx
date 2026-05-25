import React, { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type User = { id: string; email: string; displayName: string };
type Seat = { id: string; label: string; isReserved: boolean };
type PaymentAttempt = { id: string; seatId: string; status: string };
type Reservation = {
  id: string;
  seatId: string;
  seatLabel: string;
  status: string;
  confirmedAt: string | null;
};

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed with ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string>('');
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('reviewer@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Reviewer');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [seatData, me] = await Promise.all([
      api<Seat[]>('/seats'),
      api<{ user: User | null }>('/auth/me').catch(() => ({ user: null })),
    ]);
    setSeats(seatData);
    setUser(me.user);
    if (me.user) {
      setReservation(await api<Reservation | null>('/reservations/me'));
    }
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const path = mode === 'register' ? '/auth/register' : '/auth/login';
      const result = await api<{ user: User }>(path, {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      setUser(result.user);
      setMessage(`Signed in as ${result.user.email}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  async function reserveSelectedSeat() {
    if (!selectedSeatId) {
      setMessage('Choose a seat first');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const payment = await api<PaymentAttempt>('/payments/create', {
        method: 'POST',
        body: JSON.stringify({ seatId: selectedSeatId }),
      });
      const confirmed = await api<Reservation>(`/payments/${payment.id}/complete`, {
        method: 'POST',
      });
      setReservation(confirmed);
      setMessage(`${confirmed.seatLabel} reserved successfully`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reservation failed');
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api<void>('/auth/logout', { method: 'POST' });
    setUser(null);
    setReservation(null);
    setMessage('Signed out');
    await refresh();
  }

  return (
    <main className="shell">
      <section className="header">
        <div>
          <p className="eyebrow">Public reservation workflow</p>
          <h1>Seat Reservation</h1>
        </div>
        {user && (
          <button className="secondary" onClick={logout}>
            Sign out
          </button>
        )}
      </section>

      {!user ? (
        <form className="panel auth" onSubmit={submitAuth}>
          <div className="tabs">
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
              Register
            </button>
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Login
            </button>
          </div>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {mode === 'register' && (
            <label>
              Display name
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          )}
          <button disabled={busy}>{busy ? 'Working...' : mode === 'register' ? 'Create account' : 'Login'}</button>
        </form>
      ) : (
        <section className="grid">
          <div className="panel">
            <h2>Available seats</h2>
            <div className="seats">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  className={selectedSeatId === seat.id ? 'seat selected' : 'seat'}
                  disabled={seat.isReserved || busy}
                  onClick={() => setSelectedSeatId(seat.id)}
                >
                  <span>{seat.label}</span>
                  <small>{seat.isReserved ? 'Reserved' : 'Available'}</small>
                </button>
              ))}
            </div>
            <button disabled={busy || !selectedSeatId} onClick={reserveSelectedSeat}>
              {busy ? 'Processing payment...' : 'Pay and reserve'}
            </button>
          </div>
          <div className="panel">
            <h2>Your reservation</h2>
            {reservation ? (
              <div className="confirmation">
                <strong>{reservation.seatLabel}</strong>
                <span>{reservation.status}</span>
                <small>{reservation.confirmedAt ? new Date(reservation.confirmedAt).toLocaleString() : ''}</small>
              </div>
            ) : (
              <p>No confirmed reservation yet.</p>
            )}
          </div>
        </section>
      )}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
