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
        if (session && session.id) {
          const user = DB.getUser(session.id);
          if (user && user.status !== 'Inactive') {
            this.currentUser = user;
          } else {
            this.logout();
          }
        }
      } catch (e) {
        console.error('Failed to parse session', e);
      }
    }
  },

  getCurrentUser() {
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
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
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
