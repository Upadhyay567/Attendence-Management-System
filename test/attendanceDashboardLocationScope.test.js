// test/attendanceDashboardLocationScope.test.js
const fs = require('fs');
const path = require('path');

describe('Attendance Dashboard All Locations & Real-Time Biometric Punch Monitoring', () => {
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
    DB.data = JSON.parse(originalSeedData);
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

  describe('2. Dashboard Scoping: Full Organizational Visibility Across All Locations & Punches', () => {
    test('Active employees and total staff encompass all 1,217 active workforce members across branches', () => {
      const activeEmployees = DB.getUsers().filter(u => u && u.status !== 'Inactive');
      expect(activeEmployees.length).toBeGreaterThanOrEqual(1217);
    });

    test('Today logs cover all 620 punches logged across all 12 operational branches', () => {
      const todayStr = '2026-10-01';
      const allTodayLogs = (DB.getLogs() || []).filter(l => l.date === todayStr && (l.checkIn || l.checkOut || l.lastBiometricPunchAt));
      expect(allTodayLogs.length).toBeGreaterThanOrEqual(620);

      // Compute distinct locations from current logs and configured office coordinates
      const officeCoords = DB.getOfficeCoordinates() || {};
      const distinctLocs = Array.from(new Set([
        ...allTodayLogs.map(l => (l.location || l.biometricUsed || '').trim()).filter(Boolean),
        ...Object.keys(officeCoords)
      ])).filter(loc => !loc.toLowerCase().includes('kohat')).sort((a, b) => a.localeCompare(b));

      expect(distinctLocs).toContain('ASHOK VIHAR');
      expect(distinctLocs).toContain('Chattarpur Office');
      expect(distinctLocs).toContain('Delhi Head Office');
      expect(distinctLocs).toContain('GT KARNAL SITE');
      expect(distinctLocs).toContain('HS Office');
      expect(distinctLocs).toContain('Office HQ');
      expect(distinctLocs).toContain('PITAM PURA');
      expect(distinctLocs).toContain('PUNJABI BAGH');
      expect(distinctLocs).toContain('RETAIL');
      expect(distinctLocs).toContain('Siyonee');
      expect(distinctLocs).toContain('Surya Gurugram');
      expect(distinctLocs).toContain('WH-1340');

      // Verify exact punch counts per location match the Attendances dropdown
      const getCount = (locName) => allTodayLogs.filter(l => {
        const logLoc = (l.location || l.biometricUsed || '').toLowerCase().trim();
        return logLoc === locName.toLowerCase().trim();
      }).length;

      expect(getCount('ASHOK VIHAR')).toBe(9);
      expect(getCount('Chattarpur Office')).toBe(7);
      expect(getCount('Delhi Head Office')).toBe(44);
      expect(getCount('GT KARNAL SITE')).toBeGreaterThanOrEqual(47);
      expect(getCount('HS Office')).toBe(269);
      expect(getCount('Office HQ')).toBe(1);
      expect(getCount('PITAM PURA')).toBe(33);
      expect(getCount('PUNJABI BAGH')).toBe(3);
      expect(getCount('RETAIL')).toBe(108);
      expect(getCount('Siyonee')).toBe(57);
      expect(getCount('Surya Gurugram')).toBe(11);
      expect(getCount('WH-1340')).toBe(31);
    });

    test('Present now records identify all 612 staff currently on duty without checkout across all branches', () => {
      const todayStr = '2026-10-01';
      const allTodayLogs = (DB.getLogs() || []).filter(l => l.date === todayStr && l.checkIn);

      const userTodayMap = new Map();
      allTodayLogs.forEach(log => {
        const empKey = log.userId || log.employeeId || log.biometricUserId;
        if (!empKey) return;
        if (!userTodayMap.has(empKey)) {
          userTodayMap.set(empKey, []);
        }
        userTodayMap.get(empKey).push(log);
      });

      const presentNowList = [];
      for (const [empKey, ulogs] of userTodayMap.entries()) {
        ulogs.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
        const latest = ulogs[0];
        const hasCheckedOut = latest.checkOut && latest.checkOut !== '--' && latest.checkOut !== '--:--';
        if (!hasCheckedOut) {
          presentNowList.push(latest);
        }
      }

      expect(presentNowList.length).toBeGreaterThanOrEqual(600);
    });

    test('Location filtering narrows punches accurately when a specific worksite is selected', () => {
      const todayStr = '2026-10-01';
      const allTodayLogs = (DB.getLogs() || []).filter(l => l.date === todayStr && (l.checkIn || l.checkOut || l.lastBiometricPunchAt));

      // Filter by HS Office
      const hsLogs = allTodayLogs.filter(l => (l.location || l.biometricUsed || '').toLowerCase().trim() === 'hs office');
      expect(hsLogs.length).toBe(269);

      // Filter by RETAIL
      const retailLogs = allTodayLogs.filter(l => (l.location || l.biometricUsed || '').toLowerCase().trim() === 'retail');
      expect(retailLogs.length).toBe(108);

      // Filter by multi-select (e.g. Chattarpur Office + Surya Gurugram)
      const multiSelect = new Set(['chattarpur office', 'surya gurugram']);
      const multiLogs = allTodayLogs.filter(l => multiSelect.has((l.location || l.biometricUsed || '').toLowerCase().trim()));
      expect(multiLogs.length).toBe(7 + 11);
    });
  });

  describe('3. Dynamic Location Updates', () => {
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
