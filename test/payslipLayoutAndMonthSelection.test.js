const fs = require('fs');
const path = require('path');

describe('Payslip Layout, Basic Salary in Brackets, Half-Day Display, and Month Selection Tests', () => {
  let DB;

  beforeAll(() => {
    global.window = { addEventListener: () => {} };
    global.document = { addEventListener: () => {} };
    global.localStorage = { getItem: () => null, setItem: () => {} };
    global.sessionStorage = { getItem: () => null, setItem: () => {} };
    global.navigator = { onLine: true };
    global.Event = class { constructor(t) { this.type = t; } };
    global.CustomEvent = class {};

    const dbCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
    const mod = { exports: {} };
    const wrapped = dbCode.replace(/export\s+const\s+DB\s+=/g, 'const DB =').concat('\nmodule.exports = { DB };');
    const fn = new Function('module', 'exports', 'require', wrapped);
    fn(mod, mod.exports, require);
    DB = mod.exports.DB;
    DB.save = () => Promise.resolve();

    const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../seed.json'), 'utf8'));
    DB.data = seed;
  });

  test('renderAdminPayslipDrawer displays Basic Salary with nominal amount in brackets', () => {
    const hemant = DB.getUsers().find(u => u.employeeId === 'EMP1' || u.name === 'Hemant');
    expect(hemant).toBeDefined();

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

    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    const fnMatch = appCode.match(/function renderAdminPayslipDrawer\([\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    const fn = new Function('DB', 'Utils', 'Auth', 'document', 'window', fnMatch[0] + '\nreturn renderAdminPayslipDrawer;');
    const renderAdminPayslipDrawer = fn(DB, global.Utils, global.Auth, global.document, global.window);

    renderAdminPayslipDrawer(hemant.id, 9, 2026); // October 2026
    expect(drawer.style.display).toBe('block');
    // Expect "Basic Salary (₹45,000)" or fullBaseSalary in bracket
    expect(drawer.innerHTML).toContain('Basic Salary (₹45,000)');
    // Expect Month & Year period selectors in drawer header
    expect(drawer.innerHTML).toContain('id="admin-payslip-month-select"');
    expect(drawer.innerHTML).toContain('id="admin-payslip-year-select"');
    // Expect structured 4-column attendance bar
    expect(drawer.innerHTML).toContain('payslip-attendance-bar');
    expect(drawer.innerHTML).toContain('payslip-att-col');
  });

  test('Monthly Report table compiles with Half Days displayed in brackets and Basic Salary', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    
    // Check that custom-table header includes Basic Salary and Present / Absent (Half)
    expect(appCode).toContain('<th>Basic Salary</th><th>Present / Absent (Half)</th>');
    
    // Check that row template renders halfDays in brackets
    expect(appCode).toMatch(/\(\$\{p\.halfDays\}\s+Half\)/);
  });

  test('CSS contains modern structured styling for payslip attendance bar and grid', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
    expect(css).toContain('.payslip-attendance-bar');
    expect(css).toContain('.payslip-att-col');
    expect(css).toContain('.payslip-att-label');
    expect(css).toContain('.payslip-att-value');
    expect(css).toContain('.payslip-field-label');
    expect(css).toContain('.payslip-field-value');
  });
});
