import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ISeatRepository, TransactionalManager } from '../../domain/repositories';
import { SeatView } from '../../domain/types';
import { Seat } from '../db/entities/seat.entity';

@Injectable()
export class PostgresSeatRepository implements ISeatRepository {
  constructor(
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
  ) {}

  async findAll(): Promise<SeatView[]> {
    const seats = await this.seatRepo.find({
      relations: { reservations: true },
      order: { label: 'ASC' },
    });

    return seats.map((seat) => ({
      id: seat.id,
      label: seat.label,
      isReserved: seat.reservations?.some((r) => r.status === 'CONFIRMED') ?? false,
    }));
  }

  async findByIdForUpdate(manager: TransactionalManager, id: string): Promise<void> {
    const entityManager: EntityManager = manager || this.seatRepo.manager;
    await entityManager
      .createQueryBuilder(Seat, 'seat')
      .setLock('pessimistic_write')
      .where('seat.id = :id', { id })
      .getOne();
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.seatRepo.count({ where: { id } });
    return count > 0;
  }
}
