import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { useAuth } from './hooks/useAuth';
import { useSeats } from './hooks/useSeats';
import { useReservations } from './hooks/useReservations';
import { AuthPanel } from './components/AuthPanel';
import { SeatGrid } from './components/SeatGrid';
import { ReservationList } from './components/ReservationList';

export function App() {
  const { user, busy: authBusy, message, setMessage, refreshUser, login, register, logout } = useAuth();
  const { seats, refreshSeats } = useSeats();
  const { reservations, busy: reservationBusy, refreshReservations, reserveSeat } = useReservations();

  useEffect(() => {
    refresh();
  }, [refreshUser]);

  async function refresh() {
    const currentUser = await refreshUser();
    await refreshSeats();
    if (currentUser) {
      await refreshReservations();
    }
  }

  const handleReserve = async (seatId: string) => {
    try {
      const confirmed = await reserveSeat(seatId);
      setMessage(`${confirmed.seatLabel} reserved successfully`);
      await refreshSeats();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reservation failed');
      await refreshSeats();
    }
  };

  const busy = authBusy || reservationBusy;

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
        <AuthPanel onLogin={login} onRegister={register} busy={busy} />
      ) : (
        <section className="grid">
          <SeatGrid seats={seats} onReserve={handleReserve} busy={busy} />
          <ReservationList reservations={reservations} />
        </section>
      )}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
