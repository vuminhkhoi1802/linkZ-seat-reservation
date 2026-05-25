import { TypeOrmUserRepository } from '../src/infrastructure/repositories/user.repository';

describe('TypeOrmUserRepository', () => {
  let repo: TypeOrmUserRepository;
  let userRepo: any;
  let dataSource: any;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };
    repo = new TypeOrmUserRepository(dataSource, userRepo);
  });

  it('findByEmail() returns user or null', async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: '1',
      email: 't@e.com',
      displayName: 'T',
      localCredential: { passwordHash: 'h' },
    });
    expect(await repo.findByEmail('t@e.com')).toEqual({
      id: '1',
      email: 't@e.com',
      display_name: 'T',
      password_hash: 'h',
    });

    userRepo.findOne.mockResolvedValueOnce(null);
    expect(await repo.findByEmail('t@e.com')).toBeNull();
  });

  it('findByEmail() handles user without local credentials', async () => {
    userRepo.findOne.mockResolvedValueOnce({
      id: '1',
      email: 't@e.com',
      displayName: 'T',
      localCredential: null,
    });
    const result = await repo.findByEmail('t@e.com');
    expect(result?.password_hash).toBe('');
  });

  it('findById() returns user or null', async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: '1', email: 't', displayName: 'D' });
    expect(await repo.findById('1')).toEqual({ id: '1', email: 't', display_name: 'D' });

    userRepo.findOne.mockResolvedValueOnce(null);
    expect(await repo.findById('1')).toBeNull();
  });

  it('createWithCredentials() uses transaction', async () => {
    const userEntity = { id: '1', email: 't', displayName: 'D' };
    const manager = {
      create: jest.fn().mockReturnValue(userEntity),
      save: jest.fn().mockResolvedValue(userEntity),
    };
    dataSource.transaction.mockImplementation(async (work: any) => work(manager));

    const result = await repo.createWithCredentials('t', 'D', 'hash');
    expect(result).toEqual({ id: '1', email: 't', display_name: 'D' });
    expect(manager.save).toHaveBeenCalledTimes(3);
  });
});
