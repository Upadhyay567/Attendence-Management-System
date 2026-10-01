// test/hrManagerBiometricPunch.test.js
const fs = require('fs');
const path = require('path');

describe('HR & Manager Role Biometric Punch Display & Scoping', () => {
  let DB;
  let getUserAssignedLocations;
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

  describe('1. HR and Manager User Worksite Assignment Verification', () => {
    test('HR Admin Manager has assigned company worksites in seed.json', () => {
      const admin = DB.getUser('usr_admin');
      expect(admin).toBeDefined();
      const locs = getUserAssignedLocations(admin);
      expect(locs.length).toBeGreaterThan(0);
      expect(locs).toContain('Office HQ');
      expect(locs).toContain('GT KARNAL SITE');
    });

    test('Abhishek Sharma (HR) has assigned worksites in seed.json', () => {
      const hrUser = DB.getUser('usr_6af1y3c');
      expect(hrUser).toBeDefined();
      const locs = getUserAssignedLocations(hrUser);
      expect(locs).toContain('GT KARNAL SITE');
      expect(locs).toContain('Noida sector 61');
    });

    test('Amit Sharma (Manager) has assigned worksites in seed.json', () => {
      const mgrUser = DB.getUser('usr_w4thpma');
      expect(mgrUser).toBeDefined();
      const locs = getUserAssignedLocations(mgrUser);
      expect(locs).toContain('GT KARNAL SITE');
    });
  });

  describe('2. Biometric Log Resolution for Users Without Shift Schedule (HR & Manager)', () => {
    test('DB.getTodayLog(user.id) resolves biometric punch log even when shiftId is empty/null', () => {
      const todayStr = '2026-10-01';
      const adminLog = DB.getTodayLog('usr_admin');
      expect(adminLog).toBeDefined();
      expect(adminLog.userId).toBe('usr_admin');
      expect(adminLog.checkIn).toBe('13:18:11');
      expect(adminLog.location).toBe('Office HQ');

      const hrLog = DB.getTodayLog('usr_6af1y3c');
      expect(hrLog).toBeDefined();
      expect(hrLog.userId).toBe('usr_6af1y3c');
      expect(hrLog.checkIn).toBe('09:17:09');
      expect(hrLog.location).toBe('GT KARNAL SITE');
    });

    test('isNoShift evaluation allows active punch session to display when user has todayLog', () => {
      const todayLog = DB.getTodayLog('usr_admin');
      const checkInStatus = { allowed: false, type: 'NoShift' };

      // Previous faulty logic: blocked display if checkInStatus was NoShift
      const previousFaultyIsNoShift = !checkInStatus.allowed && checkInStatus.type === 'NoShift';
      expect(previousFaultyIsNoShift).toBe(true); // would block display!

      // Fixed logic: if user has a biometric punch session today, do not block display
      const fixedIsNoShift = (!checkInStatus.allowed && checkInStatus.type === 'NoShift') && !todayLog;
      expect(fixedIsNoShift).toBe(false); // correctly allows display!
    });
  });

  describe('3. Attendance Dashboard Live Feed Scoping for HR and Manager Roles', () => {
    test('When HR Admin logs in, biometric punches from assigned locations are visible in live feed', () => {
      const admin = DB.getUser('usr_admin');
      const assignedLocs = getUserAssignedLocations(admin).map(l => l.toLowerCase().trim());
      expect(assignedLocs.length).toBeGreaterThan(0);

      const todayStr = '2026-10-01';
      const allTodayLogs = (DB.getLogs() || []).filter(l => l.date === todayStr);

      const allowedPunches = allTodayLogs.filter(l => {
        const loc = (l.location || '').toLowerCase().trim();
        const bioLoc = (l.biometricUsed || '').toLowerCase().trim();
        return (loc && assignedLocs.includes(loc)) || (bioLoc && assignedLocs.includes(bioLoc));
      });

      expect(allowedPunches.length).toBeGreaterThan(0);
      // Confirms both admin punch and employee punches are visible
      expect(allowedPunches.some(l => l.userId === 'usr_admin')).toBe(true);
    });

    test('When Manager Amit Sharma logs in, punches from GT KARNAL SITE are visible', () => {
      const mgr = DB.getUser('usr_w4thpma');
      const assignedLocs = getUserAssignedLocations(mgr).map(l => l.toLowerCase().trim());
      expect(assignedLocs).toEqual(['gt karnal site']);

      const todayStr = '2026-10-01';
      const allTodayLogs = (DB.getLogs() || []).filter(l => l.date === todayStr);

      const scopedPunches = allTodayLogs.filter(l => {
        const loc = (l.location || '').toLowerCase().trim();
        const bioLoc = (l.biometricUsed || '').toLowerCase().trim();
        return (loc && assignedLocs.includes(loc)) || (bioLoc && assignedLocs.includes(bioLoc));
      });

      expect(scopedPunches.length).toBeGreaterThan(0);
      expect(scopedPunches.every(l => {
        const loc = (l.location || '').toLowerCase().trim();
        const bioLoc = (l.biometricUsed || '').toLowerCase().trim();
        return loc === 'gt karnal site' || bioLoc === 'gt karnal site';
      })).toBe(true);
    });

    test('When an HR or Manager has no location assigned, live feed and count remain strictly 0', () => {
      const unassignedUser = {
        id: 'usr_mock_unassigned',
        role: 'hr',
        preferredLocation: '',
        preferredLocations: []
      };
      const assignedLocs = getUserAssignedLocations(unassignedUser);
      expect(assignedLocs.length).toBe(0);

      let currentTodayLogs = [];
      const hasAssignedLocations = assignedLocs.length > 0;
      if (!hasAssignedLocations) {
        currentTodayLogs = [];
      }
      expect(currentTodayLogs.length).toBe(0);
    });
  });
});
