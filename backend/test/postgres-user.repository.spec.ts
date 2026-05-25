import { PostgresUserRepository } from '../src/infrastructure/repositories/postgres-user.repository';

describe('PostgresUserRepository', () => {
  let repo: PostgresUserRepository;
  let db: any;

  beforeEach(() => {
    db = { query: jest.fn(), transaction: jest.fn() };
    repo = new PostgresUserRepository(db);
  });

  it('findByEmail() returns user or null', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    expect(await repo.findByEmail('t@e.com')).toEqual({ id: '1' });

    db.query.mockResolvedValueOnce({ rows: [] });
    expect(await repo.findByEmail('t@e.com')).toBeNull();
  });

  it('findById() returns user or null', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    expect(await repo.findById('1')).toEqual({ id: '1' });

    db.query.mockResolvedValueOnce({ rows: [] });
    expect(await repo.findById('1')).toBeNull();
  });

  it('createWithCredentials() uses transaction', async () => {
    const user = { id: '1', email: 't' };
    const client = { query: jest.fn().mockResolvedValue({ rows: [user] }) };
    db.transaction.mockImplementation(async (work: any) => work(client));

    const result = await repo.createWithCredentials('t', 'D', 'hash');
    expect(result).toEqual(user);
    expect(client.query).toHaveBeenCalledTimes(3);
  });
});
