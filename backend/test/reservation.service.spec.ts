import { ConflictException } from '@nestjs/common';
import { ReservationService } from '../src/application/reservation.service';

describe('ReservationService contract', () => {
  it('treats seat conflicts as explicit availability failures', async () => {
    const db = {
      transaction: jest.fn(async (work) => work({} as any)),
    };
    const reservationRepo = {
      findByPaymentAttemptId: jest.fn().mockResolvedValue(null),
      isSeatConfirmed: jest.fn().mockResolvedValue(true),
      createConfirmed: jest.fn(),
      listByUserId: jest.fn(),
    };
    const paymentRepo = {
      findByIdForUpdate: jest.fn(async () => ({
        id: 'payment-1',
        user_id: 'user-1',
        seat_id: 'seat-1',
        status: 'PENDING',
      })),
      markAsFailed: jest.fn(),
      markAsCompleted: jest.fn(),
      create: jest.fn(),
    };
    const seatRepo = {
      findByIdForUpdate: jest.fn(),
      findAll: jest.fn(),
      existsById: jest.fn(),
    };

    const service = new ReservationService(
      db as any,
      reservationRepo as any,
      paymentRepo as any,
      seatRepo as any,
    );

    await expect(service.completePaymentAndReserve('user-1', 'payment-1')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(paymentRepo.markAsFailed).toHaveBeenCalledWith(expect.anything(), 'payment-1');
  });
});
