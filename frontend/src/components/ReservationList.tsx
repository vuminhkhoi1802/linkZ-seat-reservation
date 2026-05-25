import React from 'react';
import { Reservation } from '../api/types';

interface ReservationListProps {
  reservations: Reservation[];
}

export function ReservationList({ reservations }: ReservationListProps) {
  return (
    <div className="panel">
      <h2>Your reserved seats</h2>
      {reservations.length > 0 ? (
        <div className="reservation-list">
          {reservations.map((reservation) => (
            <div className="confirmation" key={reservation.id}>
              <strong>{reservation.seatLabel}</strong>
              <span>{reservation.status}</span>
              <small>
                {reservation.confirmedAt ? new Date(reservation.confirmedAt).toLocaleString() : ''}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <p>No confirmed seats yet.</p>
      )}
    </div>
  );
}
