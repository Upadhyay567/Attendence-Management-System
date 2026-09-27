import { DB } from './core/db.js';

// Client-Side API Helper

export const AppAPI = {
  async fetchProfileDownload(userIds) {
    const activeDB = (typeof window !== 'undefined' && window.DB && window.DB.data && window.DB.data.users && window.DB.data.users.length) ? window.DB : DB;
    if (typeof activeDB.queryEmployeeProfiles === 'function') {
      return activeDB.queryEmployeeProfiles(userIds);
    }
    const all = (activeDB.getUsers ? activeDB.getUsers() : (activeDB.data ? activeDB.data.users : [])) || [];
    return all.filter(u => userIds.includes(u.id) || (u.employeeId && userIds.includes(u.employeeId)));
  },

  async fetchReportDownload(userIds, month, year) {
    const activeDB = (typeof window !== 'undefined' && window.DB && window.DB.data && window.DB.data.users && window.DB.data.users.length) ? window.DB : DB;
    if (typeof activeDB.queryAttendanceReport === 'function') {
      return activeDB.queryAttendanceReport(userIds, month, year);
    }
    return [];
  }
};
