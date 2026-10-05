import { DB } from './core/db.js';

// Client-Side API Helper

export const AppAPI = {
  async fetchProfileDownload(userIds, options = {}) {
    const baseUrl = (typeof window !== 'undefined' && window.apiBaseUrl) ? window.apiBaseUrl : '';
    try {
      const res = await fetch(`${baseUrl}/api/reports/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, location: options ? options.location : undefined })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.profiles) && data.profiles.length > 0) {
          return data.profiles;
        }
      }
    } catch (e) {
      // Non-fatal network fallback to in-memory activeDB
    }

    const activeDB = (typeof window !== 'undefined' && window.DB && window.DB.data && window.DB.data.users && window.DB.data.users.length) ? window.DB : DB;
    if (typeof activeDB.queryEmployeeProfiles === 'function') {
      return activeDB.queryEmployeeProfiles(userIds, options);
    }
    const normalizeLocationName = (loc) => {
      if (!loc || typeof loc !== 'string') return '';
      const l = loc.trim();
      const lower = l.toLowerCase();
      if (lower === 'chattarpur') return 'Chattarpur Office';
      if (lower === 'omaxe office' || lower === 'surya omaxe') return 'Delhi Head Office';
      if (lower.includes('pitampura') || lower === 'hs group hq, pitampura, delhi') return 'PITAM PURA';
      return l;
    };
    const getUserPrimaryLocation = (u) => {
      if (!u) return 'Head Office';
      let loc = (u.preferredLocation && u.preferredLocation.trim()) ||
                (Array.isArray(u.preferredLocations) && u.preferredLocations.find(l => l && l.trim())) ||
                (Array.isArray(u.assignedLocations) && u.assignedLocations.find(l => l && l.trim())) ||
                (u.workLocation && u.workLocation.trim()) ||
                '';
      return loc ? normalizeLocationName(loc) : 'Head Office';
    };

    const all = (activeDB.getUsers ? activeDB.getUsers() : (activeDB.data ? activeDB.data.users : [])) || [];
    let list = all.filter(u => userIds.includes(u.id) || (u.employeeId && userIds.includes(u.employeeId)));
    if (options && options.location && options.location !== 'all') {
      const target = normalizeLocationName(options.location).toLowerCase().trim();
      list = list.filter(u => getUserPrimaryLocation(u).toLowerCase().trim() === target);
    }
    return list;
  },

  async fetchReportDownload(userIds, month, year) {
    const activeDB = (typeof window !== 'undefined' && window.DB && window.DB.data && window.DB.data.users && window.DB.data.users.length) ? window.DB : DB;
    if (typeof activeDB.queryAttendanceReport === 'function') {
      return activeDB.queryAttendanceReport(userIds, month, year);
    }
    return [];
  }
};
