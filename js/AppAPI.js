import { DB } from './db.js';

// Client-Side API Helper

export const AppAPI = {
  async fetchProfileDownload(userIds) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(DB.queryEmployeeProfiles(userIds));
      }, 300);
    });
  },

  async fetchReportDownload(userIds, month, year) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(DB.queryAttendanceReport(userIds, month, year));
      }, 300);
    });
  }
};
