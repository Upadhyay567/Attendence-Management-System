const fs = require('fs');
const path = require('path');

describe('Monthly Reports Performance & Payroll Calculation Test Suite', () => {
  let DB;
  let testSeed;

  beforeAll(() => {
    // Setup browser mocks
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

  test('buildPayrollIndex should index 1,200+ employees and 13,000+ logs in under 100ms', () => {
    const t0 = Date.now();
    const index = DB.buildPayrollIndex(8, 2026);
    const duration = Date.now() - t0;

    expect(index).toBeDefined();
    expect(index.monthMeta).toBeDefined();
    expect(index.monthMeta.totalDays).toBe(30);
    expect(index.logsByUser).toBeDefined();
    expect(index.byId).toBeDefined();
    expect(duration).toBeLessThan(500);
  });

  test('calculateAllMonthlyPayrolls should compute all employee payrolls in under 500ms', () => {
    const emps = DB.getUsers().filter(u => u.role === 'employee');
    expect(emps.length).toBeGreaterThan(100);

    const t0 = Date.now();
    const results = DB.calculateAllMonthlyPayrolls(emps, 8, 2026);
    const duration = Date.now() - t0;

    expect(results.length).toBe(emps.length);
    expect(duration).toBeLessThan(500);

    results.forEach(r => {
      expect(typeof r.grossEarnings).toBe('number');
      expect(typeof r.totalDeductions).toBe('number');
      expect(typeof r.netSalary).toBe('number');
      expect(r.netSalary).toBeGreaterThanOrEqual(0);
      expect(typeof r.presentDays).toBe('number');
      expect(typeof r.absentDays).toBe('number');
    });
  });

  test('calculateMonthlyPayroll should correctly match Hemant user identifiers and attendance', () => {
    const hemant = DB.getUsers().find(u => u.name && u.name.includes('Hemant'));
    expect(hemant).toBeDefined();

    const payroll = DB.calculateMonthlyPayroll(hemant.id, 8, 2026);
    expect(payroll).toBeDefined();
    expect(payroll.employeeName).toBe(hemant.name);
    expect(payroll.baseSalary).toBe(hemant.baseSalary);
    expect(payroll.netSalary).toBe(28000);
    expect(payroll.presentDays).toBe(16);
  });

  test('cache invalidation should clear _payrollIndexCache when data changes', () => {
    DB.getPayrollIndex(8, 2026);
    expect(DB._payrollIndexCache).not.toBeNull();

    DB.invalidatePayrollCache();
    expect(DB._payrollIndexCache).toBeNull();
  });
});
