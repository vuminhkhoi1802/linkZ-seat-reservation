import { SessionService } from '../src/infrastructure/security/session.service';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepo: any;

  beforeEach(() => {
    sessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    service = new SessionService(sessionRepo);
  });

  it('creates a session', async () => {
    sessionRepo.create.mockReturnValue({ userId: 'u1' });
    const result = await service.createSession('u1');
    expect(result.token).toBeDefined();
    expect(sessionRepo.save).toHaveBeenCalled();
  });

  it('gets principal from valid session', async () => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    sessionRepo.findOne.mockResolvedValue({
      userId: 'u1',
      expiresAt,
      user: { email: 'test@example.com' },
    });

    const principal = await service.getPrincipal('valid-token');
    expect(principal?.userId).toBe('u1');
    expect(principal?.email).toBe('test@example.com');
  });

  it('returns null for missing token', async () => {
    expect(await service.getPrincipal(undefined)).toBeNull();
  });

  it('returns null for non-existent session', async () => {
    sessionRepo.findOne.mockResolvedValue(null);
    expect(await service.getPrincipal('invalid')).toBeNull();
  });

  it('returns null for expired session', async () => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() - 1);

    sessionRepo.findOne.mockResolvedValue({ userId: 'u1', expiresAt });
    expect(await service.getPrincipal('expired')).toBeNull();
  });

  it('deletes a session', async () => {
    await service.deleteSession('token');
    expect(sessionRepo.delete).toHaveBeenCalled();
  });

  it('does nothing on delete if token is missing', async () => {
    await service.deleteSession(undefined);
    expect(sessionRepo.delete).not.toHaveBeenCalled();
  });
});
