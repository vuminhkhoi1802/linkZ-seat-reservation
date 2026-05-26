import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExternalAuthPanel } from './ExternalAuthPanel';

vi.mock('@clerk/clerk-react', () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ExternalAuthPanel', () => {
  it('renders Clerk actions when Clerk is configured', () => {
    render(<ExternalAuthPanel clerkConfigured busy={false} onDemoSignIn={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Sign in with Clerk' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Clerk account' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('lets reviewers choose between multiple passwordless demo identities', () => {
    const onDemoSignIn = vi.fn().mockResolvedValue(undefined);
    render(<ExternalAuthPanel clerkConfigured={false} busy={false} onDemoSignIn={onDemoSignIn} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue as Reviewer B' }));

    expect(screen.getByRole('button', { name: 'Continue as Reviewer A' })).toBeInTheDocument();
    expect(onDemoSignIn).toHaveBeenCalledWith({
      providerUserId: 'reviewer-b',
      email: 'reviewer.b@example.com',
      displayName: 'Reviewer B',
    });
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });
});
