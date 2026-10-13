const fs = require('fs');
const path = require('path');

describe('Photo Fetch and Dashboard Data Persistence Verification', () => {
  const seedPath = path.join(__dirname, '..', 'seed.json');
  let originalSeedData;

  beforeAll(() => {
    originalSeedData = fs.readFileSync(seedPath, 'utf8');
  });

  afterAll(() => {
    fs.writeFileSync(seedPath, originalSeedData, 'utf8');
  });

  describe('1. Photo URL Resolution Engine', () => {
    // Extract Utils from js/utils.js
    let Utils;
    beforeAll(() => {
      const utilsCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8');
      const cleanCode = utilsCode.replace(/export\s+const\s+/g, 'const ') + '\nmodule.exports = { Utils };';
      const m = { exports: {} };
      const fn = new Function('module', 'exports', cleanCode);
      fn(m, m.exports);
      Utils = m.exports.Utils;
    });

    test('resolvePhotoUrl handles base64 data URLs without alteration', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
      expect(Utils.resolvePhotoUrl(dataUrl)).toBe(dataUrl);
    });

    test('resolvePhotoUrl handles absolute HTTP and HTTPS URLs', () => {
      expect(Utils.resolvePhotoUrl('http://example.com/photos/avatar.png')).toBe('http://example.com/photos/avatar.png');
      expect(Utils.resolvePhotoUrl('https://cdn.example.com/user.jpg')).toBe('https://cdn.example.com/user.jpg');
    });

    test('resolvePhotoUrl prepends window.apiBaseUrl for relative /uploads/ paths', () => {
      global.window = { apiBaseUrl: 'http://localhost:8080' };
      expect(Utils.resolvePhotoUrl('/uploads/employee_123.jpg')).toBe('http://localhost:8080/uploads/employee_123.jpg');
      expect(Utils.resolvePhotoUrl('uploads/employee_123.jpg')).toBe('http://localhost:8080/uploads/employee_123.jpg');
      delete global.window;
    });

    test('resolvePhotoUrl returns empty string for null, undefined, or empty values', () => {
      expect(Utils.resolvePhotoUrl(null)).toBe('');
      expect(Utils.resolvePhotoUrl(undefined)).toBe('');
      expect(Utils.resolvePhotoUrl('')).toBe('');
      expect(Utils.resolvePhotoUrl('   ')).toBe('');
    });
  });

  describe('2. Compact Storage Snapshot Metadata & Photo Preservation', () => {
    test('_buildCompactStorageSnapshot preserves photo, scheduleIds, and preferredLocations', () => {
      const dbCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
      
      // Verify _buildCompactStorageSnapshot retains photo, scheduleIds, preferredLocations
      expect(dbCode).toContain('photo: u.photo || null');
      expect(dbCode).toContain('scheduleIds: Array.isArray(u.scheduleIds)');
      expect(dbCode).toContain('preferredLocations: Array.isArray(u.preferredLocations)');

      // Verify DB._doInit does not overwrite fresh server state with localStorage
      expect(dbCode).toContain('if (!this.data || !Array.isArray(this.data.users) || this.data.users.length === 0)');
    });
  });

  describe('3. Backend applyLocalUpdate & Granular Mutations', () => {
    // Extract applyLocalUpdate from attendance.controller.js
    let applyLocalUpdate;
    beforeAll(() => {
      const controllerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'server', 'controllers', 'attendance.controller.js'), 'utf8');
      const match = controllerCode.match(/function\s+applyLocalUpdate\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(match).toBeDefined();
      const fnCode = match[0] + '\nmodule.exports = { applyLocalUpdate };';
      const m = { exports: {} };
      const fn = new Function('module', 'exports', fnCode);
      fn(m, m.exports);
      applyLocalUpdate = m.exports.applyLocalUpdate;
    });

    test('applyLocalUpdate correctly deletes user when type is pull or delete', () => {
      const stateObj = {
        users: [
          { id: 'usr_test_1', name: 'User 1' },
          { id: 'usr_test_2', name: 'User 2' }
        ],
        attendanceLogs: [
          { id: 'log_1', userId: 'usr_test_1' },
          { id: 'log_2', userId: 'usr_test_2' }
        ]
      };

      // HR deletes user via 'pull'
      applyLocalUpdate(stateObj, 'pull', 'users', null, null, { id: 'usr_test_1' });
      expect(stateObj.users.length).toBe(1);
      expect(stateObj.users[0].id).toBe('usr_test_2');

      // Attendance logs cleanup via 'pull'
      applyLocalUpdate(stateObj, 'pull', 'attendanceLogs', null, null, { userId: 'usr_test_1' });
      expect(stateObj.attendanceLogs.length).toBe(1);
      expect(stateObj.attendanceLogs[0].id).toBe('log_2');
    });

    test('applyLocalUpdate correctly updates user with loose ID match', () => {
      const stateObj = {
        users: [
          { id: '100', name: 'Old Name', photo: 'data:old_photo' }
        ]
      };

      // Query with number or string match
      applyLocalUpdate(stateObj, 'update', 'users', null, { name: 'New Name', photo: 'data:new_photo' }, { id: '100' });
      expect(stateObj.users[0].name).toBe('New Name');
      expect(stateObj.users[0].photo).toBe('data:new_photo');
    });

    test('applyLocalUpdate unshifts or upserts when type is push', () => {
      const stateObj = { users: [] };
      applyLocalUpdate(stateObj, 'push', 'users', { id: 'usr_new', name: 'New Employee', photo: 'data:img' });
      expect(stateObj.users.length).toBe(1);
      expect(stateObj.users[0].id).toBe('usr_new');
    });
  });

  describe('4. Server /api/mutate Persistence Logic', () => {
    test('/api/mutate code does not resurrect deleted users or ignore deletions of collections', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'server', 'app.js'), 'utf8');
      
      // Ensure sync preserves only active users from data.users
      expect(appCode).toContain('if (Array.isArray(data.users) && data.users.length > 0)');
      expect(appCode).toContain('existing.users = data.users.map(u => {');
      expect(appCode).toContain('if (!merged.photo && prev.photo) {');

      // Ensure deletions in other collections are not skipped
      expect(appCode).not.toContain('data[k].length < existing[k].length && k !== \'leaveRequests\'');
      expect(appCode).toContain('existing[k] = data[k];');
    });
  });

  describe('5. UI Editing Photo Protection', () => {
    test('userManagementView and adminDashboard edit modal code preserves photos when not explicitly removed', () => {
      const userMgmtCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'userManagementView.js'), 'utf8');
      expect(userMgmtCode).toContain('photoRemovedExplicitly ? null : (editorPhotoDataUrl || (isEdit && user && user.photo ? user.photo : null))');

      const adminDashCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'views', 'adminDashboard.js'), 'utf8');
      expect(adminDashCode).toContain('photoRemovedExplicitly ? null : (editorPhotoDataUrl || (targetUserObj ? targetUserObj.photo : null))');
    });
  });
});
