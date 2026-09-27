// auth.js - Authentication Service & Biometric Simulators
import { DB } from './db.js';
import { Utils } from './utils.js';

const SESSION_KEY = 'attendance_current_session';

export const Auth = {
  currentUser: null,

  init() {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        const sId = session ? (session.id || session.userId || (session.user && session.user.id)) : null;
        if (sId) {
          const activeDB = (typeof window !== 'undefined' && window.DB && window.DB.data && window.DB.data.users && window.DB.data.users.length) ? window.DB : DB;
          const user = activeDB.getUser ? activeDB.getUser(sId) : null;
          if (user && user.status !== 'Inactive') {
            this.currentUser = user;
          } else if (!user) {
            if (session.user && (!this.currentUser || this.currentUser.id === sId)) {
              this.currentUser = session.user;
            }
          } else if (user && user.status === 'Inactive') {
            this.logout();
          }
        }
      } catch (e) {
        console.error('Failed to parse session', e);
      }
    }
    if (typeof window !== 'undefined' && this.currentUser) {
      window.__ATTENDANCE_AUTH_USER__ = this.currentUser;
    }
  },

  getCurrentUser() {
    if (!this.currentUser && typeof window !== 'undefined' && window.__ATTENDANCE_AUTH_USER__) {
      this.currentUser = window.__ATTENDANCE_AUTH_USER__;
    }
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    let session = null;
    if (raw) {
      try { session = JSON.parse(raw); } catch (e) {}
    }
    const sId = (this.currentUser && this.currentUser.id) || (session ? (session.id || session.userId || (session.user && session.user.id)) : null);

    if (sId) {
      const activeDB = (typeof window !== 'undefined' && window.DB && window.DB.data && window.DB.data.users && window.DB.data.users.length) ? window.DB : DB;
      const freshUser = activeDB.getUser ? activeDB.getUser(sId) : null;
      if (freshUser && freshUser.status !== 'Inactive') {
        this.currentUser = freshUser;
      } else if (!this.currentUser && session && session.user) {
        this.currentUser = session.user;
      }
    }
    if (typeof window !== 'undefined' && this.currentUser) {
      window.__ATTENDANCE_AUTH_USER__ = this.currentUser;
    }
    return this.currentUser;
  },

  login(loginKey, employeeId, password) {
    let user = null;
    if (loginKey && employeeId) {
      const u = DB.getUserByUsernameOrId(loginKey);
      if (u && u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase().trim()) {
        user = u;
      }
    } else if (loginKey) {
      user = DB.getUserByUsernameOrId(loginKey);
    } else if (employeeId) {
      user = DB.getUsers().find(u => u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase().trim());
    }

    if (!user) {
      return { success: false, message: 'Account not found. Please check your username/email or Employee ID.' };
    }

    if (user.status === 'Inactive') {
      return { success: false, message: 'Your account is currently Inactive. Please contact HR to reactivate your access.' };
    }

    // Verify password if password provided, or if user login requires password check
    if (password !== undefined && password !== null && password !== '') {
      if (!Utils.verifyPassword(password, user.password)) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }
    } else if (user.password && !employeeId) {
      // Password was expected for username/email login
      return { success: false, message: 'Password is required to log in.' };
    }

    this.currentUser = user;
    const sessionData = JSON.stringify({
      id: user.id,
      token: 'session_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
      loginTime: new Date().toISOString()
    });
    sessionStorage.setItem(SESSION_KEY, sessionData);
    localStorage.setItem(SESSION_KEY, sessionData);
    return { success: true, user };
  },

  logout() {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      window.__ATTENDANCE_AUTH_USER__ = null;
      window.lastGpsInRangeState = undefined;
      if (window.activeTimer) {
        clearInterval(window.activeTimer);
        window.activeTimer = null;
      }
      if (window.radarInterval) {
        clearInterval(window.radarInterval);
        window.radarInterval = null;
      }
      if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
        try {
          navigator.geolocation.clearWatch(window.activeGpsWatchId);
        } catch (e) {}
        window.activeGpsWatchId = null;
      }
      const root = document.getElementById('app-root');
      if (root) {
        root.removeAttribute('data-shell-user-id');
      }
    }
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('hs_selected_shift_id');
    sessionStorage.removeItem('hs_last_was_early');
    sessionStorage.removeItem('hs_pending_auto_checkin_time');
    sessionStorage.removeItem('hs_mock_location');
    sessionStorage.removeItem('hs_current_resolved_coords');
    sessionStorage.removeItem('hs_current_resolved_distance');
    sessionStorage.removeItem('hs_current_resolved_in_range');
  },

  // Password Security Strength Validation
  validatePassword(password) {
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
    const isNotJustNumbers = /\D/.test(password); // true if contains at least one non-digit
    const isLongEnough = password.length >= 6;

    return {
      valid: hasUpper && hasSpecial && isNotJustNumbers && isLongEnough,
      hasUpper,
      hasSpecial,
      isNotJustNumbers,
      isLongEnough
    };
  }
};
