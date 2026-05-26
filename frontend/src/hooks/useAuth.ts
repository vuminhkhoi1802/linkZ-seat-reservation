import { useState, useCallback } from 'react';
import { api, setAccessTokenProvider } from '../api/client';
import { User } from '../api/types';

export interface DemoIdentity {
  providerUserId: string;
  email: string;
  displayName: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refreshUser = useCallback(async () => {
    try {
      const result = await api<{ user: User | null }>('/auth/me');
      setUser(result.user);
      return result.user;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []);

  const activateTokenProvider = useCallback(async (provider: () => Promise<string | null>) => {
    setBusy(true);
    setMessage('');
    try {
      setAccessTokenProvider(provider);
      const result = await api<{ user: User | null }>('/auth/me');
      const user = result.user;
      setUser(user);
      if (user) {
        setMessage(`Signed in as ${user.email}`);
      }
      return user;
    } catch (error) {
      setUser(null);
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
      throw error;
    } finally {
      setBusy(false);
    }
  }, [refreshUser]);

  const signInDemo = useCallback(
    (identity: DemoIdentity) =>
      activateTokenProvider(
        async () => `mock:${identity.providerUserId}:${identity.email}:${identity.displayName}`,
      ),
    [activateTokenProvider],
  );

  const logout = useCallback(async () => {
    setAccessTokenProvider(null);
    setUser(null);
    setMessage('Signed out');
  }, []);

  return { user, busy, message, setMessage, refreshUser, activateTokenProvider, signInDemo, logout };
}
