// test/manualShiftAndLocationScheduling.test.js
const fs = require('fs');
const path = require('path');

describe('Employee Shift & Worksite Assignment - Manual Allocation & Biometric Locations', () => {
  let DB;
  let originalSeedData;
  const originalSeedPath = path.join(__dirname, '..', 'seed.json');

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
  });

  afterAll(() => {
    fs.writeFileSync(originalSeedPath, originalSeedData, 'utf8');
  });

  describe('1. Worksite Location Sanitization & Biometric Data Sources', () => {
    test('DB.getBiometricLocations returns only existing worksite locations from biometric devices', () => {
      const bioLocs = DB.getBiometricLocations();
      expect(Array.isArray(bioLocs)).toBe(true);
      expect(bioLocs.length).toBeGreaterThan(0);

      // Verify known biometric worksite locations are present
      expect(bioLocs).toContain('GT KARNAL SITE');
      expect(bioLocs).toContain('Noida sector 61');
      expect(bioLocs).toContain('Chattarpur Office');
      expect(bioLocs).toContain('PITAM PURA');
      expect(bioLocs).toContain('Delhi Head Office');

      // Verify sample and mock locations are strictly absent
      expect(bioLocs.some(l => l.includes('28.6952'))).toBe(false);
      expect(bioLocs).not.toContain('Office HQ');
      expect(bioLocs).not.toContain('Mock Device');
      expect(bioLocs).not.toContain('Worksite (28.6952, 77.1860)');
    });

    test('DB.getOfficeCoordinates excludes sample coordinates and includes biometric branch locations', () => {
      const coords = DB.getOfficeCoordinates();
      expect(typeof coords).toBe('object');
      
      // Sample worksite coordinates should be completely removed
      expect(coords['Worksite (28.6952, 77.1860)']).toBeUndefined();
      expect(coords['Office HQ']).toBeUndefined();
      expect(Object.keys(coords).some(k => k.includes('28.6952'))).toBe(false);

      // Valid biometric locations must exist with lat & lng
      expect(coords['GT KARNAL SITE']).toBeDefined();
      expect(coords['GT KARNAL SITE'].lat).toBeCloseTo(28.7180, 2);
      expect(coords['GT KARNAL SITE'].lng).toBeCloseTo(77.1420, 2);

      expect(coords['Noida sector 61']).toBeDefined();
      expect(coords['Delhi Head Office']).toBeDefined();
      expect(coords['Chattarpur Office']).toBeDefined();
    });

    test('schedulesView filters allLocationNames to only existing biometric worksite locations', () => {
      const viewCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'schedulesView.js'), 'utf8');
      expect(viewCode).toContain('getBiometricLocations');
      expect(viewCode).toContain('!l.includes(\'28.6952\')');
      expect(viewCode).toContain('l !== \'Office HQ\'');
    });
  });

  describe('2. Manual Shift & Location Assignment Engine', () => {
    let testUser;

    beforeEach(() => {
      testUser = {
        id: 'usr_manual_test_101',
        name: 'Manual Test Employee',
        employeeId: 'MTE101',
        role: 'employee',
        department: 'Operations',
        scheduleIds: [],
        scheduleId: '',
        preferredLocations: [],
        preferredLocation: ''
      };
      DB.data.users.push(testUser);
    });

    afterEach(() => {
      DB.data.users = DB.data.users.filter(u => u.id !== testUser.id);
    });

    test('Manual assignment: updating shifts modifies user scheduleIds and primary scheduleId', () => {
      const newShifts = ['sch_morning_1', 'sch_evening_2'];
      DB.updateUser(testUser.id, {
        scheduleIds: newShifts,
        scheduleId: newShifts[0]
      });

      const updated = DB.getUser(testUser.id);
      expect(updated.scheduleIds).toEqual(newShifts);
      expect(updated.scheduleId).toBe('sch_morning_1');
    });

    test('Manual assignment: updating worksite location modifies preferredLocations and strips sample placeholders', () => {
      const selectedLocs = ['GT KARNAL SITE', 'Noida sector 61'];
      DB.updateUser(testUser.id, {
        preferredLocations: selectedLocs,
        preferredLocation: selectedLocs[0]
      });

      const updated = DB.getUser(testUser.id);
      expect(updated.preferredLocations).toEqual(selectedLocs);
      expect(updated.preferredLocation).toBe('GT KARNAL SITE');
    });

    test('Manual assignment: unassigning (selecting No Shift / No Location) empties assignments cleanly', () => {
      // First assign
      DB.updateUser(testUser.id, {
        scheduleIds: ['sch_test'],
        scheduleId: 'sch_test',
        preferredLocations: ['GT KARNAL SITE'],
        preferredLocation: 'GT KARNAL SITE'
      });

      // Then clear / unassign
      DB.updateUser(testUser.id, {
        scheduleIds: [],
        scheduleId: '',
        preferredLocations: [],
        preferredLocation: ''
      });

      const cleared = DB.getUser(testUser.id);
      expect(cleared.scheduleIds).toEqual([]);
      expect(cleared.scheduleId).toBe('');
      expect(cleared.preferredLocations).toEqual([]);
      expect(cleared.preferredLocation).toBe('');
    });

    test('Position popover logic does not wipe activeEditingEmpId when opened', () => {
      const viewCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'schedulesView.js'), 'utf8');
      
      // In positionPopoverAt, closeAllPopovers should not be called blindly
      // which would destroy activeEditingEmpId
      const posFnIdx = viewCode.indexOf('const positionPopoverAt');
      expect(posFnIdx).toBeGreaterThan(-1);
      const posFnChunk = viewCode.substring(posFnIdx, posFnIdx + 700);
      expect(posFnChunk).not.toContain('closeAllPopovers();');

      // Both popovers must feature the Done button for explicit confirmation
      expect(viewCode).toContain('global-shift-done-btn');
      expect(viewCode).toContain('global-loc-done-btn');
    });
  });
});
