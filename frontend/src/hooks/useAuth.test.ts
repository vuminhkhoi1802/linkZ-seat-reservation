import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import * as client from '../api/client';

vi.mock('../api/client');

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles login success', async () => {
    const user = { id: '1', email: 'test@example.com', displayName: 'Test' };
    vi.mocked(client.api).mockResolvedValue({ user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.message).toBe('Signed in as test@example.com');
  });

  it('handles login failure', async () => {
    vi.mocked(client.api).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrong');
      } catch (e) {}
    });

    expect(result.current.user).toBeNull();
    expect(result.current.message).toBe('Invalid credentials');
  });

  it('handles registration success', async () => {
    const user = { id: '1', email: 'test@example.com', displayName: 'Test' };
    vi.mocked(client.api).mockResolvedValue({ user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register('test@example.com', 'password', 'Test');
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.message).toBe('Signed in as test@example.com');
  });

  it('handles registration failure', async () => {
    vi.mocked(client.api).mockRejectedValue(new Error('Email exists'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.register('test@example.com', 'password', 'Test');
      } catch (e) {}
    });

    expect(result.current.user).toBeNull();
    expect(result.current.message).toBe('Email exists');
  });

  it('handles refreshUser success', async () => {
    const user = { id: '1', email: 'test@example.com', displayName: 'Test' };
    vi.mocked(client.api).mockResolvedValue({ user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const refreshed = await result.current.refreshUser();
      expect(refreshed).toEqual(user);
    });

    expect(result.current.user).toEqual(user);
  });

  it('handles refreshUser failure', async () => {
    vi.mocked(client.api).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const refreshed = await result.current.refreshUser();
      expect(refreshed).toBeNull();
    });

    expect(result.current.user).toBeNull();
  });

  it('handles logout', async () => {
    vi.mocked(client.api).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.message).toBe('Signed out');
  });
});
