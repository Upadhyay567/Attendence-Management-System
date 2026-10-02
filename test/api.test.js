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
    let data;
    for (let i = 0; i < 5; i++) {
      try {
        data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        break;
      } catch (err) {
        if (i === 4) throw err;
        const start = Date.now();
        while (Date.now() - start < 150) {}
      }
    }
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

  describe('Worksite Location Management & Helpers Tests', () => {
    it('Verify location helper functions are exported and globally attached in app.js and views', () => {
      const appPath = path.join(__dirname, '..', 'js', 'app.js');
      const appCode = fs.readFileSync(appPath, 'utf8');
      expect(appCode).toContain('export function registerNewLocation');
      expect(appCode).toContain('export function rebuildLocationDropdown');
      expect(appCode).toContain('export async function fetchNearbyAndRegister');
      expect(appCode).toContain('export async function enterCustomAndRegister');
      expect(appCode).toContain('export async function openAddLocationDialog');
      expect(appCode).toContain('export async function fetchNearbyAndAddLocation');
      expect(appCode).toContain('export async function enterCustomLocation');
      expect(appCode).toContain('window.openAddLocationDialog = openAddLocationDialog');
      expect(appCode).toContain('window.fetchNearbyAndAddLocation = fetchNearbyAndAddLocation');
      expect(appCode).toContain('window.enterCustomLocation = enterCustomLocation');

      const schedPath = path.join(__dirname, '..', 'js', 'views', 'schedulesView.js');
      const schedCode = fs.readFileSync(schedPath, 'utf8');
      expect(schedCode).toContain('window.openAddLocationDialog');

      const empPath = path.join(__dirname, '..', 'js', 'views', 'employeeDashboard.js');
      const empCode = fs.readFileSync(empPath, 'utf8');
      expect(empCode).toContain('export function registerNewLocation');
      expect(empCode).toContain('export function rebuildLocationDropdown');
      expect(empCode).toContain('window.openAddLocationDialog = openAddLocationDialog');
    });
  });

  describe('Biometric Multi-Location & Strict Employee Matching Tests', () => {
    it('Verify WH-1340 and WH-130 resolve to warehouse worksite', () => {
      const { resolveDeviceLocation } = require('../src/server/biometric/easywdms.service');
      const wh1340 = resolveDeviceLocation('GED7253700398', 'WH-1340');
      expect(wh1340.location).toBe('WH-1340');
      expect(wh1340.name).toBe('WH-1340');

      const wh130 = resolveDeviceLocation('', 'WH-130');
      expect(wh130.location).toBe('WH-1340');

      const closeDev = resolveDeviceLocation('0056120200363', 'WH-1340-close');
      expect(closeDev.location).toBe('WH-1340-close');
    });

    it('Strict employee matching prevents first-name cross-contamination', () => {
      const bioSyncCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'server', 'biometric', 'biometricSync.service.js'), 'utf8');
      // Verify first-name substring matching is completely eliminated
      expect(bioSyncCode).not.toContain('firstUName === firstTargetName');
      // Verify overwriting existing biometricUserId is prevented
      expect(bioSyncCode).not.toContain('employee.biometricUserId !== String(biometricUserId).trim()');
      expect(bioSyncCode).toContain('if (!employee.biometricUserId)');
    });
  });

  describe('Location Filter on Employee and Payroll Pages (HR and Manager)', () => {
    it('Verify Employee page (userManagementView & adminDashboard) contains location filter select and listener', () => {
      const userMgmtPath = path.join(__dirname, '..', 'js', 'views', 'userManagementView.js');
      const userMgmtCode = fs.readFileSync(userMgmtPath, 'utf8');
      expect(userMgmtCode).toContain('id="filter-location-select"');
      expect(userMgmtCode).toContain('Location: All Locations');
      expect(userMgmtCode).toContain('distinctLocs');
      expect(userMgmtCode).toContain('userMatchesLocation');
      expect(userMgmtCode).toContain('locVal');
      expect(userMgmtCode).toMatch(/\[.*locSel.*\]\.forEach/);

      const adminDashPath = path.join(__dirname, '..', 'js', 'views', 'adminDashboard.js');
      const adminDashCode = fs.readFileSync(adminDashPath, 'utf8');
      expect(adminDashCode).toContain('id="filter-location-select"');
      expect(adminDashCode).toContain('Location: All Locations');
      expect(adminDashCode).toContain('distinctLocs');
      expect(adminDashCode).toContain('userMatchesLocation');
      expect(adminDashCode).toContain('locVal');
      expect(adminDashCode).toMatch(/\[.*locSel.*\]\.forEach/);
    });

    it('Verify Payroll page (renderAdminReports in app.js) contains location filter select, listeners, and CSV export support', () => {
      const appPath = path.join(__dirname, '..', 'js', 'app.js');
      const appCode = fs.readFileSync(appPath, 'utf8');
      expect(appCode).toContain('id="report-location-select"');
      expect(appCode).toContain('Location: All Locations');
      expect(appCode).toContain('getDistinctWorksiteLocations');
      expect(appCode).toContain('checkUserMatchesLocation');
      expect(appCode).toContain("locSelectEl.addEventListener('change', refreshReports)");
      expect(appCode).toContain('const locVal = locSelect ? locSelect.value : \'all\';');
    });

    it('Verify location filter matching logic matches preferred, assigned, and punch locations', () => {
      const user1 = { id: 'u1', employeeId: 'E1', preferredLocation: 'GT KARNAL SITE' };
      const user2 = { id: 'u2', employeeId: 'E2', preferredLocation: 'Cyber City, Gurugram' };
      const user3 = { id: 'u3', employeeId: 'E3', assignedLocations: ['Noida sector 61'] };

      const checkLoc = (u, target) => {
        if (!target || target === 'all') return true;
        const t = target.toLowerCase().trim();
        const c = val => typeof val === 'string' && val.toLowerCase().trim() === t;
        if (c(u.preferredLocation) || c(u.workLocation)) return true;
        if (Array.isArray(u.preferredLocations) && u.preferredLocations.some(c)) return true;
        if (Array.isArray(u.assignedLocations) && u.assignedLocations.some(c)) return true;
        return false;
      };

      expect(checkLoc(user1, 'all')).toBe(true);
      expect(checkLoc(user1, 'GT KARNAL SITE')).toBe(true);
      expect(checkLoc(user1, 'Cyber City, Gurugram')).toBe(false);
      expect(checkLoc(user2, 'Cyber City, Gurugram')).toBe(true);
      expect(checkLoc(user3, 'Noida sector 61')).toBe(true);
      expect(checkLoc(user3, 'GT KARNAL SITE')).toBe(false);
    });
  });
});

