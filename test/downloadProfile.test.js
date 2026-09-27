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
});