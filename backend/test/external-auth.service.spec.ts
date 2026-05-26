import { ExternalAuthService } from '../src/application/external-auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('ExternalAuthService', () => {
  const originalAuthProvider = process.env.AUTH_PROVIDER;
  let userRepo: any;
  let service: ExternalAuthService;

  beforeEach(() => {
    process.env.AUTH_PROVIDER = 'mock';
    userRepo = {
      upsertExternalIdentity: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'reviewer@example.com',
        display_name: 'Reviewer',
      }),
      findById: jest.fn(),
    };
    service = new ExternalAuthService(userRepo);
  });

  afterEach(() => {
    process.env.AUTH_PROVIDER = originalAuthProvider;
  });

  it('maps a mock external identity to an internal principal', async () => {
    const principal = await service.authenticateBearerToken('mock:clerk-user:reviewer@example.com:Reviewer');

    expect(principal).toEqual({ userId: 'user-1', email: 'reviewer@example.com' });
    expect(userRepo.upsertExternalIdentity).toHaveBeenCalledWith(
      'clerk',
      'clerk-user',
      'reviewer@example.com',
      'Reviewer',
    );
  });

  it('returns null when the bearer token is missing', async () => {
    await expect(service.authenticateBearerToken(undefined)).resolves.toBeNull();
    expect(userRepo.upsertExternalIdentity).not.toHaveBeenCalled();
  });

  it('does not accept mock tokens unless mock mode is explicitly enabled', async () => {
    process.env.AUTH_PROVIDER = 'clerk';
    delete process.env.CLERK_SECRET_KEY;

    await expect(
      service.authenticateBearerToken('mock:clerk-user:reviewer@example.com:Reviewer'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
