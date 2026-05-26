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

  it('uses a passwordless demo identity when Clerk is not configured', () => {
    const onDemoSignIn = vi.fn().mockResolvedValue(undefined);
    render(<ExternalAuthPanel clerkConfigured={false} busy={false} onDemoSignIn={onDemoSignIn} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue as reviewer' }));

    expect(onDemoSignIn).toHaveBeenCalled();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });
});
