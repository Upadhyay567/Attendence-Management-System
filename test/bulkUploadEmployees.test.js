// test/bulkUploadEmployees.test.js
const fs = require('fs');
const path = require('path');

describe('Employee Directory Bulk Upload Data Feature', () => {
  let DB;
  let Utils;
  let normalizeBulkRow;
  let parseUploadDate;
  let parseUploadNumber;
  let processBulkEmployeeData;
  let originalSeedData;
  const originalSeedPath = path.join(__dirname, '..', 'seed.json');

  beforeAll(() => {
    originalSeedData = fs.readFileSync(originalSeedPath, 'utf8');

    // Load Utils
    const utilsCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8');
    const utilsMod = { exports: {} };
    const wrappedUtils = utilsCode
      .replace(/export\s+const\s+Utils\s+=/g, 'const Utils =')
      .replace(/export\s+const\s+html\s+=/g, 'const html =')
      .concat('\nmodule.exports = { Utils, html };');
    const fnUtils = new Function('module', 'exports', 'require', wrappedUtils);
    fnUtils(utilsMod, utilsMod.exports, require);
    Utils = utilsMod.exports.Utils;
    global.Utils = Utils;

    // Load DB
    const dbCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
    const dbMod = { exports: {} };
    const wrappedDb = dbCode.replace(/export\s+const\s+DB\s+=/g, 'const DB =').concat('\nmodule.exports = { DB };');
    const fnDb = new Function('module', 'exports', 'require', wrappedDb);
    fnDb(dbMod, dbMod.exports, require);
    DB = dbMod.exports.DB;
    DB.data = JSON.parse(originalSeedData);
    DB.save = () => Promise.resolve();
    global.DB = DB;

    // Extract bulk upload helper functions from userManagementView.js
    const userMgmtCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'userManagementView.js'), 'utf8');
    
    // We isolate the helper functions
    const modUser = { exports: {} };
    const cleanedCode = userMgmtCode
      .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
      .replace(/export\s+function\s+/g, 'function ')
      .replace(/export\s+async\s+function\s+/g, 'async function ')
      .concat('\nmodule.exports = { normalizeBulkRow, parseUploadDate, parseUploadNumber, processBulkEmployeeData };');
    
    const fnUser = new Function('module', 'exports', 'require', 'DB', 'Utils', cleanedCode);
    fnUser(modUser, modUser.exports, require, DB, Utils);

    normalizeBulkRow = modUser.exports.normalizeBulkRow;
    parseUploadDate = modUser.exports.parseUploadDate;
    parseUploadNumber = modUser.exports.parseUploadNumber;
    processBulkEmployeeData = modUser.exports.processBulkEmployeeData;
  });

  afterAll(() => {
    fs.writeFileSync(originalSeedPath, originalSeedData, 'utf8');
  });

  describe('1. Column Normalization & Field Parser Helpers', () => {
    test('normalizeBulkRow maps multiple header variations to canonical fields', () => {
      const raw = {
        'Employee Name': 'Vikas Gupta',
        'Emp ID': 'EMP777',
        'Department Name': 'Operations',
        'Job Title': 'Floor Supervisor',
        'Work Location': 'GT KARNAL SITE',
        'Mobile Number': '9876501234',
        'Email Address': 'vikas@surya.com',
        'Date of Joining': '2024-03-01',
        'Basic Salary': '45,000',
        'Allowance HRA': '₹6,750',
        'Deduction PF': '1800',
        'Bank Account Number': '123456789012',
        'IFSC Code': 'sbin0001234'
      };

      const norm = normalizeBulkRow(raw);
      expect(norm.name).toBe('Vikas Gupta');
      expect(norm.employeeId).toBe('EMP777');
      expect(norm.department).toBe('Operations');
      expect(norm.designation).toBe('Floor Supervisor');
      expect(norm.preferredLocation).toBe('GT KARNAL SITE');
      expect(norm.phone).toBe('9876501234');
      expect(norm.email).toBe('vikas@surya.com');
      expect(norm.dateOfJoining).toBe('2024-03-01');
      expect(norm.baseSalary).toBe(45000);
      expect(norm.allowanceHRA).toBe(6750);
      expect(norm.deductionPF).toBe(1800);
      expect(norm.accountNumber).toBe('123456789012');
      expect(norm.ifscCode).toBe('sbin0001234');
    });

    test('parseUploadDate handles ISO strings, DD/MM/YYYY, and Excel serial numbers', () => {
      expect(parseUploadDate('2024-05-15')).toBe('2024-05-15');
      expect(parseUploadDate('15/05/2024')).toBe('2024-05-15');
      expect(parseUploadDate('15-05-2024')).toBe('2024-05-15');
      // Excel serial 45427 corresponds to 2024-05-15
      expect(parseUploadDate(45427)).toBe('2024-05-15');
      expect(parseUploadDate('')).toBe('');
      expect(parseUploadDate(null)).toBe('');
    });

    test('parseUploadNumber strips currency symbols and commas', () => {
      expect(parseUploadNumber('₹55,000')).toBe(55000);
      expect(parseUploadNumber('$2,500.50')).toBe(2500.50);
      expect(parseUploadNumber(30000)).toBe(30000);
      expect(parseUploadNumber('')).toBeNull();
      expect(parseUploadNumber(null)).toBeNull();
    });
  });

  describe('2. Upsert Rule: Check Name and Emp ID Same to Update, Otherwise Add New', () => {
    let existingEmployee;

    beforeEach(() => {
      // Pick an existing employee from DB
      existingEmployee = DB.getUsers().find(u => u && u.employeeId && u.name && u.role === 'employee');
      expect(existingEmployee).toBeDefined();
    });

    test('When Name AND Emp ID match an existing user, updates existing user details', async () => {
      const origDept = existingEmployee.department;
      const newPhone = '+91 9999988888';
      const newDesignation = 'Senior Operations Lead';

      const uploadRows = [
        {
          'Employee Name': existingEmployee.name,
          'Emp ID': existingEmployee.employeeId,
          'Department': 'Logistics & Supply',
          'Designation': newDesignation,
          'Mobile Number': newPhone,
          'Base Salary': '62000'
        }
      ];

      const res = await processBulkEmployeeData(uploadRows);

      expect(res.success).toBe(true);
      expect(res.updated).toBe(1);
      expect(res.added).toBe(0);

      // Verify the user was updated in DB
      const updatedUser = DB.getUser(existingEmployee.id);
      expect(updatedUser.designation).toBe(newDesignation);
      expect(updatedUser.phone).toBe(newPhone);
      expect(updatedUser.baseSalary).toBe(62000);
      expect(updatedUser.department).toBe('Logistics & Supply');
    });

    test('Case-insensitivity and whitespace trimming on Name and Emp ID still updates matching user', async () => {
      const uploadRows = [
        {
          'Employee Name': '  ' + existingEmployee.name.toLowerCase() + '  ',
          'Emp ID': '  ' + existingEmployee.employeeId.toLowerCase() + '  ',
          'City': 'Chandigarh',
          'State': 'Punjab'
        }
      ];

      const res = await processBulkEmployeeData(uploadRows);
      expect(res.updated).toBe(1);
      expect(res.added).toBe(0);

      const updatedUser = DB.getUser(existingEmployee.id);
      expect(updatedUser.city).toBe('Chandigarh');
      expect(updatedUser.state).toBe('Punjab');
    });

    test('When Name is different or Emp ID is not in DB, adds new employee', async () => {
      const initialUserCount = DB.getUsers().length;
      const uniqueEmpId = 'EMP_BULK_' + Math.floor(Math.random() * 100000);
      const uniqueName = 'Kavita Singh Test';

      const uploadRows = [
        {
          'Employee Name': uniqueName,
          'Emp ID': uniqueEmpId,
          'Department': 'Finance & Accounts',
          'Designation': 'Accountant',
          'Mobile Number': '+91 9123456789',
          'Email': 'kavita.test@example.com',
          'Date of Joining': '2024-07-01',
          'Base Salary': '42000'
        }
      ];

      const res = await processBulkEmployeeData(uploadRows);
      expect(res.success).toBe(true);
      expect(res.updated).toBe(0);
      expect(res.added).toBe(1);

      expect(DB.getUsers().length).toBe(initialUserCount + 1);

      // Verify new user was created with matching details
      const createdUser = DB.getUsers().find(u => u.employeeId === uniqueEmpId);
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe(uniqueName);
      expect(createdUser.department).toBe('Finance & Accounts');
      expect(createdUser.designation).toBe('Accountant');
      expect(createdUser.role).toBe('employee');
      expect(createdUser.status).toBe('Active');
      expect(createdUser.baseSalary).toBe(42000);
    });

    test('When Emp ID matches but Name is completely different, treats as new data and adds on', async () => {
      const initialUserCount = DB.getUsers().length;
      const mismatchedName = 'Completely Different Person XYZ';

      const uploadRows = [
        {
          'Employee Name': mismatchedName,
          'Emp ID': existingEmployee.employeeId,
          'Department': 'Testing Dept',
          'Designation': 'QA Tester'
        }
      ];

      const res = await processBulkEmployeeData(uploadRows);
      expect(res.added).toBe(1);
      expect(res.updated).toBe(0);
      expect(DB.getUsers().length).toBe(initialUserCount + 1);
    });

    test('Processes mixed batch with both updates and new additions seamlessly', async () => {
      const initialCount = DB.getUsers().length;
      const brandNewId = 'EMP_NEW_' + Math.floor(Math.random() * 100000);

      const mixedRows = [
        // Match: updates existing
        {
          'Employee Name': existingEmployee.name,
          'Emp ID': existingEmployee.employeeId,
          'Branch': 'Delhi Head Office'
        },
        // No Match: adds new
        {
          'Employee Name': 'Aman Khurana',
          'Emp ID': brandNewId,
          'Department': 'Digital Marketing',
          'Designation': 'SEO Specialist',
          'Work Location': 'Office HQ'
        },
        // Blank row: should be skipped
        {}
      ];

      const res = await processBulkEmployeeData(mixedRows);
      expect(res.success).toBe(true);
      expect(res.updated).toBe(1);
      expect(res.added).toBe(1);
      expect(res.skipped).toBe(1);
      expect(DB.getUsers().length).toBe(initialCount + 1);
    });
  });

  describe('3. Employee Directory View Button Visibility', () => {
    test('addBtnHTML contains the Bulk Upload Data button for HR / Admin / Manager roles', () => {
      const viewCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'userManagementView.js'), 'utf8');
      expect(viewCode).toContain('id="btn-bulk-upload-users"');
      expect(viewCode).toContain('Bulk Upload Data');
      expect(viewCode).toContain('openBulkUploadModal');
    });
  });
});
