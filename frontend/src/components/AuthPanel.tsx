import React, { FormEvent, useState } from 'react';

interface AuthPanelProps {
  onLogin: (email: string, password: string) => Promise<any>;
  onRegister: (email: string, password: string, displayName: string) => Promise<any>;
  busy: boolean;
}

export function AuthPanel({ onLogin, onRegister, busy }: AuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('reviewer@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Reviewer');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register') {
      onRegister(email, password, displayName);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <form className="panel auth" onSubmit={handleSubmit}>
      <div className="tabs">
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          Register
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Login
        </button>
      </div>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {mode === 'register' && (
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
      )}
      <button disabled={busy}>
        {busy ? 'Working...' : mode === 'register' ? 'Create account' : 'Login'}
      </button>
    </form>
  );
}
