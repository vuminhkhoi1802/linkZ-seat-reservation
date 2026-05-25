import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeatGrid } from './SeatGrid';

describe('SeatGrid', () => {
  const seats = [
    { id: '1', label: 'Seat A', isReserved: false },
    { id: '2', label: 'Seat B', isReserved: true },
  ];

  it('renders available and reserved seats', () => {
    render(<SeatGrid seats={seats} onReserve={vi.fn()} busy={false} />);

    expect(screen.getByText('Seat A')).toBeInTheDocument();
    expect(screen.getByText('Seat B')).toBeInTheDocument();
    
    const seatB = screen.getByRole('button', { name: /Seat B/ });
    expect(seatB).toBeDisabled();
  });

  it('selects a seat and calls onReserve', () => {
    const onReserve = vi.fn().mockResolvedValue({});
    render(<SeatGrid seats={seats} onReserve={onReserve} busy={false} />);

    fireEvent.click(screen.getByText('Seat A'));
    fireEvent.click(screen.getByRole('button', { name: 'Pay and reserve' }));

    expect(onReserve).toHaveBeenCalledWith('1');
  });

  it('disables buttons when busy', () => {
    render(<SeatGrid seats={seats} onReserve={vi.fn()} busy={true} />);
    expect(screen.getByRole('button', { name: 'Processing payment...' })).toBeDisabled();
  });
});
