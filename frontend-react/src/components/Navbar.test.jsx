import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar from './Navbar';

describe('Navbar Component Unit Tests', () => {
  it('renders House of Surya branding and user profile', () => {
    const mockLogout = vi.fn();
    const mockRefresh = vi.fn();
    const mockUser = {
      name: 'Abhishek Sharma',
      employeeId: 'HR0789',
      role: 'hr'
    };

    render(
      <Navbar 
        user={mockUser} 
        onLogout={mockLogout} 
        onRefresh={mockRefresh} 
        isRefreshing={false} 
      />
    );

    expect(screen.getByText('HOUSE OF SURYA')).toBeInTheDocument();
    expect(screen.getByText('HRMS & Attendance Portal')).toBeInTheDocument();
    expect(screen.getByText('Abhishek Sharma')).toBeInTheDocument();
    expect(screen.getByText('HR0789')).toBeInTheDocument();
    expect(screen.getByText('HR Admin')).toBeInTheDocument();
  });

  it('triggers onLogout and onRefresh callbacks on button clicks', () => {
    const mockLogout = vi.fn();
    const mockRefresh = vi.fn();
    const mockUser = { name: 'John Doe', role: 'employee' };

    render(
      <Navbar 
        user={mockUser} 
        onLogout={mockLogout} 
        onRefresh={mockRefresh} 
        isRefreshing={false} 
      />
    );

    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByTitle('Refresh database records');
    fireEvent.click(refreshBtn);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
