import { SignInButton, SignUpButton } from '@clerk/clerk-react';

interface ExternalAuthPanelProps {
  clerkConfigured: boolean;
  busy: boolean;
  onDemoSignIn: () => Promise<unknown>;
}

export function ExternalAuthPanel({ clerkConfigured, busy, onDemoSignIn }: ExternalAuthPanelProps) {
  if (clerkConfigured) {
    return (
      <div className="panel auth">
        <SignInButton mode="modal">
          <button type="button">Sign in with Clerk</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="secondary">
            Create Clerk account
          </button>
        </SignUpButton>
      </div>
    );
  }

  return (
    <div className="panel auth">
      <button type="button" disabled={busy} onClick={onDemoSignIn}>
        {busy ? 'Working...' : 'Continue as reviewer'}
      </button>
    </div>
  );
}
