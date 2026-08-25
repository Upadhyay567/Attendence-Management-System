import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';

describe('Login Component Unit Tests', () => {
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    mockOnLoginSuccess.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders input elements and dropdown correctly', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText('HS Group Delhi Portal')).toBeInTheDocument();
    expect(screen.getByLabelText('Portal Role')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. HR10456 or john')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('displays an error message when authentication fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid ID/Username. No matching account found.' })
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. HR10456 or john'), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid ID/Username. No matching account found.')).toBeInTheDocument();
    });
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('calls onLoginSuccess on successful credentials validation', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mocked_jwt_token',
        user: { name: 'Deepak Sharma', role: 'hr' }
      })
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('e.g. HR10456 or john'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Surya@123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(
        { name: 'Deepak Sharma', role: 'hr' },
        'mocked_jwt_token'
      );
    });
  });
});
