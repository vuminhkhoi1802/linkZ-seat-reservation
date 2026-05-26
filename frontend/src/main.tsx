import React, { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, SignedIn, UserButton, useAuth as useClerkAuth } from '@clerk/clerk-react';
import './styles.css';
import { useAuth } from './hooks/useAuth';
import { useSeats } from './hooks/useSeats';
import { useReservations } from './hooks/useReservations';
import { ExternalAuthPanel } from './components/ExternalAuthPanel';
import { SeatGrid } from './components/SeatGrid';
import { ReservationList } from './components/ReservationList';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

interface AppContentProps {
  clerkConfigured: boolean;
  clerkAuth?: {
    isSignedIn: boolean | undefined;
    getToken: () => Promise<string | null>;
    signOut: () => Promise<void>;
  };
}

export function AppContent({ clerkConfigured, clerkAuth }: AppContentProps) {
  const {
    user,
    busy: authBusy,
    message,
    setMessage,
    refreshUser,
    activateTokenProvider,
    signInDemo,
    logout,
  } = useAuth();
  const { seats, refreshSeats, clearSeats } = useSeats();
  const {
    reservations,
    busy: reservationBusy,
    refreshReservations,
    reserveSeat,
    clearReservations,
  } = useReservations();

  useEffect(() => {
    if (!clerkConfigured) {
      refreshUser();
      return;
    }

    if (clerkAuth?.isSignedIn) {
      activateTokenProvider(clerkAuth.getToken);
    } else {
      logout();
    }
  }, [activateTokenProvider, clerkAuth, clerkConfigured, logout, refreshUser]);

  // React to user changes
  useEffect(() => {
    if (user) {
      refreshSeats();
      refreshReservations();
    } else {
      clearReservations();
      clearSeats();
    }
  }, [user, clearReservations, clearSeats, refreshReservations, refreshSeats]);

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
          <div className="session-actions">
            {clerkConfigured && (
              <SignedIn>
                <UserButton />
              </SignedIn>
            )}
            <button
              className="secondary"
              onClick={() => {
                if (clerkConfigured && clerkAuth) {
                  clerkAuth.signOut();
                }
                logout();
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </section>

      {!user ? (
        <ExternalAuthPanel clerkConfigured={clerkConfigured} busy={busy} onDemoSignIn={signInDemo} />
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

function ClerkAwareApp() {
  const clerkAuth = useClerkAuth();
  const authAdapter = useMemo(
    () => ({
      isSignedIn: clerkAuth.isSignedIn,
      getToken: clerkAuth.getToken,
      signOut: clerkAuth.signOut,
    }),
    [clerkAuth.getToken, clerkAuth.isSignedIn, clerkAuth.signOut],
  );

  return (
    <AppContent
      clerkConfigured
      clerkAuth={authAdapter}
    />
  );
}

export function App() {
  if (clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <ClerkAwareApp />
      </ClerkProvider>
    );
  }

  return <AppContent clerkConfigured={false} />;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
