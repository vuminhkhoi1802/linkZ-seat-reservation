import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { LocalAuthService } from '../src/application/local-auth.service';

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let userRepo: any;
  let passwordHasher: any;
  let sessions: any;

  beforeEach(() => {
    userRepo = {
      createWithCredentials: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
      verify: jest.fn(),
    };
    sessions = {
      createSession: jest.fn().mockResolvedValue({ token: 't1', expiresAt: new Date() }),
    };
    service = new LocalAuthService(userRepo, passwordHasher, sessions);
  });

  it('registers a new user', async () => {
    const user = { id: '1', email: 't@e.com', display_name: 'T' };
    userRepo.createWithCredentials.mockResolvedValue(user);

    const result = await service.register('t@e.com', 'pass', 'T');
    expect(result.user).toEqual(user);
    expect(sessions.createSession).toHaveBeenCalledWith('1');
  });

  it('throws ConflictException on duplicate email', async () => {
    userRepo.createWithCredentials.mockRejectedValue({ code: '23505' });
    await expect(service.register('t@e.com', 'pass')).rejects.toBeInstanceOf(ConflictException);
  });

  it('logins successfully', async () => {
    const user = { id: '1', email: 't@e.com', display_name: 'T', password_hash: 'hashed' };
    userRepo.findByEmail.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(true);

    const result = await service.login('t@e.com', 'pass');
    expect(result.user.id).toBe('1');
  });

  it('throws UnauthorizedException on invalid credentials', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(service.login('t@e.com', 'pass')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws UnauthorizedException on wrong password', async () => {
    userRepo.findByEmail.mockResolvedValue({ password_hash: 'h' });
    passwordHasher.verify.mockResolvedValue(false);
    await expect(service.login('t@e.com', 'pass')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns user from me()', async () => {
    const user = { id: '1', email: 't' };
    userRepo.findById.mockResolvedValue(user);
    expect(await service.me('1')).toBe(user);
  });
});
