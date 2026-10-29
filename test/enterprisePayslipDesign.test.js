const fs = require('fs');
const path = require('path');

describe('Enterprise Payslip Premium Redesign, DB Bank Details & Dynamic Active Rows', () => {
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

  test('Employee with no bank details shows N/A and does NOT show fake Kotak Mahindra Bank or fake A/c', () => {
    // Hemant or Vipin Chandra without bank details
    const userWithoutBank = {
      id: 'usr_no_bank',
      employeeId: 'EMP_NO_BANK',
      name: 'Vipin Chandra',
      role: 'employee',
      baseSalary: 30000
    };

    const drawer = {
      style: { display: 'none' },
      dataset: {},
      innerHTML: '',
      scrollIntoView: jest.fn()
    };
    global.document.getElementById = (id) => (id === 'admin-payslip-preview-drawer' ? drawer : null);
    global.Utils = { escape: (s) => String(s || '') };
    global.Auth = { getCurrentUser: () => ({ role: 'admin' }) };

    // Inject temporary user into DB
    DB.data.users.push(userWithoutBank);

    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    const fnMatch = appCode.match(/function renderAdminPayslipDrawer\([\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    const fn = new Function('DB', 'Utils', 'Auth', 'document', 'window', fnMatch[0] + '\nreturn renderAdminPayslipDrawer;');
    const renderAdminPayslipDrawer = fn(DB, global.Utils, global.Auth, global.document, global.window);

    renderAdminPayslipDrawer(userWithoutBank.id, 9, 2026);

    const html = drawer.innerHTML;

    // Must NOT contain hardcoded fake sample bank details
    expect(html).not.toContain('KOTAK MAHINDRA BANK');
    expect(html).not.toContain('01720030209123');
    expect(html).not.toContain('AHGPT5354F');
    expect(html).not.toContain('DL/CPM/29544/10241');

    // Must show N/A for missing bank and PAN
    expect(html).toContain('Bank Name</span><span class="ep-bank-val">: N/A');
    expect(html).toContain('Account No.</span><span class="ep-bank-val">: N/A');
    expect(html).toContain('PAN Number</span><span class="ep-bank-val">: N/A');

    // Must have House of Surya Logo
    expect(html).toContain('assets/surya_logo_transparent_hd.png');

    // Must NOT contain company address
    expect(html).not.toContain('1421 1ST FLOOR GALI KISHAN DUTT MALIWARA CHANDNI CHOWK DELHI-110006');
    expect(html).not.toContain('ep-company-address');

    // Must contain Close button
    expect(html).toContain('id="btn-admin-close-payslip-drawer"');

    // Clean up
    DB.data.users = DB.data.users.filter(u => u.id !== 'usr_no_bank');
  });

  test('Irrelevant 0.00 allowance and deduction rows are filtered out', () => {
    const userWithBasicOnly = {
      id: 'usr_basic_only',
      employeeId: 'EMP_BASIC',
      name: 'Test Associate',
      role: 'employee',
      baseSalary: 18000
    };

    const drawer = {
      style: { display: 'none' },
      dataset: {},
      innerHTML: '',
      scrollIntoView: jest.fn()
    };
    global.document.getElementById = (id) => (id === 'admin-payslip-preview-drawer' ? drawer : null);
    global.Utils = { escape: (s) => String(s || '') };
    global.Auth = { getCurrentUser: () => ({ role: 'admin' }) };

    DB.data.users.push(userWithBasicOnly);

    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    const fnMatch = appCode.match(/function renderAdminPayslipDrawer\([\s\S]*?\n\}/);
    const fn = new Function('DB', 'Utils', 'Auth', 'document', 'window', fnMatch[0] + '\nreturn renderAdminPayslipDrawer;');
    const renderAdminPayslipDrawer = fn(DB, global.Utils, global.Auth, global.document, global.window);

    renderAdminPayslipDrawer(userWithBasicOnly.id, 9, 2026);

    const html = drawer.innerHTML;

    // Irrelevant 0.00 items must NOT appear in the table
    expect(html).not.toContain('V.P.F.');
    expect(html).not.toContain('Leave Salary');
    expect(html).not.toContain('Medical Allow.');
    expect(html).not.toContain('Leave Encasment');
    expect(html).not.toContain('Advance Sal. Deduction');
    expect(html).not.toContain('L.w.f.');

    // Clean up
    DB.data.users = DB.data.users.filter(u => u.id !== 'usr_basic_only');
  });

  test('handleLiveReRender ignores #admin-reports to prevent auto-closing drawer on punch sync', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    expect(appCode).toContain("activeHash === '#admin-reports'");
  });
});
