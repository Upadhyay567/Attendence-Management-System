import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmployeeDashboard from './EmployeeDashboard';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    mutateGranular: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('EmployeeDashboard Component Unit Tests', () => {
  const mockUser = {
    id: 'emp_123',
    employeeId: 'EMP123',
    name: 'Rohan Verma',
    role: 'employee',
    department: 'Logistics',
    scheduleId: 'sch_gen'
  };

  const mockDbState = {
    schedules: [
      { id: 'sch_gen', name: 'Standard Shift', startTime: '09:30', endTime: '18:30', gracePeriod: 15, location: 'Delhi Hub' }
    ],
    attendanceLogs: [],
    leaveRequests: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders employee greeting and allows clocking in', async () => {
    const mockOnUpdate = vi.fn();
    render(<EmployeeDashboard user={mockUser} dbState={mockDbState} onDataUpdated={mockOnUpdate} />);

    expect(screen.getByText(/Welcome back, Rohan Verma!/i)).toBeInTheDocument();
    expect(screen.getByText(/You haven't clocked in today./i)).toBeInTheDocument();

    const punchInBtn = screen.getByText(/👉 Punch In \(Clock In\)/i);
    expect(punchInBtn).toBeInTheDocument();

    fireEvent.click(punchInBtn);

    await waitFor(() => {
      expect(api.mutateGranular).toHaveBeenCalledWith(
        'create',
        'attendanceLogs',
        expect.objectContaining({
          userId: 'emp_123',
          shiftId: 'sch_gen'
        })
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('renders punch out button when user has clocked in today without checkout', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const clockedInDbState = {
      ...mockDbState,
      attendanceLogs: [
        {
          id: 'att_today_1',
          userId: 'emp_123',
          date: todayStr,
          checkIn: '09:28:10',
          checkOut: '',
          status: 'On Time'
        }
      ]
    };

    const mockOnUpdate = vi.fn();
    render(<EmployeeDashboard user={mockUser} dbState={clockedInDbState} onDataUpdated={mockOnUpdate} />);

    expect(screen.getByText(/Checked In:/i)).toBeInTheDocument();
    const punchOutBtn = screen.getByText(/👋 Punch Out \(Clock Out\)/i);
    expect(punchOutBtn).toBeInTheDocument();

    fireEvent.click(punchOutBtn);

    await waitFor(() => {
      expect(api.mutateGranular).toHaveBeenCalledWith(
        'update',
        'attendanceLogs',
        null,
        { id: 'att_today_1' },
        expect.objectContaining({
          checkOut: expect.any(String)
        })
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
