import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentAttemptView } from '../domain/types';
import { IPaymentRepository, IReservationRepository } from '../domain/repositories';
import { DatabaseService } from '../infrastructure/db/database.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly db: DatabaseService, // Still needed for pool connection if we check outside tx, but let's see if we can use repos
    @Inject('IPaymentRepository')
    private readonly paymentRepo: IPaymentRepository,
    @Inject('IReservationRepository')
    private readonly reservationRepo: IReservationRepository,
  ) {}

  async createPaymentAttempt(userId: string, seatId: string): Promise<PaymentAttemptView> {
    // We can use a simple query for the check, but let's use the repo
    const isReserved = await this.reservationRepo.isSeatConfirmed(this.db as any, seatId);
    if (isReserved) {
      throw new BadRequestException('Seat is already reserved');
    }

    try {
      return await this.paymentRepo.create(userId, seatId);
    } catch (error) {
      if (error instanceof Error && error.message === 'Seat not found') {
        throw new NotFoundException('Seat not found');
      }
      throw error;
    }
  }
}
