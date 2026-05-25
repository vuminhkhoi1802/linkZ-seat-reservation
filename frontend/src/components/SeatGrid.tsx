import React, { useState } from 'react';
import { Seat } from '../api/types';

interface SeatGridProps {
  seats: Seat[];
  onReserve: (seatId: string) => Promise<void>;
  busy: boolean;
}

export function SeatGrid({ seats, onReserve, busy }: SeatGridProps) {
  const [selectedSeatId, setSelectedSeatId] = useState<string>('');

  const handleReserve = () => {
    if (selectedSeatId) {
      onReserve(selectedSeatId);
    }
  };

  return (
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
      <button disabled={busy || !selectedSeatId} onClick={handleReserve}>
        {busy ? 'Processing payment...' : 'Pay and reserve'}
      </button>
    </div>
  );
}
