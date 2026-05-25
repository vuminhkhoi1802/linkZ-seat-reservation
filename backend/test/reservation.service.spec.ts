import { ConflictException } from '@nestjs/common';
import { ReservationService } from '../src/application/reservation.service';

describe('ReservationService contract', () => {
  it('treats seat conflicts as explicit availability failures', async () => {
    const db = {
      transaction: jest.fn(async (work) =>
        work({
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rows: [{ id: 'payment-1', user_id: 'user-1', seat_id: 'seat-1', status: 'PENDING' }],
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'seat-1' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'reservation-1' }] })
            .mockResolvedValueOnce({ rows: [] }),
        }),
      ),
    };
    const service = new ReservationService(db as never);

    await expect(service.completePaymentAndReserve('user-1', 'payment-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
