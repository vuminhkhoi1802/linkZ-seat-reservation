import { PostgresReservationRepository } from '../src/infrastructure/repositories/postgres-reservation.repository';

describe('PostgresReservationRepository', () => {
  let repo: PostgresReservationRepository;
  let reservationRepo: any;

  beforeEach(() => {
    reservationRepo = {
      find: jest.fn(),
      manager: {
        findOne: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };
    repo = new PostgresReservationRepository(reservationRepo);
  });

  it('findByPaymentAttemptId() maps row to ReservationView', async () => {
    reservationRepo.manager.findOne.mockResolvedValue({ id: 'r1', confirmedAt: new Date(), seat: { label: 'A' } });
    const result = await repo.findByPaymentAttemptId(reservationRepo.manager, 'p1');
    expect(result?.id).toBe('r1');
    expect(result?.seatLabel).toBe('A');

    reservationRepo.manager.findOne.mockResolvedValue(null);
    expect(await repo.findByPaymentAttemptId(reservationRepo.manager, 'p1')).toBeNull();
  });

  it('isSeatConfirmed() returns boolean', async () => {
    reservationRepo.manager.count.mockResolvedValue(1);
    expect(await repo.isSeatConfirmed(reservationRepo.manager, 's1')).toBe(true);

    reservationRepo.manager.count.mockResolvedValue(0);
    expect(await repo.isSeatConfirmed(reservationRepo.manager, 's1')).toBe(false);
  });

  it('createConfirmed() returns ReservationView', async () => {
    reservationRepo.manager.findOne.mockResolvedValue({ label: 'A' });
    reservationRepo.manager.create.mockReturnValue({ id: 'r1', seatId: 's1', status: 'CONFIRMED', confirmedAt: new Date() });
    reservationRepo.manager.save.mockResolvedValue({ id: 'r1', seatId: 's1', status: 'CONFIRMED', confirmedAt: new Date() });
    
    const result = await repo.createConfirmed(reservationRepo.manager, 'u1', 's1', 'p1');
    expect(result.id).toBe('r1');
    expect(result.seatLabel).toBe('A');
  });

  it('listByUserId() returns list', async () => {
    reservationRepo.find.mockResolvedValue([{ id: 'r1', confirmedAt: new Date(), seat: { label: 'A' } }]);
    const result = await repo.listByUserId('u1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('r1');
  });

  it('findByPaymentAttemptId() uses default manager if none provided', async () => {
    reservationRepo.manager.findOne = jest.fn();
    await repo.findByPaymentAttemptId(undefined, 'p1');
    expect(reservationRepo.manager.findOne).toHaveBeenCalled();
  });

  it('isSeatConfirmed() uses default manager if none provided', async () => {
    reservationRepo.manager.count = jest.fn();
    await repo.isSeatConfirmed(undefined, 's1');
    expect(reservationRepo.manager.count).toHaveBeenCalled();
  });

  it('createConfirmed() uses default manager if none provided', async () => {
    reservationRepo.manager.findOne = jest.fn();
    reservationRepo.manager.create = jest.fn().mockReturnValue({});
    reservationRepo.manager.save = jest.fn().mockResolvedValue({ id: 'r1' });
    await repo.createConfirmed(undefined, 'u1', 's1', 'p1');
    expect(reservationRepo.manager.save).toHaveBeenCalled();
  });
});
