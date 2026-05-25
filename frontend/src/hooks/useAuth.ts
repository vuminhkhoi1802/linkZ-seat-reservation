import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { User } from '../api/types';

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

  const login = async (email: string, password: string) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(result.user);
      setMessage(`Signed in as ${result.user.email}`);
      return result.user;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      setUser(result.user);
      setMessage(`Signed in as ${result.user.email}`);
      return result.user;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api<void>('/auth/logout', { method: 'POST' });
    setUser(null);
    setMessage('Signed out');
  };

  return { user, busy, message, setMessage, refreshUser, login, register, logout };
}
