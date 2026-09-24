import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SchedulesView from './SchedulesView';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    mutateGranular: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('SchedulesView Component Unit Tests', () => {
  const mockDbState = {
    users: [
      { id: 'usr_1', employeeId: 'EMP01', name: 'John Doe', department: 'Sales', designation: 'Executive', scheduleId: 'sch_1' },
      { id: 'usr_2', employeeId: 'EMP02', name: 'Jane Smith', department: 'Operations', designation: 'Associate', scheduleId: 'sch_2' }
    ],
    schedules: [
      { id: 'sch_1', name: 'General Shift', startTime: '09:30', endTime: '18:30', location: 'Chandni Chowk HQ' },
      { id: 'sch_2', name: 'Night Shift', startTime: '20:00', endTime: '04:00', location: 'Noida Hub' }
    ],
    officeCoordinates: {
      'Chandni Chowk HQ': { lat: 28.65, lng: 77.23 },
      'Noida Hub': { lat: 28.53, lng: 77.39 }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shift schedule cards and roster records', () => {
    render(<SchedulesView dbState={mockDbState} onDataUpdated={vi.fn()} />);

    expect(screen.getByText('Shift Roster & Schedules')).toBeInTheDocument();
    expect(screen.getAllByText('General Shift').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Night Shift').length).toBeGreaterThan(0);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('allows selecting employees and applying bulk shift assignment', async () => {
    const mockOnDataUpdated = vi.fn();
    render(<SchedulesView dbState={mockDbState} onDataUpdated={mockOnDataUpdated} />);

    // Select John Doe checkbox
    const userCheckbox = screen.getByLabelText('Select John Doe');
    fireEvent.click(userCheckbox);

    // Pick target shift
    const shiftSelect = screen.getByLabelText(/Target Shift/i, { selector: 'select' });
    fireEvent.change(shiftSelect, { target: { value: 'sch_2' } });

    // Pick target location
    const locationSelect = screen.getByLabelText(/Target Working Location/i, { selector: 'select' });
    fireEvent.change(locationSelect, { target: { value: 'Noida Hub' } });

    // Click assign button
    const assignBtn = screen.getByText(/Assign \(1\) Staff/i);
    fireEvent.click(assignBtn);

    await waitFor(() => {
      expect(api.mutateGranular).toHaveBeenCalledWith(
        'update',
        'users',
        null,
        { id: 'usr_1' },
        { scheduleId: 'sch_2', preferredLocation: 'Noida Hub' }
      );
      expect(mockOnDataUpdated).toHaveBeenCalled();
    });
  });
});
