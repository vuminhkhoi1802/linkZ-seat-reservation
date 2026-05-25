import { PostgresPaymentRepository } from '../src/infrastructure/repositories/postgres-payment.repository';

describe('PostgresPaymentRepository', () => {
  let repo: PostgresPaymentRepository;
  let paymentRepo: any;

  beforeEach(() => {
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    paymentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(() => queryBuilder),
        update: jest.fn(),
      },
    };
    repo = new PostgresPaymentRepository(paymentRepo);
  });

  it('create() returns PaymentAttemptView', async () => {
    paymentRepo.create.mockReturnValue({ id: 'p1', seatId: 's1', status: 'PENDING' });
    paymentRepo.save.mockResolvedValue({ id: 'p1', seatId: 's1', status: 'PENDING' });
    const result = await repo.create('u1', 's1');
    expect(result.id).toBe('p1');
  });

  it('findByIdForUpdate() returns row or null', async () => {
    const queryBuilder = paymentRepo.manager.createQueryBuilder();
    queryBuilder.getOne.mockResolvedValue({ id: 'p1', userId: 'u1', seatId: 's1', status: 'PENDING' });
    
    expect(await repo.findByIdForUpdate(paymentRepo.manager, 'p1')).toEqual({
      id: 'p1',
      user_id: 'u1',
      seat_id: 's1',
      status: 'PENDING',
    });

    queryBuilder.getOne.mockResolvedValue(null);
    expect(await repo.findByIdForUpdate(paymentRepo.manager, 'p1')).toBeNull();
  });

  it('markAsCompleted() calls update', async () => {
    await repo.markAsCompleted(paymentRepo.manager, 'p1');
    expect(paymentRepo.manager.update).toHaveBeenCalledWith(expect.anything(), 'p1', expect.objectContaining({ status: 'COMPLETED' }));
  });

  it('markAsFailed() calls update', async () => {
    await repo.markAsFailed(paymentRepo.manager, 'p1');
    expect(paymentRepo.manager.update).toHaveBeenCalledWith(expect.anything(), 'p1', expect.objectContaining({ status: 'FAILED' }));
  });
});
