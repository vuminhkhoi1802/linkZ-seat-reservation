import * as argon2 from 'argon2';
import { PasswordHasher } from '../src/infrastructure/security/password-hasher';

jest.mock('argon2');

describe('PasswordHasher', () => {
  let hasher: PasswordHasher;

  beforeEach(() => {
    hasher = new PasswordHasher();
  });

  it('hashes a password', async () => {
    (argon2.hash as jest.Mock).mockResolvedValue('hashed_pw');
    const result = await hasher.hash('plain');
    expect(result).toBe('hashed_pw');
    expect(argon2.hash).toHaveBeenCalledWith('plain');
  });

  it('verifies a password', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const result = await hasher.verify('hash', 'plain');
    expect(result).toBe(true);
    expect(argon2.verify).toHaveBeenCalledWith('hash', 'plain');
  });
});
