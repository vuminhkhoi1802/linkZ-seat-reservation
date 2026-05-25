import { PostgresSeatRepository } from '../src/infrastructure/repositories/postgres-seat.repository';

describe('PostgresSeatRepository', () => {
  let repo: PostgresSeatRepository;
  let seatRepo: any;

  beforeEach(() => {
    seatRepo = {
      find: jest.fn(),
      count: jest.fn(),
      manager: {},
    };
    repo = new PostgresSeatRepository(seatRepo);
  });

  it('findAll() maps rows to SeatView', async () => {
    seatRepo.find.mockResolvedValue([
      { id: '1', label: 'A', reservations: [{ status: 'CONFIRMED' }] },
    ]);
    const result = await repo.findAll();
    expect(result[0]).toEqual({ id: '1', label: 'A', isReserved: true });
  });

  it('existsById() returns true if count > 0', async () => {
    seatRepo.count.mockResolvedValue(1);
    expect(await repo.existsById('1')).toBe(true);
  });

  it('existsById() returns false if count is 0', async () => {
    seatRepo.count.mockResolvedValue(0);
    expect(await repo.existsById('1')).toBe(false);
  });
});
