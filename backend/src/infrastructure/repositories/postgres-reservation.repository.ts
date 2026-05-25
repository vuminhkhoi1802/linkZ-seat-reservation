import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IReservationRepository, TransactionalManager } from '../../domain/repositories';
import { ReservationView } from '../../domain/types';
import { Reservation } from '../db/entities/reservation.entity';
import { Seat } from '../db/entities/seat.entity';

@Injectable()
export class PostgresReservationRepository implements IReservationRepository {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
  ) {}

  async findByPaymentAttemptId(manager: TransactionalManager, paymentAttemptId: string): Promise<ReservationView | null> {
    const entityManager: EntityManager = manager;
    const reservation = await entityManager.findOne(Reservation, {
      where: { paymentAttemptId },
      relations: { seat: true },
    });

    return reservation ? this.mapReservation(reservation) : null;
  }

  async isSeatConfirmed(manager: TransactionalManager, seatId: string): Promise<boolean> {
    const entityManager: EntityManager = manager || this.reservationRepo.manager;
    const count = await entityManager.count(Reservation, {
      where: { seatId, status: 'CONFIRMED' },
    });
    return count > 0;
  }

  async createConfirmed(
    manager: TransactionalManager,
    userId: string,
    seatId: string,
    paymentAttemptId: string,
  ): Promise<ReservationView> {
    const entityManager: EntityManager = manager || this.reservationRepo.manager;
    
    // We need the seat label for the view, so we fetch the seat first or use a join
    const seat = await entityManager.findOne(Seat, { where: { id: seatId } });

    const reservation = entityManager.create(Reservation, {
      userId,
      seatId,
      paymentAttemptId,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    });
    const saved = await entityManager.save(Reservation, reservation);
    
    return {
      id: saved.id,
      seatId: saved.seatId,
      seatLabel: seat?.label ?? '',
      status: saved.status,
      confirmedAt: saved.confirmedAt?.toISOString() ?? null,
    };
  }

  async listByUserId(userId: string): Promise<ReservationView[]> {
    const reservations = await this.reservationRepo.find({
      where: { userId, status: 'CONFIRMED' },
      relations: { seat: true },
      order: { confirmedAt: 'DESC' },
    });

    return reservations.map((r) => this.mapReservation(r));
  }

  private mapReservation(r: Reservation): ReservationView {
    return {
      id: r.id,
      seatId: r.seatId,
      seatLabel: r.seat?.label ?? '',
      status: r.status,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
    };
  }
}
