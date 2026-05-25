import { TypeOrmSeatRepository } from '../src/infrastructure/repositories/seat.repository';

describe('TypeOrmSeatRepository', () => {
  let repo: TypeOrmSeatRepository;
  let seatRepo: any;

  beforeEach(() => {
    seatRepo = {
      find: jest.fn(),
      count: jest.fn(),
      manager: {},
    };
    repo = new TypeOrmSeatRepository(seatRepo);
  });

  it('findAll() maps rows to SeatView', async () => {
    seatRepo.find.mockResolvedValue([
      { id: '1', label: 'A', reservations: [{ status: 'CONFIRMED' }] },
    ]);
    const result = await repo.findAll();
    expect(result[0]).toEqual({ id: '1', label: 'A', isReserved: true });
  });

  it('findAll() handles seat without reservations', async () => {
    seatRepo.find.mockResolvedValue([
      { id: '1', label: 'A', reservations: [] },
    ]);
    const result = await repo.findAll();
    expect(result[0].isReserved).toBe(false);
  });

  it('findAll() handles seat with null reservations', async () => {
    seatRepo.find.mockResolvedValue([
      { id: '1', label: 'A', reservations: null },
    ]);
    const result = await repo.findAll();
    expect(result[0].isReserved).toBe(false);
  });

  it('existsById() returns true if count > 0', async () => {
    seatRepo.count.mockResolvedValue(1);
    expect(await repo.existsById('1')).toBe(true);
  });

  it('existsById() returns false if count is 0', async () => {
    seatRepo.count.mockResolvedValue(0);
    expect(await repo.existsById('1')).toBe(false);
  });

  it('findByIdForUpdate() uses default manager if none provided', async () => {
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    seatRepo.manager.createQueryBuilder = jest.fn(() => queryBuilder);
    
    await repo.findByIdForUpdate(undefined, '1');
    expect(seatRepo.manager.createQueryBuilder).toHaveBeenCalled();
  });
});
