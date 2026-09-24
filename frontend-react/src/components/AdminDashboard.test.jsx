import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminDashboard from './AdminDashboard';

describe('AdminDashboard Component Unit Tests', () => {
  const mockDbState = {
    users: [
      { id: 'u1', employeeId: 'E001', name: 'Alice Smith', status: 'Active', department: 'Sales' },
      { id: 'u2', employeeId: 'E002', name: 'Bob Jones', status: 'Active', department: 'IT' },
      { id: 'u3', employeeId: 'E003', name: 'Charlie Brown', status: 'Inactive', department: 'HR' }
    ],
    attendanceLogs: [
      { id: 'a1', userId: 'u1', date: '2026-09-24', checkIn: '09:15:00', checkOut: '', status: 'On Time' },
      { id: 'a2', userId: 'u2', date: '2026-09-24', checkIn: '10:45:00', checkOut: '', status: 'Late' }
    ],
    leaveRequests: [
      { id: 'l1', userId: 'u3', type: 'Sick', startDate: '2026-09-24', endDate: '2026-09-25', status: 'Pending', reason: 'Flu' }
    ],
    schedules: [
      { id: 's1', name: 'Morning Shift', startTime: '09:00', endTime: '18:00', location: 'Noida' }
    ]
  };

  it('computes and renders KPI counts correctly', () => {
    const mockNavigate = vi.fn();
    render(<AdminDashboard dbState={mockDbState} onNavigate={mockNavigate} />);

    expect(screen.getByText('Executive Operations Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Active Employees')).toBeInTheDocument();
    expect(screen.getByText('Pending Leave Requests')).toBeInTheDocument();
    expect(screen.getByText('Configured Shifts')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('renders employee punch table and handles navigation buttons', () => {
    const mockNavigate = vi.fn();
    render(<AdminDashboard dbState={mockDbState} onNavigate={mockNavigate} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    const rosterBtn = screen.getByText('📅 Manage Schedules & Roster');
    fireEvent.click(rosterBtn);
    expect(mockNavigate).toHaveBeenCalledWith('schedules');
  });
});
