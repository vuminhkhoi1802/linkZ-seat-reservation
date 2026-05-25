import { PostgresPaymentRepository } from '../src/infrastructure/repositories/postgres-payment.repository';

describe('PostgresPaymentRepository', () => {
  let repo: PostgresPaymentRepository;
  let db: any;

  beforeEach(() => {
    db = { query: jest.fn() };
    repo = new PostgresPaymentRepository(db);
  });

  it('create() returns PaymentAttemptView', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'p1', seat_id: 's1', status: 'PENDING' }] });
    const result = await repo.create('u1', 's1');
    expect(result.id).toBe('p1');
  });

  it('create() throws if seat not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await expect(repo.create('u1', 's1')).rejects.toThrow('Seat not found');
  });

  it('findByIdForUpdate() returns row or null', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [{ id: 'p1' }] }) };
    expect(await repo.findByIdForUpdate(client as any, 'p1')).toEqual({ id: 'p1' });

    client.query.mockResolvedValue({ rows: [] });
    expect(await repo.findByIdForUpdate(client as any, 'p1')).toBeNull();
  });

  it('markAsCompleted() calls query', async () => {
    const client = { query: jest.fn() };
    await repo.markAsCompleted(client as any, 'p1');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('COMPLETED'), ['p1']);
  });

  it('markAsFailed() calls query', async () => {
    const client = { query: jest.fn() };
    await repo.markAsFailed(client as any, 'p1');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('FAILED'), ['p1']);
  });
});
