import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../src/interfaces/guards/auth.guard';

function contextWithAuthorization(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization ? { authorization } : {},
      }),
    }),
  } as any;
}

describe('AuthGuard', () => {
  it('accepts a valid bearer token and attaches the principal', async () => {
    const auth = {
      authenticateBearerToken: jest.fn().mockResolvedValue({ userId: 'u1', email: 'u@example.com' }),
    };
    const guard = new AuthGuard(auth as any);
    const context = contextWithAuthorization('Bearer token-1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auth.authenticateBearerToken).toHaveBeenCalledWith('token-1');
  });

  it('rejects requests without a valid bearer token', async () => {
    const auth = { authenticateBearerToken: jest.fn().mockResolvedValue(null) };
    const guard = new AuthGuard(auth as any);

    await expect(guard.canActivate(contextWithAuthorization())).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
