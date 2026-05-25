import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  it('throws NotFoundException if payment attempt not found', async () => {
    const db = { transaction: jest.fn(async (work) => work({} as any)) };
    const paymentRepo = { findByIdForUpdate: jest.fn().mockResolvedValue(null) };
    const service = new ReservationService(db as any, {} as any, paymentRepo as any, {} as any);

    await expect(service.completePaymentAndReserve('u1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException if payment belongs to another user', async () => {
    const db = { transaction: jest.fn(async (work) => work({} as any)) };
    const paymentRepo = { findByIdForUpdate: jest.fn().mockResolvedValue({ user_id: 'other' }) };
    const service = new ReservationService(db as any, {} as any, paymentRepo as any, {} as any);

    await expect(service.completePaymentAndReserve('u1', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns existing reservation if already confirmed', async () => {
    const db = { transaction: jest.fn(async (work) => work({} as any)) };
    const paymentRepo = { findByIdForUpdate: jest.fn().mockResolvedValue({ user_id: 'u1' }) };
    const reservationRepo = { findByPaymentAttemptId: jest.fn().mockResolvedValue({ id: 'r1' }) };
    const service = new ReservationService(db as any, reservationRepo as any, paymentRepo as any, {} as any);

    const result = await service.completePaymentAndReserve('u1', 'p1');
    expect(result.id).toBe('r1');
  });

  it('lists my reservations', async () => {
    const reservationRepo = { listByUserId: jest.fn().mockResolvedValue([]) };
    const service = new ReservationService({} as any, reservationRepo as any, {} as any, {} as any);
    expect(await service.listMyReservations('u1')).toEqual([]);
  });
});
