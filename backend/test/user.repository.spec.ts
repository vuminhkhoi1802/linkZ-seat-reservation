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

  it('findById() returns user or null', async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: '1', email: 't', displayName: 'D' });
    expect(await repo.findById('1')).toEqual({ id: '1', email: 't', display_name: 'D' });

    userRepo.findOne.mockResolvedValueOnce(null);
    expect(await repo.findById('1')).toBeNull();
  });

  it('upsertExternalIdentity() creates user and identity in a transaction', async () => {
    const userEntity = { id: '1', email: 't', displayName: 'D' };
    const identityRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(identityRepo),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue(userEntity),
      save: jest.fn().mockResolvedValue(userEntity),
    };
    dataSource.transaction.mockImplementation(async (work: any) => work(manager));

    const result = await repo.upsertExternalIdentity('clerk', 'clerk-user', 't', 'D');
    expect(result).toEqual({ id: '1', email: 't', display_name: 'D' });
    expect(identityRepo.save).toHaveBeenCalled();
  });

  it('upsertExternalIdentity() updates an existing identity user', async () => {
    const existingUser = { id: '1', email: 'old@example.com', displayName: 'Old' };
    const identity = { email: 'old@example.com', user: existingUser };
    const identityRepo = {
      findOne: jest.fn().mockResolvedValue(identity),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(identityRepo),
      save: jest.fn().mockImplementation((_entity: any, value: any) => Promise.resolve(value)),
    };
    dataSource.transaction.mockImplementation(async (work: any) => work(manager));

    const result = await repo.upsertExternalIdentity('clerk', 'clerk-user', 'new@example.com', 'New');

    expect(result).toEqual({ id: '1', email: 'new@example.com', display_name: 'New' });
    expect(identityRepo.save).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
  });
});
