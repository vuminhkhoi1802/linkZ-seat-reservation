import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { IPaymentRepository, TransactionalManager } from '../../domain/repositories';
import { PaymentAttemptView } from '../../domain/types';
import { PaymentAttempt } from '../db/entities/payment-attempt.entity';

@Injectable()
export class TypeOrmPaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentAttempt)
    private readonly paymentRepo: Repository<PaymentAttempt>,
  ) {}

  async create(userId: string, seatId: string): Promise<PaymentAttemptView> {
    const attempt = this.paymentRepo.create({
      userId,
      seatId,
      status: 'PENDING',
    });
    const saved = await this.paymentRepo.save(attempt);
    return { id: saved.id, seatId: saved.seatId, status: saved.status };
  }

  async findById(id: string): Promise<{
    id: string;
    user_id: string;
    seat_id: string;
    status: string;
  } | null> {
    const attempt = await this.paymentRepo.findOne({ where: { id } });
    if (!attempt) return null;

    return {
      id: attempt.id,
      user_id: attempt.userId,
      seat_id: attempt.seatId,
      status: attempt.status,
    };
  }

  async findByIdForUpdate(manager: TransactionalManager, id: string): Promise<{
    id: string;
    user_id: string;
    seat_id: string;
    status: string;
  } | null> {
    const entityManager: EntityManager = manager || this.paymentRepo.manager;
    const attempt = await entityManager
      .createQueryBuilder(PaymentAttempt, 'attempt')
      .setLock('pessimistic_write')
      .where('attempt.id = :id', { id })
      .getOne();

    if (!attempt) return null;

    return {
      id: attempt.id,
      user_id: attempt.userId,
      seat_id: attempt.seatId,
      status: attempt.status,
    };
  }

  async markAsCompleted(manager: TransactionalManager, id: string): Promise<void> {
    const entityManager: EntityManager = manager || this.paymentRepo.manager;
    await entityManager.update(PaymentAttempt, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });
  }

  async markAsFailed(manager: TransactionalManager, id: string): Promise<void> {
    const entityManager: EntityManager = manager || this.paymentRepo.manager;
    await entityManager.update(PaymentAttempt, id, {
      status: 'FAILED',
      completedAt: new Date(),
    });
  }
}
