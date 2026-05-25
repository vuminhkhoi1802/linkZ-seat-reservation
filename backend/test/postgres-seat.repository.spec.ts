import { PostgresSeatRepository } from '../src/infrastructure/repositories/postgres-seat.repository';

describe('PostgresSeatRepository', () => {
  let repo: PostgresSeatRepository;
  let db: any;

  beforeEach(() => {
    db = { query: jest.fn() };
    repo = new PostgresSeatRepository(db);
  });

  it('findAll() maps rows to SeatView', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: '1', label: 'A', is_reserved: true }],
    });
    const result = await repo.findAll();
    expect(result[0]).toEqual({ id: '1', label: 'A', isReserved: true });
  });

  it('existsById() returns true if rowCount > 0', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });
    expect(await repo.existsById('1')).toBe(true);
  });

  it('existsById() returns false if rowCount is 0', async () => {
    db.query.mockResolvedValue({ rowCount: 0 });
    expect(await repo.existsById('1')).toBe(false);
  });

  it('existsById() handles null rowCount', async () => {
    db.query.mockResolvedValue({ rowCount: null });
    expect(await repo.existsById('1')).toBe(false);
  });
});
