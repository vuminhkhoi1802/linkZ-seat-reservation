import { PostgresReservationRepository } from '../src/infrastructure/repositories/postgres-reservation.repository';

describe('PostgresReservationRepository', () => {
  let repo: PostgresReservationRepository;
  let db: any;

  beforeEach(() => {
    db = { query: jest.fn() };
    repo = new PostgresReservationRepository(db);
  });

  it('findByPaymentAttemptId() maps row to ReservationView', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id: 'r1', confirmed_at: new Date() }] }) };
    const result = await repo.findByPaymentAttemptId(client as any, 'p1');
    expect(result?.id).toBe('r1');

    client.query.mockResolvedValue({ rows: [] });
    expect(await repo.findByPaymentAttemptId(client as any, 'p1')).toBeNull();
  });

  it('isSeatConfirmed() returns boolean', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rowCount: 1 }) };
    expect(await repo.isSeatConfirmed(client as any, 's1')).toBe(true);

    client.query.mockResolvedValue({ rowCount: 0 });
    expect(await repo.isSeatConfirmed(client as any, 's1')).toBe(false);

    client.query.mockResolvedValue({ rowCount: undefined });
    expect(await repo.isSeatConfirmed(client as any, 's1')).toBe(false);
  });

  it('createConfirmed() returns ReservationView', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id: 'r1', confirmed_at: new Date() }] }) };
    const result = await repo.createConfirmed(client as any, 'u1', 's1', 'p1');
    expect(result.id).toBe('r1');
  });

  it('listByUserId() returns list', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'r1', confirmed_at: new Date() }] });
    const result = await repo.listByUserId('u1');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('r1');
  });
});
