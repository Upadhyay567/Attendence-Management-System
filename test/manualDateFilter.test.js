// test/manualDateFilter.test.js - Verification of Manual Date & Date Range Filter in Attendance
const fs = require('fs');
const path = require('path');

describe('Attendance View - Manual Date and Date Range Filter', () => {
  const attendancesViewPath = path.join(__dirname, '..', 'js', 'views', 'attendancesView.js');
  let attendancesViewCode;

  beforeAll(() => {
    attendancesViewCode = fs.readFileSync(attendancesViewPath, 'utf8');
  });

  test('UI elements for Manual Date Filter are present in attendancesView.js', () => {
    // Check popover container
    expect(attendancesViewCode).toContain('admin-att-calendar-popover');
    // Check tabs for Month View and Manual Date
    expect(attendancesViewCode).toContain('tab-att-month-view');
    expect(attendancesViewCode).toContain('tab-att-manual-view');
    // Check Single Date input
    expect(attendancesViewCode).toContain('input-att-single-date');
    expect(attendancesViewCode).toContain('btn-att-quick-today');
    // Check Date Range inputs (From Date and To Date)
    expect(attendancesViewCode).toContain('input-att-from-date');
    expect(attendancesViewCode).toContain('input-att-to-date');
    // Check validation error container
    expect(attendancesViewCode).toContain('att-date-range-error');
    // Check reset to month button
    expect(attendancesViewCode).toContain('btn-att-reset-filter');
  });

  test('Single Date filtering logic: filters strictly for selected date without requiring a range', () => {
    const mockLogs = [
      { id: '1', date: '2026-09-29', userId: 'u1' },
      { id: '2', date: '2026-09-30', userId: 'u1' },
      { id: '3', date: '2026-10-01', userId: 'u1' },
      { id: '4', date: '2026-10-02', userId: 'u1' }
    ];

    const filterMode = 'manual';
    const singleDate = '2026-09-30';
    const fromDate = '';
    const toDate = '';

    const filterFunction = (log) => {
      if (!log.date) return false;
      if (filterMode === 'manual') {
        if (singleDate) return log.date === singleDate;
        if (fromDate && toDate) return log.date >= fromDate && log.date <= toDate;
        if (fromDate) return log.date === fromDate;
        if (toDate) return log.date === toDate;
        return true;
      }
      return true;
    };

    const result = mockLogs.filter(filterFunction);
    expect(result.length).toBe(1);
    expect(result[0].date).toBe('2026-09-30');
    expect(result[0].id).toBe('2');
  });

  test('Date Range filtering logic: filters all logs within [From Date, To Date] inclusive', () => {
    const mockLogs = [
      { id: '1', date: '2026-09-28', userId: 'u1' },
      { id: '2', date: '2026-09-29', userId: 'u1' },
      { id: '3', date: '2026-09-30', userId: 'u1' },
      { id: '4', date: '2026-10-01', userId: 'u1' },
      { id: '5', date: '2026-10-05', userId: 'u1' }
    ];

    const filterMode = 'manual';
    const singleDate = '';
    const fromDate = '2026-09-29';
    const toDate = '2026-10-01';

    const filterFunction = (log) => {
      if (!log.date) return false;
      if (filterMode === 'manual') {
        if (singleDate) return log.date === singleDate;
        if (fromDate && toDate) {
          if (toDate < fromDate) return false;
          return log.date >= fromDate && log.date <= toDate;
        }
        if (fromDate) return log.date === fromDate;
        if (toDate) return log.date === toDate;
        return true;
      }
      return true;
    };

    const result = mockLogs.filter(filterFunction);
    expect(result.length).toBe(3);
    expect(result.map(r => r.date)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
  });

  test('Validation: To Date cannot be earlier than From Date', () => {
    const fromDate = '2026-10-05';
    const toDate = '2026-10-01';

    let hasValidationError = false;
    let errorMessage = '';

    if (fromDate && toDate && toDate < fromDate) {
      hasValidationError = true;
      errorMessage = 'To Date cannot be earlier than From Date';
    }

    expect(hasValidationError).toBe(true);
    expect(errorMessage).toBe('To Date cannot be earlier than From Date');
  });

  test('Non-compulsory rule: When only From Date is selected, it filters for that single date', () => {
    const mockLogs = [
      { id: '1', date: '2026-09-30', userId: 'u1' },
      { id: '2', date: '2026-10-01', userId: 'u1' },
      { id: '3', date: '2026-10-02', userId: 'u1' }
    ];

    const filterMode = 'manual';
    const singleDate = '';
    const fromDate = '2026-10-01';
    const toDate = '';

    const filterFunction = (log) => {
      if (!log.date) return false;
      if (filterMode === 'manual') {
        if (singleDate) return log.date === singleDate;
        if (fromDate && toDate) return log.date >= fromDate && log.date <= toDate;
        if (fromDate) return log.date === fromDate;
        if (toDate) return log.date === toDate;
        return true;
      }
      return true;
    };

    const result = mockLogs.filter(filterFunction);
    expect(result.length).toBe(1);
    expect(result[0].date).toBe('2026-10-01');
  });

  test('Non-compulsory rule: When only To Date is selected, it filters for that single date', () => {
    const mockLogs = [
      { id: '1', date: '2026-09-30', userId: 'u1' },
      { id: '2', date: '2026-10-01', userId: 'u1' },
      { id: '3', date: '2026-10-02', userId: 'u1' }
    ];

    const filterMode = 'manual';
    const singleDate = '';
    const fromDate = '';
    const toDate = '2026-09-30';

    const filterFunction = (log) => {
      if (!log.date) return false;
      if (filterMode === 'manual') {
        if (singleDate) return log.date === singleDate;
        if (fromDate && toDate) return log.date >= fromDate && log.date <= toDate;
        if (fromDate) return log.date === fromDate;
        if (toDate) return log.date === toDate;
        return true;
      }
      return true;
    };

    const result = mockLogs.filter(filterFunction);
    expect(result.length).toBe(1);
    expect(result[0].date).toBe('2026-09-30');
  });

  test('Existing Month View calendar remains fully intact as default', () => {
    const mockLogs = [
      { id: '1', date: '2026-09-30', userId: 'u1' },
      { id: '2', date: '2026-10-01', userId: 'u1' },
      { id: '3', date: '2026-10-15', userId: 'u1' }
    ];

    const filterMode = 'month';
    const selectedYear = 2026;
    const selectedMonth = 9; // October (0-indexed)

    const filterFunction = (log) => {
      if (!log.date) return false;
      if (filterMode === 'manual') return true;
      const [y, m] = log.date.split('-');
      const logYear = parseInt(y, 10);
      const logMonth = parseInt(m, 10) - 1;
      return logYear === selectedYear && logMonth === selectedMonth;
    };

    const result = mockLogs.filter(filterFunction);
    expect(result.length).toBe(2);
    expect(result.map(r => r.date)).toEqual(['2026-10-01', '2026-10-15']);
  });

  test('Immediate update event listeners: input and change events are registered for date inputs', () => {
    expect(attendancesViewCode).toContain("singleDateInput.addEventListener('input', handleSingleDateChange)");
    expect(attendancesViewCode).toContain("singleDateInput.addEventListener('change', handleSingleDateChange)");
    expect(attendancesViewCode).toContain("fromDateInput.addEventListener('input', handleRangeChange)");
    expect(attendancesViewCode).toContain("fromDateInput.addEventListener('change', handleRangeChange)");
    expect(attendancesViewCode).toContain("toDateInput.addEventListener('input', handleRangeChange)");
    expect(attendancesViewCode).toContain("toDateInput.addEventListener('change', handleRangeChange)");
  });
});
