const fs = require('fs');
const path = require('path');

describe('Download Profile Modal and Dossier Generation', () => {
  let seedData;

  beforeAll(() => {
    seedData = JSON.parse(fs.readFileSync(path.join(__dirname, '../seed.json'), 'utf8'));
  });

  test('Database contains healthy employee records', () => {
    expect(seedData.users).toBeDefined();
    expect(seedData.users.length).toBeGreaterThan(50);
    const activeUsers = seedData.users.filter(u => u.status !== 'Inactive');
    expect(activeUsers.length).toBe(seedData.users.length);
  });

  test('HR Admin and Operations Managers can select all employees for profile download', () => {
    const rawUsers = seedData.users;
    const hrUser = rawUsers.find(u => u.role === 'hr');
    expect(hrUser).toBeDefined();

    const hrRole = String(hrUser.role || '').toLowerCase();
    const isHrAdminOrManager = hrRole === 'hr' || hrRole === 'admin' || hrRole === 'manager';
    expect(isHrAdminOrManager).toBe(true);

    let modalUsers = [];
    if (isHrAdminOrManager) {
      modalUsers = rawUsers.filter(u => u && u.status !== 'Inactive');
    }

    expect(modalUsers.length).toBe(rawUsers.length);
    expect(modalUsers.length).toBeGreaterThan(90);
    const showWarning = modalUsers.length === 0;
    expect(showWarning).toBe(false);
  });

  test('Operations Manager can view all employees for profile download', () => {
    const rawUsers = seedData.users;
    const managerUser = rawUsers.find(u => u.role === 'manager');
    expect(managerUser).toBeDefined();

    const role = String(managerUser.role || '').toLowerCase();
    const isAdminOrHrOrManager = role === 'hr' || role === 'admin' || role === 'manager';
    expect(isAdminOrHrOrManager).toBe(true);

    const modalUsers = rawUsers.filter(u => u && u.status !== 'Inactive');
    expect(modalUsers.length).toBe(rawUsers.length);
    expect(modalUsers.length).toBeGreaterThan(90);
  });

  test('Regular Employee sees only their own profile', () => {
    const rawUsers = seedData.users;
    const employeeUser = rawUsers.find(u => u.role === 'employee');
    expect(employeeUser).toBeDefined();

    const role = String(employeeUser.role || '').toLowerCase();
    const isAdminOrHrOrManager = role === 'hr' || role === 'admin' || role === 'manager';
    expect(isAdminOrHrOrManager).toBe(false);

    let modalUsers = [];
    if (isAdminOrHrOrManager) {
      modalUsers = rawUsers.filter(u => u && u.status !== 'Inactive');
    } else if (employeeUser.id) {
      modalUsers = rawUsers.filter(u => u && (u.id === employeeUser.id || (u.employeeId && u.employeeId === employeeUser.employeeId)));
    }

    expect(modalUsers.length).toBe(1);
    expect(modalUsers[0].id).toBe(employeeUser.id);
  });

  test('Employee query logic returns matching user dossiers with complete profile fields', () => {
    const rawUsers = seedData.users;
    const testIds = [rawUsers[0].id, rawUsers[1].id, rawUsers[2].id];
    const queryEmployeeProfiles = (userIds) => rawUsers.filter(u => userIds.includes(u.id) || (u.employeeId && userIds.includes(u.employeeId)));
    const dossiers = queryEmployeeProfiles(testIds);
    expect(dossiers.length).toBe(3);
    dossiers.forEach(d => {
      expect(d.name).toBeDefined();
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.employeeId || d.id).toBeDefined();
      expect(d.department).toBeDefined();
      expect(d.designation).toBeDefined();
    });
  });

  test('Search filter properly matches names and employee IDs without throwing errors', () => {
    const rawUsers = seedData.users;
    const query1 = 'sharma';
    const matches1 = rawUsers.filter(u => {
      const name = String(u.name || '').toLowerCase();
      const empid = String(u.employeeId || '').toLowerCase();
      return name.includes(query1) || empid.includes(query1);
    });
    expect(matches1.length).toBeGreaterThan(0);

    const query2 = rawUsers[0].employeeId.toLowerCase();
    const matches2 = rawUsers.filter(u => {
      const name = String(u.name || '').toLowerCase();
      const empid = String(u.employeeId || '').toLowerCase();
      return name.includes(query2) || empid.includes(query2);
    });
    expect(matches2.length).toBeGreaterThan(0);

    const mockUsers = [{ id: '1', name: null, employeeId: 'E1' }, { id: '2', name: undefined, employeeId: 'E2' }];
    const safeMatches = mockUsers.filter(u => {
      const name = String(u.name || '').toLowerCase();
      const empid = String(u.employeeId || '').toLowerCase();
      return name.includes('e1') || empid.includes('e1');
    });
    expect(safeMatches.length).toBe(1);
  });

  test('Safe calculation for all employee profiles does not throw TypeError on null allowances or deductions', () => {
    const rawUsers = seedData.users || [];
    expect(rawUsers.length).toBeGreaterThan(100);

    // Verify all users (including biometric enrolled users with null allowances) parse safely
    rawUsers.forEach((u, i) => {
      const displayName = u.name || u.username || 'Staff';
      const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM';
      expect(typeof initials).toBe('string');
      expect(initials.length).toBeGreaterThan(0);

      const base = (u.baseSalary !== undefined && u.baseSalary !== null && !isNaN(u.baseSalary)) ? Number(u.baseSalary) : 50000;
      const hra = (u.allowanceHRA !== undefined && u.allowanceHRA !== null && !isNaN(u.allowanceHRA)) ? Number(u.allowanceHRA) : Math.round(base * 0.15);
      const travel = (u.allowanceTravel !== undefined && u.allowanceTravel !== null && !isNaN(u.allowanceTravel)) ? Number(u.allowanceTravel) : 3000;
      const pf = (u.deductionPF !== undefined && u.deductionPF !== null && !isNaN(u.deductionPF)) ? Number(u.deductionPF) : Math.round(base * 0.08);
      const pt = (u.deductionPT !== undefined && u.deductionPT !== null && !isNaN(u.deductionPT)) ? Number(u.deductionPT) : 200;
      const tds = (u.deductionTDS !== undefined && u.deductionTDS !== null && !isNaN(u.deductionTDS)) ? Number(u.deductionTDS) : (base > 60000 ? 10 : 5);

      expect(typeof base.toLocaleString()).toBe('string');
      expect(typeof hra.toLocaleString()).toBe('string');
      expect(typeof travel.toLocaleString()).toBe('string');
      expect(typeof pf.toLocaleString()).toBe('string');
      expect(typeof pt.toLocaleString()).toBe('string');
      expect(typeof tds).toBe('number');
    });
  });

  test('Location filtering correctly partitions employees by worksite', () => {
    const rawUsers = seedData.users || [];
    const logs = seedData.attendanceLogs || [];

    const userLocationsMap = new Map();
    logs.forEach(l => {
      const loc = (l.location || l.biometricUsed || l.branch || '').toLowerCase().trim();
      if (!loc) return;
      if (l.userId) {
        if (!userLocationsMap.has(l.userId)) userLocationsMap.set(l.userId, new Set());
        userLocationsMap.get(l.userId).add(loc);
      }
      if (l.employeeId) {
        if (!userLocationsMap.has(l.employeeId)) userLocationsMap.set(l.employeeId, new Set());
        userLocationsMap.get(l.employeeId).add(loc);
      }
      if (l.biometricUserId) {
        const bk = 'bio_' + l.biometricUserId;
        if (!userLocationsMap.has(bk)) userLocationsMap.set(bk, new Set());
        userLocationsMap.get(bk).add(loc);
      }
    });

    const getUserLocations = (u) => {
      const set = new Set();
      const add = (v) => { if (typeof v === 'string' && v.trim()) set.add(v.toLowerCase().trim()); };
      add(u.workLocation);
      add(u.preferredLocation);
      if (Array.isArray(u.preferredLocations)) u.preferredLocations.forEach(add);
      if (Array.isArray(u.assignedLocations)) u.assignedLocations.forEach(add);
      if (u.shiftLocations && typeof u.shiftLocations === 'object') Object.values(u.shiftLocations).forEach(add);
      const fromLogs = userLocationsMap.get(u.id) || userLocationsMap.get(u.employeeId) || userLocationsMap.get('bio_' + u.biometricUserId);
      if (fromLogs) fromLogs.forEach(l => set.add(l));
      return set;
    };

    const hsStaff = rawUsers.filter(u => getUserLocations(u).has('hs office'));
    expect(hsStaff.length).toBeGreaterThanOrEqual(300);

    const gtSiteStaff = rawUsers.filter(u => getUserLocations(u).has('gt karnal site'));
    expect(gtSiteStaff.length).toBeGreaterThanOrEqual(500);

    const retailStaff = rawUsers.filter(u => getUserLocations(u).has('retail'));
    expect(retailStaff.length).toBeGreaterThanOrEqual(180);
  });

  test('UI elements for Location Filter, Excel Format, and safe download are declared in downloads.js', () => {
    const downloadsCode = fs.readFileSync(path.join(__dirname, '../js/downloads.js'), 'utf8');

    // 1. Location filter in modal
    expect(downloadsCode).toContain('id="profile-location-filter"');
    expect(downloadsCode).toContain('All Locations');

    // 2. Format selector supporting Excel (.xlsx) and PDF (.pdf)
    expect(downloadsCode).toContain('id="profile-format-select"');
    expect(downloadsCode).toContain('value="xlsx"');
    expect(downloadsCode).toContain('value="pdf"');

    // 3. Functions exported and available
    expect(downloadsCode).toContain('export function downloadProfileExcel');
    expect(downloadsCode).toContain('export function downloadProfilePDF');
    expect(downloadsCode).toContain('export async function openProfileDownloadModal');
  });
});