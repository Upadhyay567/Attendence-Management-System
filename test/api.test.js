const fs = require('fs');
const path = require('path');

describe('Attendance System Core & Security API Tests', () => {
  it('Verify database seed configuration structure', () => {
    const seedPath = path.join(__dirname, '..', 'seed.json');
    expect(fs.existsSync(seedPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('schedules');
    expect(data).toHaveProperty('attendanceLogs');
  });

  it('Verify real-time SSE stream & audit log endpoints in server architecture', () => {
    const appPath = path.join(__dirname, '..', 'src', 'server', 'app.js');
    const appCode = fs.readFileSync(appPath, 'utf8');
    expect(appCode).toContain('/api/events');
    expect(appCode).toContain('createAuditRouter');
    expect(appCode).toContain('createReportsRouter');
    expect(appCode).toContain('broadcastSSEEvent');

    const auditRoutePath = path.join(__dirname, '..', 'src', 'server', 'routes', 'audit.routes.js');
    const auditRouteCode = fs.readFileSync(auditRoutePath, 'utf8');
    expect(auditRouteCode).toContain('/audit-logs');

    const reportsRoutePath = path.join(__dirname, '..', 'src', 'server', 'routes', 'reports.routes.js');
    const reportsRouteCode = fs.readFileSync(reportsRoutePath, 'utf8');
    expect(reportsRouteCode).toContain('/attendance-csv');
    expect(reportsRouteCode).toContain('/payslip-pdf');

    const serverPath = path.join(__dirname, '..', 'server.js');
    const serverCode = fs.readFileSync(serverPath, 'utf8');
    expect(serverCode).toContain('broadcastSSEEvent');
    expect(serverCode).toContain('recordAuditLog');
  });

  it('Verify anti-spoofing accuracy thresholds in client dashboard', () => {
    const dashPath = path.join(__dirname, '..', 'js', 'views', 'employeeDashboard.js');
    const dashCode = fs.readFileSync(dashPath, 'utf8');
    expect(dashCode).toContain('coords.accuracy > 500');
  });

  it('Verify multi-device registry & central biometric vault structures', () => {
    const seedPath = path.join(__dirname, '..', 'seed.json');
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    expect(data).toHaveProperty('biometricDevices');
    expect(data).toHaveProperty('biometricVault');
    expect(data).toHaveProperty('biometricSyncLogs');
    expect(Array.isArray(data.biometricDevices)).toBe(true);
    expect(data.biometricDevices.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(data.biometricVault)).toBe(true);
    expect(data.biometricVault.length).toBeGreaterThanOrEqual(15);

    const routesPath = path.join(__dirname, '..', 'src', 'server', 'routes', 'biometric.routes.js');
    const routesCode = fs.readFileSync(routesPath, 'utf8');
    expect(routesCode).toContain('/biometric/devices');
    expect(routesCode).toContain('/biometric/sync-templates');
    expect(routesCode).toContain('/biometric/template-sync-status');
  });

  describe('Payroll Calculation Engine (Actual Month Days & Sunday Loss-of-Holiday)', () => {
    let DB;

    beforeAll(() => {
      const dbFilePath = path.join(__dirname, '..', 'js', 'db.js');
      const code = fs.readFileSync(dbFilePath, 'utf8');
      const transformed = code.replace(/export\s+const\s+DB\s*=/, 'const DB =') + '\n; return DB;';
      DB = new Function(transformed)();
    });

    beforeEach(() => {
      DB.data = {
        users: [
          {
            id: 'usr_test_1',
            employeeId: 'EMP_TEST1',
            name: 'Test Employee',
            baseSalary: 31000,
            allowanceHRA: 0,
            allowanceTravel: 0,
            deductionPF: 0,
            deductionPT: 0,
            deductionESI: 0,
            deductionTDS: 0,
            scheduleId: 'sch_default'
          }
        ],
        schedules: [
          {
            id: 'sch_default',
            name: 'Standard 5-day Shift',
            startTime: '09:00',
            endTime: '17:00',
            workDays: [1, 2, 3, 4, 5]
          }
        ],
        attendanceLogs: [],
        leaveRequests: [],
        payrollAdjustments: []
      };
    });

    it('should calculate daily rate based on actual days in month (28, 29, 30, or 31)', () => {
      // 28 days: Feb 2025
      const feb28 = DB.calculateMonthlyPayroll('usr_test_1', 1, 2025);
      expect(feb28.totalDays).toBe(28);
      expect(feb28.workingDays).toBe(28);
      expect(feb28.dailyRate).toBe(Math.round(31000 / 28));

      // 29 days: Feb 2024 (Leap year)
      const feb29 = DB.calculateMonthlyPayroll('usr_test_1', 1, 2024);
      expect(feb29.totalDays).toBe(29);
      expect(feb29.workingDays).toBe(29);
      expect(feb29.dailyRate).toBe(Math.round(31000 / 29));

      // 30 days: September 2026
      const sep30 = DB.calculateMonthlyPayroll('usr_test_1', 8, 2026);
      expect(sep30.totalDays).toBe(30);
      expect(sep30.workingDays).toBe(30);
      expect(sep30.dailyRate).toBe(Math.round(31000 / 30));

      // 31 days: January 2026
      const jan31 = DB.calculateMonthlyPayroll('usr_test_1', 0, 2026);
      expect(jan31.totalDays).toBe(31);
      expect(jan31.workingDays).toBe(31);
      expect(jan31.dailyRate).toBe(Math.round(31000 / 31));
    });

    it('should include actual working days in calculation result', () => {
      for (let day = 1; day <= 12; day++) {
        const dateStr = `2026-09-${String(day).padStart(2, '0')}`;
        DB.data.attendanceLogs.push({
          id: `log_${day}`,
          userId: 'usr_test_1',
          date: dateStr,
          checkIn: '09:00:00',
          checkOut: '17:00:00',
          status: 'On Time'
        });
      }

      const payroll = DB.calculateMonthlyPayroll('usr_test_1', 8, 2026);
      expect(payroll.actualWorkingDays).toBe(12);
      expect(payroll.presentDays).toBe(12);
    });

    it('should not penalize Sunday if employee takes fewer than 2 leaves in that week', () => {
      DB.data.leaveRequests.push({
        id: 'lv_single',
        userId: 'usr_test_1',
        type: 'Sick',
        startDate: '2026-09-02',
        endDate: '2026-09-02',
        status: 'Approved'
      });

      const payroll = DB.calculateMonthlyPayroll('usr_test_1', 8, 2026);
      expect(payroll.unpaidSundayDays).toBe(0);
      expect(payroll.sundayDeduction).toBe(0);
      expect(payroll.penalizedSundays).toHaveLength(0);
    });

    it('should penalize Sunday when employee takes 2 or more leaves in that week', () => {
      // 2 leaves in Mon-Sat window (Sep 1 and Sep 2, preceding Sunday Sep 6)
      DB.data.leaveRequests.push({
        id: 'lv_double',
        userId: 'usr_test_1',
        type: 'Casual',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        status: 'Approved'
      });

      const payroll = DB.calculateMonthlyPayroll('usr_test_1', 8, 2026);
      expect(payroll.unpaidSundayDays).toBe(1);
      expect(payroll.penalizedSundays).toHaveLength(1);
      expect(payroll.penalizedSundays[0].date).toBe('2026-09-06');
      expect(payroll.penalizedSundays[0].leavesInWeek).toBe(2);

      const expectedDailyRate = 31000 / 30;
      expect(payroll.sundayDeduction).toBe(Math.round(1 * expectedDailyRate));
    });
  });
});
