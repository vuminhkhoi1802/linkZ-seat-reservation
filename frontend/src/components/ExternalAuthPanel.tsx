import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { DemoIdentity } from '../hooks/useAuth';

interface ExternalAuthPanelProps {
  clerkConfigured: boolean;
  busy: boolean;
  onDemoSignIn: (identity: DemoIdentity) => Promise<unknown>;
}

const demoIdentities: DemoIdentity[] = [
  {
    providerUserId: 'reviewer-a',
    email: 'reviewer.a@example.com',
    displayName: 'Reviewer A',
  },
  {
    providerUserId: 'reviewer-b',
    email: 'reviewer.b@example.com',
    displayName: 'Reviewer B',
  },
];

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
      {demoIdentities.map((identity) => (
        <button
          key={identity.providerUserId}
          type="button"
          disabled={busy}
          onClick={() => onDemoSignIn(identity)}
        >
          {busy ? 'Working...' : `Continue as ${identity.displayName}`}
        </button>
      ))}
    </div>
  );
}
