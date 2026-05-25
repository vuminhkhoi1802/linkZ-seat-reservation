import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from '../src/application/payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let db: any;
  let paymentRepo: any;
  let reservationRepo: any;

  beforeEach(() => {
    db = {};
    paymentRepo = { create: jest.fn() };
    reservationRepo = { isSeatConfirmed: jest.fn() };
    service = new PaymentService(db, paymentRepo, reservationRepo);
  });

  it('creates payment attempt', async () => {
    reservationRepo.isSeatConfirmed.mockResolvedValue(false);
    paymentRepo.create.mockResolvedValue({ id: 'p1' });

    const result = await service.createPaymentAttempt('u1', 's1');
    expect(result.id).toBe('p1');
  });

  it('throws BadRequestException if seat is reserved', async () => {
    reservationRepo.isSeatConfirmed.mockResolvedValue(true);
    await expect(service.createPaymentAttempt('u1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException if seat not found', async () => {
    reservationRepo.isSeatConfirmed.mockResolvedValue(false);
    paymentRepo.create.mockRejectedValue(new Error('Seat not found'));
    await expect(service.createPaymentAttempt('u1', 's1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
