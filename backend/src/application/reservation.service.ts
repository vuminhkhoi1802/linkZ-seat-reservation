import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/db/database.service';
import { ReservationView } from '../domain/types';
import { IPaymentRepository, IReservationRepository, ISeatRepository } from '../domain/repositories';

@Injectable()
export class ReservationService {
  constructor(
    private readonly db: DatabaseService,
    @Inject('IReservationRepository')
    private readonly reservationRepo: IReservationRepository,
    @Inject('IPaymentRepository')
    private readonly paymentRepo: IPaymentRepository,
    @Inject('ISeatRepository')
    private readonly seatRepo: ISeatRepository,
  ) {}

  async completePaymentAndReserve(userId: string, paymentAttemptId: string): Promise<ReservationView> {
    return this.db.transaction(async (client) => {
      const payment = await this.paymentRepo.findByIdForUpdate(client, paymentAttemptId);
      if (!payment) {
        throw new NotFoundException('Payment attempt not found');
      }
      if (payment.user_id !== userId) {
        throw new ForbiddenException('Payment attempt belongs to another user');
      }

      const existingReservation = await this.reservationRepo.findByPaymentAttemptId(client, paymentAttemptId);
      if (existingReservation) {
        return existingReservation;
      }

      await this.seatRepo.findByIdForUpdate(client, payment.seat_id);
      const isTaken = await this.reservationRepo.isSeatConfirmed(client, payment.seat_id);
      
      if (isTaken) {
        await this.paymentRepo.markAsFailed(client, paymentAttemptId);
        throw new ConflictException('Seat was reserved before this payment completed');
      }

      await this.paymentRepo.markAsCompleted(client, paymentAttemptId);
      return this.reservationRepo.createConfirmed(client, userId, payment.seat_id, paymentAttemptId);
    });
  }

  async listMyReservations(userId: string): Promise<ReservationView[]> {
    return this.reservationRepo.listByUserId(userId);
  }
}
