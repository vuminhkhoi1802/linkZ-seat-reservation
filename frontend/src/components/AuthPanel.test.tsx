import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPanel } from './AuthPanel';

describe('AuthPanel', () => {
  it('switches between Login and Register modes', () => {
    render(<AuthPanel onLogin={vi.fn()} onRegister={vi.fn()} busy={false} />);

    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();

    const loginTabs = screen.getAllByRole('button', { name: 'Login' });
    fireEvent.click(loginTabs[0]); // Click the tab
    
    // Check that we now have the login submit button
    const buttons = screen.getAllByRole('button', { name: 'Login' });
    expect(buttons.length).toBe(2);
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
  });

  it('calls onRegister when in register mode', () => {
    const onRegister = vi.fn().mockResolvedValue({});
    render(<AuthPanel onLogin={vi.fn()} onRegister={onRegister} busy={false} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onRegister).toHaveBeenCalledWith('new@example.com', 'password123', 'Reviewer');
  });

  it('calls onLogin when in login mode', () => {
    const onLogin = vi.fn().mockResolvedValue({});
    render(<AuthPanel onLogin={onLogin} onRegister={vi.fn()} busy={false} />);

    const loginTab = screen.getAllByRole('button', { name: 'Login' })[0];
    fireEvent.click(loginTab);
    
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    
    const loginSubmit = screen.getAllByRole('button', { name: 'Login' })[1];
    fireEvent.click(loginSubmit);

    expect(onLogin).toHaveBeenCalledWith('user@example.com', 'password123');
  });

  it('disables buttons when busy', () => {
    render(<AuthPanel onLogin={vi.fn()} onRegister={vi.fn()} busy={true} />);
    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled();
  });
});
