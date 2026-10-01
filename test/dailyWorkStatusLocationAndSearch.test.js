// test/dailyWorkStatusLocationAndSearch.test.js - Verification of Location Filter & Search in Daily Work Status
const fs = require('fs');
const path = require('path');

describe('Daily Work Status - Location Filter & Search Button Controls', () => {
  const dwsViewPath = path.join(__dirname, '..', 'js', 'views', 'dailyWorkStatusView.js');
  let dwsCode;
  let seedData;

  beforeAll(() => {
    dwsCode = fs.readFileSync(dwsViewPath, 'utf8');
    const seedPath = path.join(__dirname, '..', 'seed.json');
    seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  });

  test('UI elements for Location Filter & Search are declared in dailyWorkStatusView.js', () => {
    // 1. Search input and search button
    expect(dwsCode).toContain('id="dws-search-input"');
    expect(dwsCode).toContain('id="btn-dws-search-trigger"');
    expect(dwsCode).toContain('id="btn-dws-clear-search"');
    expect(dwsCode).toContain('Search employee');

    // 2. Location filter dropdown
    expect(dwsCode).toContain('id="dws-location-filter"');
    expect(dwsCode).toContain('All Locations');

    // 3. Location filter in modal
    expect(dwsCode).toContain('id="select-dws-filter-loc"');
    expect(dwsCode).toContain('Location / Worksite');

    // 4. Module state variables
    expect(dwsCode).toContain('dailyWorkStatusLocationFilter');
    expect(dwsCode).toContain('dailyWorkStatusSearchQuery');
  });

  test('Event listeners are registered for Search and Location Filter', () => {
    expect(dwsCode).toContain("getElementById('dws-location-filter')");
    expect(dwsCode).toContain("locSelect.addEventListener('change'");
    expect(dwsCode).toContain("getElementById('dws-search-input')");
    expect(dwsCode).toContain("getElementById('btn-dws-search-trigger')");
    expect(dwsCode).toContain("searchBtn.addEventListener('click'");
    expect(dwsCode).toContain("searchInput.addEventListener('input'");
    expect(dwsCode).toContain("searchInput.addEventListener('keydown'");
  });

  test('Location filtering logic: isolates employees by assigned location or branch punches', () => {
    const allUsers = (seedData.users || []).filter(u => u.role === 'employee');
    const allLogs = seedData.attendanceLogs || [];

    const userLocationsMap = new Map();
    allLogs.forEach(l => {
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
        const bk = `bio_${l.biometricUserId}`;
        if (!userLocationsMap.has(bk)) userLocationsMap.set(bk, new Set());
        userLocationsMap.get(bk).add(loc);
      }
    });

    const filterByLocation = (locFilter) => {
      if (!locFilter) return allUsers;
      const targetLoc = locFilter.toLowerCase().trim();
      return allUsers.filter(e => {
        const addCheck = (val) => typeof val === 'string' && val.toLowerCase().trim() === targetLoc;
        if (addCheck(e.workLocation) || addCheck(e.preferredLocation)) return true;
        if (Array.isArray(e.preferredLocations) && e.preferredLocations.some(addCheck)) return true;
        if (Array.isArray(e.assignedLocations) && e.assignedLocations.some(addCheck)) return true;
        if (e.shiftLocations && typeof e.shiftLocations === 'object') {
          if (Object.values(e.shiftLocations).some(addCheck)) return true;
        }
        const userLocs = userLocationsMap.get(e.id) || userLocationsMap.get(e.employeeId) || userLocationsMap.get(`bio_${e.biometricUserId}`);
        return userLocs && userLocs.has(targetLoc);
      });
    };

    // All Locations returns full employee list
    expect(filterByLocation('').length).toBe(allUsers.length);

    // Specific branch locations filter to exact active rosters
    const hsStaff = filterByLocation('HS Office');
    expect(hsStaff.length).toBeGreaterThanOrEqual(300);

    const retailStaff = filterByLocation('RETAIL');
    expect(retailStaff.length).toBeGreaterThanOrEqual(180);

    const gtSiteStaff = filterByLocation('GT KARNAL SITE');
    expect(gtSiteStaff.length).toBeGreaterThanOrEqual(70);

    const siyoneeStaff = filterByLocation('Siyonee');
    expect(siyoneeStaff.length).toBeGreaterThanOrEqual(50);
  });

  test('Search filtering logic: matches employee by name, employee ID, and biometric ID', () => {
    const allUsers = (seedData.users || []).filter(u => u.role === 'employee');

    const searchUsers = (query) => {
      if (!query) return allUsers;
      const q = query.toLowerCase().trim();
      return allUsers.filter(e => 
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.id && e.id.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.biometricUserId && String(e.biometricUserId).toLowerCase().includes(q))
      );
    };

    // Search by exact name
    const hemantMatch = searchUsers('Hemant');
    expect(hemantMatch.length).toBeGreaterThanOrEqual(1);
    expect(hemantMatch.some(e => e.name === 'Hemant')).toBe(true);

    // Search by employee code
    const emp1200Match = searchUsers('EMP1200');
    expect(emp1200Match.length).toBe(1);
    expect(emp1200Match[0].name).toContain('BHUPENDRA');

    // Case-insensitivity
    const lowerMatch = searchUsers('bhupendra');
    expect(lowerMatch.length).toBeGreaterThanOrEqual(1);
  });

  test('Combined Location and Search filtering narrows results accurately', () => {
    const allUsers = (seedData.users || []).filter(u => u.role === 'employee');
    const allLogs = seedData.attendanceLogs || [];

    const userLocationsMap = new Map();
    allLogs.forEach(l => {
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
        const bk = `bio_${l.biometricUserId}`;
        if (!userLocationsMap.has(bk)) userLocationsMap.set(bk, new Set());
        userLocationsMap.get(bk).add(loc);
      }
    });

    const combinedFilter = (locFilter, searchQuery) => {
      let filtered = allUsers;
      if (locFilter) {
        const targetLoc = locFilter.toLowerCase().trim();
        filtered = filtered.filter(e => {
          const addCheck = (val) => typeof val === 'string' && val.toLowerCase().trim() === targetLoc;
          if (addCheck(e.workLocation) || addCheck(e.preferredLocation)) return true;
          if (Array.isArray(e.preferredLocations) && e.preferredLocations.some(addCheck)) return true;
          if (Array.isArray(e.assignedLocations) && e.assignedLocations.some(addCheck)) return true;
          if (e.shiftLocations && typeof e.shiftLocations === 'object') {
            if (Object.values(e.shiftLocations).some(addCheck)) return true;
          }
          const userLocs = userLocationsMap.get(e.id) || userLocationsMap.get(e.employeeId) || userLocationsMap.get(`bio_${e.biometricUserId}`);
          return userLocs && userLocs.has(targetLoc);
        });
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(e => 
          (e.name && e.name.toLowerCase().includes(q)) ||
          (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
          (e.id && e.id.toLowerCase().includes(q))
        );
      }
      return filtered;
    };

    // Search for a person specifically within HS Office
    const res = combinedFilter('HS Office', 'Sachin');
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res.every(e => e.name.toLowerCase().includes('sachin'))).toBe(true);
  });

  test('exportDailyWorkStatusCSV integrates location and search filtering', () => {
    expect(dwsCode).toContain('if (dailyWorkStatusLocationFilter) {');
    expect(dwsCode).toContain('if (dailyWorkStatusSearchQuery) {');
    expect(dwsCode).toContain('userLocationsMap');
  });
});
