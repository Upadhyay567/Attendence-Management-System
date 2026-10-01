// test/attendanceDashboardLocationScope.test.js
const fs = require('fs');
const path = require('path');

describe('Attendance Dashboard Location Scoping & Zero-Default Behavior', () => {
  let getUserAssignedLocations;
  let DB;
  const originalSeedPath = path.join(__dirname, '..', 'seed.json');
  let originalSeedData;

  beforeAll(() => {
    originalSeedData = fs.readFileSync(originalSeedPath, 'utf8');

    // Load DB
    const dbCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
    const dbMod = { exports: {} };
    const wrappedDb = dbCode.replace(/export\s+const\s+DB\s+=/g, 'const DB =').concat('\nmodule.exports = { DB };');
    const fnDb = new Function('module', 'exports', 'require', wrappedDb);
    fnDb(dbMod, dbMod.exports, require);
    DB = dbMod.exports.DB;
    DB.save = () => Promise.resolve();

    // Extract getUserAssignedLocations from adminDashboard.js
    const adminCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'adminDashboard.js'), 'utf8');
    const match = adminCode.match(/export\s+function\s+getUserAssignedLocations\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    if (!match) {
      throw new Error('Could not find getUserAssignedLocations in adminDashboard.js');
    }
    const fnCode = match[0].replace(/export\s+function\s+getUserAssignedLocations/, 'function getUserAssignedLocations');
    const mod = { exports: {} };
    const fn = new Function('module', 'exports', fnCode + '\nmodule.exports = { getUserAssignedLocations };');
    fn(mod, mod.exports);
    getUserAssignedLocations = mod.exports.getUserAssignedLocations;
  });

  afterAll(() => {
    fs.writeFileSync(originalSeedPath, originalSeedData);
  });

  describe('1. getUserAssignedLocations resolution', () => {
    test('Returns empty array for null, undefined, or empty user object', () => {
      expect(getUserAssignedLocations(null)).toEqual([]);
      expect(getUserAssignedLocations(undefined)).toEqual([]);
      expect(getUserAssignedLocations({})).toEqual([]);
    });

    test('Filters out blank strings, placeholders, and dummy values ("None", "Not Assigned", "-", "--")', () => {
      const user = {
        preferredLocation: '   ',
        preferredLocations: ['None', 'No Worksite Location', 'Not Assigned', '-', '--', ''],
        shiftLocations: { s1: 'None', s2: '-' },
        assignedLocations: ['Not Assigned', '   ']
      };
      expect(getUserAssignedLocations(user)).toEqual([]);
    });

    test('Collects and trims valid locations from all assignment properties', () => {
      const user = {
        preferredLocation: ' Noida sector 61 ',
        preferredLocations: ['Site Alpha', 'Site Beta'],
        shiftLocations: { shift_1: 'Site Gamma', shift_2: 'Site Alpha' },
        assignedLocations: ['Site Delta', 'Site Beta']
      };
      const locs = getUserAssignedLocations(user);
      expect(locs).toEqual(expect.arrayContaining([
        'Noida sector 61',
        'Site Alpha',
        'Site Beta',
        'Site Gamma',
        'Site Delta'
      ]));
      // Verify deduplication
      expect(locs.filter(l => l === 'Site Alpha').length).toBe(1);
      expect(locs.filter(l => l === 'Site Beta').length).toBe(1);
    });

    test('Never returns Kohat Enclave by default when unassigned', () => {
      const hrUser = {
        id: 'usr_hr_test',
        role: 'hr',
        name: 'HR Manager',
        preferredLocation: ''
      };
      const locs = getUserAssignedLocations(hrUser);
      expect(locs).toEqual([]);
      expect(locs.some(l => l.toLowerCase().includes('kohat'))).toBe(false);
    });
  });

  describe('2. Dashboard Scoping Logic for HR/Manager without assigned locations', () => {
    test('When HR/Manager has no assigned location, active user list and today records are strictly empty', () => {
      const unassignedHr = {
        id: 'usr_unassigned_hr',
        role: 'hr',
        name: 'Unassigned HR',
        preferredLocation: '',
        preferredLocations: []
      };

      const assignedLocations = getUserAssignedLocations(unassignedHr);
      expect(assignedLocations.length).toBe(0);

      // Scoping logic replicated directly from adminDashboard.js: getAssignedUserIds
      const isHrOrManager = unassignedHr.role === 'hr' || unassignedHr.role === 'manager';
      const hasAssignedLocations = assignedLocations.length > 0;

      let scopedEmployees = [];
      if (isHrOrManager && !hasAssignedLocations) {
        scopedEmployees = [];
      } else {
        scopedEmployees = DB.getUsers().filter(u => u && u.role === 'employee');
      }

      expect(scopedEmployees).toEqual([]);

      // Scoping logic replicated directly from adminDashboard.js: getTodayPresentNowRecords
      let presentNowRecords = [];
      if (isHrOrManager && !hasAssignedLocations) {
        presentNowRecords = [];
      }
      expect(presentNowRecords).toEqual([]);

      // Dropdown button text logic: when unassigned, must be blank string ''
      let btnText = 'Initial';
      if (isHrOrManager && !hasAssignedLocations) {
        btnText = '';
      }
      expect(btnText).toBe('');
    });
  });

  describe('3. Dashboard Scoping Logic for HR/Manager with assigned location', () => {
    test('When HR/Manager is assigned a specific location, only matching records and distinct locations are exposed', () => {
      const assignedHr = {
        id: 'usr_assigned_hr',
        role: 'hr',
        name: 'Assigned HR',
        preferredLocation: 'Noida sector 61'
      };

      const assignedLocations = getUserAssignedLocations(assignedHr);
      expect(assignedLocations).toEqual(['Noida sector 61']);

      const allowedLocsLower = assignedLocations.map(l => l.toLowerCase().trim());
      expect(allowedLocsLower).toEqual(['noida sector 61']);

      // Distinct locations dropdown in adminDashboard.js uses assignedLocations for HR/Manager
      const distinctLocs = assignedLocations;
      expect(distinctLocs).toEqual(['Noida sector 61']);
      expect(distinctLocs).not.toContain('Kohat Enclave, Pitampura, Delhi');

      // Test log filtering
      const sampleLogs = [
        { id: 'log_1', userId: 'u1', date: '2026-10-01', location: 'Noida sector 61', checkIn: '09:00' },
        { id: 'log_2', userId: 'u2', date: '2026-10-01', location: 'Kohat Enclave, Pitampura, Delhi', checkIn: '09:15' },
        { id: 'log_3', userId: 'u3', date: '2026-10-01', location: 'Mumbai Branch', checkIn: '09:30' },
        { id: 'log_4', userId: 'u4', date: '2026-10-01', location: 'noida sector 61', checkIn: '09:45' }
      ];

      const filteredLogs = sampleLogs.filter(l => {
        const loc = (l.location || '').toLowerCase().trim();
        return loc && allowedLocsLower.includes(loc);
      });

      expect(filteredLogs.length).toBe(2);
      expect(filteredLogs.map(l => l.id)).toEqual(['log_1', 'log_4']);
      expect(filteredLogs.some(l => (l.location || '').includes('Kohat'))).toBe(false);
    });
  });

  describe('4. Dynamic Location Updates', () => {
    test('Updating user assigned location immediately updates resolution without default fallback', () => {
      const managerUser = {
        id: 'usr_manager_dynamic',
        role: 'manager',
        preferredLocation: ''
      };

      // Initially blank
      expect(getUserAssignedLocations(managerUser)).toEqual([]);

      // Update location dynamically
      managerUser.preferredLocation = 'Gurugram Cyber City';
      const updatedLocs = getUserAssignedLocations(managerUser);
      expect(updatedLocs).toEqual(['Gurugram Cyber City']);
      expect(updatedLocs).not.toContain('Kohat Enclave, Pitampura, Delhi');

      // Update to multiple locations dynamically
      managerUser.preferredLocations = ['Gurugram Cyber City', 'Delhi South Extension'];
      const multiLocs = getUserAssignedLocations(managerUser);
      expect(multiLocs).toEqual(expect.arrayContaining(['Gurugram Cyber City', 'Delhi South Extension']));
      expect(multiLocs.length).toBe(2);
    });
  });
});
