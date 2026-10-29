const fs = require('fs');
const path = require('path');

describe('Half-Day Rules, Historical Reconciliation, and Modal Stability Test Suite', () => {
  let DB;
  let testSeed;

  beforeAll(() => {
    global.window = { addEventListener: () => {} };
    global.document = { addEventListener: () => {} };
    global.localStorage = { getItem: () => null, setItem: () => {} };
    global.sessionStorage = { getItem: () => null, setItem: () => {} };
    global.navigator = { onLine: true };
    global.Event = class {};
    global.CustomEvent = class {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
    const mod = { exports: {} };
    const wrapped = code.replace(/export\s+const\s+DB\s+=/g, 'const DB =').concat('\nmodule.exports = { DB };');
    const fn = new Function('module', 'exports', 'require', wrapped);
    fn(mod, mod.exports, require);
    DB = mod.exports.DB;
    DB.save = () => Promise.resolve();

    testSeed = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../seed.json'), 'utf8'));
    DB.data = testSeed;
  });

  test('200-minute early departure rule triggers Half Day for Vipin Chandra on 2026-10-09', () => {
    // Vipin Chandra shift: 09:30 to 19:30. Punch: 09:33 to 15:11 (left 258 mins early >= 200m)
    const p = DB.calculateMonthlyPayroll('usr_bio_1128', 9, 2026);
    expect(p).toBeDefined();
    expect(p.halfDays).toBeGreaterThanOrEqual(1);
    expect(p.halfDayDeduction).toBeGreaterThan(0);
    // 30,000 / 31 = 967.74; half day = 484
    expect(p.halfDayDeduction).toBe(484);
  });

  test('Vipin Chandra historical half days in September 2026 and April 2026 compute properly', () => {
    const pSep = DB.calculateMonthlyPayroll('usr_bio_1128', 8, 2026); // September (0-indexed 8)
    expect(pSep.halfDays).toBeGreaterThanOrEqual(1);
    expect(pSep.halfDayDeduction).toBeGreaterThan(0);

    const pApr = DB.calculateMonthlyPayroll('usr_bio_1128', 3, 2026); // April (0-indexed 3)
    expect(pApr.halfDays).toBe(1);
    expect(pApr.halfDayDeduction).toBe(500); // 30,000 / 30 = 1000; half = 500
  });

  test('Employees from Image 2 have accurate half-day counts and non-zero deductions', () => {
    const targets = [
      { id: '3010', name: 'Deepak', minHalfDays: 1, expectedBase: 28000 },
      { id: '882', name: 'Gaurav Kumar', minHalfDays: 0, expectedBase: 30000 },
      { id: '660', name: 'MANAV', minHalfDays: 1, expectedBase: 32000 },
      { id: '1157', name: 'Nitesh Sharma', minHalfDays: 1, expectedBase: 47000 },
      { id: '641', name: 'SHANU', minHalfDays: 1, expectedBase: 26000 },
      { id: '1188', name: 'Shyamal', minHalfDays: 1, expectedBase: 28000 },
      { id: '1345', name: 'Sonu Nishad', minHalfDays: 1, expectedBase: 25000 },
      { id: '835', name: 'Sumit', minHalfDays: 0, expectedBase: 30000 }
    ];

    targets.forEach(t => {
      const u = DB.data.users.find(x => x.employeeId === t.id || x.id === 'usr_bio_' + t.id);
      expect(u).toBeDefined();
      expect(u.baseSalary).toBe(t.expectedBase);

      const p = DB.calculateMonthlyPayroll(u.id, 9, 2026);
      expect(p.halfDays).toBeGreaterThanOrEqual(t.minHalfDays);
      if (t.minHalfDays > 0) expect(p.halfDayDeduction).toBeGreaterThan(0);
      expect(p.totalDeductions).toBeGreaterThan(0);
      expect(p.netSalary).toBeGreaterThan(0);
    });
  });

  test('Prorated nominal base salary and deductions add up mathematically', () => {
    const u = DB.data.users.find(x => x.employeeId === '1128');
    const p = DB.calculateMonthlyPayroll(u.id, 9, 2026);
    
    // periodNominalBase + allowances - totalDeductions = netSalary
    const totalAllowances = (p.allowanceHRA || 0) + (p.allowanceTravel || 0) + (p.allowanceCCA || 0) + (p.allowancePerformance || 0) + (p.allowanceOther || 0) + (p.bonus || 0);
    const expectedNet = p.periodNominalBase + totalAllowances - p.totalDeductions;
    expect(Math.abs(p.netSalary - expectedNet)).toBeLessThanOrEqual(2); // rounding tolerance
  });

  test('Backend computeAttendanceStatus verifies 200m late arrival, early departure, and short duration', () => {
    const { computeAttendanceStatus } = require('../src/server/biometric/biometricSync.service.js');
    const shift = { startTime: '09:00', endTime: '18:00', halfDayLimit: 200, gracePeriod: 15 };

    // On time
    expect(computeAttendanceStatus('09:10', '18:05', shift, '2026-10-15')).toBe('On Time');
    // Late arrival within limit
    expect(computeAttendanceStatus('09:30', '18:05', shift, '2026-10-15')).toBe('Late');
    // Late arrival >= 200m (09:00 + 200m = 12:20 PM)
    expect(computeAttendanceStatus('12:25', '18:05', shift, '2026-10-15')).toBe('Half Day');
    // Early departure >= 200m (18:00 - 200m = 14:40 PM)
    expect(computeAttendanceStatus('09:05', '14:35', shift, '2026-10-15')).toBe('Half Day');
    // Short duration < 240m (09:05 to 12:05 = 180 mins)
    expect(computeAttendanceStatus('09:05', '12:05', shift, '2026-10-15')).toBe('Half Day');
    // Missing check-out on past date
    expect(computeAttendanceStatus('09:05', '', shift, '2026-10-15')).toBe('Half Day');
    // Missing check-in
    expect(computeAttendanceStatus('', '18:05', shift, '2026-10-15')).toBe('Half Day');
  });

  test('Inspecting payslip for September reflects September data and not October', () => {
    const vijay = DB.getUsers().find(u => u.name === 'Vijay');
    expect(vijay).toBeDefined();

    // September 2026 (month = 8)
    const pSep = DB.calculateMonthlyPayroll(vijay.id, 8, 2026);
    expect(pSep.periodLabel).toBe('September 2026');
    expect(pSep.presentDays).toBe(20);
    expect(pSep.sundayPresentDays).toBe(1);
    expect(pSep.halfDays).toBe(1);
    expect(pSep.absentDays).toBe(7);
    expect(pSep.weeklyOffDays).toBe(3);
    // Under ₹25k EPF ceiling: PF deduction is ₹3,000, so total deductions is 28,333 + 3,000 = 31,333
    expect(pSep.totalDeductions).toBe(31333);
    expect(pSep.netSalary).toBe(70334);

    // October 2026 (month = 9)
    const pOct = DB.calculateMonthlyPayroll(vijay.id, 9, 2026);
    expect(pOct.periodLabel).toContain('October');
    expect(pOct.presentDays).toBe(25);
    expect(pOct.halfDays).toBe(0);
    expect(pOct.absentDays).toBe(0);
    // Under ₹25k EPF ceiling: PF deduction is ₹3,000, so net salary is 90,323 - 3,000 = 87,323
    expect(pOct.netSalary).toBe(90548);

    // Ensure the two months are completely distinct
    expect(pSep.netSalary).not.toBe(pOct.netSalary);
    expect(pSep.presentDays).not.toBe(pOct.presentDays);
    expect(pSep.totalDeductions).not.toBe(pOct.totalDeductions);
  });

  test('renderAdminPayslipDrawer dynamically renders correct month data into drawer DOM', () => {
    const vijay = DB.getUsers().find(u => u.name === 'Vijay');
    
    // Setup mock DOM for renderAdminPayslipDrawer
    const drawer = {
      style: { display: 'none' },
      dataset: {},
      innerHTML: '',
      scrollIntoView: jest.fn()
    };
    global.document.getElementById = (id) => {
      if (id === 'admin-payslip-preview-drawer') return drawer;
      return null;
    };
    global.Utils = { escape: (s) => String(s || '') };
    global.Auth = { getCurrentUser: () => ({ role: 'admin' }) };

    // Extract renderAdminPayslipDrawer function from js/app.js
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    const fnMatch = appCode.match(/function renderAdminPayslipDrawer\([\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    const fn = new Function('DB', 'Utils', 'Auth', 'document', 'window', fnMatch[0] + '\nreturn renderAdminPayslipDrawer;');
    const renderAdminPayslipDrawer = fn(DB, global.Utils, global.Auth, global.document, global.window);

    // 1. Inspect in September (month = 8)
    renderAdminPayslipDrawer(vijay.id, 8, 2026);
    expect(drawer.style.display).toBe('block');
    expect(drawer.dataset.activeUserId).toBe(vijay.id);
    expect(drawer.innerHTML).toContain('September 2026');
    expect(drawer.innerHTML).toContain('20 days'); // 20 present days
    expect(drawer.innerHTML).toContain('7 abs');   // 7 absent days
    expect(drawer.innerHTML).toContain('1 half');  // 1 half day
    expect(drawer.innerHTML).toContain('₹70,334');  // Net salary disbursed in Sep (including statutory PF)

    // 2. Switch month to October (month = 9)
    renderAdminPayslipDrawer(vijay.id, 9, 2026);
    expect(drawer.innerHTML).toContain('October');
    expect(drawer.innerHTML).toContain('25 days'); // 24 present days in Oct
    expect(drawer.innerHTML).toContain('0 abs');   // 0 abs
    expect(drawer.innerHTML).toContain('0 half');  // 0 half
    expect(drawer.innerHTML).toContain('₹90,548');  // Net salary disbursed in Oct (including statutory PF)
  });
});
