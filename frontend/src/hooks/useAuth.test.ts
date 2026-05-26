import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import * as client from '../api/client';

vi.mock('../api/client');

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activates a token provider and refreshes the authenticated user', async () => {
    const user = { id: '1', email: 'test@example.com', displayName: 'Test' };
    vi.mocked(client.api).mockResolvedValue({ user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.activateTokenProvider(async () => 'token-1');
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.message).toBe('Signed in as test@example.com');
    expect(client.setAccessTokenProvider).toHaveBeenCalled();
  });

  it('handles external authentication failure', async () => {
    vi.mocked(client.api).mockRejectedValue(new Error('Invalid token'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.activateTokenProvider(async () => 'bad-token');
      } catch (e) {}
    });

    expect(result.current.user).toBeNull();
    expect(result.current.message).toBe('Invalid token');
  });

  it('signs in with the demo external identity', async () => {
    const user = { id: '1', email: 'test@example.com', displayName: 'Test' };
    vi.mocked(client.api).mockResolvedValue({ user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInDemo({
        providerUserId: 'reviewer-a',
        email: 'reviewer.a@example.com',
        displayName: 'Reviewer A',
      });
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.message).toBe('Signed in as test@example.com');
    expect(client.setAccessTokenProvider).toHaveBeenCalled();
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
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.message).toBe('Signed out');
    expect(client.setAccessTokenProvider).toHaveBeenCalledWith(null);
  });
});
