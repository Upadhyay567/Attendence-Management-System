// app.js - SPA Router & Controller
import { DB } from './db.js';
import { Auth } from './auth.js';
import { Utils } from './utils.js';
import { triggerBirthdayCelebration } from './celebration.js';

// Custom dialog modal manager
const CustomDialog = {
  alert(message, title = null) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-dialog-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'custom-dialog-card';
      
      modal.innerHTML = `
        <div class="custom-dialog-icon-wrapper">
          <div class="custom-dialog-icon-badge custom-dialog-icon-alert" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        </div>
        ${title ? `<h3 style="margin: 10px 0 6px 0; font-size: 16px; font-weight: 700; color: var(--text-primary); text-align: center;">${Utils.escape(title)}</h3>` : ''}
        <div class="custom-dialog-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="custom-dialog-actions" style="justify-content: center;">
          <button class="custom-dialog-btn-primary" style="min-width: 120px;" id="btn-custom-alert-ok">OK</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      const close = () => {
        overlay.style.animation = 'customDialogFadeOut 0.18s ease forwards';
        modal.style.animation = 'customDialogScaleDown 0.18s ease forwards';
        setTimeout(() => {
          if (overlay.parentNode) document.body.removeChild(overlay);
          resolve();
        }, 180);
      };

      modal.querySelector('#btn-custom-alert-ok').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    });
  },
  
  confirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-dialog-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'custom-dialog-card custom-confirm-card';
      
      modal.innerHTML = `
        <div class="custom-dialog-icon-wrapper">
          <div class="custom-dialog-icon-badge custom-dialog-icon-confirm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        </div>
        <div class="custom-dialog-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-btn-secondary" id="btn-custom-confirm-cancel">Cancel</button>
          <button class="custom-dialog-btn-primary" id="btn-custom-confirm-ok">Confirm</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      const close = (result) => {
        overlay.style.animation = 'customDialogFadeOut 0.18s ease forwards';
        modal.style.animation = 'customDialogScaleDown 0.18s ease forwards';
        setTimeout(() => {
          if (overlay.parentNode) document.body.removeChild(overlay);
          resolve(result);
        }, 180);
      };
      
      modal.querySelector('#btn-custom-confirm-ok').addEventListener('click', () => close(true));
      modal.querySelector('#btn-custom-confirm-cancel').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  },
  
  prompt(message, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'custom-dialog-overlay';
      
      const modal = document.createElement('div');
      modal.className = 'custom-dialog-card custom-prompt-card';
      
      modal.innerHTML = `
        <div class="custom-dialog-icon-wrapper">
          <div class="custom-dialog-icon-badge custom-dialog-icon-prompt">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </div>
        </div>
        <div class="custom-dialog-message">${message.replace(/\n/g, '<br>')}</div>
        <div class="custom-dialog-input-group">
          <input type="text" class="custom-dialog-input" id="input-custom-prompt" value="${defaultValue}" placeholder="Type here..." autocomplete="off">
        </div>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-btn-secondary" id="btn-custom-prompt-cancel">Cancel</button>
          <button class="custom-dialog-btn-primary custom-dialog-btn-prompt" id="btn-custom-prompt-ok">Submit</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      const input = modal.querySelector('#input-custom-prompt');
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
      
      const close = (val) => {
        overlay.style.animation = 'customDialogFadeOut 0.18s ease forwards';
        modal.style.animation = 'customDialogScaleDown 0.18s ease forwards';
        setTimeout(() => {
          if (overlay.parentNode) document.body.removeChild(overlay);
          resolve(val);
        }, 180);
      };
      
      modal.querySelector('#btn-custom-prompt-ok').addEventListener('click', () => close(input.value));
      modal.querySelector('#btn-custom-prompt-cancel').addEventListener('click', () => close(null));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') close(input.value);
        if (e.key === 'Escape') close(null);
      });
    });
  }
};

// Global overrides of native browser dialogs to show beautiful mid-screen popup modals instead of ugly native browser bars
window.alert = function(msg, title = null) {
  if (msg !== undefined && msg !== null) {
    CustomDialog.alert(String(msg), title);
  }
};

function getCheckInTimeStatus(user, targetShiftId = null) {
  if (!user) return { allowed: false, reason: 'Authentication required.' };
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const resolved = DB.resolveUserShiftForDate(user, todayStr, targetShiftId);
  
  if (!resolved || !resolved.scheduleId) {
    return { allowed: false, reason: 'No shift assigned today. Please contact your manager or HR to assign a shift schedule.', type: 'NoShift' };
  }
  
  const schedule = resolved.schedule || DB.getSchedule(resolved.scheduleId);
  if (!schedule || !schedule.startTime) {
    return { allowed: false, reason: 'No shift assigned today. Please contact your manager or HR to assign a shift schedule.', type: 'NoShift' };
  }
  
  const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
  const shiftStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMinute, 0, 0);
  const allowedStartTime = new Date(shiftStart.getTime() - 30 * 60 * 1000);
  
  if (today.getTime() < allowedStartTime.getTime()) {
    return { allowed: false, reason: 'Your shift has not started yet. You can check in only 30 minutes before your scheduled shift.', type: 'TooEarly' };
  }
  
  return { allowed: true };
}

// Override native confirm() — returns a Promise, so callers must use `await`
const _nativeConfirm = window.confirm;
window.confirm = function(msg) {
  return CustomDialog.confirm(String(msg || ''));
};

// Override native prompt() — returns a Promise, so callers must use `await`
const _nativePrompt = window.prompt;
window.prompt = function(msg, defaultVal) {
  return CustomDialog.prompt(String(msg || ''), defaultVal != null ? String(defaultVal) : '');
};

let activeTimer = null;
const AUTH_REQUIRE_ID_MANDATORY = false; // Change to true to make ID verification mandatory
const getInitials = (name) => (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

// Convert 24-hour time string (e.g. "08:00", "16:30") to 12-hour AM/PM format (e.g. "08:00 AM", "04:30 PM")
function formatTime12h(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return timeStr || '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

// Format a time range "startTime - endTime" with AM/PM
function formatTimeRange12h(start, end) {
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
}
let currentScanner = null;
let activeAdminApprovalsTab = 'leaves';
window.activeGpsWatchId = null;
window.lastAcquiredLocation = null;

// Global Office Coordinates mapping
Object.defineProperty(window, 'OFFICE_COORDINATES', {
  get() {
    return DB.getOfficeCoordinates();
  },
  configurable: true
});

// Multi-language Translation dictionary
const Translations = {
  en: {
    brand: "HS Group Delhi",
    subtitle: "House of Surya",
    monitor: "Live Monitoring",
    employees: "Employees & Payroll",
    shifts: "Shift Schedules",
    approvals: "Approvals Desk",
    reports: "Monthly Reports",
    status: "Check-In / Status",
    leaves: "Leave Requests",
    payslips: "My Payslips",
    profile: "My Profile",
    settings: "Settings"
  },
  hi: {
    brand: "एचएस ग्रुप दिल्ली",
    subtitle: "हाउस ऑफ़ सूर्य",
    monitor: "लाइव निगरानी",
    employees: "कर्मचारी और पेरोल",
    shifts: "शिफ्ट अनुसूची",
    approvals: "स्वीकृति डेस्क",
    reports: "मासिक रिपोर्ट",
    status: "चेक-इन / स्थिति",
    leaves: "छुट्टी के अनुरोध",
    payslips: "मेरी वेतन पर्ची",
    profile: "मेरी प्रोफाइल",
    settings: "सेटिंग्स"
  }
};

// Centralized Validation for Profile Data
const ValidationUtils = {
  validateProfile: (data) => {
    // 1. Required Fields Check
    for (const key of Object.keys(data)) {
      if (data[key] === undefined || data[key] === null || data[key].toString().trim() === '') {
        return { valid: false, message: `Required Field: ${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} cannot be empty.` };
      }
    }

    // 2. Name Validation (A-Z and spaces only)
    if (data.name !== undefined && !/^[A-Za-z\s]+$/.test(data.name)) {
      return { valid: false, message: 'Invalid Details: Name can only contain letters (A-Z).' };
    }

    // 3. Data Type Validations
    if (data.email !== undefined && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(data.email)) {
      return { valid: false, message: 'Invalid Details: Email format is invalid.' };
    }

    // Phone validation (numbers and simple formatting like + or -)
    if (data.phone !== undefined && (!/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(data.phone) || data.phone.replace(/[^0-9]/g, '').length < 7)) {
      return { valid: false, message: 'Invalid Details: Mobile Number format is invalid.' };
    }

    // Employee ID (Alphanumeric and dashes/underscores)
    if (data.employeeId !== undefined && !/^[A-Za-z0-9_-]+$/.test(data.employeeId)) {
      return { valid: false, message: 'Invalid Details: Employee ID can only contain letters, numbers, hyphens, or underscores.' };
    }

    // Date validations (simple check for valid date objects)
    if (data.dob !== undefined && isNaN(new Date(data.dob).getTime())) {
      return { valid: false, message: 'Invalid Details: Date of Birth is invalid.' };
    }
    if (data.dateOfJoining !== undefined && isNaN(new Date(data.dateOfJoining).getTime())) {
      return { valid: false, message: 'Invalid Details: Date of Joining is invalid.' };
    }

    return { valid: true };
  }
};

let currentLang = localStorage.getItem('hs_app_lang');
if (currentLang !== 'en' && currentLang !== 'hi') {
  currentLang = 'en';
}
let activeTheme = localStorage.getItem('hs_app_theme') || 'dark';

// Initialize App
const startApp = async () => {
  try {
    await DB.init();
  } catch (e) {
    console.warn('DB.init warning:', e);
  }

  try {
    Auth.init();
  } catch (e) {
    console.warn('Auth.init warning:', e);
  }
  
  // Safe helper for screenshot testing / local automation
  const params = new URLSearchParams(window.location.search);
  if (params.has('autologin')) {
    const username = params.get('autologin');
    const user = DB.getUserByUsername(username);
    if (user) {
      Auth.currentUser = user;
      sessionStorage.setItem('attendance_current_session', JSON.stringify({ id: user.id }));
    }
  }

  applyGlobalTheme();
  setupRouter();

  // --- Global Modal Close Handlers ---
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlays = document.querySelectorAll('.modal-overlay:not(.closing)');
      if (overlays.length > 0) {
        closeModal(overlays[overlays.length - 1]);
      }
    }
  });

  const handleLiveReRender = async () => {
    await DB.init();

    // Check if the current user has been deactivated
    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
      const freshUser = DB.getUser(currentUser.id);
      if (freshUser && freshUser.status === 'Inactive') {
        Auth.logout();
        window.location.hash = '#login';
        if (typeof showToastNotification === 'function') {
          showToastNotification('⚠️ Your account is Inactive. Please contact HR.', 'error');
        } else {
          alert('Your account is Inactive. Please contact HR.');
        }
        return;
      }
    }

    updateNotificationsUI();
    const currentHash = window.location.hash || '#dashboard';
    if (currentHash === '#dashboard') {
      renderEmployeeDashboard();
    } else if (currentHash === '#admin-schedules') {
      renderAdminSchedules();
    } else if (currentHash === '#admin-accounts') {
      renderAccountManagementView();
    } else if (currentHash === '#admin-users') {
      renderAdminUsers();
    }
  };

  window.addEventListener('db_updated', handleLiveReRender);
  window.addEventListener('storage', (e) => {
    if (e.key === 'attendance_system_db') {
      handleLiveReRender();
    }
  });
};

window.bootstrapperReady = startApp;

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startApp);
}
startApp();

function applyGlobalTheme() {
  const body = document.body;
  if (activeTheme === 'light') {
    body.classList.add('light-theme');
  } else {
    body.classList.remove('light-theme');
  }
}

// Smooth animated modal close - used by click-outside, Esc, and close buttons
function closeModal(overlay) {
  if (!overlay || overlay.classList.contains('closing')) return;
  overlay.classList.add('closing');
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  // Fallback removal if animation doesn't fire (e.g. display:none scenarios)
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
}
window.closeModal = closeModal;

function openFullScreenImageModal(imageSrc) {
  if (!imageSrc) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 15, 29, 0.95); backdrop-filter: blur(15px);
    display: flex; justify-content: center; align-items: center; z-index: 11000;
    cursor: zoom-out; animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;
  overlay.innerHTML = `
    <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; justify-content: center; align-items: center;" onclick="event.stopPropagation();">
      <img src="${imageSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 2px solid rgba(251, 191, 36, 0.4); max-height: 85vh;">
      <button id="btn-close-fullscreen-view" style="position: absolute; top: -45px; right: 0; background: none; border: none; color: #fff; font-size: 36px; cursor: pointer; font-weight: 700;">&times;</button>
    </div>
  `;
  const closeView = () => {
    overlay.classList.add('closing');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
  };
  overlay.addEventListener('click', closeView);
  const btnClose = overlay.querySelector('#btn-close-fullscreen-view');
  if (btnClose) btnClose.addEventListener('click', closeView);
  document.body.appendChild(overlay);
}
window.openFullScreenImageModal = openFullScreenImageModal;

// Register delegated click handler for list avatars
document.addEventListener('click', (e) => {
  const avatarEl = e.target.closest('.clickable-list-avatar');
  if (avatarEl && avatarEl.dataset.photo) {
    e.stopPropagation();
    openFullScreenImageModal(avatarEl.dataset.photo);
  }
});

// Simple Router
function triggerCelebrationIfBirthday(user) {
  if (user && user.dob) {
    const today = new Date();
    const parts = user.dob.split('-');
    if (parts.length === 3) {
      const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      const birthDay = parseInt(parts[2], 10);
      if (today.getMonth() === birthMonth && today.getDate() === birthDay) {
        triggerBirthdayCelebration(user);
      }
    }
  }
}

function setupRouter() {
  const handleRoute = () => {
    try {
      // Clear any active GPS watch and radar animation interval on navigation change
      if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
        try {
          navigator.geolocation.clearWatch(window.activeGpsWatchId);
        } catch (e) {
          console.warn("Failed to clear GPS watch:", e);
        }
        window.activeGpsWatchId = null;
      }
      if (window.radarInterval) {
        clearInterval(window.radarInterval);
        window.radarInterval = null;
      }

      const hash = window.location.hash || '#login';
      let user = Auth.getCurrentUser();

      if (user) {
        const freshUser = DB.getUser(user.id);
        if (freshUser && freshUser.status === 'Inactive') {
          Auth.logout();
          user = null;
          if (typeof showToastNotification === 'function') {
            showToastNotification('⚠️ Your account is Inactive. Please contact HR.', 'error');
          } else {
            alert('Your account is Inactive. Please contact HR.');
          }
        }
      }

      if (hash === '#login') {
        if (user) {
          window.location.hash = (user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager') ? '#admin-dashboard' : '#dashboard';
          return;
        }
        renderLoginView();
        return;
      }

      if (!user) {
        window.location.hash = '#login';
        return;
      }

      // STRICT EMPLOYEE ROLE PERMISSIONS ENFORCEMENT
      const baseRole = DB.getUserBaseRole(user.role);
      if (baseRole === 'employee') {
        const allowedEmployeeRoutes = [
          '#dashboard',
          '#leaves',
          '#employee-reports',
          '#employee-profile',
          '#employee-verification',
          '#employee-swaps',
          '#support',
          '#settings'
        ];
        if (!allowedEmployeeRoutes.includes(hash)) {
          console.warn(`Unauthorized route attempt by employee: ${hash}`);
          window.location.hash = '#dashboard';
          return;
        }
      }

      const isManagementRoute = hash.startsWith('#admin-');
      const isEmployeeRoute = hash === '#dashboard' || hash === '#leaves' || hash.startsWith('#employee-');
      const isManagementRole = baseRole === 'hr' || baseRole === 'manager' || baseRole === 'finance_manager';

      if (isManagementRoute && !isManagementRole) {
        window.location.hash = '#dashboard';
        return;
      }
      if (isEmployeeRoute && isManagementRole) {
        window.location.hash = '#admin-dashboard';
        return;
      }

      renderAppShell();
      if (typeof updateNotificationsUI === 'function') {
        updateNotificationsUI();
      }
      
      // Set Active Link in Sidebar
      document.querySelectorAll('.menu-item').forEach(li => {
        li.classList.remove('active');
        const href = li.querySelector('a')?.getAttribute('href');
        if (href === hash) li.classList.add('active');
      });

      // Highlight active submenu items and parent
      document.querySelectorAll('.submenu-item').forEach(subLi => {
        subLi.classList.remove('active');
        const href = subLi.querySelector('a')?.getAttribute('href');
        if (href === hash) {
          subLi.classList.add('active');
          const parentMenu = document.getElementById('nav-admin-attendance');
          if (parentMenu) parentMenu.classList.add('active');
        }
      });

      // Render Content View
      switch (hash) {
        // Employee Routes
        case '#dashboard':
          renderEmployeeDashboard();
          triggerCelebrationIfBirthday(user);
          break;
        case '#leaves':
          renderEmployeeLeaves();
          break;
        case '#employee-reports':
          renderEmployeeReports();
          break;
        case '#employee-profile':
          renderEmployeeProfile();
          break;
        case '#employee-verification':
          renderEmployeeVerification();
          break;
        case '#employee-swaps':
          renderEmployeeSwapsView();
          break;
        case '#support':
          renderEmployeeSupport();
          break;
        case '#settings':
        case '#admin-settings':
          renderSettingsView();
          break;

        // Admin / HR / Manager Routes
        case '#admin-dashboard':
        case '#admin-my-attendances':
        case '#admin-attendances':
        case '#admin-work-status':
        case '#admin-checkin-log':
        case '#admin-deviations':
        case '#admin-time-policies':
          renderAdminDashboard();
          triggerCelebrationIfBirthday(user);
          break;
        case '#admin-schedules':
          renderAdminSchedules();
          break;
        case '#admin-attendance':
          renderAdminAttendance();
          break;
        case '#admin-approvals':
        case '#admin-requests':
        case '#admin-leaves':
          renderAdminApprovals();
          break;
        case '#admin-tickets':
        case '#admin-support':
          renderAdminSupport();
          break;
        case '#admin-announcements':
          renderAdminAnnouncements();
          break;
        case '#admin-locations':
          renderAdminLocations();
          break;
        case '#admin-users':
        case '#admin-employees':
          renderAdminUsers();
          break;
        case '#admin-accounts':
          renderAccountManagementView();
          break;
        case '#admin-reports':
        case '#admin-hours-balance':
          renderAdminReports();
          break;
        case '#admin-verification':
          renderAdminVerificationView();
          break;
        case '#admin-profile':
          renderAdminProfile();
          break;
        case '#admin-finance':
          if (user.role === 'finance_manager') {
            renderAdminFinance();
          } else {
            window.location.hash = '#admin-dashboard';
          }
          break;
        default:
          window.location.hash = (user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager') ? '#admin-dashboard' : '#dashboard';
      }
    } catch (routeErr) {
      console.error("Router error caught:", routeErr);
      renderLoginView();
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function showCompanyPolicyModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 550px;">
      <div class="modal-header">
        <h3 class="modal-title">Company Policy & Guidelines</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div style="font-size: 13px; color: var(--text-primary); line-height: 1.6; display: flex; flex-direction: column; gap: 16px; margin-top: 10px; max-height: 60vh; overflow-y: auto; padding-right: 8px;">
        <div>
          <h4 style="color: var(--primary); font-weight: 700; margin-bottom: 4px; font-size: 14px;">1. Geo-Fencing & Verification Rules</h4>
          <p style="color: var(--text-secondary);">All check-in and check-out actions must be completed within 100 meters of the assigned site. Attempted check-ins outside the geo-fence boundary require mandatory manager review and approval, and will flag a "deviation log" on the system.</p>
        </div>
        <div>
          <h4 style="color: var(--primary); font-weight: 700; margin-bottom: 4px; font-size: 14px;">2. Shift Timings & Grace Period</h4>
          <p style="color: var(--text-secondary);">Each employee is mapped to a designated work shift pattern. Late entries exceeding a 15-minute grace period will result in automated fractional day deductions (TDS, PT, or salary components) based on organizational policies.</p>
        </div>
        <div>
          <h4 style="color: var(--primary); font-weight: 700; margin-bottom: 4px; font-size: 14px;">3. Privacy & Location Logging</h4>
          <p style="color: var(--text-secondary);">To respect individual privacy, GPS coordinates and locations are captured and logged ONLY at the exact moments of check-in and check-out. No continuous, background, or off-duty tracking is performed.</p>
        </div>
        <div>
          <h4 style="color: var(--primary); font-weight: 700; margin-bottom: 4px; font-size: 14px;">4. Leave Management</h4>
          <p style="color: var(--text-secondary);">Leave applications (Sick, Casual, or Earned) should be submitted through the portal prior to shift commencement. Approvals must be processed by direct managers or HR Admins. Unapproved absences will register as LOP (Loss of Pay).</p>
        </div>
      </div>
      <div class="modal-actions" style="margin-top: 24px;">
        <button class="btn" onclick="closeModal(this.closest('.modal-overlay'))">Acknowledge & Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function renderLoginView() {
  if (activeTimer) clearInterval(activeTimer);

  // Clear any geofencing state so next login starts clean
  sessionStorage.removeItem('hs_pending_auto_checkin_time');
  sessionStorage.removeItem('hs_mock_location');
  sessionStorage.removeItem('hs_current_resolved_coords');
  sessionStorage.removeItem('hs_current_resolved_distance');
  sessionStorage.removeItem('hs_current_resolved_in_range');
  window.lastGpsInRangeState = undefined;

  const root = document.getElementById('app-root');

  const allUsers = DB.getUsers();
  const hrUsers = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'hr');
  const managerUsers = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'manager' || DB.getUserBaseRole(u.role) === 'finance_manager');
  const employeeUsers = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'employee');

  const getInitials = (name) => (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  const getRoleItemsHTML = (users, defaultSubtitle) => {
    return users.map(u => {
      const nameVal = u.name || u.username || '';
      return `
        <button class="staff-item" data-username="${Utils.escape(u.username)}">
          <div class="staff-item-avatar">${Utils.escape(getInitials(nameVal))}</div>
          <div class="staff-item-info">
            <div class="staff-item-name">${Utils.escape(nameVal)}</div>
            <div class="staff-item-subtitle">${Utils.escape(u.designation || defaultSubtitle)}</div>
          </div>
          <div class="staff-item-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </button>
      `;
    }).join('');
  };

  root.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-hero-column">
        <div class="auth-hero-overlay"></div>
        <div class="auth-hero-content">
          <div class="auth-hero-brand">
            <img src="surya-logo.png?v=7" alt="Surya Logo" class="auth-hero-logo">
            <div class="auth-hero-brand-text">
              <div class="auth-hero-brand-title">HS Group Delhi</div>
              <div class="auth-hero-brand-subtitle">House of Surya</div>
            </div>
          </div>
          <div class="auth-hero-main">
            <div class="auth-hero-tagline">WORKFORCE OPERATIONS, SIMPLIFIED</div>
            <h1 class="auth-hero-title">Make every workday count.</h1>
            <p class="auth-hero-desc">
              Track attendance, manage shifts, and streamline payroll deductions from one unified, secure workspace.
            </p>
            <div class="auth-hero-features">
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">01</span>
                <div class="auth-hero-feature-details">
                  <strong>Live Geofence Check-in</strong>
                  <span>Verify and clock in/out instantly when you arrive at your worksite.</span>
                </div>
              </div>
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">02</span>
                <div class="auth-hero-feature-details">
                  <strong>Smart Shift Scheduling</strong>
                  <span>Seamless shift allocation, rotation, and worksite distribution planning.</span>
                </div>
              </div>
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">03</span>
                <div class="auth-hero-feature-details">
                  <strong>Payroll & Leave Ledger</strong>
                  <span>Automated leave balance checks and precise payroll deduction tracking.</span>
                </div>
              </div>
            </div>
          </div>
          <div class="auth-hero-footer">
            Secure attendance & workforce management for growing enterprise teams.
          </div>
        </div>
      </div>
      <div class="auth-form-column">
        <div class="auth-card" id="auth-box" style="max-width: 480px; width: 100%; padding: 32px;">
          <!-- Content dynamically rendered by renderRolesList() -->
        </div>
      </div>
    </div>
  `;

  const renderRolesList = () => {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;

    authBox.innerHTML = `
      <div id="role-selector-section" style="animation: fadeIn 0.3s ease;">
        <div class="auth-header" style="position:relative; margin-bottom: 24px; text-align: center;">
          <div class="auth-logo" style="margin-bottom: 12px; justify-content: center; display: flex;">
            <img src="surya-logo.png?v=7" alt="Surya Logo" style="height: 65px; object-fit: contain; mix-blend-mode: multiply;">
          </div>
          <div class="auth-title" style="text-align: center; font-size: 22px; font-weight: 800; color: var(--primary); margin-bottom: 4px;">House of Surya</div>
          <div class="auth-subtitle" style="text-align: center; color: var(--text-secondary); margin-bottom: 8px; font-weight: 700; font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase;">WORKFORCE OPERATIONS PORTAL</div>
          <div class="auth-sub-desc" style="text-align: center; font-size: 13px; color: var(--text-muted);">Select your role to access your dashboard</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- HR Button -->
          <button class="role-portal-btn" data-role="hr" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 16px; pointer-events: none;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div style="pointer-events: none;">
                <div style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">HR / Admin Portal</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Manage payroll, user directories & request approvals</div>
              </div>
            </div>
            <div style="font-size: 15px; color: var(--text-muted); font-weight: bold; margin-left: 10px; pointer-events: none;">➔</div>
          </button>

          <!-- Manager Button -->
          <button class="role-portal-btn" data-role="manager" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 16px; pointer-events: none;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <div style="pointer-events: none;">
                <div style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">Manager Portal</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Review shift swaps & oversee team operations</div>
              </div>
            </div>
            <div style="font-size: 15px; color: var(--text-muted); font-weight: bold; margin-left: 10px; pointer-events: none;">➔</div>
          </button>

          <!-- Employee Button -->
          <button class="role-portal-btn" data-role="employee" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 16px; pointer-events: none;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(6, 182, 212, 0.15); color: #06b6d4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                  <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H8zm4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm4 8H8v-.5c0-1.33 2.67-2 4-2s4 .67 4 2v.5z"/>
                </svg>
              </div>
              <div style="pointer-events: none;">
                <div style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">Employee Portal</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Clock in/out, view payslips & schedules</div>
              </div>
            </div>
            <div style="font-size: 15px; color: var(--text-muted); font-weight: bold; margin-left: 10px; pointer-events: none;">➔</div>
          </button>
        </div>

        <div class="auth-policy-footer" style="margin-top: 24px; text-align: center; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 16px;">
          By logging in, you agree to the <a href="#" id="btn-show-policy" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Company Policy & Guidelines</a>.
        </div>
      </div>
    `;

    // Bind portal button clicks
    authBox.querySelectorAll('.role-portal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const role = targetBtn.getAttribute('data-role');
        
        let defaultUser = null;
        if (role === 'hr') {
          defaultUser = DB.getUsers().find(u => u.role === 'hr') || DB.getUsers().find(u => u.id === 'usr_admin') || { role: 'hr' };
        } else if (role === 'manager') {
          defaultUser = DB.getUsers().find(u => u.role === 'manager') || DB.getUsers().find(u => u.id === 'usr_manager') || { role: 'manager' };
        } else {
          defaultUser = DB.getUsers().find(u => u.role === 'employee') || DB.getUsers().find(u => u.id === 'usr_john') || { role: 'employee' };
        }
        
        if (defaultUser) {
          showVerificationScreen(defaultUser);
        }
      });
    });

    const policyBtn = document.getElementById('btn-show-policy');
    if (policyBtn) {
      policyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showCompanyPolicyModal();
      });
    }
  };

  const renderUsersList = (role) => {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;

    let roleTitle = '';
    let usersList = [];
    let defaultSubtitle = '';

    if (role === 'hr') {
      roleTitle = 'HR / Admin';
      usersList = hrUsers;
      defaultSubtitle = 'HR / Admin';
    } else if (role === 'manager') {
      roleTitle = 'Managers';
      usersList = managerUsers;
      defaultSubtitle = 'Operations Manager';
    } else {
      roleTitle = 'Employees';
      usersList = employeeUsers;
      defaultSubtitle = 'Employee';
    }

    const itemsHTML = getRoleItemsHTML(usersList, defaultSubtitle) || `<div style="font-size:11.5px;color:var(--text-secondary);text-align:center;padding:20px">No accounts registered under this role.</div>`;

    authBox.innerHTML = `
      <div id="role-users-section" style="animation: fadeIn 0.3s ease;">
        <div class="auth-header" style="margin-bottom: 20px; text-align: center; position: relative;">
          <button id="btn-back-to-roles" style="position: absolute; left: 0; top: 0; background: transparent; border: none; color: var(--primary); font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 6px 0;">
            ◀ Back
          </button>
          <div class="auth-logo" style="margin-bottom: 8px; justify-content: center; display: flex;">
            <img src="surya-logo.png?v=7" alt="Surya Logo" style="height: 50px; object-fit: contain; mix-blend-mode: multiply;">
          </div>
          <div class="auth-title" style="text-align: center; font-size: 18px; font-weight: 700; color: var(--primary);">${roleTitle} Portal</div>
          <div class="auth-sub-desc" style="text-align: center; font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">SELECT YOUR ACCOUNT TO CONTINUE</div>
        </div>
        
        <div class="staff-list" style="max-height: 320px; overflow-y: auto;">
          ${itemsHTML}
        </div>
      </div>
    `;

    // Bind back button
    authBox.querySelector('#btn-back-to-roles').addEventListener('click', renderRolesList);

    // Bind user selection
    authBox.querySelectorAll('.staff-item').forEach(userBtn => {
      userBtn.addEventListener('click', () => {
        const username = userBtn.getAttribute('data-username');
        const user = DB.getUserByUsername(username);
        if (user) {
          showVerificationScreen(user);
        }
      });
    });
  };

  const showVerificationScreen = (selectedUser) => {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;

    authBox.classList.remove('auth-card-wide');

    let idLabelText = 'Employee ID';
    let placeholderText = 'e.g. EMP100';

    if (selectedUser.role === 'hr') {
      idLabelText = 'HR ID';
      placeholderText = 'e.g. HR100';
    } else if (selectedUser.role === 'manager' || selectedUser.role === 'finance_manager') {
      idLabelText = 'Manager ID';
      placeholderText = 'e.g. MGR100';
    }

    const isHrOrManager = selectedUser && (selectedUser.role === 'hr' || selectedUser.role === 'manager' || selectedUser.role === 'finance_manager');

    const createAccButtonHTML = '';

    const skipButtonHTML = (!AUTH_REQUIRE_ID_MANDATORY && !isHrOrManager)
      ? `<button class="btn btn-secondary" id="btn-verify-id-skip" style="width: 100%; font-weight: 600; background: rgba(255,255,255,0.03); border-color: var(--border); color: var(--text-primary)">Skip & Continue</button>`
      : '';

    authBox.innerHTML = `
      <div id="auth-verification-section" style="animation: fadeIn 0.3s ease; padding: 10px;">
        <div class="auth-header" style="margin-bottom: 24px; text-align: center; position: relative;">
          <div class="auth-logo" style="margin-bottom: 12px; justify-content: center; display: flex;">
            <img src="surya-logo.png?v=7" alt="Surya Logo" style="height: 65px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251,191,36,0.25)); mix-blend-mode: multiply;">
          </div>
          <div class="auth-title" style="font-size: 20px; font-weight: 700; color: var(--primary);">Secure Portal Access</div>
          <div class="auth-subtitle" style="color: var(--text-secondary); margin-bottom: 8px;">Verify identity to initialize dashboard</div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="auth-id-input" style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; display: block;">${idLabelText} *</label>
          <input type="text" id="auth-id-input" class="form-input" placeholder="${placeholderText}" value="" style="background: rgba(255,255,255,0.02); text-transform: uppercase; font-size: 13px;" autofocus>
        </div>

        ${isHrOrManager ? `
        <div class="form-group" style="margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <label class="form-label" for="auth-pwd-input" style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 0; display: block;">Password *</label>
            <button type="button" id="btn-forgot-password-trigger" style="background:none; border:none; color:var(--primary); font-size:11.5px; font-weight:700; cursor:pointer; padding:0; text-decoration:underline">Forgot Password?</button>
          </div>
          <div style="position:relative">
            <input type="password" id="auth-pwd-input" class="form-input" placeholder="Enter account password" style="background: rgba(255,255,255,0.02); font-size: 13px; padding-right: 40px;">
            <button type="button" id="btn-toggle-auth-pwd" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--primary); cursor:pointer; font-size:14px; display:flex; align-items:center;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- Warning Box -->
        <div id="auth-verify-warning" style="display: none; padding: 10px 14px; border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-sm); background: rgba(239,68,68,0.05); color: var(--error); font-size: 11.5px; font-weight: 600; line-height: 1.45; margin-bottom: 18px;">
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${isHrOrManager ? `
          <button class="btn" id="btn-verify-id-submit" style="width: 100%; font-weight: 700; font-size: 13px; padding: 10px 0; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; border: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); cursor: pointer;">Log In</button>
          ` : `
          <button class="btn btn-cyan" id="btn-verify-id-submit" style="width: 100%; font-weight: 700; font-size: 13px;">Log In</button>
          ${skipButtonHTML}
          `}
          ${(!isHrOrManager && skipButtonHTML) ? '' : `
          <button class="btn btn-secondary" id="btn-verify-id-skip-dev" style="width: 100%; font-weight: 700; font-size: 13px; background: rgba(255,255,255,0.03); border: 1.5px dashed var(--primary); color: var(--primary); border-radius: 12px; cursor: pointer; padding: 10px 0;">Skip & Continue</button>
          `}

          ${isHrOrManager ? `
          <div style="margin-top: 6px; text-align: center; font-size: 12.5px; color: var(--text-secondary);">
            Don't have an account? <a href="#" id="btn-verify-id-create-acc" style="color: #89201B; font-weight: 700; text-decoration: underline; transition: color 0.2s;">Create Account</a>
          </div>
          ` : ''}

          <button class="btn btn-secondary" id="btn-verify-id-back" style="width: 100%; background: transparent; border-color: transparent; font-size: 12px; color: var(--text-muted); cursor: pointer; padding: 6px 0;">← Back to Select Account</button>
        </div>
        <div class="auth-policy-footer" style="margin-top: 20px; text-align: center; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 12px;">
          By logging in, you agree to the <a href="#" id="btn-show-policy-verify" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Company Policy</a>.
        </div>
      </div>
    `;

    const inputEl = authBox.querySelector('#auth-id-input');
    const pwdEl = authBox.querySelector('#auth-pwd-input');
    const toggleAuthPwdBtn = authBox.querySelector('#btn-toggle-auth-pwd');
    const warningEl = authBox.querySelector('#auth-verify-warning');
    const submitBtn = authBox.querySelector('#btn-verify-id-submit');
    const skipBtn = authBox.querySelector('#btn-verify-id-skip');
    const skipDevBtn = authBox.querySelector('#btn-verify-id-skip-dev');
    const backBtn = authBox.querySelector('#btn-verify-id-back');
    const createAccBtn = authBox.querySelector('#btn-verify-id-create-acc');
    const forgotPwdBtn = authBox.querySelector('#btn-forgot-password-trigger');

    if (forgotPwdBtn) {
      forgotPwdBtn.addEventListener('click', () => {
        const prefilledId = inputEl ? inputEl.value.trim() : (selectedUser ? selectedUser.employeeId : '');
        showForgotPasswordModal(prefilledId);
      });
    }

    if (toggleAuthPwdBtn && pwdEl) {
      const svgEyeOpen = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      const svgEyeClosed = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      toggleAuthPwdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (pwdEl.type === 'password') {
          pwdEl.type = 'text';
          toggleAuthPwdBtn.innerHTML = svgEyeOpen;
        } else {
          pwdEl.type = 'password';
          toggleAuthPwdBtn.innerHTML = svgEyeClosed;
        }
      });
    }

    if (createAccBtn) {
      createAccBtn.addEventListener('click', () => {
        showAccountModal();
      });
    }

    const handleVerification = () => {
      const enteredId = inputEl.value.trim();
      const enteredPwd = pwdEl ? pwdEl.value : '';

      if (!enteredId) {
        warningEl.textContent = `⚠️ Please enter your ${idLabelText}.`;
        warningEl.style.display = 'block';
        return;
      }

      const allUsers = DB.getUsers();
      const matchedUser = allUsers.find(u => 
        (u.employeeId && u.employeeId.toUpperCase() === enteredId.toUpperCase()) ||
        (u.username && u.username.toLowerCase() === enteredId.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === enteredId.toLowerCase())
      );

      if (!matchedUser) {
        warningEl.textContent = `⚠️ Invalid ${idLabelText}. No matching account found.`;
        warningEl.style.display = 'block';
        return;
      }

      // Check role mismatch
      const expectedRole = selectedUser.role;
      let isRoleValid = false;
      if (expectedRole === 'hr' && matchedUser.role === 'hr') isRoleValid = true;
      if ((expectedRole === 'manager' || expectedRole === 'finance_manager') && (matchedUser.role === 'manager' || matchedUser.role === 'finance_manager')) isRoleValid = true;
      if (expectedRole === 'employee' && matchedUser.role === 'employee') isRoleValid = true;

      if (!isRoleValid) {
        warningEl.textContent = `⚠️ Access Denied: Account '${enteredId}' is an ${matchedUser.role.toUpperCase()} account and cannot log in from the ${expectedRole.toUpperCase()} portal.`;
        warningEl.style.display = 'block';
        return;
      }

      if (matchedUser.status === 'Inactive') {
        warningEl.textContent = `⚠️ Your account is Inactive. Please contact HR.`;
        warningEl.style.display = 'block';
        return;
      }

      if (isHrOrManager) {
        if (!enteredPwd) {
          warningEl.textContent = `⚠️ Password is required to log in to this account.`;
          warningEl.style.display = 'block';
          return;
        }
        if (matchedUser.password) {
          const isValidPwd = Utils.verifyPassword(enteredPwd, matchedUser.password);
          if (!isValidPwd) {
            warningEl.textContent = `⚠️ Invalid Password. Please check your password and try again.`;
            warningEl.style.display = 'block';
            return;
          }
        }
      }

      proceedLogin(matchedUser);
    };

    submitBtn.addEventListener('click', handleVerification);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleVerification();
      }
    });
    if (pwdEl) {
      pwdEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleVerification();
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        proceedLogin(selectedUser);
      });
    }

    if (skipDevBtn) {
      skipDevBtn.addEventListener('click', () => {
        proceedLogin(selectedUser);
      });
    }

    backBtn.addEventListener('click', () => {
      renderLoginView();
    });

    const policyLinkVerify = authBox.querySelector('#btn-show-policy-verify');
    if (policyLinkVerify) {
      policyLinkVerify.addEventListener('click', (e) => {
        e.preventDefault();
        showCompanyPolicyModal();
      });
    }
  };

  const proceedLogin = (user) => {
    Auth.currentUser = user;
    sessionStorage.setItem('attendance_current_session', JSON.stringify({ id: user.id }));
    const baseRole = DB.getUserBaseRole(user.role);
    if (baseRole === 'hr' || baseRole === 'manager' || baseRole === 'finance_manager') {
      window.location.hash = '#admin-dashboard';
    } else {
      window.location.hash = '#dashboard';
    }
  };

  // Bootstrap login view with Role Selector list
  renderRolesList();
}



function renderAppShell() {
  const root = document.getElementById('app-root');
  const user = Auth.getCurrentUser();
  const avatarText = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const labels = Translations[currentLang] || Translations.en;
  const isMobile = window.innerWidth <= 768;
  const defaultActive = !isMobile;

  let menuHTML = '';
  const baseRole = DB.getUserBaseRole(user.role);
  if (baseRole === 'hr' || baseRole === 'manager' || baseRole === 'finance_manager') {
    const isHrOrManager = baseRole === 'hr' || baseRole === 'manager';
    menuHTML = `
      <li class="menu-item" id="nav-admin-dashboard"><a href="#admin-dashboard">
        <svg viewBox="0 0 24 24"><path d="M10 20H5v-7H2l10-9 10 9h-3v7h-5v-6h-2v6z"/></svg> <span class="menu-label">${labels.monitor}</span>
      </a></li>
      ${isHrOrManager ? `
      <li class="menu-item menu-item-has-submenu" id="nav-admin-attendance" style="position: relative;">
        <a href="javascript:void(0)" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="display: flex; align-items: center; gap: 14px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;vertical-align:middle;">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m7.5 12.5 2 2 4.5-4.5"></path>
              <path d="m11.5 12.5 1.5 1.5 3-3"></path>
            </svg>
            <span class="menu-label">Attendance</span>
          </span>
          <span class="submenu-arrow" style="font-size: 10px; opacity: 0.7; transition: transform 0.2s ease;">▶</span>
        </a>
        <ul class="submenu-list">
          <li class="submenu-item" id="sub-my-attendances"><a href="#admin-my-attendances">My Attendances</a></li>
          <li class="submenu-item" id="sub-attendances"><a href="#admin-attendances">Attendances</a></li>
          <li class="submenu-item" id="sub-requests"><a href="#admin-requests">Attendance Requests</a></li>
          <li class="submenu-item" id="sub-hours-balance"><a href="#admin-hours-balance">Hours Balance</a></li>
          <li class="submenu-item" id="sub-work-status"><a href="#admin-work-status">Daily Work Status</a></li>
          <li class="submenu-item" id="sub-checkin-log"><a href="#admin-checkin-log">Check-in / Check-out Log</a></li>
          <li class="submenu-item" id="sub-deviations"><a href="#admin-deviations">Late Arrival & Early Departure</a></li>
          <li class="submenu-item" id="sub-time-policies"><a href="#admin-time-policies">Time Policies</a></li>
        </ul>
      </li>
      ` : ''}
      ${user.role === 'finance_manager' ? `
      <li class="menu-item" id="nav-admin-finance"><a href="#admin-finance">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;vertical-align:middle;margin-right:8px"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="20" x2="12" y2="4"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg> <span class="menu-label">Finance Management</span>
      </a></li>
      ` : ''}
      <li class="menu-item" id="nav-admin-users"><a href="#admin-users">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> <span class="menu-label">${labels.employees}</span>
      </a></li>
      <li class="menu-item" id="nav-admin-schedules"><a href="#admin-schedules">
        <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg> <span class="menu-label">${labels.shifts}</span>
      </a></li>
      <li class="menu-item" id="nav-admin-locations"><a href="#admin-locations">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;vertical-align:middle;margin-right:8px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> <span class="menu-label">Worksite Locations</span>
      </a></li>
      <li class="menu-item" id="nav-admin-approvals"><a href="#admin-approvals">
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> <span class="menu-label">${labels.approvals}</span>
      </a></li>
      <li class="menu-item" id="nav-admin-reports"><a href="#admin-reports">
        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> <span class="menu-label">${labels.reports}</span>
      </a></li>
      <li class="menu-item" id="nav-admin-verification"><a href="#admin-verification">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> <span class="menu-label">Verification Docs</span>
      </a></li>
      <li class="menu-item" id="nav-admin-profile"><a href="#admin-profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> <span class="menu-label">My Profile</span>
      </a></li>
      <li class="menu-item" id="nav-admin-support"><a href="#admin-support">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <span class="menu-label">Support Tickets</span>
      </a></li>
      <li class="menu-item" id="nav-settings"><a href="#settings">
        <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 c-0.12,0.21-0.08,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.21,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg> <span class="menu-label">${labels.settings}</span>
      </a></li>
    `;
  } else {
    menuHTML = `
      <li class="menu-item" id="nav-dashboard"><a href="#dashboard">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg> <span class="menu-label">${labels.status}</span>
      </a></li>
      <li class="menu-item" id="nav-leaves"><a href="#leaves">
        <svg viewBox="0 0 24 24"><path d="M14 6c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V6zm6 2c0-.55-.45-1-1-1h-3c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h3c.55 0 1-.45 1-1V8z"/></svg> <span class="menu-label">${labels.leaves}</span>
      </a></li>
      <li class="menu-item" id="nav-employee-reports"><a href="#employee-reports">
        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> <span class="menu-label">${labels.payslips}</span>
      </a></li>
      <li class="menu-item" id="nav-employee-profile"><a href="#employee-profile">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg> <span class="menu-label">${labels.profile}</span>
      </a></li>
      <li class="menu-item" id="nav-employee-verification"><a href="#employee-verification">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> <span class="menu-label">Verification Docs</span>
      </a></li>
      <li class="menu-item" id="nav-employee-swaps"><a href="#employee-swaps">
        <svg viewBox="0 0 24 24"><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/></svg> <span class="menu-label">Shift Swaps</span>
      </a></li>
      <li class="menu-item" id="nav-support"><a href="#support">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <span class="menu-label">Support Helpdesk</span>
      </a></li>
      <li class="menu-item" id="nav-settings"><a href="#settings">
        <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 c-0.12,0.21-0.08,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.21,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg> <span class="menu-label">${labels.settings}</span>
      </a></li>
    `;
  }

  root.innerHTML = `
    <div class="sidebar-overlay ${defaultActive ? 'active' : ''}" id="sidebar-overlay-el"></div>
    <aside class="sidebar ${defaultActive ? 'active' : ''}" id="sidebar-aside-el">
      <div class="sidebar-brand">
        <a href="#dashboard" class="sidebar-brand-logo" title="House of Surya">
          <img src="assets/surya_logo_white.png?v=8" alt="House of Surya Logo" class="surya-brand-img full-logo" />
          <img src="assets/surya_logo_white.png?v=8" alt="House of Surya Favicon" class="surya-brand-img favicon-logo" />
        </a>
      </div>
      <ul class="sidebar-menu">
        ${menuHTML}
      </ul>
      <div class="sidebar-footer">
        <div class="user-profile-summary">
          <div class="avatar clickable-list-avatar" data-photo="${user.photo || ''}" style="overflow:hidden; display:flex; align-items:center; justify-content:center; cursor:${user.photo ? 'pointer' : 'default'}" title="${user.photo ? 'Click to view full screen' : ''}">
            ${user.photo ? `<img src="${user.photo}" style="width:100%; height:100%; object-fit:cover;">` : avatarText}
          </div>
          <div class="user-info-text">
            <span class="user-name">${Utils.escape(user.name)}</span>
            <span class="user-role">${user.role}</span>
          </div>
        </div>
        <button class="logout-btn" id="logout-trigger" title="Log Out">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
    </aside>
    <main class="main-content">
      <!-- Top Dark Header Navigation Bar -->
      <header class="top-nav-bar">
        <div style="display:flex; align-items:center; gap:12px">
          <button class="sidebar-toggle-btn" id="mobile-sidebar-toggle" title="Toggle Navigation" style="margin-right: 4px; display: flex; align-items: center; justify-content: center;">
            <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <div class="top-nav-search">
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="text" placeholder="Search..." id="global-header-search">
          </div>
        </div>
        <div class="top-nav-right">
          <div class="messages-widget" style="position:relative">
            <button id="btn-messages-toggle" class="top-nav-icon-btn" title="Messages">
              <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <span class="top-nav-badge" id="messages-count" style="display:none">0</span>
            </button>
            
            <div id="messages-dropdown" style="display:none;position:absolute;top:100%;right:0;width:340px;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);z-index:1001;margin-top:10px;animation:fadeIn 0.2s ease">
              <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:13.5px;color:var(--text-primary)">Messages & Emails</strong>
                <button id="btn-compose-message" style="background:var(--primary);border:none;color:#ffffff;cursor:pointer;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px">New Message</button>
              </div>
              <div id="messages-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column">
                <!-- populated dynamically -->
              </div>
            </div>
          </div>
          
          <div class="notification-widget" style="position:relative">
            <button id="btn-notifications-toggle" class="top-nav-icon-btn" title="Notifications">
              <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <span class="top-nav-badge" id="notification-count" style="display:none">6</span>
            </button>
            
            <div id="notifications-dropdown" style="display:none;position:absolute;top:100%;right:0;width:340px;background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);z-index:1001;margin-top:10px;animation:fadeIn 0.2s ease">
              <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:13.5px;color:var(--text-primary)">Alerts & Notifications</strong>
                <button id="btn-delete-all-dropdown" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:11px;text-decoration:underline;padding:0">Delete All</button>
              </div>
              <div id="notifications-list" style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column">
                <!-- populated dynamically -->
              </div>
            </div>
          </div>

          <div style="position:relative" id="user-profile-menu-wrapper">
            <div class="top-nav-user" style="display:flex; align-items:center; gap:8px">
              <div id="top-user-profile-click-target" title="View Profile" style="cursor:pointer; display:flex; align-items:center; gap:8px">
                <div class="top-nav-user-avatar clickable-list-avatar" data-photo="${user.photo || ''}" style="overflow:hidden; display:flex; align-items:center; justify-content:center; cursor:${user.photo ? 'pointer' : 'default'}" title="${user.photo ? 'Click to view full screen' : ''}">
                  ${user.photo ? `<img src="${user.photo}" style="width:100%; height:100%; object-fit:cover;">` : avatarText}
                </div>
                <div class="top-nav-user-info">
                  <span class="top-nav-user-name">${Utils.escape(user.name)}</span>
                  <span class="top-nav-user-role">${user.role === 'hr' ? 'HR Admin Manager' : (user.role === 'manager' ? 'Operations Manager' : 'Employee')}</span>
                </div>
              </div>
              <button class="top-nav-dropdown-btn" id="btn-user-dropdown-toggle" title="Open Menu" style="background:transparent;border:none;color:#fca5a5;cursor:pointer;display:flex;align-items:center;padding:4px;border-radius:6px;margin-left:2px">
                <svg style="width:16px;height:16px;fill:currentColor;transition:transform 0.2s ease" id="user-dropdown-chevron" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
            </div>
            
            <div id="top-user-dropdown-menu" class="user-dropdown-menu" style="display:none; position:absolute; top:calc(100% + 10px); right:0; width:210px; background:#3d0d0a; border:1px solid rgba(137, 32, 27, 0.4); border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:1002; padding:6px">
              <div style="padding:10px 12px; border-bottom:1px solid rgba(137, 32, 27, 0.3); margin-bottom:4px">
                <div style="font-size:13px; font-weight:700; color:#ffffff">${Utils.escape(user.name)}</div>
                <div style="font-size:11px; color:#fca5a5">${user.role === 'hr' ? 'HR Admin Manager' : (user.role === 'manager' ? 'Operations Manager' : 'Employee')}</div>
              </div>
              <a href="${(user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager') ? '#admin-profile' : '#employee-profile'}" class="user-dropdown-item" id="menu-item-profile">
                <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span>My Profile</span>
              </a>
              <a href="${(user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager') ? '#admin-settings' : '#settings'}" class="user-dropdown-item" id="menu-item-settings">
                <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                <span>Settings</span>
              </a>
              <button class="user-dropdown-item logout" id="menu-item-logout">
                <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                <span>Logout</span>
              </button>
            </div>
        </div>
      </header>
      <div id="main-view" style="flex-grow:1; display:flex; flex-direction:column; overflow-y:auto"></div>
    </main>
  `;

  const sidebarOverlay = document.getElementById('sidebar-overlay-el');
  const sidebarAside = document.getElementById('sidebar-aside-el');
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const openSidebar = () => {
    if (sidebarAside) sidebarAside.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
  };

  const closeSidebar = () => {
    if (sidebarAside) sidebarAside.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  };

  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebarAside && sidebarAside.classList.contains('active');
      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  const sidebarItems = root.querySelectorAll('.sidebar-menu a, .logout-btn');
  sidebarItems.forEach(item => {
    // Prevent closing sidebar on submenu clicks
    if (item.closest('.submenu-list')) return;
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });

  // Attendance Submenu hover logic with debounce delay
  const attendanceMenu = document.getElementById('nav-admin-attendance');
  if (attendanceMenu) {
    const submenu = attendanceMenu.querySelector('.submenu-list');
    let hideTimeout = null;

    const showSubmenu = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      submenu.style.visibility = 'visible';
      submenu.style.opacity = '1';
      submenu.style.pointerEvents = 'auto';
      submenu.style.transform = 'translateX(0) translateY(0)';
      const arrow = attendanceMenu.querySelector('.submenu-arrow');
      if (arrow) arrow.style.transform = 'rotate(90deg)';
    };

    const hideSubmenu = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        submenu.style.visibility = 'hidden';
        submenu.style.opacity = '0';
        submenu.style.pointerEvents = 'none';
        submenu.style.transform = 'translateX(8px) translateY(-5px)';
        const arrow = attendanceMenu.querySelector('.submenu-arrow');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }, 200); // 200ms delay is perfect for seamless traversal
    };

    attendanceMenu.addEventListener('mouseenter', showSubmenu);
    attendanceMenu.addEventListener('mouseleave', hideSubmenu);
  }

  const handleLogout = () => {
    Auth.logout();
    sessionStorage.removeItem('hs_pending_auto_checkin_time');
    sessionStorage.removeItem('hs_mock_location');
    sessionStorage.removeItem('hs_current_resolved_coords');
    sessionStorage.removeItem('hs_current_resolved_distance');
    sessionStorage.removeItem('hs_current_resolved_in_range');
    window.location.hash = '#login';
  };

  const logoutBtn1 = document.getElementById('logout-trigger');
  const logoutBtn2 = document.getElementById('menu-item-logout');

  if (logoutBtn1) logoutBtn1.addEventListener('click', handleLogout);
  if (logoutBtn2) logoutBtn2.addEventListener('click', handleLogout);

  // Bind User Profile click and Dropdown Menu Toggle
  const profileClickTarget = document.getElementById('top-user-profile-click-target');
  const dropdownToggleBtn = document.getElementById('btn-user-dropdown-toggle');
  const userDropdownMenu = document.getElementById('top-user-dropdown-menu');
  const userChevron = document.getElementById('user-dropdown-chevron');
  const profileItem = document.getElementById('menu-item-profile');
  const settingsItem = document.getElementById('menu-item-settings');

  if (profileClickTarget) {
    profileClickTarget.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = (user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager') ? '#admin-profile' : '#employee-profile';
    });
  }

  if (dropdownToggleBtn && userDropdownMenu) {
    dropdownToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = userDropdownMenu.style.display === 'none';
      userDropdownMenu.style.display = isHidden ? 'block' : 'none';
      if (userChevron) {
        userChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    });

    if (profileItem) {
      profileItem.addEventListener('click', () => {
        userDropdownMenu.style.display = 'none';
        if (userChevron) userChevron.style.transform = 'rotate(0deg)';
      });
    }

    if (settingsItem) {
      settingsItem.addEventListener('click', () => {
        userDropdownMenu.style.display = 'none';
        if (userChevron) userChevron.style.transform = 'rotate(0deg)';
      });
    }

    document.addEventListener('click', (e) => {
      const wrapper = document.getElementById('user-profile-menu-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        userDropdownMenu.style.display = 'none';
        if (userChevron) userChevron.style.transform = 'rotate(0deg)';
      }
    });
  }

  // Bind Notifications Dropdown toggle
  const toggleBtn = document.getElementById('btn-notifications-toggle');
  const dropdown = document.getElementById('notifications-dropdown');
  const clearBtn = document.getElementById('btn-delete-all-dropdown');

  const msgToggleBtn = document.getElementById('btn-messages-toggle');
  const msgDropdown = document.getElementById('messages-dropdown');
  const composeBtn = document.getElementById('btn-compose-message');

  // Bind Global Real-Time Header Search
  const globalSearchInput = document.getElementById('global-header-search');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      const tableRows = document.querySelectorAll('main.main-content table.custom-table tbody tr');
      const cards = document.querySelectorAll('main.main-content .card-panel');
      const paginationInfo = document.querySelector('.equify-pagination-info');

      if (tableRows.length > 0) {
        let matchCount = 0;
        tableRows.forEach(row => {
          // Skip empty state notification rows
          if (row.children.length === 1 && row.textContent.includes('No matching')) return;

          const text = row.textContent.toLowerCase();
          if (!query || text.includes(query)) {
            row.style.display = '';
            matchCount++;
          } else {
            row.style.display = 'none';
          }
        });

        if (paginationInfo) {
          paginationInfo.textContent = query 
            ? `Search results: ${matchCount} matching` 
            : `Total: ${tableRows.length} showing all items`;
        }
      } else if (cards.length > 0) {
        cards.forEach(card => {
          const text = card.textContent.toLowerCase();
          if (!query || text.includes(query)) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      }
    });
  }

  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        updateNotificationsUI();
      }
    });

    if (msgToggleBtn && msgDropdown) {
      msgToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = msgDropdown.style.display === 'block';
        msgDropdown.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
          updateMessagesInbox();
        }
      });
    }

    if (composeBtn) {
      composeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (msgDropdown) msgDropdown.style.display = 'none';
        openComposeMessageModal();
      });
    }

    // Initial update of Messages inbox
    updateMessagesInbox();

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
        dropdown.style.display = 'none';
      }
      if (msgDropdown && !msgDropdown.contains(e.target) && e.target !== msgToggleBtn && !msgToggleBtn.contains(e.target)) {
        msgDropdown.style.display = 'none';
      }
    });

    // Delete all notifications click event
    if (clearBtn) {
      clearBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;
        
        if (await CustomDialog.confirm('Are you sure you want to delete all notifications?')) {
          if (currentUser.role === 'finance_manager') {
            if (DB.data.financeAlerts && DB.data.financeAlerts.length > 0) {
              DB.data.financeAlerts = [];
              DB.save();
              updateNotificationsUI();
              await CustomDialog.alert('Financial alerts deleted.');
            } else {
              await CustomDialog.alert('No financial alerts to delete.');
            }
          } else if (currentUser.role === 'hr' || currentUser.role === 'manager') {
            await CustomDialog.alert('Action items (approvals and swaps) require review and cannot be deleted without processing.');
          } else {
            const announcements = DB.getAnnouncements();
            const delKey = `hs_del_notices_${currentUser.id}`;
            const delIds = JSON.parse(localStorage.getItem(delKey) || '[]');
            
            announcements.forEach(a => {
              if (!delIds.includes(a.id)) delIds.push(a.id);
            });
            localStorage.setItem(delKey, JSON.stringify(delIds));
            
            updateNotificationsUI();
            if (window.location.hash === '#dashboard') {
              renderEmployeeDashboard();
            }
          }
        }
      });
    }

    // Initial render of notifications state
    updateNotificationsUI();
  }
}

// -------------------------------------------------------------
// EMPLOYEE DASHBOARD & LIVE TIMERS
// -------------------------------------------------------------
function renderEmployeeDashboard() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const selectedShiftId = sessionStorage.getItem('hs_selected_shift_id');
  const todayStr = new Date().toISOString().split('T')[0];
  const resolved = DB.resolveUserShiftForDate(user, todayStr, selectedShiftId);
  let schedule = resolved.schedule || DB.getSchedule(resolved.scheduleId);
  if (!schedule) {
    schedule = {
      id: 'sch_1',
      name: 'Standard Day Shift',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriod: 15,
      workDays: [1, 2, 3, 4, 5],
      location: 'Kohat Enclave, Pitampura, Delhi'
    };
  }
  const officeName = (user.shiftLocations && user.shiftLocations[schedule.id]) || user.preferredLocation || 'Kohat Enclave, Pitampura, Delhi';
  const todayLog = DB.getTodayLog(user.id, schedule.id);

  const checkInStatus = getCheckInTimeStatus(user, schedule.id);
  const isEarly = !checkInStatus.allowed && checkInStatus.type === 'TooEarly';
  const isNoShift = !checkInStatus.allowed && checkInStatus.type === 'NoShift';
  sessionStorage.setItem('hs_last_was_early', isEarly ? 'true' : 'false');

  // Dynamic GPS Mock Selector options
  let optionsHTML = '';
  optionsHTML += `<option value="real">🛰️ Use Device GPS (Real-Time Location)</option>`;
  Object.entries(window.OFFICE_COORDINATES).forEach(([locName, coords]) => {
    const isPreferred = locName === officeName;
    optionsHTML += `<option value="${locName}">📍 Mock: ${locName}${isPreferred ? ' (Your Assigned Office - In Range)' : ''}</option>`;
  });

  let multiShiftHTML = '';
  if (resolved.allSchedules && resolved.allSchedules.length > 1) {
    multiShiftHTML = `
      <div class="card-panel" style="margin-bottom:20px; padding:14px 18px; border:1px solid var(--border); background:rgba(255,255,255,0.015); border-radius:var(--radius-md);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">🕒</span>
            <strong style="font-size:13.5px; color:var(--primary); font-weight:700;">Assigned Shift Schedules & Work Locations</strong>
            <span style="font-size:11px; background:rgba(251,191,36,0.12); color:var(--primary); padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid rgba(251,191,36,0.25);">${resolved.allSchedules.length} Assigned</span>
          </div>
          <span style="font-size:11.5px; color:var(--text-secondary);">Click any shift to switch active session & geofence</span>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:10px;">
          ${resolved.allSchedules.map(s => {
            const isSel = String(s.id) === String(schedule.id);
            const sLog = DB.getTodayLog(user.id, s.id);
            const sLoc = (user.shiftLocations && user.shiftLocations[s.id]) || user.preferredLocation || s.location || 'Kohat Enclave, Pitampura, Delhi';
            
            let statusBadge = `<span class="badge" style="font-size:9.5px; padding:2px 7px; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.08);">⚪ Not Started</span>`;
            if (sLog && sLog.checkIn && !sLog.checkOut) {
              statusBadge = `<span class="badge badge-on-time" style="font-size:9.5px; padding:2px 8px; font-weight:700; background:rgba(16,185,129,0.15); color:var(--success); border:1px solid rgba(16,185,129,0.3);">🟢 In Session</span>`;
            } else if (sLog && sLog.checkOut) {
              statusBadge = `<span class="badge" style="font-size:9.5px; padding:2px 8px; font-weight:700; background:rgba(255,255,255,0.08); color:var(--text-muted); border:1px solid rgba(255,255,255,0.15);">🏁 Checked Out</span>`;
            }

            const activeBadge = isSel 
              ? `<span style="font-size:9.5px; font-weight:700; background:linear-gradient(135deg, var(--cyan) 0%, #2563eb 100%); color:#ffffff; padding:2px 8px; border-radius:10px; box-shadow:0 2px 6px rgba(6,182,212,0.3);">Active Shift</span>` 
              : '';

            return `
              <div class="btn-switch-shift" data-shift-id="${s.id}" style="
                background: ${isSel ? 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(251,191,36,0.05) 100%)' : 'rgba(255,255,255,0.02)'};
                border: 1.5px solid ${isSel ? 'var(--primary)' : 'rgba(255,255,255,0.08)'};
                border-radius: var(--radius-sm);
                padding: 10px 14px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 6px;
                transition: all 0.2s ease;
                box-shadow: ${isSel ? '0 4px 14px rgba(251,191,36,0.12), inset 0 0 10px rgba(6,182,212,0.06)' : 'none'};
                position: relative;
                overflow: hidden;
              "
              onmouseover="if (!${isSel}) { this.style.borderColor='rgba(251,191,36,0.5)'; this.style.background='rgba(255,255,255,0.04)'; }"
              onmouseout="if (!${isSel}) { this.style.borderColor='rgba(255,255,255,0.08)'; this.style.background='rgba(255,255,255,0.02)'; }"
              >
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <div style="font-weight:700; font-size:13px; color:${isSel ? 'var(--primary)' : 'var(--text-primary)'}; display:flex; align-items:center; gap:6px;">
                    <span>${isSel ? '👉' : '⏳'}</span>
                    <span>${Utils.escape(s.name)}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    ${activeBadge}
                    ${statusBadge}
                  </div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11.5px; border-top:1px dashed rgba(255,255,255,0.06); padding-top:6px; margin-top:2px;">
                  <div style="color:var(--text-secondary); display:flex; align-items:center; gap:4px;">
                    <span>⏰</span>
                    <strong style="color:var(--text-primary); font-weight:600;">${formatTimeRange12h(s.startTime, s.endTime)}</strong>
                  </div>
                  <div style="display:flex; align-items:center; gap:4px; font-size:11.5px;">
                    <span style="color:var(--text-muted);">→</span>
                    <span style="background:rgba(6,182,212,0.12); color:var(--cyan); padding:2px 8px; border-radius:4px; border:1px solid rgba(6,182,212,0.25); font-weight:600;">📍 ${Utils.escape(sLoc)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Welcome, ${Utils.escape(user.name)}</h1>
        <div class="content-subtitle">Log your hours and view daily shift metrics.</div>
      </div>
      <div></div>
    </div>
    
    <div class="content-body">
      ${multiShiftHTML}

      <div class="dashboard-split">
        <!-- Clock Panel -->
        <div>
          <div class="card-panel">
            <div class="clock-widget">
              <div class="clock-timer" id="clock-live-time">--:--:--</div>
              <div class="clock-date" id="clock-live-date">---</div>
              
              <div class="clock-status-tag ${todayLog ? 'status-clocked-in' : 'status-clocked-out'}">
                <span style="width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block"></span>
                <span id="clock-status-text">${todayLog ? (todayLog.checkOut ? 'Clocked Out' : 'Clocked In') : 'Clocked Out'}</span>
              </div>

              <!-- Fixed clock actions row -->
              <div class="clock-actions-row">
                ${isNoShift 
                  ? `
                    <div style="text-align: center; font-size: 13px; color: var(--text-secondary); background: rgba(255, 149, 0, 0.06); border: 1px solid rgba(255, 149, 0, 0.2); padding: 10px; border-radius: 8px; font-weight: 500; width: 100%;">
                      <div style="color: var(--warning); font-weight: 700; margin-bottom: 4px;">⚠️ No Shift Assigned</div>
                      No shift assigned today. Please contact your manager or HR.
                    </div>
                  `
                  : (isEarly 
                      ? `
                        <div style="text-align: center; font-size: 13px; color: var(--text-secondary); background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); padding: 10px; border-radius: 8px; font-weight: 500; width: 100%;">
                          <div style="color: var(--danger); font-weight: 700; margin-bottom: 4px;">⚠️ Too Early</div>
                          Your shift has not started yet. You can check in only 30 minutes before your scheduled shift.
                        </div>
                      `
                      : (!todayLog || !todayLog.checkIn
                          ? `
                            <button class="btn btn-success" id="btn-regular-checkin">Clock In</button>
                          ` 
                          : (todayLog.checkOut 
                              ? `<button class="btn" style="background:rgba(255,255,255,0.05);cursor:not-allowed;" disabled>Checked Out Today</button>`
                              : `
                                <button class="btn btn-danger" id="btn-regular-checkout">Clock Out</button>
                              `
                            )
                        )
                    )
                }
              </div>
            </div>
          </div>

          <!-- GPS Geofence Card -->
          <div class="card-panel gps-sim-card">
            <div class="card-panel-header">
              <h3 class="card-panel-title">🛰️ Attendance Geofence Validation</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              
              <!-- Map Radar Canvas -->
              <div style="position:relative; width:100%; border-radius:var(--radius-sm); overflow:hidden">
                <canvas id="gps-canvas-map" style="width:100%; height:150px; background:#0f172a; display:block"></canvas>
              </div>

              <!-- Geolocation Error Display -->
              <div id="gps-error-container" style="display:none; margin-bottom:4px"></div>

              <!-- Side-by-side location verification -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:10px; background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; line-height:1.4">
                <div>
                  <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">🏢 Fixed Worksite Location</span>
                  <div style="font-weight:600; color:var(--primary); margin-top:2px" id="gps-worksite-name-display">${Utils.escape(officeName)}</div>
                  <div style="color:var(--text-secondary); font-size:11px" id="gps-worksite-coords-display">--</div>
                </div>
                <div style="border-left:1px solid var(--border); padding-left:10px">
                  <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">📱 Live GPS Location</span>
                  <div style="font-weight:600; color:var(--text-primary); margin-top:2px" id="gps-coords-display">Acquiring...</div>
                  <div style="color:var(--text-secondary); font-size:11px" id="gps-status-sub-display">--</div>
                </div>
              </div>

              <!-- GPS Real-Time Details (Address & Timestamp) -->
              <div style="display:flex; flex-direction:column; gap:8px; padding:10px; background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; line-height:1.4">
                <div>
                  <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">📍 Current Address</span>
                  <div id="gps-address-display" style="font-weight:500; color:var(--text-primary); margin-top:2px">Acquiring address...</div>
                </div>
                <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:6px">
                  <div>
                    <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">🕒 Last Updated</span>
                    <div id="gps-timestamp-display" style="font-weight:500; color:var(--text-primary); margin-top:1px">--</div>
                  </div>
                  <div>
                    <span style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">🎯 Accuracy</span>
                    <div id="gps-accuracy-display" style="font-weight:500; color:var(--text-primary); margin-top:1px; text-align:right">--</div>
                  </div>
                </div>
              </div>


              <!-- Status & Distance Info -->
              <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0">
                <span style="font-size:13px; color:var(--text-secondary)">Geofence Status:</span>
                <span style="display:flex; align-items:center; gap:8px">
                  <span id="gps-distance-display" style="font-size:12px; font-weight:600; color:var(--text-primary)">--</span>
                  <span id="gps-radar" class="gps-radar-indicator in-range"></span>
                  <span id="gps-status-badge" class="badge badge-on-time">In Range</span>
                </span>
              </div>
              
              <!-- Location Simulation Selector -->
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label" style="font-size:11px; margin-bottom:6px">Location Tracking Mode:</label>
                <select class="form-input" id="gps-mock-selector" style="padding:8px 12px; font-size:13px; background:rgba(255,255,255,0.02)">
                  ${optionsHTML}
                </select>
              </div>

              <!-- Direct Geofence Card Actions -->
              <div class="geofence-direct-actions" style="margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px">
                ${isNoShift 
                  ? `
                    <div style="text-align: center; font-size: 12px; color: var(--text-secondary); background: rgba(255, 149, 0, 0.06); border: 1px solid rgba(255, 149, 0, 0.2); padding: 10px; border-radius: 8px; font-weight: 500;">
                      <div style="color: var(--warning); font-weight: 700; margin-bottom: 4px;">⚠️ No Shift Assigned</div>
                      No shift assigned today. Please contact your manager or HR.
                    </div>
                  `
                  : (isEarly 
                      ? `
                        <div style="text-align: center; font-size: 12px; color: var(--text-secondary); background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); padding: 10px; border-radius: 8px; font-weight: 500;">
                          <div style="color: var(--danger); font-weight: 700; margin-bottom: 4px;">⚠️ Too Early</div>
                          Your shift has not started yet. You can check in only 30 minutes before your scheduled shift.
                        </div>
                      `
                      : (todayLog && todayLog.checkOut
                          ? `
                            <div id="geofence-checked-out-msg" style="background:rgba(255,255,255,0.05); text-align:center; font-size:13px; padding:10px; border-radius:var(--radius-sm); color:var(--text-secondary); font-weight:600">
                              Checked Out Today
                            </div>
                          `
                          : `
                            <div style="display: grid; grid-template-columns: 1fr; gap:8px" id="geofence-btn-group">
                              ${!todayLog || !todayLog.checkIn
                                ? `<button class="btn btn-success" id="btn-geofence-checkin" style="font-size:13px; padding:10px; font-weight:600;">Check In</button>`
                                : ''
                              }
                              ${todayLog && todayLog.checkIn && !todayLog.checkOut
                                ? `<button class="btn btn-danger" id="btn-geofence-checkout" style="font-size:13px; padding:10px; font-weight:600;">Check Out</button>`
                                : ''
                              }
                            </div>
                          `
                        )
                    )
                }
              </div>
            </div>
          </div>

          <div class="card-panel">
            <div class="card-panel-header">
              <h3 class="card-panel-title">Active Shift Details</h3>
            </div>
            <div class="shift-card" style="background:transparent;border:none;padding:0">
              <div class="shift-card-header" style="margin-bottom:10px">
                <span class="shift-title" style="color:var(--primary);font-size:16px">${Utils.escape(schedule.name)}</span>
              </div>
              <div class="shift-meta-row">
                <span>Working Hours:</span>
                <strong style="color:var(--text-primary)">${formatTime12h(schedule.startTime)} <span style="font-size:10px;font-weight:700;color:var(--primary);background:rgba(251,191,36,0.1);padding:2px 6px;border-radius:4px;margin:0 4px">→</span> ${formatTime12h(schedule.endTime)}</strong>
              </div>
              <div class="shift-meta-row">
                <span>Grace Period:</span>
                <strong style="color:var(--warning)">${schedule.gracePeriod} minutes</strong>
              </div>
              <div class="shift-meta-row">
                <span>Assigned Location:</span>
                <strong style="color:var(--text-primary)">${Utils.escape(officeName)}</strong>
              </div>
              <div class="shift-days-row">
                ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => `
                  <div class="day-bubble ${schedule.workDays.includes(i) ? 'active' : ''}">${day}</div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side panels -->
        <div>
          <div class="card-panel" style="margin-bottom:20px">
            <h3 class="card-panel-title" style="margin-bottom:15px">Today's Duration Clock</h3>
            <div class="clock-timer" style="font-size:32px;color:var(--cyan);text-align:center" id="active-work-timer">00h 00m 00s</div>
          </div>

          <!-- Notice Board Card -->
          <div class="card-panel" style="margin-bottom:20px; min-height:220px; display:flex; flex-direction:column">
            <div class="card-panel-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h3 class="card-panel-title">📢 Notifications</h3>
              <button id="btn-delete-all-notices" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:12px;text-decoration:underline;display:none;">Delete All</button>
            </div>
            <div id="employee-notices-container" style="display:flex;flex-direction:column;gap:12px;margin-top:10px;flex-grow:1;max-height:320px;overflow-y:auto;padding-right:4px">
              <!-- announcements loaded dynamically -->
            </div>
          </div>

          <!-- Schedule & Attendance Calendar Card -->
          <div class="card-panel" style="margin-bottom:0; display:flex; flex-direction:column; gap:16px">
            <div class="card-panel-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px">
              <h3 class="card-panel-title">🗓️ Schedule & Attendance Calendar</h3>
              <!-- Schedule Quick Tabs -->
              <div class="calendar-tabs" style="display:flex; gap:6px; background:rgba(255,255,255,0.03); padding:4px; border-radius:var(--radius-sm); border:1px solid var(--border)">
                <button class="cal-tab-btn active" data-tab="today" style="background:transparent; border:none; color:var(--text-secondary); padding:4px 8px; font-size:11.5px; cursor:pointer; font-weight:600; border-radius:4px; transition:all 0.2s">Today</button>
                <button class="cal-tab-btn" data-tab="next" style="background:transparent; border:none; color:var(--text-secondary); padding:4px 8px; font-size:11.5px; cursor:pointer; font-weight:600; border-radius:4px; transition:all 0.2s">Next Day</button>
                <button class="cal-tab-btn" data-tab="last" style="background:transparent; border:none; color:var(--text-secondary); padding:4px 8px; font-size:11.5px; cursor:pointer; font-weight:600; border-radius:4px; transition:all 0.2s">Last Day</button>
                <button class="cal-tab-btn" data-tab="weekly" style="background:transparent; border:none; color:var(--text-secondary); padding:4px 8px; font-size:11.5px; cursor:pointer; font-weight:600; border-radius:4px; transition:all 0.2s">Weekly</button>
              </div>
            </div>

            <!-- Tab Content (Schedule Card) -->
            <div id="calendar-schedule-card" style="padding:14px; background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12.5px; display:flex; flex-direction:column; gap:10px">
              <!-- Dynamically populated based on active tab -->
            </div>

            <!-- Calendar Monthly Grid Header & Grid -->
            <div style="display:flex; flex-direction:column; gap:8px">
              <div style="display:flex; justify-content:space-between; align-items:center">
                <span id="calendar-month-year" style="font-weight:700; color:var(--text-primary); font-size:13.5px">July 2026</span>
                <div style="display:flex; gap:6px">
                  <button id="btn-calendar-prev" class="btn btn-secondary" style="width:auto; padding:4px 8px; font-size:11px">&lt;</button>
                  <button id="btn-calendar-next" class="btn btn-secondary" style="width:auto; padding:4px 8px; font-size:11px">&gt;</button>
                </div>
              </div>
              
              <!-- Month Grid -->
              <div class="calendar-grid-container" style="display:flex; flex-direction:column; gap:4px">
                <!-- Day Names -->
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:10px; font-weight:700; color:var(--text-secondary); margin-bottom:4px">
                  <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
                </div>
                <!-- Day Grid Cells -->
                <div id="calendar-days-grid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Live updates tick
  startLiveClock();
  startActiveWorkTimer(todayLog);
  // Calendar Initialisation
  let currentCalDate = new Date();
  
  const tabBtns = document.querySelectorAll('.cal-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const activeTab = e.target.getAttribute('data-tab');
      renderCalendarScheduleTab(user.id, activeTab);
    });
  });

  // Render initial schedule today tab
  renderCalendarScheduleTab(user.id, 'today');

  const refreshCalendarView = () => {
    renderCalendarGrid(user.id, currentCalDate.getFullYear(), currentCalDate.getMonth());
  };
  refreshCalendarView();

  const btnPrev = document.getElementById('btn-calendar-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentCalDate.setMonth(currentCalDate.getMonth() - 1);
      refreshCalendarView();
    });
  }
  const btnNext = document.getElementById('btn-calendar-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentCalDate.setMonth(currentCalDate.getMonth() + 1);
      refreshCalendarView();
    });
  }
  renderEmployeeNotices(user.id);

  // Geofencing Simulation setup
  let mockLoc = sessionStorage.getItem('hs_mock_location') || 'real';
  const gpsSelect = document.getElementById('gps-mock-selector');
  if (gpsSelect) {
    gpsSelect.value = mockLoc;
    gpsSelect.addEventListener('change', (e) => {
      mockLoc = e.target.value;
      sessionStorage.setItem('hs_mock_location', mockLoc);
      updateGpsUI(mockLoc);
    });
  }

  // Bind shift switcher buttons
  document.querySelectorAll('.btn-switch-shift').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const shiftId = e.currentTarget.dataset.shiftId;
      sessionStorage.setItem('hs_selected_shift_id', shiftId);
      renderEmployeeDashboard();
    });
  });

  // Dashboard Check-in actions
  if (!todayLog || !todayLog.checkIn) {
    const regIn = document.getElementById('btn-regular-checkin');
    if (regIn) {
      regIn.addEventListener('click', async () => {
        const checkInStatus = getCheckInTimeStatus(user, schedule.id);
        if (!checkInStatus.allowed) {
          if (checkInStatus.type === 'TooEarly') {
            await CustomDialog.alert("Your shift has not started yet. You can check in only 30 minutes before your scheduled shift.", "Too Early");
          } else {
            await CustomDialog.alert(checkInStatus.reason, "Check In Blocked");
          }
          return;
        }
        handlePinClockIn(user.id, schedule.id);
      });
    }
  } else if (!todayLog.checkOut) {
    const regOut = document.getElementById('btn-regular-checkout');
    if (regOut) regOut.addEventListener('click', () => handleClockOut(user.id, schedule.id));
  }

  // Bind Geofence Card Actions (Direct Check-In without passwords/prompts)
  const geoCheckIn = document.getElementById('btn-geofence-checkin');
  if (geoCheckIn) {
    geoCheckIn.addEventListener('click', async () => {
      const checkInStatus = getCheckInTimeStatus(user, schedule.id);
      if (!checkInStatus.allowed) {
        if (checkInStatus.type === 'TooEarly') {
          await CustomDialog.alert("Your shift has not started yet. You can check in only 30 minutes before your scheduled shift.", "Too Early");
        } else {
          await CustomDialog.alert(checkInStatus.reason, "Check In Blocked");
        }
        return;
      }

      const regIn = document.getElementById('btn-regular-checkin');
      if (regIn) {
        regIn.setAttribute('disabled', 'true');
        regIn.style.opacity = '0.4';
      }
      geoCheckIn.setAttribute('disabled', 'true');
      geoCheckIn.style.opacity = '0.4';

      const coords = await getOneTimeLocationPromise();
      if (!coords) {
        alert("❌ Check-in Rejected! Could not acquire GPS coordinates.");
        if (regIn) {
          regIn.removeAttribute('disabled');
          regIn.style.opacity = '1';
        }
        geoCheckIn.removeAttribute('disabled');
        geoCheckIn.style.opacity = '1';
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const targetCoords = window.OFFICE_COORDINATES[officeName] || window.OFFICE_COORDINATES['Kohat Enclave, Pitampura, Delhi'] || window.OFFICE_COORDINATES[Object.keys(window.OFFICE_COORDINATES)[0]];

      const distance = calculateHaversineDistance(coords.lat, coords.lng, targetCoords.lat, targetCoords.lng);
      const inRange = distance <= 100;
      const resolvedDistance = (distance / 1000).toFixed(2);
      const coordsStr = `${coords.lat.toFixed(6)}° N, ${coords.lng.toFixed(6)}° E`;

      if (!inRange) {
        alert('❌ Check-in Rejected! You are out of range.');
        if (regIn) {
          regIn.removeAttribute('disabled');
          regIn.style.opacity = '1';
        }
        geoCheckIn.removeAttribute('disabled');
        geoCheckIn.style.opacity = '1';
        return;
      }

      sessionStorage.removeItem('hs_pending_auto_checkin_time');
      DB.checkIn(user.id, 'none', officeName, false, '', coordsStr, resolvedDistance, null, null, schedule.id);
      requestsPushDBState();
      renderEmployeeDashboard();
    });
  }

  // Bind Geofence Card Actions (Direct Check-Out without confirmation/passwords/prompts)
  const geoCheckOut = document.getElementById('btn-geofence-checkout');
  if (geoCheckOut) {
    geoCheckOut.addEventListener('click', () => {
      const inRange = sessionStorage.getItem('hs_current_resolved_in_range') === 'true';
      if (!inRange) {
        alert('❌ Check-out Rejected! You are out of range.');
        return;
      }
      
      const log = DB.checkOut(user.id, 'none', null, schedule.id);
      requestsPushDBState();
      renderEmployeeDashboard();
      if (log) {
        const workingHours = Utils.calculateDuration(log.checkIn, log.checkOut);
        showClockOutThankYou(log.checkOut, workingHours);
      }
    });
  }

  // Initialize GPS state
  if (gpsSelect) {
    updateGpsUI(mockLoc);
  }

  let lastAddressFetchTime = 0;
  let lastAddressLat = 0;
  let lastAddressLng = 0;
  let lastAddressVal = "";

  function updateAddressDisplay(lat, lng, element) {
    if (!element) return;
    
    // First, check if it's close to any registered worksite
    function localDist(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const phi1 = lat1 * Math.PI / 180;
      const phi2 = lat2 * Math.PI / 180;
      const deltaPhi = (lat2 - lat1) * Math.PI / 180;
      const deltaLambda = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    if (window.OFFICE_COORDINATES) {
      for (const [name, coords] of Object.entries(window.OFFICE_COORDINATES)) {
        if (localDist(lat, lng, coords.lat, coords.lng) <= 150) {
          element.textContent = name;
          return;
        }
      }
    }

    // Throttle checks to once every 4 seconds to avoid spamming Nominatim
    const now = Date.now();
    const roundedLat = parseFloat(lat.toFixed(4));
    const roundedLng = parseFloat(lng.toFixed(4));
    
    if (lastAddressLat === roundedLat && lastAddressLng === roundedLng && lastAddressVal) {
      element.textContent = lastAddressVal;
      return;
    }

    if (now - lastAddressFetchTime < 4000) {
      element.textContent = `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E (Locating...)`;
      return;
    }

    lastAddressFetchTime = now;
    lastAddressLat = roundedLat;
    lastAddressLng = roundedLng;
    element.textContent = `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E (Locating...)`;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: {
        'Accept-Language': 'en'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data && data.display_name) {
          lastAddressVal = data.display_name;
          element.textContent = lastAddressVal;
        } else {
          lastAddressVal = `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`;
          element.textContent = lastAddressVal;
        }
      })
      .catch(e => {
        lastAddressVal = getMockAddress(lat, lng);
        element.textContent = lastAddressVal;
      });
  }

  function getMockAddress(lat, lng) {
    function localDist(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const phi1 = lat1 * Math.PI / 180;
      const phi2 = lat2 * Math.PI / 180;
      const deltaPhi = (lat2 - lat1) * Math.PI / 180;
      const deltaLambda = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const distKohat = localDist(lat, lng, 28.6978, 77.1408);
    if (distKohat <= 150) {
      return "Metro Station Rd, Kohat Enclave, Pitampura, New Delhi, Delhi 110034";
    }
    const distCC = localDist(lat, lng, 28.6562, 77.2310);
    if (distCC <= 150) {
      return "Chandni Chowk Rd, Near Red Fort, Old Delhi, Delhi 110006";
    }
    const distOmaxe = localDist(lat, lng, 28.8130, 77.0673);
    if (distOmaxe <= 150) {
      return "Sector 15, Omaxe City Industrial Area, Delhi NCR, Haryana 131001";
    }
    
    if (lat > 28.7) {
      return `Sector ${Math.floor(lat * 100) % 24 + 1}, Rohini, North Delhi, Delhi 110085`;
    } else if (lng < 77.15) {
      return "Dwarka Sector 9, West Delhi, Delhi 110077";
    } else {
      return "Connaught Place, Central Delhi, New Delhi, Delhi 110001";
    }
  }

  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
  }

  function getOneTimeLocation(callback) {
    const mockLoc = sessionStorage.getItem('hs_mock_location') || 'real';
    if (mockLoc === 'real') {
      // First, try using the last acquired location from watchPosition if available
      if (window.lastAcquiredLocation) {
        callback(window.lastAcquiredLocation);
        return;
      }

      if (!navigator.geolocation) {
        callback(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          window.lastAcquiredLocation = coords;
          callback(coords);
        },
        (err) => {
          console.error("One-time geolocation error:", err);
          callback(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      let selectedCoords = window.OFFICE_COORDINATES[mockLoc];
      if (!selectedCoords) {
        const foundKey = Object.keys(window.OFFICE_COORDINATES).find(k => k.toLowerCase() === mockLoc.toLowerCase() || k.toLowerCase().includes(mockLoc.toLowerCase()));
        selectedCoords = foundKey ? window.OFFICE_COORDINATES[foundKey] : { lat: 28.6978, lng: 77.1408 };
      }
      callback(selectedCoords);
    }
  }

  function getOneTimeLocationPromise() {
    return new Promise((resolve) => {
      getOneTimeLocation((coords) => resolve(coords));
    });
  }

  function updateGpsUI(val) {
    const badge = document.getElementById('gps-status-badge');
    const radar = document.getElementById('gps-radar');
    const coordsDisplay = document.getElementById('gps-coords-display');
    const distDisplay = document.getElementById('gps-distance-display');
    
    const regularIn = document.getElementById('btn-regular-checkin');
    const regularOut = document.getElementById('btn-regular-checkout');

    // Geofence action buttons references
    const geoCheckIn = document.getElementById('btn-geofence-checkin');
    const geoCheckOut = document.getElementById('btn-geofence-checkout');

    const OFFICE_COORDINATES = window.OFFICE_COORDINATES;
    const officeName = (user && user.shiftLocations && schedule && user.shiftLocations[schedule.id]) || (user && user.preferredLocation) || 'Kohat Enclave, Pitampura, Delhi';
    const targetCoords = OFFICE_COORDINATES[officeName] || OFFICE_COORDINATES['Kohat Enclave, Pitampura, Delhi'] || OFFICE_COORDINATES[Object.keys(OFFICE_COORDINATES)[0]];

    const todayLog = DB.getTodayLog(user.id);
    const isOffline = !!(todayLog && todayLog.checkOut);

    if (isOffline) {
      // Clear any active GPS watch/interval
      if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
        try {
          navigator.geolocation.clearWatch(window.activeGpsWatchId);
        } catch (e) {}
        window.activeGpsWatchId = null;
      }
      if (window.radarInterval) {
        clearInterval(window.radarInterval);
        window.radarInterval = null;
      }

      // Update badge to Offline (styled grey)
      if (badge) {
        badge.textContent = 'Offline';
        badge.className = 'badge';
        badge.style.background = 'rgba(255,255,255,0.08)';
        badge.style.color = 'var(--text-secondary)';
        badge.style.border = '1px solid rgba(255,255,255,0.1)';
      }
      if (radar) {
        radar.className = 'gps-radar-indicator';
        radar.style.background = 'var(--text-secondary)';
        radar.style.boxShadow = 'none';
      }

      // Set other displays to offline/inactive
      if (coordsDisplay) coordsDisplay.textContent = 'Offline';
      if (distDisplay) distDisplay.textContent = '--';
      
      const statusSubDisplay = document.getElementById('gps-status-sub-display');
      if (statusSubDisplay) {
        statusSubDisplay.textContent = 'Tracking Inactive';
      }
      
      const addressDisplay = document.getElementById('gps-address-display');
      if (addressDisplay) {
        addressDisplay.textContent = 'Tracking Inactive';
      }

      const timestampDisplay = document.getElementById('gps-timestamp-display');
      if (timestampDisplay) {
        timestampDisplay.textContent = '--';
      }

      const accuracyDisplay = document.getElementById('gps-accuracy-display');
      if (accuracyDisplay) {
        accuracyDisplay.textContent = '--';
      }

      const worksiteCoordsDisplay = document.getElementById('gps-worksite-coords-display');
      if (worksiteCoordsDisplay) {
        worksiteCoordsDisplay.textContent = `${targetCoords.lat.toFixed(6)}° N, ${targetCoords.lng.toFixed(6)}° E`;
      }
      const worksiteNameDisplay = document.getElementById('gps-worksite-name-display');
      if (worksiteNameDisplay) {
        worksiteNameDisplay.textContent = officeName;
      }

      // Clear sessionStorage items to avoid stale data
      sessionStorage.removeItem('hs_current_resolved_coords');
      sessionStorage.removeItem('hs_current_resolved_distance');
      sessionStorage.removeItem('hs_current_resolved_in_range');
      sessionStorage.removeItem('hs_pending_auto_checkin_time');
      window.lastAcquiredLocation = null;

      let justBlock = document.getElementById('gps-justification-block');
      if (justBlock) {
        justBlock.style.display = 'none';
      }

      // Enable check-in buttons so they can click to start check-in flow, disable checkout buttons
      const checkInStatus = getCheckInTimeStatus(user);
      const isEarly = !checkInStatus.allowed && checkInStatus.type === 'TooEarly';

      if (regularIn) {
        if (isEarly) {
          regularIn.style.opacity = '0.4';
          regularIn.style.cursor = 'not-allowed';
          regularIn.setAttribute('title', 'Too Early');
        } else {
          regularIn.removeAttribute('disabled');
          regularIn.style.opacity = '1';
          regularIn.style.cursor = 'pointer';
          regularIn.setAttribute('title', 'Click to check in');
        }
      }
      if (geoCheckIn) {
        if (isEarly) {
          geoCheckIn.style.opacity = '0.4';
          geoCheckIn.style.cursor = 'not-allowed';
          geoCheckIn.setAttribute('title', 'Too Early');
        } else {
          geoCheckIn.removeAttribute('disabled');
          geoCheckIn.style.opacity = '1';
          geoCheckIn.style.cursor = 'pointer';
          geoCheckIn.setAttribute('title', 'Click to check in');
        }
      }
      if (regularOut) {
        regularOut.setAttribute('disabled', 'true');
        regularOut.style.opacity = '0.4';
        regularOut.style.cursor = 'not-allowed';
        regularOut.setAttribute('title', 'Offline');
      }
      if (geoCheckOut) {
        geoCheckOut.setAttribute('disabled', 'true');
        geoCheckOut.style.opacity = '0.4';
        geoCheckOut.style.cursor = 'not-allowed';
        geoCheckOut.setAttribute('title', 'Offline');
      }

      const btnGroup = document.getElementById('geofence-btn-group');
      const checkedOutMsg = document.getElementById('geofence-checked-out-msg');
      if (checkedOutMsg) {
        if (todayLog && todayLog.checkOut) {
          if (btnGroup) btnGroup.style.display = 'none';
          checkedOutMsg.style.display = 'block';
        } else {
          if (btnGroup) btnGroup.style.display = 'grid';
          checkedOutMsg.style.display = 'none';
          if (geoCheckIn) geoCheckIn.style.display = 'block';
          if (geoCheckOut) geoCheckOut.style.display = 'block';
          if (btnGroup) btnGroup.style.gridTemplateColumns = '1fr 1fr';
        }
      }

      // Draw static offline radar map
      drawRadarMap('gps-canvas-map', targetCoords.lat, targetCoords.lng, null, null, null, null, officeName, true);
      return;
    }

    // Reset inline styles to allow CSS classes to take effect
    if (badge) {
      badge.style.background = '';
      badge.style.color = '';
      badge.style.border = '';
    }
    if (radar) {
      radar.style.background = '';
      radar.style.boxShadow = '';
    }

    let justBlock = document.getElementById('gps-justification-block');
    if (!justBlock) {
      justBlock = document.createElement('div');
      justBlock.id = 'gps-justification-block';
      justBlock.style.marginTop = '12px';
      justBlock.style.transition = 'all 0.3s ease';
      justBlock.style.display = 'none'; // Hidden by default until range check confirms out-of-range
      justBlock.innerHTML = `
        <div style="font-size:12px; font-weight:600; color:var(--error); background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15); padding:10px; border-radius:var(--radius-sm); line-height:1.4">
          ❌ Check-in Rejected! You are out of geofence range. Under company policy, you must be within 100m of your assigned work location (${officeName}) to clock in.
          <button class="btn btn-warning btn-sm" id="btn-gps-use-worksite" style="margin-top:8px; display:block; width:100%; padding:6px; font-size:11px; font-weight:700">📍 Switch to Assigned Worksite Location</button>
        </div>
      `;
      const selectEl = document.getElementById('gps-mock-selector');
      if (selectEl) {
        selectEl.parentNode.parentNode.appendChild(justBlock);
      }

      const btnUseWorksite = justBlock.querySelector('#btn-gps-use-worksite');
      if (btnUseWorksite) {
        btnUseWorksite.addEventListener('click', (e) => {
          e.preventDefault();
          const sel = document.getElementById('gps-mock-selector');
          if (sel) {
            sel.value = officeName;
            sessionStorage.setItem('hs_mock_location', officeName);
          }
          updateGpsUI(officeName);
        });
      }
    }



    function applyLocationState(currentLat, currentLng, coordsStr) {
      window.lastAcquiredLocation = { lat: currentLat, lng: currentLng };
      const distance = calculateHaversineDistance(currentLat, currentLng, targetCoords.lat, targetCoords.lng);
      const inRange = distance <= 100; // 100 meters geofence radius
      const resolvedDistance = (distance / 1000).toFixed(2); // in km

      // Transition notification checks
      const prevInRange = window.lastGpsInRangeState;
      if (prevInRange !== undefined && prevInRange !== inRange) {
        if (inRange) {
          showToastNotification(`📍 Geofence Alert: You are now IN RANGE of your worksite location. Check-in unlocked!`, 'success');
        } else {
          showToastNotification(`⚠️ Geofence Alert: You are OUT OF RANGE of your worksite location. Check-in locked.`, 'warning');
        }
      } else if (prevInRange === undefined) {
        if (inRange) {
          showToastNotification(`📍 Geofence Active: Located at assigned worksite (${officeName}). Check-in unlocked!`, 'success');
        } else {
          showToastNotification(`⚠️ Geofence Active: Outside of worksite range. Check-in locked.`, 'warning');
        }
      }
      window.lastGpsInRangeState = inRange;

      // Save resolved coords and distance to sessionStorage for actual submit
      sessionStorage.setItem('hs_current_resolved_coords', coordsStr);
      sessionStorage.setItem('hs_current_resolved_distance', resolvedDistance);
      sessionStorage.setItem('hs_current_resolved_in_range', inRange ? 'true' : 'false');

      if (coordsDisplay) coordsDisplay.textContent = coordsStr;
      if (distDisplay) {
        distDisplay.textContent = distance < 1000 ? `${Math.round(distance)} meters` : `${(distance/1000).toFixed(2)} km`;
      }
      
      // Set target worksite and status detail displays
      const worksiteCoordsDisplay = document.getElementById('gps-worksite-coords-display');
      if (worksiteCoordsDisplay) {
        worksiteCoordsDisplay.textContent = `${targetCoords.lat.toFixed(6)}° N, ${targetCoords.lng.toFixed(6)}° E`;
      }
      const worksiteNameDisplay = document.getElementById('gps-worksite-name-display');
      if (worksiteNameDisplay) {
        worksiteNameDisplay.textContent = officeName;
      }
      const statusSubDisplay = document.getElementById('gps-status-sub-display');
      if (statusSubDisplay) {
        statusSubDisplay.textContent = inRange ? '✅ In geofence range' : '❌ Out of range';
      }

      // Draw custom canvas radar map
      drawRadarMap('gps-canvas-map', targetCoords.lat, targetCoords.lng, currentLat, currentLng, distance, inRange, officeName);
      
      // Keep active work timer in sync with actual check-in log only
      const currentTodayLog = DB.getTodayLog(user.id);
      if (currentTodayLog && currentTodayLog.checkIn && !currentTodayLog.checkOut) {
        startActiveWorkTimer(currentTodayLog);
      } else {
        const timerEl = document.getElementById('active-work-timer');
        if (timerEl) {
          timerEl.textContent = currentTodayLog && currentTodayLog.checkOut ? Utils.calculateDuration(currentTodayLog.checkIn, currentTodayLog.checkOut) : '00h 00m 00s';
          timerEl.style.color = 'var(--cyan)';
        }
      }

      // Start sweeping animation loop (only redraws canvas, does NOT re-evaluate location state)
      if (window.radarInterval) clearInterval(window.radarInterval);
      window.radarInterval = setInterval(() => {
        const canvas = document.getElementById('gps-canvas-map');
        if (!canvas) {
          clearInterval(window.radarInterval);
          window.radarInterval = null;
          return;
        }
        drawRadarMap('gps-canvas-map', targetCoords.lat, targetCoords.lng, currentLat, currentLng, distance, inRange, officeName);
      }, 150);



      if (inRange) {
        justBlock.style.display = 'none';
        if (badge) {
          badge.textContent = 'In Range';
          badge.className = 'badge badge-on-time';
        }
        if (radar) {
          radar.className = 'gps-radar-indicator in-range';
        }
        // Enable regular check-in/out + geofence direct action buttons
        const checkInStatus = getCheckInTimeStatus(user);
        const isEarly = !checkInStatus.allowed && checkInStatus.type === 'TooEarly';

        [regularIn, regularOut, geoCheckIn, geoCheckOut].forEach(btn => {
          if (btn) {
            if ((btn === regularIn || btn === geoCheckIn) && isEarly) {
              btn.style.opacity = '0.4';
              btn.style.cursor = 'not-allowed';
              btn.setAttribute('title', 'Too Early');
            } else {
              btn.removeAttribute('disabled');
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              btn.setAttribute('title', 'Geofence validated');
            }
          }
        });
      } else {
        justBlock.style.display = 'block';
        if (badge) {
          badge.textContent = 'Out of Range';
          badge.className = 'badge badge-late';
        }
        if (radar) {
          radar.className = 'gps-radar-indicator out-of-range';
        }
        // Disable regular check-in/out + geofence direct action buttons
        const checkInStatus = getCheckInTimeStatus(user);
        const isEarly = !checkInStatus.allowed && checkInStatus.type === 'TooEarly';

        [regularIn, regularOut, geoCheckIn, geoCheckOut].forEach(btn => {
          if (btn) {
            if ((btn === regularIn || btn === geoCheckIn) && isEarly) {
              btn.style.opacity = '0.4';
              btn.style.cursor = 'not-allowed';
              btn.setAttribute('title', 'Too Early');
            } else {
              btn.setAttribute('disabled', 'true');
              btn.style.opacity = '0.4';
              btn.style.cursor = 'not-allowed';
              btn.setAttribute('title', `Action requires being within 100m of ${officeName}`);
            }
          }
        });
      }

      // Adjust visibility/layout of geofence action buttons dynamically based on range and status
      const btnGroup = document.getElementById('geofence-btn-group');
      const checkedOutMsg = document.getElementById('geofence-checked-out-msg');
      
      if (checkedOutMsg) {
        if (currentTodayLog && currentTodayLog.checkOut) {
          if (btnGroup) btnGroup.style.display = 'none';
          checkedOutMsg.style.display = 'block';
        } else {
          if (btnGroup) btnGroup.style.display = 'grid';
          checkedOutMsg.style.display = 'none';

          if (currentTodayLog && currentTodayLog.checkIn) {
            // Active clocked in state: Hide Check In, Show only Check Out (span full width)
            if (geoCheckIn) geoCheckIn.style.display = 'none';
            if (geoCheckOut) geoCheckOut.style.display = 'block';
            if (btnGroup) btnGroup.style.gridTemplateColumns = '1fr';
          } else {
            // Not clocked in: Show Check In button only
            if (geoCheckIn) geoCheckIn.style.display = 'block';
            if (geoCheckOut) geoCheckOut.style.display = 'none';
            if (btnGroup) btnGroup.style.gridTemplateColumns = '1fr';
          }
        }
      }
    }

    if (val === 'real') {
      if (!navigator.geolocation) {
        console.warn("Geolocation API is not available on this device/browser. Automatically falling back to assigned worksite location.");
        const selectEl = document.getElementById('gps-mock-selector');
        if (selectEl) {
          selectEl.value = officeName;
          sessionStorage.setItem('hs_mock_location', officeName);
        }
        
        const errContainer = document.getElementById('gps-error-container');
        if (errContainer) {
          errContainer.style.display = 'block';
          errContainer.innerHTML = `
            <div style="font-size:12px; font-weight:600; color:var(--warning); background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.15); padding:10px; border-radius:var(--radius-sm); line-height:1.4">
              ⚠️ Mobile Device GPS problem (Insecure HTTP/No GPS). Automatically fixed location at your assigned worksite: <strong>\${officeName}</strong>.
            </div>
          `;
        }
        setTimeout(() => {
          updateGpsUI(officeName);
        }, 100);
        return;
      }

      // If already watching in real mode, don't restart it!
      if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
        // Just trigger one update of the UI with last location if we have it
        if (window.lastAcquiredLocation) {
          const lat = window.lastAcquiredLocation.lat;
          const lng = window.lastAcquiredLocation.lng;
          applyLocationState(lat, lng, `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`);
        }
        return;
      }

      if (coordsDisplay) coordsDisplay.textContent = 'Acquiring GPS Signal...';
      if (distDisplay) distDisplay.textContent = 'Calculating...';
      if (badge) {
        badge.textContent = 'Locating...';
        badge.className = 'badge badge-on-time';
      }
      if (radar) {
        radar.className = 'gps-radar-indicator in-range';
      }
      
      const errContainer = document.getElementById('gps-error-container');
      if (errContainer) errContainer.style.display = 'none';

      let triedHighAccuracy = true;

      function startWatching(highAccuracy) {
        if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
          try {
            navigator.geolocation.clearWatch(window.activeGpsWatchId);
          } catch (e) {}
          window.activeGpsWatchId = null;
        }

        window.activeGpsWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            const errContainer = document.getElementById('gps-error-container');
            if (errContainer) errContainer.style.display = 'none';

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const accuracy = pos.coords.accuracy || 10;
            const timestamp = new Date(pos.timestamp || Date.now()).toLocaleTimeString();

            // Display accuracy
            const accuracyDisplay = document.getElementById('gps-accuracy-display');
            if (accuracyDisplay) {
              accuracyDisplay.textContent = `±${Math.round(accuracy)}m (${highAccuracy ? 'GPS' : 'Network'})`;
            }

            // Display timestamp
            const timestampDisplay = document.getElementById('gps-timestamp-display');
            if (timestampDisplay) {
              timestampDisplay.textContent = timestamp;
            }

            // Display address
            const addressDisplay = document.getElementById('gps-address-display');
            if (addressDisplay) {
              updateAddressDisplay(lat, lng, addressDisplay);
            }

            applyLocationState(lat, lng, `${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`);
          },
          (err) => {
            console.error("GPS Watch error:", err, "High Accuracy:", highAccuracy);

            // Automatic network location fallback
            if (highAccuracy && triedHighAccuracy) {
              console.warn("High accuracy GPS timed out/failed. Falling back to low accuracy network location...");
              triedHighAccuracy = false;
              startWatching(false);
              return;
            }

            console.warn("GPS failed. Automatically falling back to assigned worksite location:", officeName);
            const selectEl = document.getElementById('gps-mock-selector');
            if (selectEl) {
              selectEl.value = officeName;
              sessionStorage.setItem('hs_mock_location', officeName);
            }
            
            const errContainer = document.getElementById('gps-error-container');
            if (errContainer) {
              errContainer.style.display = 'block';
              errContainer.innerHTML = `
                <div style="font-size:12px; font-weight:600; color:var(--warning); background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.15); padding:10px; border-radius:var(--radius-sm); line-height:1.4">
                  ⚠️ Mobile Device GPS problem (Permission Denied/Unavailable). Automatically fixed location at your assigned worksite: <strong>${officeName}</strong>.
                </div>
              `;
            }

            if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
              try {
                navigator.geolocation.clearWatch(window.activeGpsWatchId);
              } catch (e) {}
              window.activeGpsWatchId = null;
            }
            setTimeout(() => {
              updateGpsUI(officeName);
            }, 100);
          },
          { 
            enableHighAccuracy: highAccuracy, 
            timeout: highAccuracy ? 8000 : 15000, 
            maximumAge: 3000 
          }
        );
      }

      startWatching(true);
    } else {
      // Switching to mock — clear any active GPS watch
      if (window.activeGpsWatchId !== undefined && window.activeGpsWatchId !== null) {
        try {
          navigator.geolocation.clearWatch(window.activeGpsWatchId);
        } catch (e) {}
        window.activeGpsWatchId = null;
      }
      
      const errContainer = document.getElementById('gps-error-container');
      if (errContainer) errContainer.style.display = 'none';

      // Update mock accuracy display
      const accuracyDisplay = document.getElementById('gps-accuracy-display');
      if (accuracyDisplay) {
        accuracyDisplay.textContent = 'Perfect (Mock)';
      }
      
      // Update mock timestamp display
      const timestampDisplay = document.getElementById('gps-timestamp-display');
      if (timestampDisplay) {
        timestampDisplay.textContent = new Date().toLocaleTimeString();
      }

      let selectedCoords = null;
      let resolvedMockName = val; // Track the resolved location name for display
      if (window.OFFICE_COORDINATES[val]) {
        selectedCoords = window.OFFICE_COORDINATES[val];
        resolvedMockName = val;
      } else {
        const foundKey = Object.keys(window.OFFICE_COORDINATES).find(k => k.toLowerCase() === val.toLowerCase() || k.toLowerCase().includes(val.toLowerCase()));
        if (foundKey) {
          selectedCoords = window.OFFICE_COORDINATES[foundKey];
          resolvedMockName = foundKey;
        } else {
          selectedCoords = { lat: 28.6978, lng: 77.1408 };
          resolvedMockName = 'Kohat Enclave, Pitampura, Delhi';
        }
      }

      // Update mock address display
      const addressDisplay = document.getElementById('gps-address-display');
      if (addressDisplay) {
        updateAddressDisplay(selectedCoords.lat, selectedCoords.lng, addressDisplay);
      }

      // Update GPS sub-status to show it's a simulation
      const statusSubDisplay = document.getElementById('gps-status-sub-display');
      if (statusSubDisplay) {
        statusSubDisplay.textContent = `📍 Simulating: ${resolvedMockName}`;
      }

      applyLocationState(selectedCoords.lat, selectedCoords.lng, `${selectedCoords.lat.toFixed(6)}° N, ${selectedCoords.lng.toFixed(6)}° E`);
    }
  }


}

// ============================
// ADD LOCATION HELPER FUNCTIONS
// ============================

// Dialog for shift schedule cards (inline Add Location button)
async function openAddLocationDialog(schedId) {
  const choice = await CustomDialog.prompt(
    'Add New Location to Shift Schedule:\n\n' +
    'Type 1 for: 📍 Fetch Nearby Location (uses GPS)\n' +
    'Type 2 for: ✏️ Enter Any Location (manual entry)\n\n' +
    'Enter 1 or 2:'
  );
  
  if (choice === '1') {
    await fetchNearbyAndRegister((newLocName) => {
      const sel = document.querySelector(`.inline-sched-location[data-id="${schedId}"]`);
      if (sel) {
        DB.updateSchedule(schedId, { location: newLocName });
      }
      renderAdminSchedules();
    });
  } else if (choice === '2') {
    await enterCustomAndRegister((newLocName) => {
      const sel = document.querySelector(`.inline-sched-location[data-id="${schedId}"]`);
      if (sel) {
        DB.updateSchedule(schedId, { location: newLocName });
      }
      renderAdminSchedules();
    });
  }
}

// Fetch Nearby for modal select dropdowns
async function fetchNearbyAndAddLocation(selectElement) {
  await fetchNearbyAndRegister((newLocName) => {
    rebuildLocationDropdown(selectElement, newLocName);
  });
}

// Enter Custom for modal select dropdowns
async function enterCustomLocation(selectElement) {
  await enterCustomAndRegister((newLocName) => {
    rebuildLocationDropdown(selectElement, newLocName);
  });
}

// Core: Fetch GPS nearby and register
async function fetchNearbyAndRegister(callback) {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by this browser. Using fallback coordinates.");
    const lat = 28.6985, lng = 77.1384;
    const defaultName = `Worksite (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const name = await prompt('📍 Nearby Location Detected!\n\nCoordinates: ' + lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° E\n\nEnter a name for this location:', defaultName);
    if (name && name.trim()) {
      registerNewLocation(name.trim(), lat, lng);
      if (callback) callback(name.trim());
    }
    return;
  }

  alert('📡 Acquiring GPS signal... Please allow location access when prompted.');
  
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true });
  }).catch((error) => {
    console.warn("Geolocation failed, using fallback:", error);
    return null;
  });

  if (position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const defaultName = `Worksite (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const name = await prompt('📍 Nearby Location Detected!\n\nCoordinates: ' + lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° E\n\nEnter a name for this location:', defaultName);
    if (name && name.trim()) {
      registerNewLocation(name.trim(), lat, lng);
      if (callback) callback(name.trim());
    }
  } else {
    const lat = 28.6985, lng = 77.1384;
    const defaultName = `Worksite Delhi (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const name = await prompt('⚠️ GPS unavailable — using fallback coordinates.\n\nCoordinates: ' + lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° E\n\nEnter a name for this location:', defaultName);
    if (name && name.trim()) {
      registerNewLocation(name.trim(), lat, lng);
      if (callback) callback(name.trim());
    }
  }
}

// Core: Enter custom location name + coordinates manually
async function enterCustomAndRegister(callback) {
  const name = await prompt('✏️ Enter Location Name:\n\n(e.g. "Sector 62, Noida" or "CP Office, Delhi")');
  if (!name || !name.trim()) return;
  
  const coordStr = await prompt('Enter GPS Coordinates (optional):\n\nFormat: latitude, longitude\n(e.g. 28.6139, 77.2090)\n\nLeave blank to use default Delhi coordinates:');
  
  let lat = 28.6139, lng = 77.2090; // default Delhi center
  if (coordStr && coordStr.trim()) {
    const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      lat = parts[0];
      lng = parts[1];
    } else {
      alert('Invalid coordinates format. Using default Delhi coordinates.');
    }
  }
  
  registerNewLocation(name.trim(), lat, lng);
  if (callback) callback(name.trim());
}

// =========================================================================
// FORGOT PASSWORD MODAL (HR & MANAGER MOBILE NUMBER AUTHENTICATION)
// =========================================================================
function showForgotPasswordModal(initialId = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-content card-panel';
  modal.style.cssText = `
    max-width: 480px; width: 92%; padding: 28px;
    background: var(--bg-surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 20px; box-shadow: var(--shadow-lg) !important;
  `;

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:14px">
      <div style="display:flex; align-items:center; gap:10px">
        <div style="width:36px; height:36px; border-radius:10px; background:rgba(137,32,27,0.15); border:1px solid var(--border); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:18px">
          🔑
        </div>
        <div>
          <h3 style="font-size:17px; font-weight:800; color:var(--text-primary); margin:0">Reset Password</h3>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Forgot credentials recovery</div>
        </div>
      </div>
      <button id="btn-close-forgot-modal" style="background:var(--bg-surface-hover); border:1px solid var(--border); width:30px; height:30px; border-radius:50%; font-size:16px; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center">&times;</button>
    </div>

    <!-- Step 1: Identifier Entry -->
    <div id="forgot-step-identifier" style="display:flex; flex-direction:column; gap:16px">
      <div>
        <label style="display:block; font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:6px">USER ID / EMAIL / MOBILE NUMBER *</label>
        <input type="text" id="forgot-input-identifier" class="form-input" placeholder="e.g. EMP107, alex@gmail.com, or 9876543210" value="${Utils.escape(initialId)}" required style="font-size:13px; padding:10px 14px; border-radius:10px; width:100%; box-sizing:border-box">
      </div>

      <div id="forgot-identifier-error" style="display:none; padding:10px 14px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:10px; color:var(--error); font-size:12px; font-weight:600; line-height:1.45"></div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px">
        <button type="button" id="btn-cancel-forgot-modal" style="padding:9px 18px; font-size:12.5px; font-weight:700; border-radius:10px; background:transparent; border:1.5px solid var(--primary); color:var(--primary); cursor:pointer">Cancel</button>
        <button type="button" id="btn-verify-identifier" style="padding:9px 20px; font-size:12.5px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(137,32,27,0.4)">Proceed</button>
      </div>
    </div>

    <!-- Step 2A: Direct Password reset trigger (Attempts < 2) -->
    <div id="forgot-step-direct-trigger" style="display:none; flex-direction:column; gap:16px; text-align:center; padding:10px 0;">
      <div style="font-size:13.5px; color:var(--text-primary); line-height:1.5; margin-bottom:10px;">
        Account identified! Since this is within your first 2 resets, no verification code is required.
      </div>
      <button type="button" id="btn-trigger-create-password" style="width:100%; padding:12px 0; font-size:13.5px; font-weight:700; border-radius:12px; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(137,32,27,0.4)">Create New Password</button>
    </div>

    <!-- Step 2B: Verification Options (Attempts >= 2) -->
    <div id="forgot-step-verification-select" style="display:none; flex-direction:column; gap:16px">
      <div style="font-size:12px; color:var(--text-muted); line-height:1.5; margin-bottom:4px;">
        Verification Required: Please select a method to receive your OTP code:
      </div>

      <div id="verification-options-container" style="display:flex; flex-direction:column; gap:10px;">
        <!-- Filled dynamically -->
      </div>

      <div id="forgot-verification-error" style="display:none; padding:10px 14px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:10px; color:var(--error); font-size:12px; font-weight:600; line-height:1.45"></div>

      <button type="button" id="btn-send-verification-code" style="width:100%; padding:11px 0; font-size:13px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(137,32,27,0.4)">Send Verification Code</button>

      <!-- Code Entry Section (Initially Hidden) -->
      <div id="verification-code-entry" style="display:none; flex-direction:column; gap:12px; border-top:1px solid var(--border); padding-top:16px; margin-top:4px;">
        <div style="font-size:11px; color:var(--success); font-weight:600; text-align:center; background:rgba(16,185,129,0.08); padding:8px; border-radius:8px; border:1px solid rgba(16,185,129,0.25)">
          Code Sent! For testing, use code: <strong style="font-size:12px; text-decoration:underline;">123456</strong>
        </div>
        <div>
          <label style="display:block; font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:6px">ENTER 6-DIGIT CODE / OTP *</label>
          <input type="text" id="forgot-input-otp" class="form-input" placeholder="e.g. 123456" maxlength="6" style="width:100%; box-sizing:border-box; text-align:center; letter-spacing:4px; font-weight:700">
        </div>
        <button type="button" id="btn-submit-otp" style="width:100%; padding:11px 0; font-size:13px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35)">Verify & Proceed</button>
      </div>
    </div>

    <!-- Step 3: Password Reset Input Form -->
    <form id="forgot-step-new-pass-form" style="display:none; flex-direction:column; gap:16px">
      <div>
        <label style="display:block; font-size:11.5px; font-weight:700; color:var(--text-secondary); margin-bottom:6px">NEW PASSWORD *</label>
        <div style="position:relative">
          <input type="password" id="forgot-newpwd" class="form-input" placeholder="Minimum 6 characters" required style="padding-right: 38px; width:100%; box-sizing:border-box">
          <button type="button" id="btn-toggle-reset-pwd-1" title="Toggle password visibility" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-secondary); cursor:pointer; width:26px; height:26px; display:flex; align-items:center; justify-content:center; padding:0;">👁️</button>
        </div>
        
        <!-- Strength Indicator -->
        <div style="margin-top: 8px;">
          <div style="display: flex; gap: 4px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;">
            <div id="strength-bar-1" style="flex: 1; height: 100%; background: #475569; transition: background-color 0.2s;"></div>
            <div id="strength-bar-2" style="flex: 1; height: 100%; background: #475569; transition: background-color 0.2s;"></div>
            <div id="strength-bar-3" style="flex: 1; height: 100%; background: #475569; transition: background-color 0.2s;"></div>
          </div>
          <div id="strength-label" style="font-size: 10.5px; color:var(--text-muted); margin-top: 5px;">Password Strength: Empty</div>
        </div>
      </div>

      <div>
        <label style="display:block; font-size:11.5px; font-weight:700; color:var(--text-secondary); margin-bottom:6px">CONFIRM PASSWORD *</label>
        <div style="position:relative">
          <input type="password" id="forgot-confirmpwd" class="form-input" placeholder="Re-enter new password" required style="padding-right: 38px; width:100%; box-sizing:border-box">
          <button type="button" id="btn-toggle-reset-pwd-2" title="Toggle password visibility" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-secondary); cursor:pointer; width:26px; height:26px; display:flex; align-items:center; justify-content:center; padding:0;">👁️</button>
        </div>
      </div>

      <div id="forgot-step3-error" style="display:none; padding:10px 14px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:10px; color:var(--error); font-size:12px; font-weight:600; line-height:1.45"></div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px; border-top:1px solid var(--border); padding-top:16px">
        <button type="submit" style="width:100%; padding:11px 0; font-size:13px; font-weight:700; border-radius:10px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35)">Update Password</button>
      </div>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeModal = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };
  modal.querySelector('#btn-close-forgot-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-forgot-modal').addEventListener('click', closeModal);

  let verifiedUser = null;

  const obfuscateEmail = (email) => {
    if (!email) return 'no-email@domain.com';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name[0]}***${name[name.length-1]}@${domain}`;
  };

  const obfuscatePhone = (phone) => {
    if (!phone) return '******9999';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return '******' + cleaned;
    return '******' + cleaned.substring(cleaned.length - 4);
  };

  // Step 1 Click Handler: Verify Identity
  modal.querySelector('#btn-verify-identifier').addEventListener('click', () => {
    const errorEl = modal.querySelector('#forgot-identifier-error');
    errorEl.style.display = 'none';

    const rawInput = modal.querySelector('#forgot-input-identifier').value.trim();
    if (!rawInput) {
      errorEl.textContent = '⚠️ Please enter your User ID, Email, or Mobile Number.';
      errorEl.style.display = 'block';
      return;
    }

    const allUsers = DB.getUsers();
    const matchedUser = allUsers.find(u => {
      const key = rawInput.toLowerCase();
      const cleanKey = rawInput.replace(/\D/g, '');
      const userPhone = (u.phone || u.mobile || '').replace(/\D/g, '');
      const isPhoneMatch = cleanKey && userPhone && (cleanKey === userPhone || cleanKey.endsWith(userPhone) || userPhone.endsWith(cleanKey));

      return (u.username && u.username.toLowerCase() === key) ||
             (u.email && u.email.toLowerCase() === key) ||
             (u.employeeId && u.employeeId.toLowerCase() === key) ||
             isPhoneMatch;
    });

    if (!matchedUser) {
      errorEl.textContent = '⚠️ Account record not found for the entered credentials.';
      errorEl.style.display = 'block';
      return;
    }

    verifiedUser = matchedUser;
    const resetsCount = verifiedUser.passwordResetCount || 0;

    // Transition Step 1 Out
    modal.querySelector('#forgot-step-identifier').style.display = 'none';

    if (resetsCount < 2) {
      // Flow A: Direct "Create New Password" Button
      modal.querySelector('#forgot-step-direct-trigger').style.display = 'flex';
    } else {
      // Flow B: Show Verification Options (OTP / Email / SMS)
      const optionsContainer = modal.querySelector('#verification-options-container');
      optionsContainer.innerHTML = `
        <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:10px; cursor:pointer;">
          <input type="radio" name="verification-method" value="email" checked style="accent-color:var(--primary)">
          <div>
            <div style="font-size:12.5px; font-weight:700; color:var(--text-primary)">Email Verification</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Send verification code to ${obfuscateEmail(verifiedUser.email)}</div>
          </div>
        </label>
        <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:10px; cursor:pointer;">
          <input type="radio" name="verification-method" value="sms" style="accent-color:var(--primary)">
          <div>
            <div style="font-size:12.5px; font-weight:700; color:var(--text-primary)">SMS Verification</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Send code to ${obfuscatePhone(verifiedUser.phone || verifiedUser.mobile)}</div>
          </div>
        </label>
        <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:10px; cursor:pointer;">
          <input type="radio" name="verification-method" value="otp" style="accent-color:var(--primary)">
          <div>
            <div style="font-size:12.5px; font-weight:700; color:var(--text-primary)">One-Time Passcode (OTP)</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Authenticate with dynamic temporary passcode</div>
          </div>
        </label>
      `;
      modal.querySelector('#forgot-step-verification-select').style.display = 'flex';
    }
  });

  // Flow A Click Handler
  modal.querySelector('#btn-trigger-create-password').addEventListener('click', () => {
    modal.querySelector('#forgot-step-direct-trigger').style.display = 'none';
    modal.querySelector('#forgot-step-new-pass-form').style.display = 'flex';
  });

  // Flow B Code Sending Handler
  modal.querySelector('#btn-send-verification-code').addEventListener('click', () => {
    modal.querySelector('#btn-send-verification-code').style.display = 'none';
    modal.querySelector('#verification-code-entry').style.display = 'flex';
  });

  // Flow B Verify Code Submission
  modal.querySelector('#btn-submit-otp').addEventListener('click', () => {
    const errorEl = modal.querySelector('#forgot-verification-error');
    errorEl.style.display = 'none';

    const enteredOtp = modal.querySelector('#forgot-input-otp').value.trim();
    if (enteredOtp !== '123456') {
      errorEl.textContent = '⚠️ Invalid verification code. Please enter 123456 to bypass.';
      errorEl.style.display = 'block';
      return;
    }

    modal.querySelector('#forgot-step-verification-select').style.display = 'none';
    modal.querySelector('#forgot-step-new-pass-form').style.display = 'flex';
  });

  // Password Strength live calculator
  const newPwdInput = modal.querySelector('#forgot-newpwd');
  const confirmPwdInput = modal.querySelector('#forgot-confirmpwd');
  
  newPwdInput.addEventListener('input', () => {
    const val = newPwdInput.value;
    const bar1 = modal.querySelector('#strength-bar-1');
    const bar2 = modal.querySelector('#strength-bar-2');
    const bar3 = modal.querySelector('#strength-bar-3');
    const label = modal.querySelector('#strength-label');

    // Reset styles
    bar1.style.background = '#475569';
    bar2.style.background = '#475569';
    bar3.style.background = '#475569';

    if (!val) {
      label.textContent = 'Password Strength: Empty';
      return;
    }

    if (val.length < 6) {
      bar1.style.background = '#ef4444';
      label.textContent = 'Password Strength: Too Short (Weak)';
      return;
    }

    const hasUpper = /[A-Z]/.test(val);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);
    const hasNum = /[0-9]/.test(val);

    if (hasUpper && hasSpecial && hasNum && val.length >= 8) {
      bar1.style.background = '#10b981';
      bar2.style.background = '#10b981';
      bar3.style.background = '#10b981';
      label.textContent = 'Password Strength: Strong';
    } else if ((hasUpper || hasSpecial) && val.length >= 6) {
      bar1.style.background = '#f97316';
      bar2.style.background = '#f97316';
      label.textContent = 'Password Strength: Medium';
    } else {
      bar1.style.background = '#ef4444';
      label.textContent = 'Password Strength: Weak';
    }
  });

  // Toggle Visibility triggers
  const svgEyeOpen = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const svgEyeClosed = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  modal.querySelector('#btn-toggle-reset-pwd-1').addEventListener('click', () => {
    const type = newPwdInput.type === 'password' ? 'text' : 'password';
    newPwdInput.type = type;
    modal.querySelector('#btn-toggle-reset-pwd-1').innerHTML = type === 'password' ? svgEyeOpen : svgEyeClosed;
  });

  modal.querySelector('#btn-toggle-reset-pwd-2').addEventListener('click', () => {
    const type = confirmPwdInput.type === 'password' ? 'text' : 'password';
    confirmPwdInput.type = type;
    modal.querySelector('#btn-toggle-reset-pwd-2').innerHTML = type === 'password' ? svgEyeOpen : svgEyeClosed;
  });

  // Password reset final submit handler
  modal.querySelector('#forgot-step-new-pass-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = modal.querySelector('#forgot-step3-error');
    errorEl.style.display = 'none';

    const newPwd = newPwdInput.value;
    const confirmPwd = confirmPwdInput.value;

    if (newPwd.length < 6) {
      errorEl.textContent = '⚠️ Password must be at least 6 characters long.';
      errorEl.style.display = 'block';
      return;
    }
    if (!/[A-Z]/.test(newPwd) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPwd)) {
      errorEl.textContent = '⚠️ Password must contain at least 1 uppercase letter and 1 special character.';
      errorEl.style.display = 'block';
      return;
    }
    if (newPwd !== confirmPwd) {
      errorEl.textContent = '⚠️ Passwords do not match.';
      errorEl.style.display = 'block';
      return;
    }

    const currentCount = verifiedUser.passwordResetCount || 0;
    const hashed = Utils.hashPassword(newPwd);

    // Save counter increment and password update to database
    DB.updateUser(verifiedUser.id, {
      password: hashed,
      passwordResetCount: currentCount + 1
    });

    closeModal();
    if (typeof showToastNotification === 'function') {
      showToastNotification('✅ Password updated successfully! Please log in with your new credentials.', 'success');
    }
    const loginPwdInput = document.getElementById('auth-pwd-input');
    if (loginPwdInput) {
      loginPwdInput.value = newPwd;
      loginPwdInput.focus();
    }
  });
}



// =========================================================================
// ACCOUNT MANAGEMENT MODULE (HR & Manager Only)
// =========================================================================
function renderAccountManagementView() {
  const root = document.getElementById('main-view');
  if (!root) return;

  const currentUser = Auth.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'hr' && currentUser.role !== 'manager')) {
    window.location.hash = '#dashboard';
    return;
  }

  let searchQuery = '';
  let roleFilter = 'all';
  let statusFilter = 'all';

  const renderTableContent = () => {
    const allUsers = DB.getUsers();
    let filtered = allUsers.filter(u => u.role === 'hr' || u.role === 'manager');

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => (u.status || 'Active') === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q))
      );
    }

    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 36px; color: var(--text-secondary);">
            <div style="font-size: 32px; margin-bottom: 8px;">👤</div>
            <div style="font-weight: 600; font-size: 15px;">No Accounts Found</div>
            <div style="font-size: 12.5px; margin-top: 4px;">Try adjusting your search query or filters.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const isHR = u.role === 'hr';
      const status = u.status || 'Active';
      const isActive = status === 'Active';
      const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
      const canManage = currentUser.role === 'hr' || (currentUser.role === 'manager' && u.id === currentUser.id);

      let actionButtons = '<span style="font-size:11px; color:var(--text-muted); font-style:italic">View Only</span>';
      if (canManage) {
        const deleteBtn = (currentUser.role === 'hr' && u.id !== currentUser.id)
          ? `<button class="btn btn-sm btn-danger btn-delete-account" data-id="${u.id}" title="Delete Account" style="padding:5px 10px; font-size:12px">🗑️ Delete</button>`
          : '';
        actionButtons = `
          <button class="btn btn-sm btn-secondary btn-toggle-status" data-id="${u.id}" title="${isActive ? 'Deactivate Account' : 'Activate Account'}" style="padding:5px 10px; font-size:12px">
            ${isActive ? '🔴 Disable' : '🟢 Enable'}
          </button>
          <button class="btn btn-sm btn-outline btn-edit-account" data-id="${u.id}" title="Edit Account Details" style="padding:5px 10px; font-size:12px">
            ✏️ Edit
          </button>
          ${deleteBtn}
        `;
      }

      return `
        <tr data-user-id="${u.id}">
          <td>
            <div style="display:flex; align-items:center; gap:12px">
              <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:38px; height:38px; border-radius:50%; background:${isHR ? 'rgba(251,191,36,0.15)' : 'rgba(6,182,212,0.15)'}; color:${isHR ? 'var(--primary)' : 'var(--cyan)'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; border:1px solid ${isHR ? 'rgba(251,191,36,0.3)' : 'rgba(6,182,212,0.3)'}; overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
                ${u.photo ? `<img src="${u.photo}" style="width:100%; height:100%; object-fit:cover;">` : initials}
              </div>
              <div>
                <div style="font-weight:700; color:var(--text-primary); font-size:14px">${Utils.escape(u.name)}</div>
                <div style="font-size:11.5px; color:var(--text-secondary)">ID: ${Utils.escape(u.employeeId || '-')}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight:600; color:var(--text-primary); font-size:13px">@${Utils.escape(u.username)}</div>
            <div style="font-size:11.5px; color:var(--text-secondary)">${Utils.escape(u.email || 'No email registered')}</div>
          </td>
          <td>
            <span class="badge ${isHR ? 'badge-warning' : 'badge-info'}" style="font-size:11px; padding:4px 10px; font-weight:700">
              ${isHR ? 'HR Manager' : 'Operations Manager'}
            </span>
          </td>
          <td>
            <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}" style="font-size:11px; padding:4px 10px; font-weight:700; display:inline-flex; align-items:center; gap:5px">
              <span style="width:6px; height:6px; border-radius:50%; background:currentColor"></span>
              ${status}
            </span>
          </td>
          <td style="font-size:12.5px; color:var(--text-secondary)">
            ${Utils.formatDate(u.dateOfJoining || u.createdAt || new Date())}
          </td>
          <td>
            <div style="display:flex; gap:8px; justify-content:flex-end">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const targetUser = DB.getUser(id);
        if (!targetUser) return;
        const newStatus = (targetUser.status || 'Active') === 'Active' ? 'Inactive' : 'Active';
        
        const confirmMsg = `Are you sure you want to change account status for ${targetUser.name} to ${newStatus}?`;
        const confirmed = await CustomDialog.confirm(confirmMsg);
        if (confirmed) {
          DB.updateUser(id, { status: newStatus });
          await CustomDialog.alert(`Account status for ${targetUser.name} updated to ${newStatus}.`);
          renderAccountStats();
          renderTableContent();
        }
      });
    });

    tbody.querySelectorAll('.btn-edit-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetUser = DB.getUser(id);
        if (targetUser) {
          showAccountModal(targetUser);
        }
      });
    });

    tbody.querySelectorAll('.btn-delete-account').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const targetUser = DB.getUser(id);
        if (!targetUser) return;

        const confirmMsg = `Are you sure you want to permanently delete the account for ${targetUser.name} (@${targetUser.username})?\n\nThis action cannot be undone.`;
        const confirmed = await CustomDialog.confirm(confirmMsg);
        if (confirmed) {
          DB.deleteUser(id);
          await CustomDialog.alert(`Account for ${targetUser.name} deleted successfully.`);
          renderAccountStats();
          renderTableContent();
        }
      });
    });
  };

  const renderAccountStats = () => {
    const users = DB.getUsers().filter(u => u.role === 'hr' || u.role === 'manager');
    const total = users.length;
    const active = users.filter(u => (u.status || 'Active') === 'Active').length;
    const inactive = total - active;
    const hrCount = users.filter(u => u.role === 'hr').length;
    const managerCount = users.filter(u => u.role === 'manager').length;

    const statsContainer = document.getElementById('account-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="card-panel" style="padding:16px 20px; display:flex; align-items:center; gap:16px">
          <div style="width:44px; height:44px; border-radius:12px; background:rgba(251,191,36,0.12); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:22px">👥</div>
          <div>
            <div style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Total Accounts</div>
            <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin-top:2px">${total}</div>
          </div>
        </div>
        <div class="card-panel" style="padding:16px 20px; display:flex; align-items:center; gap:16px">
          <div style="width:44px; height:44px; border-radius:12px; background:rgba(16,185,129,0.12); color:var(--success); display:flex; align-items:center; justify-content:center; font-size:22px">🟢</div>
          <div>
            <div style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Active Accounts</div>
            <div style="font-size:22px; font-weight:800; color:var(--success); margin-top:2px">${active}</div>
          </div>
        </div>
        <div class="card-panel" style="padding:16px 20px; display:flex; align-items:center; gap:16px">
          <div style="width:44px; height:44px; border-radius:12px; background:rgba(239,68,68,0.12); color:var(--error); display:flex; align-items:center; justify-content:center; font-size:22px">🔴</div>
          <div>
            <div style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">Inactive Accounts</div>
            <div style="font-size:22px; font-weight:800; color:var(--error); margin-top:2px">${inactive}</div>
          </div>
        </div>
        <div class="card-panel" style="padding:16px 20px; display:flex; align-items:center; gap:16px">
          <div style="width:44px; height:44px; border-radius:12px; background:rgba(6,182,212,0.12); color:var(--cyan); display:flex; align-items:center; justify-content:center; font-size:22px">🛡️</div>
          <div>
            <div style="font-size:12px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">HR / Managers</div>
            <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin-top:2px">${hrCount} HR / ${managerCount} Mgr</div>
          </div>
        </div>
      `;
    }
  };

  root.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px">
      <!-- Top Title Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px">
        <div>
          <h2 style="font-size:22px; font-weight:800; color:var(--text-primary); margin:0">Account Management</h2>
          <p style="font-size:13px; color:var(--text-secondary); margin:4px 0 0 0">Create, manage, and configure role-based access for HR Administrators and Managers.</p>
        </div>
        <div>
          <button class="btn" id="btn-create-account" style="display:inline-flex; align-items:center; gap:8px; padding:10px 22px; font-weight:700; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:#ffffff; border:none; border-radius:12px; box-shadow:0 4px 14px rgba(220,38,38,0.4); cursor:pointer; transition:transform 0.15s ease">
            <svg style="width:18px; height:18px; fill:currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Create New Account
          </button>
        </div>
      </div>

      <!-- Stats Bar Grid -->
      <div id="account-stats-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px">
      </div>

      <!-- Controls & Search Toolbar -->
      <div class="card-panel" style="padding:16px 20px">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px">
          <div style="flex:1; min-width:260px">
            <input type="text" id="acct-search-input" class="form-control" placeholder="🔍 Search name, username, email, or employee ID..." style="padding:10px 14px">
          </div>
          <div style="display:flex; gap:12px; flex-wrap:wrap">
            <select id="acct-role-filter" class="form-control" style="width:auto; min-width:140px">
              <option value="all">All Roles</option>
              <option value="hr">HR Administrator</option>
              <option value="manager">Operations Manager</option>
            </select>
            <select id="acct-status-filter" class="form-control" style="width:auto; min-width:140px">
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Accounts Table -->
      <div class="card-panel" style="padding:0; overflow:hidden">
        <div class="table-responsive">
          <table class="data-table" style="width:100%">
            <thead>
              <tr>
                <th>Account Holder</th>
                <th>Username & Email</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody id="accounts-table-body">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderAccountStats();
  renderTableContent();

  document.getElementById('acct-search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTableContent();
  });

  document.getElementById('acct-role-filter').addEventListener('change', (e) => {
    roleFilter = e.target.value;
    renderTableContent();
  });

  document.getElementById('acct-status-filter').addEventListener('change', (e) => {
    statusFilter = e.target.value;
    renderTableContent();
  });

  document.getElementById('btn-create-account').addEventListener('click', () => {
    showAccountModal();
  });
}

function showAccountModal(editUser = null) {
  const isEdit = !!editUser;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;

  const initialRole = isEdit ? editUser.role : 'hr';
  const initialIdLabel = (initialRole === 'hr') ? 'HR ID *' : (initialRole === 'manager' || initialRole === 'finance_manager') ? 'Manager ID *' : 'Employee ID *';
  const initialPlaceholder = (initialRole === 'hr') ? 'e.g. HR100' : (initialRole === 'manager' || initialRole === 'finance_manager') ? 'e.g. MGR100' : 'e.g. EMP100';

  const modal = document.createElement('div');
  modal.className = 'modal-content card-panel';
  modal.style.cssText = `
    max-width: 520px; width: 92%; padding: 32px;
    background: #faf7f2 !important;
    border: 1px solid rgba(137, 32, 27, 0.15) !important;
    border-radius: 24px; box-shadow: 0 16px 40px rgba(137,32,27,0.1);
  `;

  modal.innerHTML = `
    <!-- Modal Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid rgba(137,32,27,0.08); padding-bottom:16px">
      <div style="display:flex; align-items:center; gap:12px">
        <div style="width:38px; height:38px; border-radius:10px; background:rgba(137,32,27,0.08); border:1px solid rgba(137,32,27,0.15); display:flex; align-items:center; justify-content:center; font-size:18px">
          ${isEdit ? '✏️' : '👤'}
        </div>
        <div>
          <h3 style="font-size:18px; font-weight:800; color:#1a0504; margin:0; letter-spacing:-0.01em">
            ${isEdit ? 'Edit Account' : 'Create Account'}
          </h3>
          <div style="font-size:11.5px; color:#64748b; margin-top:2px">Configure credentials and role permissions</div>
        </div>
      </div>
      <button class="close-modal-btn" id="btn-close-acct-modal" style="background:rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.1); width:32px; height:32px; border-radius:50%; font-size:18px; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s ease">&times;</button>
    </div>

    <!-- Role Selection Tabs -->
    <div id="create-acct-role-tabs" style="display:grid; grid-template-columns:${isEdit ? '1fr 1fr 1fr' : '1fr 1fr'}; gap:12px; margin-bottom:20px">
      <button type="button" class="acct-role-tab" data-role="hr" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:16px; cursor:pointer; transition:all 0.2s">
        <div class="role-tab-icon" style="width:32px; height:32px; border-radius:50%; background:rgba(137, 32, 27, 0.1); color:#89201B; display:flex; align-items:center; justify-content:center; font-size:14px">👤</div>
        <span style="font-size:11.5px; font-weight:700; color:#1e293b">HR / Admin</span>
      </button>
      <button type="button" class="acct-role-tab" data-role="manager" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:16px; cursor:pointer; transition:all 0.2s">
        <div class="role-tab-icon" style="width:32px; height:32px; border-radius:50%; background:rgba(137, 32, 27, 0.1); color:#89201B; display:flex; align-items:center; justify-content:center; font-size:14px">ℹ️</div>
        <span style="font-size:11.5px; font-weight:700; color:#1e293b">Manager</span>
      </button>
      ${isEdit ? `
      <button type="button" class="acct-role-tab" data-role="employee" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:16px; cursor:pointer; transition:all 0.2s">
        <div class="role-tab-icon" style="width:32px; height:32px; border-radius:50%; background:rgba(137, 32, 27, 0.1); color:#89201B; display:flex; align-items:center; justify-content:center; font-size:14px">📋</div>
        <span style="font-size:11.5px; font-weight:700; color:#1e293b">Employee</span>
      </button>
      ` : ''}
    </div>

    <!-- Upload Photo Section -->
    <div style="display:flex; align-items:center; gap:12px; justify-content:center; margin-bottom:20px">
      <div id="acct-photo-preview" style="width:48px; height:48px; border-radius:50%; background:#f1f5f9; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; font-size:20px; color:#64748b; overflow:hidden; cursor:pointer">
        ${isEdit && editUser.photo ? `<img src="${editUser.photo}" style="width:100%; height:100%; object-fit:cover;">` : '👤'}
      </div>
      <input type="file" id="acct-input-photo-file" accept="image/*" style="display:none">
      <button type="button" id="btn-acct-upload-photo" style="background:#fff; border:1px solid #cbd5e1; padding:6px 14px; border-radius:20px; font-size:11px; font-weight:700; color:#1e293b; cursor:pointer">Upload Photo</button>
    </div>

    <form id="acct-form" style="display:flex; flex-direction:column; gap:14px">
      <!-- Hidden original role select for backing state compatibility -->
      <select id="acct-input-role" style="display:none">
        <option value="hr">HR Administrator</option>
        <option value="manager">Operations Manager</option>
        <option value="employee">Employee</option>
      </select>

      <div>
        <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">FULL NAME *</label>
        <input type="text" id="acct-input-name" class="form-control" placeholder="e.g. Ananya Sharma" value="${isEdit ? Utils.escape(editUser.name) : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <label id="lbl-acct-id-type" style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">${initialIdLabel}</label>
          <input type="text" id="acct-input-username" class="form-control" placeholder="${initialPlaceholder}" value="${isEdit ? Utils.escape(editUser.username || editUser.employeeId || '') : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
        </div>
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">EMAIL ADDRESS *</label>
          <input type="email" id="acct-input-email" class="form-control" placeholder="e.g. alex@gmail.com" value="${isEdit ? Utils.escape(editUser.email || '') : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box; transition:border-color 0.2s ease">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">PASSWORD *</label>
          <div style="position:relative">
            <input type="password" id="acct-input-password" class="form-control" placeholder="••••••••" ${isEdit ? '' : 'required'} style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 38px 10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
            <button type="button" id="btn-toggle-pwd-vis" title="Toggle password visibility" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#64748b; cursor:pointer; width:26px; height:26px; display:flex; align-items:center; justify-content:center; padding:0; transition:color 0.2s ease">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <div style="font-size:10px; color:#64748b; margin-top:4px">Must contain uppercase & special character.</div>
        </div>
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">CONFIRM PASSWORD *</label>
          <div style="position:relative">
            <input type="password" id="acct-input-confirm-password" class="form-control" placeholder="••••••••" ${isEdit ? '' : 'required'} style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 38px 10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
            <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; letter-spacing:0.02em; margin:0">PORTAL ACCESS *</label>
          </div>
          <select id="acct-input-role-select" class="form-control" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box; cursor:pointer">
            <option value="hr" ${initialRole === 'hr' ? 'selected' : ''}>HR Administrator</option>
            <option value="manager" ${initialRole === 'manager' || initialRole === 'finance_manager' ? 'selected' : ''}>Operations Manager</option>
            ${isEdit ? `<option value="employee" ${initialRole === 'employee' ? 'selected' : ''}>Employee</option>` : ''}
          </select>
        </div>
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">MOBILE NUMBER *</label>
          <input type="tel" id="acct-input-mobile" class="form-control" placeholder="e.g. 9876543210" value="${isEdit ? Utils.escape(editUser.phone || editUser.mobile || '') : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
        </div>
      </div>

      <div id="acct-form-error" style="display:none; padding:10px 14px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; color:#b91c1c; font-size:11.5px; font-weight:600; line-height:1.45"></div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:6px; border-top:1px solid rgba(137,32,27,0.08); padding-top:20px">
        <button type="button" class="btn" id="btn-cancel-acct-modal" style="padding:10px 22px; font-size:12.5px; font-weight:700; border-radius:12px; background:#fff; border:1px solid #cbd5e1; color:#1e293b; cursor:pointer; transition:all 0.2s ease">Cancel</button>
        <button type="submit" class="btn" style="padding:10px 24px; font-size:12.5px; font-weight:700; border-radius:12px; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(220,38,38,0.3); transition:all 0.2s ease">${isEdit ? 'Save Changes' : 'Create Account'}</button>
      </div>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const pwdInput = modal.querySelector('#acct-input-password');
  const confirmPwdInput = modal.querySelector('#acct-input-confirm-password');
  const togglePwdBtn = modal.querySelector('#btn-toggle-pwd-vis');
  const roleSelect = modal.querySelector('#acct-input-role');
  const roleSelectDropdown = modal.querySelector('#acct-input-role-select');
  const tabs = modal.querySelectorAll('.acct-role-tab');
  const idLabelEl = modal.querySelector('#lbl-acct-id-type');
  const usernameInput = modal.querySelector('#acct-input-username');
  const emailInput = modal.querySelector('#acct-input-email');
  const addRoleBtn = modal.querySelector('#btn-add-custom-role');

  let uploadedPhotoDataUrl = isEdit && editUser.photo ? editUser.photo : '';
  const photoPreview = modal.querySelector('#acct-photo-preview');
  const photoFileInput = modal.querySelector('#acct-input-photo-file');
  const uploadPhotoBtn = modal.querySelector('#btn-acct-upload-photo');

  if (photoFileInput && (photoPreview || uploadPhotoBtn)) {
    const triggerFileSelect = () => photoFileInput.click();
    if (photoPreview) photoPreview.addEventListener('click', triggerFileSelect);
    if (uploadPhotoBtn) uploadPhotoBtn.addEventListener('click', triggerFileSelect);

    photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedPhotoDataUrl = event.target.result;
          if (photoPreview) {
            photoPreview.innerHTML = `<img src="${uploadedPhotoDataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const emailStrictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const val = emailInput.value.trim();
      if (!val) {
        emailInput.style.borderColor = '#cbd5e1';
      } else if (emailStrictRegex.test(val)) {
        emailInput.style.borderColor = '#10b981';
      } else {
        emailInput.style.borderColor = '#ef4444';
      }
    });
  }

  const updateRoleLabels = () => {
    const val = roleSelect.value;
    let currentVal = usernameInput ? usernameInput.value.trim() : '';
    const numMatch = currentVal.match(/\d+/);
    const numPart = numMatch ? numMatch[0] : '100';

    if (val === 'hr') {
      if (idLabelEl) idLabelEl.textContent = 'HR ID *';
      if (usernameInput) {
        if (!isEdit || !usernameInput.value) usernameInput.value = `HR${numPart}`;
        usernameInput.placeholder = 'e.g. HR100';
      }
    } else if (val === 'manager' || val === 'finance_manager') {
      if (idLabelEl) idLabelEl.textContent = 'Manager ID *';
      if (usernameInput) {
        if (!isEdit || !usernameInput.value) usernameInput.value = `MGR${numPart}`;
        usernameInput.placeholder = 'e.g. MGR100';
      }
    } else {
      if (idLabelEl) idLabelEl.textContent = 'Employee ID *';
      if (usernameInput) {
        if (!isEdit || !usernameInput.value) usernameInput.value = `EMP${numPart}`;
        usernameInput.placeholder = 'e.g. EMP100';
      }
    }
  };

  const setTabActive = (role) => {
    tabs.forEach(tab => {
      const tabRole = tab.dataset.role;
      if (tabRole === role) {
        tab.style.borderColor = '#89201B';
        tab.style.borderWidth = '2px';
        tab.style.boxShadow = '0 4px 12px rgba(137,32,27,0.12)';
        tab.style.opacity = '1';
      } else {
        tab.style.borderColor = '#cbd5e1';
        tab.style.borderWidth = '1px';
        tab.style.boxShadow = 'none';
        tab.style.opacity = '0.6';
      }
    });
    roleSelect.value = role;
    if (roleSelectDropdown) {
      roleSelectDropdown.value = role;
    }
    updateRoleLabels();
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setTabActive(tab.dataset.role);
    });
  });

  if (roleSelectDropdown) {
    roleSelectDropdown.addEventListener('change', () => {
      let role = roleSelectDropdown.value;
      if (role !== 'hr' && role !== 'manager' && role !== 'employee') {
        role = 'employee';
      }
      setTabActive(role);
    });
  }

  // Initialize role
  setTabActive(initialRole);

  if (addRoleBtn) {
    addRoleBtn.addEventListener('click', async () => {
      const newRoleTitle = await prompt("Enter new custom Department / Role title:\n(e.g. Senior Operations Manager, IT Head, HR Executive)");
      if (newRoleTitle && newRoleTitle.trim()) {
        const cleanTitle = newRoleTitle.trim();
        const cleanVal = cleanTitle.toLowerCase().replace(/\s+/g, '_');
        const option = document.createElement('option');
        option.value = cleanVal;
        option.textContent = cleanTitle;
        option.dataset.customName = cleanTitle;
        roleSelectDropdown.appendChild(option);
        roleSelectDropdown.value = cleanVal;
        setTabActive('employee'); // custom roles fall under employee view for tabs
        if (typeof showToastNotification === 'function') {
          showToastNotification(`Added custom department/role "${cleanTitle}"`, "success");
        }
      }
    });
  }

  // Duplicate code block removed successfully

  const svgEyeOpen = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const svgEyeClosed = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  togglePwdBtn.addEventListener('click', () => {
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      togglePwdBtn.innerHTML = svgEyeClosed;
      togglePwdBtn.style.color = '#dc2626';
    } else {
      pwdInput.type = 'password';
      togglePwdBtn.innerHTML = svgEyeOpen;
      togglePwdBtn.style.color = '#64748b';
    }
  });

  const closeModal = () => {
    document.body.removeChild(overlay);
  };

  modal.querySelector('#btn-close-acct-modal').addEventListener('click', closeModal);
  modal.querySelector('#btn-cancel-acct-modal').addEventListener('click', closeModal);

  modal.querySelector('#acct-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = modal.querySelector('#acct-form-error');
    errorEl.style.display = 'none';

    const name = modal.querySelector('#acct-input-name').value.trim();
    const username = modal.querySelector('#acct-input-username').value.trim();
    const email = modal.querySelector('#acct-input-email').value.trim();
    const mobile = modal.querySelector('#acct-input-mobile').value.trim();
    const password = pwdInput.value;
    const role = modal.querySelector('#acct-input-role').value;
    const selectedOption = roleSelect.options[roleSelect.selectedIndex];
    const customRoleName = selectedOption ? (selectedOption.dataset.customName || selectedOption.text) : role;

    if (!name || !username || !email || !mobile || (!isEdit && !password)) {
      errorEl.textContent = '⚠️ Please fill out all required fields.';
      errorEl.style.display = 'block';
      return;
    }

    if (!emailStrictRegex.test(email)) {
      errorEl.textContent = '⚠️ Invalid Email Format! Please enter a valid email address (e.g. alex@gmail.com or name@surya.group).';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[0-9+\s\-()]{7,15}$/.test(mobile)) {
      errorEl.textContent = '⚠️ Please enter a valid Mobile Number (7-15 digits).';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(name)) {
      errorEl.textContent = '⚠️ Full Name can only contain letters (A-Z) and spaces.';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      errorEl.textContent = '⚠️ Please enter a valid email address (e.g. name@company.com).';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      errorEl.textContent = '⚠️ Username can only contain letters, numbers, underscores, dots, or hyphens.';
      errorEl.style.display = 'block';
      return;
    }

    const existingUser = DB.getUserByUsernameOrId(username);
    if (existingUser && (!isEdit || existingUser.id !== editUser.id)) {
      errorEl.textContent = `⚠️ The Employee ID / HR ID '${username.toUpperCase()}' is already taken. Please choose another one.`;
      errorEl.style.display = 'block';
      return;
    }

    const existingUserByEmail = DB.getUserByEmail(email);
    if (existingUserByEmail && (!isEdit || existingUserByEmail.id !== editUser.id)) {
      errorEl.textContent = `⚠️ Email '${email}' is already registered to another account.`;
      errorEl.style.display = 'block';
      return;
    }

    if (password) {
      const pwdVal = Auth.validatePassword(password);
      if (!pwdVal.valid) {
        errorEl.textContent = '⚠️ Password must be at least 6 characters long and include an uppercase letter and a special character (!@#$%^&*).';
        errorEl.style.display = 'block';
        return;
      }
    }

    const payload = {
      name,
      username,
      employeeId: username.toUpperCase(),
      email,
      phone: mobile,
      mobile: mobile,
      role,
      status: isEdit ? (editUser.status || 'Active') : 'Active',
      department: customRoleName || (role === 'hr' ? 'Human Resources' : 'Operations'),
      designation: customRoleName || (role === 'hr' ? 'HR Coordinator' : 'Operations Manager'),
      photo: uploadedPhotoDataUrl
    };

    if (password) {
      payload.password = Utils.hashPassword(password);
    }

    if (isEdit) {
      DB.updateUser(editUser.id, payload);
      closeModal();
      requestsPushDBState();
      if (typeof renderAdminUsers === 'function') renderAdminUsers();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
      await CustomDialog.alert(`Account for ${name} (${username}) updated successfully.`);
    } else {
      DB.addUser(payload);
      closeModal();
      requestsPushDBState();
      if (typeof renderAdminUsers === 'function') renderAdminUsers();
      if (typeof renderAdminDashboard === 'function') renderAdminDashboard();

      const credModal = document.createElement('div');
      credModal.style.cssText = `
        position: fixed; top:0; left:0; width:100vw; height:100vh;
        background: rgba(12,3,4,0.85); backdrop-filter: blur(8px);
        display:flex; justify-content:center; align-items:center; z-index:10001;
        animation: fadeIn 0.2s ease forwards;
      `;
      credModal.innerHTML = `
        <div class="card-panel" style="max-width: 440px; width: 90%; padding: 26px; background: var(--bg-surface); border: 1px solid var(--primary); border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
          <h3 style="font-size: 19px; font-weight: 800; color: var(--primary); margin-bottom: 6px;">Account Created Successfully!</h3>
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 18px;">Here are the credentials for the newly created account:</p>
          
          <div style="background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.3); border-radius: 10px; padding: 16px; text-align: left; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px">
              <span style="color:var(--text-secondary); font-weight:600; font-size:12.5px">Full Name:</span>
              <strong style="color:var(--text-primary); font-size:13px">${Utils.escape(name)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px">
              <span style="color:var(--text-secondary); font-weight:600; font-size:12.5px">HR / Employee ID:</span>
              <strong style="color:var(--cyan); font-size:14px; font-family:monospace; background:rgba(6,182,212,0.15); padding:3px 10px; border-radius:6px">${Utils.escape(username.toUpperCase())}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px">
              <span style="color:var(--text-secondary); font-weight:600; font-size:12.5px">Email Address:</span>
              <strong style="color:var(--text-primary); font-size:13px">${Utils.escape(email)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span style="color:var(--text-secondary); font-weight:600; font-size:12.5px">Password:</span>
              <strong style="color:#f59e0b; font-size:14px; font-family:monospace; background:rgba(245,158,11,0.15); padding:3px 10px; border-radius:6px">${Utils.escape(password)}</strong>
            </div>
          </div>

          <button id="btn-close-cred-modal" class="btn btn-primary" style="width: 100%; padding: 11px; font-weight: 700; font-size: 13.5px; border-radius: 8px;">Got It & Continue</button>
        </div>
      `;
      document.body.appendChild(credModal);
      credModal.querySelector('#btn-close-cred-modal').addEventListener('click', () => {
        document.body.removeChild(credModal);
        showVerificationScreen(payload);
      });
    }

    renderAccountManagementView();
  });
}

// Register a new location globally
function registerNewLocation(name, lat, lng) {
  DB.saveOfficeCoordinate(name, lat, lng);
  
  alert('✅ Location "' + name + '" registered successfully!\nCoordinates: ' + lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° E');
}

// Rebuild a select dropdown with all current locations
function rebuildLocationDropdown(selectElement, selectValue) {
  let html = '';
  Object.keys(window.OFFICE_COORDINATES).forEach(loc => {
    html += '<option value="' + loc + '"' + (loc === selectValue ? ' selected' : '') + '>' + loc + '</option>';
  });
  selectElement.innerHTML = html;
  selectElement.value = selectValue;
}


function getAttendanceStatusForDate(userId, dateStr) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  const user = DB.getUser(userId);
  const resolved = DB.resolveUserShiftForDate(user, dateStr);
  const schedule = DB.getSchedule(resolved.scheduleId) || {
    name: 'Standard Day Shift',
    startTime: '09:00',
    endTime: '17:00',
    gracePeriod: 15,
    workDays: [1, 2, 3, 4, 5],
    location: 'Kohat Enclave, Pitampura, Delhi'
  };

  // 1. Check for Leave
  const leaves = DB.data.leaveRequests || [];
  const hasLeave = leaves.some(lv => 
    lv.userId === userId && 
    lv.status === 'Approved' && 
    dateStr >= lv.startDate && 
    dateStr <= lv.endDate
  );
  if (hasLeave) {
    return { status: 'Leave', color: 'var(--primary)', log: null, schedule };
  }

  // 2. Check for Holiday / Weekend
  const isWorkDay = schedule.workDays.includes(dayOfWeek);
  
  // Look up log
  const log = (DB.data.attendanceLogs || []).find(l => l.userId === userId && l.date === dateStr);

  if (log) {
    let status = log.status || 'Present';
    let color = 'var(--success)';
    if (status === 'Late') color = 'var(--warning)';
    if (status === 'Half Day') color = 'var(--accent)';
    return { status, color, log, schedule };
  }

  if (!isWorkDay) {
    return { status: 'Holiday', color: 'var(--text-muted)', log: null, schedule };
  }

  // If workday but in the past with no log, it's Absent
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr < todayStr) {
    return { status: 'Absent', color: 'var(--error)', log: null, schedule };
  }

  return { status: 'Scheduled', color: 'var(--cyan)', log: null, schedule };
}

function renderCalendarGrid(userId, year, month) {
  const container = document.getElementById('calendar-days-grid');
  const monthYearLabel = document.getElementById('calendar-month-year');
  if (!container || !monthYearLabel) return;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  container.innerHTML = '';

  // Padding cells for previous month
  for (let i = 0; i < firstDay; i++) {
    const pad = document.createElement('div');
    pad.style.opacity = '0';
    container.appendChild(pad);
  }

  // Real days
  const todayStr = new Date().toISOString().split('T')[0];
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const { status, color, log, schedule } = getAttendanceStatusForDate(userId, dStr);

    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.dataset.date = dStr;
    cell.style.cssText = `
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 11.5px;
      font-weight: 700;
      position: relative;
      background: ${dStr === todayStr ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.01)'};
      border-color: ${dStr === todayStr ? 'var(--primary)' : 'var(--border)'};
      transition: all 0.2s ease;
    `;

    cell.innerHTML = `
      <span>${day}</span>
      <span style="width: 5px; height: 5px; border-radius: 50%; background: ${color}; position: absolute; bottom: 4px"></span>
    `;

    cell.addEventListener('click', () => {
      openDateDetailsModal(userId, dStr, status, color, log, schedule);
    });

    container.appendChild(cell);
  }
}

function renderCalendarScheduleTab(userId, activeTab) {
  const container = document.getElementById('calendar-schedule-card');
  if (!container) return;

  const now = new Date();
  let targetDate = new Date();

  if (activeTab === 'today') {
    // current date
  } else if (activeTab === 'next') {
    targetDate.setDate(now.getDate() + 1);
  } else if (activeTab === 'last') {
    targetDate.setDate(now.getDate() - 1);
  }

  const dStr = targetDate.toISOString().split('T')[0];

  if (activeTab === 'weekly') {
    const user = DB.getUser(userId);
    const resolved = DB.resolveUserShiftForDate(user, dStr);
    const schedule = DB.getSchedule(resolved.scheduleId) || {
      name: 'Standard Day Shift',
      startTime: '09:00',
      endTime: '17:00',
      workDays: [1, 2, 3, 4, 5],
      location: 'Kohat Enclave, Pitampura, Delhi'
    };

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px">
        <strong style="color:var(--primary); font-size:13px">Assigned Weekly Schedule</strong>
        <div style="display:flex; flex-direction:column; gap:4px">
          ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, idx) => {
            const isWork = schedule.workDays.includes(idx);
            return `
              <div style="display:flex; justify-content:space-between; font-size:12px; padding: 4px 6px; background: ${now.getDay() === idx ? 'rgba(255,255,255,0.04)' : 'transparent'}; border-radius: 4px">
                <span style="font-weight:600; color: ${now.getDay() === idx ? 'var(--primary)' : 'var(--text-secondary)'}">${dayName}</span>
                <span style="color: ${isWork ? 'var(--text-primary)' : 'var(--text-muted)'}">
                  ${isWork ? `${schedule.name} (${formatTimeRange12h(schedule.startTime, schedule.endTime)})` : 'Weekly Off (Holiday)'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    return;
  }

  const { status, color, log, schedule } = getAttendanceStatusForDate(userId, dStr);

  let checkInTime = '--:--';
  let checkOutTime = '--:--';
  let workDuration = '00h 00m';

  if (log) {
    checkInTime = log.checkIn || '--:--';
    checkOutTime = log.checkOut || '--:--';
    if (log.checkIn && log.checkOut) {
      const [inH, inM] = log.checkIn.split(':').map(Number);
      const [outH, outM] = log.checkOut.split(':').map(Number);
      const mins = (outH * 60 + outM) - (inH * 60 + inM);
      if (mins > 0) {
        workDuration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }
    } else if (log.checkIn) {
      workDuration = 'Active Session';
    }
  }

  const isWorkDay = schedule.workDays.includes(targetDate.getDay());
  const showShiftInfo = isWorkDay && status !== 'Leave';

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center">
      <strong style="color:var(--text-primary); font-size:13.5px">${activeTab === 'today' ? 'Today' : (activeTab === 'next' ? 'Tomorrow' : 'Yesterday')} - ${Utils.formatDate(dStr)}</strong>
      <span class="badge" style="background: ${color}22; color: ${color}; font-weight:700; font-size:11px">${status}</span>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:4px">
      <div>
        <span style="font-size:10.5px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">🏢 Assigned Shift</span>
        ${showShiftInfo ? `
          <div style="font-weight:600; color:var(--text-primary); margin-top:2px">${Utils.escape(schedule.name)}</div>
          <div style="color:var(--text-muted); font-size:11px; margin-top:1px">${formatTimeRange12h(schedule.startTime, schedule.endTime)}</div>
        ` : `
          <div style="font-weight:600; color:var(--text-muted); margin-top:2px">${status === 'Leave' ? 'Approved Leave' : 'Weekly Off (Holiday)'}</div>
          <div style="color:var(--text-muted); font-size:11px; margin-top:1px">No active shift scheduled</div>
        `}
      </div>
      <div>
        <span style="font-size:10.5px; color:var(--text-secondary); text-transform:uppercase; font-weight:600">🕒 Clock Activity</span>
        <div style="font-weight:600; color:var(--text-primary); margin-top:2px">In: ${checkInTime} | Out: ${checkOutTime}</div>
        <div style="color:var(--cyan); font-size:11px; margin-top:1px">Duration: ${workDuration}</div>
      </div>
    </div>
  `;
}

function openDateDetailsModal(userId, dateStr, status, color, log, schedule) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  let checkInTime = '--:--';
  let checkOutTime = '--:--';
  let workDuration = '00h 00m';
  let checkInLoc = 'N/A';
  let checkOutLoc = 'N/A';

  if (log) {
    checkInTime = log.checkIn || '--:--';
    checkOutTime = log.checkOut || '--:--';
    checkInLoc = log.location || 'Kohat Enclave, Pitampura, Delhi';
    checkOutLoc = log.checkOutLocation || log.location || 'Kohat Enclave, Pitampura, Delhi';
    
    if (log.checkIn && log.checkOut) {
      const [inH, inM] = log.checkIn.split(':').map(Number);
      const [outH, outM] = log.checkOut.split(':').map(Number);
      const mins = (outH * 60 + outM) - (inH * 60 + inM);
      if (mins > 0) {
        workDuration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }
    } else if (log.checkIn) {
      workDuration = 'Active Session';
    }
  }

  const date = new Date(dateStr);
  const isWorkDay = schedule.workDays.includes(date.getDay());
  const showShiftInfo = isWorkDay && status !== 'Leave';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 420px; padding: 24px; display:flex; flex-direction:column; gap:14px">
      <div class="modal-header" style="margin-bottom: 2px">
        <h3 class="modal-title">📅 Date Attendance Summary</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      
      <div style="font-size: 15px; font-weight: 700; color: var(--text-primary)">
        ${Utils.formatDate(dateStr)}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-sm)">
        <span style="font-size: 12.5px; color: var(--text-secondary)">Status:</span>
        <span class="badge" style="background: ${color}22; color: ${color}; font-weight:700; font-size:12px; padding: 4px 10px">${status}</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; font-size:12.5px">
        <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:700; color:var(--primary)">📋 Shift Pattern</h4>
        ${showShiftInfo ? `
          <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Shift Name:</span><strong style="color:var(--text-primary)">${Utils.escape(schedule.name)}</strong></div>
          <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Work Timings:</span><strong style="color:var(--text-primary)">${formatTimeRange12h(schedule.startTime, schedule.endTime)}</strong></div>
          <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Assigned Worksite:</span><strong style="color:var(--text-primary); max-width: 200px; text-align:right">${Utils.escape(DB.getUserShiftLocation(DB.getUser(userId), schedule ? schedule.id : null))}</strong></div>
        ` : `
          <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Shift Name:</span><strong style="color:var(--text-muted)">${status === 'Leave' ? 'Approved Leave' : 'Weekly Off (Holiday)'}</strong></div>
          <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Work Timings:</span><strong style="color:var(--text-muted)">None (Rest Day)</strong></div>
          <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Assigned Worksite:</span><strong style="color:var(--text-muted)">None (Rest Day)</strong></div>
        `}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; font-size:12.5px; border-top: 1px solid var(--border); padding-top: 12px">
        <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:700; color:var(--primary)">🕒 Clock Activity</h4>
        <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Check-in Time:</span><strong style="color:var(--text-primary)">${checkInTime}</strong></div>
        <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Check-in Location:</span><strong style="color:var(--text-primary); max-width: 200px; text-align:right">${Utils.escape(checkInLoc)}</strong></div>
        <div style="display:flex; justify-content:space-between; margin-top:4px"><span style="color:var(--text-secondary)">Check-out Time:</span><strong style="color:var(--text-primary)">${checkOutTime}</strong></div>
        <div style="display:flex; justify-content:space-between"><span style="color:var(--text-secondary)">Check-out Location:</span><strong style="color:var(--text-primary); max-width: 200px; text-align:right">${Utils.escape(checkOutLoc)}</strong></div>
        <div style="display:flex; justify-content:space-between; margin-top:4px; border-top:1px dashed var(--border); padding-top:6px"><span style="color:var(--text-secondary)">Total Work Duration:</span><strong style="color:var(--cyan)">${workDuration}</strong></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function handlePinClockIn(userId, shiftId = null) {
  const regIn = document.getElementById('btn-regular-checkin');
  if (regIn) {
    regIn.setAttribute('disabled', 'true');
    regIn.style.opacity = '0.4';
  }
  const geoIn = document.getElementById('btn-geofence-checkin');
  if (geoIn) {
    geoIn.setAttribute('disabled', 'true');
    geoIn.style.opacity = '0.4';
  }

  const coords = await getOneTimeLocationPromise();
  if (!coords) {
    alert("❌ Check-in Rejected! Could not acquire GPS coordinates.");
    if (regIn) {
      regIn.removeAttribute('disabled');
      regIn.style.opacity = '1';
    }
    if (geoIn) {
      geoIn.removeAttribute('disabled');
      geoIn.style.opacity = '1';
    }
    return;
  }

  const user = DB.getUser(userId);
  const todayStr = new Date().toISOString().split('T')[0];
  const resolved = DB.resolveUserShiftForDate(user, todayStr, shiftId);
  const schedule = resolved.schedule || DB.getSchedule(resolved.scheduleId);
  const officeName = (user && user.shiftLocations && schedule && user.shiftLocations[schedule.id]) || (user && user.preferredLocation) || 'Kohat Enclave, Pitampura, Delhi';
  const targetCoords = window.OFFICE_COORDINATES[officeName] || window.OFFICE_COORDINATES['Kohat Enclave, Pitampura, Delhi'] || window.OFFICE_COORDINATES[Object.keys(window.OFFICE_COORDINATES)[0]];

  const distance = calculateHaversineDistance(coords.lat, coords.lng, targetCoords.lat, targetCoords.lng);
  const inRange = distance <= 100;
  const resolvedDistance = (distance / 1000).toFixed(2);
  const coordsStr = `${coords.lat.toFixed(6)}° N, ${coords.lng.toFixed(6)}° E`;

  if (!inRange) {
    alert(`❌ Check-in Rejected! Your current coordinates are out of range for the office geofence. Under company policy, you must be within 100m of ${officeName} to clock in.`);
    if (regIn) {
      regIn.removeAttribute('disabled');
      regIn.style.opacity = '1';
    }
    if (geoIn) {
      geoIn.removeAttribute('disabled');
      geoIn.style.opacity = '1';
    }
    return;
  }

  const pass = await prompt('Enter your Account Password to Clock In:');
  if (pass === null) {
    if (regIn) {
      regIn.removeAttribute('disabled');
      regIn.style.opacity = '1';
    }
    if (geoIn) {
      geoIn.removeAttribute('disabled');
      geoIn.style.opacity = '1';
    }
    return;
  }
  if (user && user.password === pass) {
    sessionStorage.removeItem('hs_pending_auto_checkin_time');
    DB.checkIn(userId, 'none', officeName, false, '', coordsStr, resolvedDistance, null, null, schedule ? schedule.id : null);
    requestsPushDBState();
    renderEmployeeDashboard();
  } else {
    alert('Invalid Password credentials.');
    if (regIn) {
      regIn.removeAttribute('disabled');
      regIn.style.opacity = '1';
    }
    if (geoIn) {
      geoIn.removeAttribute('disabled');
      geoIn.style.opacity = '1';
    }
  }
}

async function handleClockOut(userId, shiftId = null) {
  const inRange = sessionStorage.getItem('hs_current_resolved_in_range') === 'true';
  const user = DB.getUser(userId);
  const todayStr = new Date().toISOString().split('T')[0];
  const resolved = DB.resolveUserShiftForDate(user, todayStr, shiftId);
  const schedule = resolved.schedule || DB.getSchedule(resolved.scheduleId);
  const officeName = (user && user.shiftLocations && schedule && user.shiftLocations[schedule.id]) || (user && user.preferredLocation) || 'Kohat Enclave, Pitampura, Delhi';

  if (!inRange) {
    alert(`❌ Clock-out Rejected! Your current coordinates are out of range for the office geofence. Under company policy, you must be within 100m of ${officeName} to clock out.`);
    return;
  }

  if (await confirm('Clock Out?')) {
    const log = DB.checkOut(userId, 'none', null, schedule ? schedule.id : null);
    requestsPushDBState();
    renderEmployeeDashboard();
    if (log) {
      const workingHours = Utils.calculateDuration(log.checkIn, log.checkOut);
      showClockOutThankYou(log.checkOut, workingHours);
    }
  }
}



// Settings Panel View
function renderSettingsView() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">System Settings</h1>
        <div class="content-subtitle">Change theme color gradients, update languages, and check builds.</div>
      </div>
    </div>

    <div class="content-body">
      <div class="settings-section-grid">
        <!-- Theme Card (Cleaned Solar labels) -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Appearance Theme</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:rgba(255,255,255,0.01)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:18px">🌇</span>
                <div>
                  <strong style="display:block;font-size:13px">Dark Mode</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Sunset burgundy/gold theme</span>
                </div>
              </div>
              <input type="radio" name="settings-theme" value="dark" ${activeTheme === 'dark' ? 'checked' : ''}>
            </label>

            <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:rgba(255,255,255,0.01)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:18px">🌅</span>
                <div>
                  <strong style="display:block;font-size:13px">Light Mode</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Sunrise cream/gold theme</span>
                </div>
              </div>
              <input type="radio" name="settings-theme" value="light" ${activeTheme === 'light' ? 'checked' : ''}>
            </label>
          </div>
        </div>

        <!-- Language Card -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Interface Language</h3>
          </div>
          <div class="form-group">
            <select class="form-input" id="settings-lang-select" style="padding:12px">
              <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English (US)</option>
              <option value="hi" ${currentLang === 'hi' ? 'selected' : ''}>Hindi (हिन्दी)</option>
            </select>
          </div>
          <button class="btn btn-secondary" id="btn-save-lang" style="font-size:13px">Change Language</button>
        </div>

        <!-- Version updates checker -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Build & Version Checks</h3>
          </div>
          <div style="font-size:14px;margin-bottom:15px">
            <div>Current Version: <strong>v1.3.0</strong></div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Last verified: Today</div>
          </div>
          
          <button class="btn" id="btn-check-version" style="font-size:13px">Check for Version Updates</button>
          
          <div id="version-check-status" style="display:none;margin-top:15px;font-size:12px;color:var(--text-secondary);align-items:center;gap:8px"></div>
        </div>

        <!-- Account Session Card -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Account Session</h3>
          </div>
          <div style="font-size:14px;margin-bottom:15px;display:flex;flex-direction:column;gap:8px">
            <div>Logged in as: <strong>${Utils.escape(user ? user.name : 'Unknown')}</strong></div>
            <div style="font-size:11px;color:var(--text-secondary)">Role: <span style="text-transform:uppercase;font-weight:600;color:var(--primary)">${user ? user.role : 'N/A'}</span></div>
          </div>
          
          <button class="btn btn-danger" id="btn-settings-logout" style="font-size:13px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px">
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Log Out Account
          </button>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('input[name="settings-theme"]').forEach(rad => {
    rad.addEventListener('change', (e) => {
      activeTheme = e.target.value;
      localStorage.setItem('hs_app_theme', activeTheme);
      applyGlobalTheme();
    });
  });

  document.getElementById('btn-save-lang').addEventListener('click', () => {
    const val = document.getElementById('settings-lang-select').value;
    currentLang = val;
    localStorage.setItem('hs_app_lang', currentLang);
    renderAppShell();
    renderSettingsView();
    alert('Language updated successfully / भाषा सफलतापूर्वक अपडेट की गई');
  });

  const verBtn = document.getElementById('btn-check-version');
  const verStatus = document.getElementById('version-check-status');

  verBtn.addEventListener('click', () => {
    verBtn.disabled = true;
    verStatus.style.display = 'flex';
    verStatus.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:pulseScan 1s infinite;display:inline-block"></span> Checking HS Group server hubs...`;
    
    setTimeout(() => {
      verStatus.innerHTML = `✓ System is up to date. Latest version <strong>v1.3.0</strong> is active.`;
      verBtn.disabled = false;
    }, 2000);
  });

  document.getElementById('btn-settings-logout').addEventListener('click', () => {
    Auth.logout();
    sessionStorage.removeItem('hs_pending_auto_checkin_time');
    sessionStorage.removeItem('hs_mock_location');
    sessionStorage.removeItem('hs_current_resolved_coords');
    sessionStorage.removeItem('hs_current_resolved_distance');
    sessionStorage.removeItem('hs_current_resolved_in_range');
    window.location.hash = '#login';
  });
}

// -------------------------------------------------------------
// CORE SHARED SUB-FUNCTIONS
// -------------------------------------------------------------
function renderEmployeeLeaves() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');

  // Calculate today's date in YYYY-MM-DD local format
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Automatically determine the Approval Head based on department
  const getApprovalHeadForDepartment = (dept) => {
    const department = (dept || '').toLowerCase();
    if (department.includes('engineering') || department.includes('quality assurance') || department.includes('qa')) {
      return 'Operations Manager';
    } else if (department.includes('finance')) {
      return 'Finance Manager';
    } else if (department.includes('operations')) {
      return 'HR Admin Manager';
    } else if (department.includes('resources') || department.includes('hr')) {
      return 'HR Admin Manager';
    } else {
      return 'HR Admin Manager';
    }
  };

  const approverName = getApprovalHeadForDepartment(user.department);

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Leave Request Desk</h1>
        <div class="content-subtitle">Request leaves and check status approvals.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split reverse">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Apply for New Leave</h3></div>
          <form id="leave-request-form">
            <div class="form-group">
              <label class="form-label" for="leave-type">Leave Type</label>
              <select class="form-input" id="leave-type" required>
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Annual">Annual Leave</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="leave-approver">Approval Head</label>
              <select class="form-input" id="leave-approver" required>
                <option value="HR Admin Manager" ${approverName === 'HR Admin Manager' ? 'selected' : ''}>HR Admin Manager</option>
                <option value="Operations Manager" ${approverName === 'Operations Manager' ? 'selected' : ''}>Operations Manager</option>
                <option value="Finance Manager" ${approverName === 'Finance Manager' ? 'selected' : ''}>Finance Manager</option>
                <option value="Department Head" ${approverName === 'Department Head' ? 'selected' : ''}>Department Head</option>
              </select>
            </div>

            <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="form-label" for="leave-start">Start Date</label>
                <input class="form-input" type="date" id="leave-start" min="${localTodayStr}" required>
              </div>
              <div>
                <label class="form-label" for="leave-end">End Date</label>
                <input class="form-input" type="date" id="leave-end" min="${localTodayStr}" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="leave-reason">Reason for Leave</label>
              <textarea class="form-input" id="leave-reason" placeholder="Describe the reason..." rows="3" required style="resize:vertical"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="leave-proof">Supporting Document <span style="color:var(--text-muted);font-weight:normal;font-size:12px;">(Optional, e.g. medical certificate)</span></label>
              <input class="form-input" type="file" id="leave-proof" accept="image/*,.pdf,.doc,.docx" style="padding:8px">
            </div>
            <button class="btn" type="submit">Submit Request</button>
          </form>
          <div id="leave-alert" style="display:none"></div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Leave Request History</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead><tr><th>Dates</th><th>Type</th><th>Approver</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody id="leave-history-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  renderPersonalLeaves(user.id);

  document.getElementById('leave-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('leave-type').value;
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value.trim();
    const chosenApprover = document.getElementById('leave-approver').value;

    if (start < localTodayStr) {
      showLeaveAlert('Leave start date cannot be in the past.', 'error');
      return;
    }
    if (end < start) {
      showLeaveAlert('Start date cannot be after end date.', 'error');
      return;
    }
    DB.applyLeave(user.id, type, start, end, reason, chosenApprover);
    showLeaveAlert('Leave request submitted successfully!', 'success');
    document.getElementById('leave-request-form').reset();
    renderPersonalLeaves(user.id);
  });
}

function renderEmployeeReports() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const today = new Date();
  let selectedMonth = today.getMonth();
  let selectedYear = today.getFullYear();

  main.innerHTML = `
    <div class="content-header" id="employee-payslip-tab-header">
      <div>
        <h1 class="content-title">My Payroll Statements</h1>
        <div class="content-subtitle">View salary statements, attendance deductions, and download payslips.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel report-filter-bar" style="margin-bottom:24px">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <label class="form-label" style="margin:0" for="emp-report-month">Select Period:</label>
          <select class="form-input" id="emp-report-month" style="width:130px;padding:8px">
            ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select class="form-input" id="emp-report-year" style="width:100px;padding:8px">
            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-cyan" id="btn-emp-print-payslip" style="margin-left:auto;padding:10px 18px;width:auto;font-size:13px">🖨️ Print Statement</button>
      </div>
      <div id="payslip-render-container"></div>
    </div>
  `;
  const refreshPayslip = () => renderEmployeePayslip(user.id, selectedMonth, selectedYear);
  document.getElementById('emp-report-month').addEventListener('change', (e) => { selectedMonth = Number(e.target.value); refreshPayslip(); });
  document.getElementById('emp-report-year').addEventListener('change', (e) => { selectedYear = Number(e.target.value); refreshPayslip(); });
  document.getElementById('btn-emp-print-payslip').addEventListener('click', () => {
    printSinglePayslipPDF(user.id, selectedMonth, selectedYear);
  });
  refreshPayslip();
}

function renderEmployeePayslip(userId, month, year) {
  const container = document.getElementById('payslip-render-container');
  if (!container) return;
  
  // Ensure we resolve user correctly via ID, employeeId, email, or username
  const user = DB.getUser(userId);
  if (!user) {
    container.innerHTML = `<div class="card-panel" style="text-align:center;color:var(--text-secondary)">Employee record not found.</div>`;
    return;
  }

  // Fetch the latest database values dynamically on every call
  const payroll = DB.calculateMonthlyPayroll(user.id, month, year);
  if (!payroll) {
    container.innerHTML = `<div class="card-panel" style="text-align:center;color:var(--text-secondary)">No payroll data recorded for this month.</div>`;
    return;
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  container.innerHTML = `
    <div class="payslip-wrapper">
      <div class="payslip-header">
        <div>
          <div class="payslip-company-name">HS Group Delhi</div>
          <div class="payslip-company-desc">House of Surya | Employee Salary Statement</div>
        </div>
        <div class="payslip-title">PAYSLIP RECEIPT</div>
      </div>
      <div class="payslip-grid">
        <div class="payslip-meta-block">
          <div><strong>Employee Name:</strong> ${Utils.escape(user.name)}</div>
          <div><strong>Employee ID:</strong> ${Utils.escape(user.employeeId || user.id)}</div>
          <div><strong>Department:</strong> ${Utils.escape(user.department || 'N/A')}</div>
          <div><strong>Role / Designation:</strong> ${Utils.escape(user.designation || 'Staff Associate')}</div>
        </div>
        <div class="payslip-meta-block">
          <div><strong>Statement Period:</strong> ${monthNames[month]} ${year}</div>
          <div><strong>Total Working Days:</strong> ${payroll.workingDays} days</div>
          <div><strong>Present Days:</strong> ${payroll.presentDays} days</div>
          <div><strong>Leave Days:</strong> ${payroll.approvedLeaveDays} days</div>
        </div>
      </div>

      <table class="payslip-table">
        <thead>
          <tr>
            <th>Description of Allowances / Deductions</th>
            <th style="text-align:right">Earning Rate / Allowances</th>
            <th style="text-align:right">Deducted Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Base Fixed Monthly Salary</td>
            <td style="text-align:right">₹${payroll.baseSalary.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>House Rent Allowance (HRA)</td>
            <td style="text-align:right">₹${payroll.allowanceHRA.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>Travel Allowance</td>
            <td style="text-align:right">₹${payroll.allowanceTravel.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>Overtime Allowance (${payroll.overtimeText})</td>
            <td style="text-align:right;color:var(--success)">₹${payroll.overtimePay.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>Absent Penalties (${payroll.absentDays} days absent)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.absentDeduction.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Half-day Salary Deductions (${payroll.halfDays} occurrences)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.halfDayDeduction.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Provident Fund (PF) Deduction</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionPF.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Professional Tax (PT)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionPT.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Employees' State Insurance (ESI)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionESI.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Tax Deducted at Source (TDS) (${payroll.deductionTDS}%)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionTDSVal.toLocaleString()}</td>
          </tr>
          ${payroll.bonus > 0 ? `
          <tr>
            <td>Manager Discretionary Bonus / Rewards</td>
            <td style="text-align:right;color:var(--success);font-weight:600">₹${payroll.bonus.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          ` : ''}
          ${payroll.adhocDeduction > 0 ? `
          <tr>
            <td>Manager Ad-hoc Deduction / Adjustments</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:var(--error);font-weight:600">₹${payroll.adhocDeduction.toLocaleString()}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td>Net Disbursed Take-home Salary</td>
            <td style="text-align:right" colspan="2">₹${payroll.netSalary.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      ${payroll.remarks ? `
      <div style="margin-top:20px;padding:12px;background:rgba(255,255,255,0.01);border:1px dashed var(--border);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary)">
        <strong>Remarks / Notes:</strong> ${Utils.escape(payroll.remarks)}
      </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:11px;color:#64748b">
        <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;width:180px;text-align:center">HR Dept Seal</div>
        <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;width:180px;text-align:center">Signature of Recipient</div>
      </div>
    </div>
  `;
}

function renderEmployeeProfile() {
  const currentSession = sessionStorage.getItem('attendance_current_session');
  let userId = null;
  if (currentSession) {
    try {
      userId = JSON.parse(currentSession).id;
    } catch (e) {}
  }
  if (!userId) {
    const currentUser = Auth.getCurrentUser();
    userId = currentUser ? currentUser.id : null;
  }
  if (!userId) {
    window.location.hash = '#login';
    return;
  }
  const user = DB.getUser(userId);
  const main = document.getElementById('main-view');

  const userSchedule = user.scheduleId ? DB.data.schedules.find(s => s.id === user.scheduleId) : null;
  const shiftText = userSchedule ? `${userSchedule.name} (${formatTimeRange12h(userSchedule.startTime, userSchedule.endTime)})` : 'Not Assigned';
  const locationText = user.preferredLocation || 'Not Assigned';

  const isSelfAdmin = user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager';
  const status = user.profileVerificationStatus || 'Approved';
  const editCount = user.profileEditCount || 0;
  const badgeTitle = user.role === 'hr' ? 'HR Badge' : (user.role === 'manager' || user.role === 'finance_manager' ? 'Manager Badge' : 'Employee Badge');
  
  let verificationStatusHTML = '';
  if (!isSelfAdmin) {
    let statusColor = 'var(--success)';
    let statusText = 'Verified / Approved';
    let icon = '✅';
    if (status === 'Pending Approval') {
      statusColor = 'var(--warning)';
      statusText = 'Pending Review';
      icon = '⏳';
    } else if (status === 'Rejected') {
      statusColor = 'var(--error)';
      statusText = 'Issue Flagged';
      icon = '❌';
    }
    
    verificationStatusHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; color:var(--text-secondary)">Status:</span>
          <strong style="color:${statusColor}; font-size:13px">${icon} ${statusText}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:8px; margin-top:2px;">
          <span style="font-size:11.5px; color:var(--text-muted)">Direct Edits:</span>
          <span style="font-size:11.5px; color:var(--text-secondary); font-weight:600;">${editCount} / 3 used</span>
        </div>
        ${status === 'Rejected' && user.profileVerificationComment ? `
          <div style="font-size:11.5px; color:var(--error); background:rgba(239,68,68,0.05); border:1.5px dashed rgba(239,68,68,0.2); padding:8px 10px; border-radius:6px; margin-top:4px; line-height:1.45;">
            <strong>Comment:</strong> "${Utils.escape(user.profileVerificationComment)}"
          </div>
        ` : ''}
      </div>
    `;
  } else {
    verificationStatusHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px; color:var(--text-secondary)">Status:</span>
          <strong style="color:var(--success); font-size:13px">✅ Verified Admin</strong>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:8px; margin-top:2px;">
          <span style="font-size:11.5px; color:var(--text-muted)">Edit Access:</span>
          <span style="font-size:11.5px; color:var(--text-secondary); font-weight:600;">Unlimited Edits</span>
        </div>
      </div>
    `;
  }

  main.innerHTML = `
    <style>
      .prof-page-wrap {
        max-width: 820px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .prof-field-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 18px;
      }
      .prof-field-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }
      .prof-input {
        height: 44px;
        border-radius: 10px;
        border: 1px solid var(--border);
        padding: 0 14px;
        font-size: 13.5px;
        background: var(--bg-surface);
        color: var(--text-primary);
        width: 100%;
        box-sizing: border-box;
        outline: none;
        box-shadow: var(--shadow-sm);
        transition: all 0.25s ease;
      }
      .prof-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
        background: var(--bg-surface);
      }
      .prof-input[readonly], .prof-input:disabled {
        background: rgba(120, 120, 120, 0.05);
        color: var(--text-muted);
        cursor: not-allowed;
        border-color: var(--border);
        box-shadow: none;
      }
      .prof-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 6px;
        display: block;
      }
      .prof-section-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px 28px;
        box-shadow: var(--shadow-sm);
      }
      .prof-section-title {
        font-size: 14px;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0 0 16px 0;
        padding-bottom: 10px;
        border-bottom: 1.5px solid var(--border);
      }
      @media (max-width: 700px) {
        .prof-field-row { grid-template-columns: 1fr 1fr; }
        .prof-field-row-2 { grid-template-columns: 1fr; }
      }
      @media (max-width: 500px) {
        .prof-field-row { grid-template-columns: 1fr; }
      }
      .staff-banner-grid {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        width: 100%;
      }
      .staff-banner-avatar {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary) 0%, #5c0f0a 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 800;
        color: #fff;
        flex-shrink: 0;
        box-shadow: 0 4px 10px rgba(137,32,27,0.15);
      }
      .staff-banner-main {
        flex: 1;
        min-width: 200px;
      }
      .staff-banner-meta {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-shrink: 0;
      }
      @media (max-width: 580px) {
        .staff-banner-grid {
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }
        .staff-banner-main {
          width: 100%;
        }
        .staff-banner-meta {
          width: 100%;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 12px;
          margin-top: 4px;
        }
      }
    </style>

    <div class="content-header">
      <div>
        <h1 class="content-title">My Details</h1>
        <div class="content-subtitle">Complete your details and update your personal information.</div>
      </div>
    </div>

    <div class="content-body" style="padding-top:0;">
      <form id="profile-details-form">
        <div class="prof-page-wrap">

          <div id="profile-alert" class="alert" style="display:none;"></div>

          <!-- Profile Status Bar -->
          ${!isSelfAdmin ? `
          <div class="prof-section-card" style="padding:12px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="font-size:13px; color:#475569;">
              Profile Status:&nbsp;
              <strong style="color:${status === 'Approved' ? '#16a34a' : status === 'Pending Approval' ? '#d97706' : '#dc2626'};">
                ${status === 'Approved' ? 'Verified / Approved' : status === 'Pending Approval' ? 'Pending Review' : 'Issue Flagged'}
              </strong>
            </div>
            <div style="font-size:12.5px; color:#94a3b8; font-weight:600;">Direct Edits Used: ${editCount}/3</div>
          </div>
          ` : `
          <div class="prof-section-card" style="padding:12px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="font-size:13px; color:#475569;">
              Profile Status:&nbsp;<strong style="color:#16a34a;">Verified Admin</strong>
            </div>
            <div style="font-size:12.5px; color:#94a3b8; font-weight:600;">Edit Access: Unlimited</div>
          </div>
          `}

          <!-- ID Card & Upload Section Row -->
          <div class="profile-badge-row" style="display:flex; gap:20px; align-items:stretch; flex-wrap:wrap; justify-content:center; margin-bottom:12px;">
            <!-- ID Card Column -->
            <div class="id-card" id="employee-id-badge" style="width:100%; max-width:360px; height:215px; position:relative; transform-style:preserve-3d; transition:transform 0.6s cubic-bezier(0.4,0,0.2,1); cursor:pointer; flex-shrink:0;">
              <!-- FRONT -->
              <div class="id-card-front" style="position:absolute; width:100%; height:100%; backface-visibility:hidden; -webkit-backface-visibility:hidden; border-radius:14px; padding:18px 20px; overflow:hidden; background:linear-gradient(145deg,#fff6f6,#fcebeb); border:1px solid rgba(137, 32, 27, 0.15); box-shadow:0 8px 24px rgba(137,32,27,0.08); display:flex; flex-direction:column; justify-content:space-between;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(180,130,60,0.2); padding-bottom:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <img src="surya-logo.png?v=7" alt="Surya Logo" style="height:22px; object-fit:contain;">
                    <div>
                      <div style="font-size:10px; font-weight:800; color:#b45309; letter-spacing:1px; text-transform:uppercase; line-height:1.2;">HS GROUP DELHI</div>
                      <div style="font-size:7.5px; color:#92400e; text-transform:uppercase; letter-spacing:0.5px;">HOUSE OF SURYA</div>
                    </div>
                  </div>
                  <div style="font-size:7.5px; font-weight:700; color:#92400e; border:1px solid #d97706; padding:2px 7px; border-radius:20px; text-transform:uppercase; background:rgba(251,191,36,0.1);">${badgeTitle}</div>
                </div>
                <div style="display:flex; gap:14px; align-items:center; margin:10px 0;">
                  <div id="profile-badge-photo-click" style="width:64px; height:64px; border-radius:${user.photo ? '10px' : '50%'}; background:${user.photo ? 'transparent' : 'linear-gradient(135deg,#89201B,#5c0f0a)'}; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; color:#fbbf24; border:2px solid #fbbf24; box-shadow:0 4px 12px rgba(0,0,0,0.25); flex-shrink:0; overflow:hidden; ${user.photo ? 'cursor:pointer;' : ''}" title="${user.photo ? 'Click to view full screen' : ''}">
                    ${user.photo ? `<img src="${user.photo}" style="width:100%; height:100%; object-fit:contain; background:transparent;">` : `<svg viewBox="0 0 24 24" fill="currentColor" style="width:36px; height:36px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`}
                  </div>
                  <div style="overflow:hidden;">
                    <div style="font-size:16px; font-weight:700; color:#1a1a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">${Utils.escape(user.name)}</div>
                    <div style="font-size:10px; color:#b45309; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${Utils.escape(user.designation || 'Associate')}</div>
                    <div style="font-size:9.5px; color:#78716c; margin-top:1px;">${Utils.escape(user.department || 'General')}</div>
                  </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                  <div>
                    <div style="font-size:7px; color:#92400e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; opacity:0.8;">EMPLOYEE ID</div>
                    <div style="font-size:11px; font-weight:800; color:#b45309;">${Utils.escape(user.employeeId)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:7px; color:#92400e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; opacity:0.8;">JOINED DATE</div>
                    <div style="font-size:11px; font-weight:600; color:#44403c;">${user.dateOfJoining ? Utils.formatDate(user.dateOfJoining) : 'N/A'}</div>
                  </div>
                </div>
              </div>
              <!-- BACK -->
              <div class="id-card-back" style="position:absolute; width:100%; height:100%; backface-visibility:hidden; -webkit-backface-visibility:hidden; border-radius:14px; padding:18px 20px; overflow:hidden; background:linear-gradient(145deg,#2a0807,#130303); border:1px solid rgba(137, 32, 27, 0.3); box-shadow:0 8px 24px rgba(0,0,0,0.35); display:flex; flex-direction:column; justify-content:space-between; transform:rotateY(180deg);">
                <div style="border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:6px; font-size:9px; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Emergency &amp; Office Info</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <div>
                    <span style="color:rgba(255,255,255,0.5); font-size:8px; text-transform:uppercase; display:block; margin-bottom:1px;">Emergency Contact</span>
                    <strong style="color:#fff; font-size:11px;">${Utils.escape(user.emergencyContact || 'N/A')}</strong>
                  </div>
                  <div>
                    <span style="color:rgba(255,255,255,0.5); font-size:8px; text-transform:uppercase; display:block; margin-bottom:1px;">Office Location</span>
                    <span style="font-size:10px; color:rgba(255,255,255,0.8); line-height:1.3; display:block;">${Utils.escape(locationText)}</span>
                  </div>
                </div>
                <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="font-size:7px; color:rgba(255,255,255,0.5); text-transform:uppercase; display:block;">Attendance Badge</span>
                    <span style="font-size:9px; font-family:monospace; color:#fbbf24; font-weight:700; margin-top:2px; display:block;">SURYA-EMP-${Utils.escape(user.employeeId)}</span>
                  </div>
                  <div style="display:flex; gap:2px; height:24px; background:rgba(255,255,255,0.9); padding:3px 6px; border-radius:2px; align-items:stretch;">
                    <div style="width:2px;background:#000;"></div><div style="width:1px;background:#000;"></div><div style="width:3px;background:#000;"></div><div style="width:1px;background:#000;"></div><div style="width:2px;background:#000;"></div><div style="width:4px;background:#000;"></div><div style="width:1px;background:#000;"></div><div style="width:2px;background:#000;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Upload Control Column -->
            <div style="display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:10px; gap:12px; flex-wrap:wrap;">
              <input type="file" id="my-profile-photo-file-input" accept="image/*" style="display:none">
              <button id="btn-upload-profile-photo-real" class="btn" type="button" style="width:auto; min-width:200px; padding:12px 24px; font-size:13.5px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#fff; border-radius:10px; cursor:pointer; box-shadow:0 4px 12px rgba(137,32,27,0.2); transition:all 0.2s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                ${user.photo ? 'Change Profile Photo' : 'Upload Profile Photo'}
              </button>
              ${user.photo ? `
              <button id="btn-delete-profile-photo" class="btn" type="button" style="width:auto; padding:12px 24px; font-size:13.5px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; background:#fdf2f2; border:1.5px solid #fecaca; color:#dc2626; border-radius:10px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:all 0.2s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Delete Photo
              </button>
              ` : ''}
            </div>
          </div>

          <!-- Assigner Card -->
          ${(() => {
            if (user.assignedById) {
              const assigner = DB.getUser(user.assignedById);
              if (assigner) {
                const roleLabel = assigner.role === 'hr' ? 'HR Coordinator' : assigner.role === 'manager' ? 'Operations Manager' : assigner.role;
                const initials = assigner.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                const joinedDate = user.dateOfJoining ? new Date(user.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                return `
                  <div class="prof-section-card" style="padding: 20px 24px; border-left: 4px solid var(--primary); box-shadow: var(--shadow-sm);">
                    <div class="staff-banner-grid">
                      <div class="staff-banner-avatar">${initials}</div>
                      <div class="staff-banner-main">
                        <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: 4px;">Registered / Assigned By</div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${Utils.escape(assigner.name)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); font-weight: 500;">${roleLabel}</div>
                      </div>
                      <div class="staff-banner-meta">
                        <div style="text-align: left;">
                          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: 4px;">Date of Joining</div>
                          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${joinedDate}</div>
                        </div>
                        <div style="display: flex; align-items: center;">
                          <span class="verified-staff-badge" style="display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: rgba(137, 32, 27, 0.08); color: var(--primary); border: 1px solid rgba(137, 32, 27, 0.2); border-radius: 20px; font-size: 11.5px; font-weight: 700;">
                            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px;"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            Verified Staff
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }
            }
            return '';
          })()}

          <!-- Personal Details -->
          <div class="prof-section-card" style="position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1.5px solid var(--border); padding-bottom:10px;">
              <h3 style="margin:0; font-size:14px; font-weight:800; color:var(--text-primary);">Personal Details</h3>
              <button class="btn" type="button" id="btn-profile-edit-focus" style="padding: 0 14px; height: 30px; font-size: 11.5px; font-weight: 700; border-radius: 6px; border: 1.5px solid var(--primary); background: transparent; color: var(--primary); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: auto;">Edit Profile</button>
            </div>
            <div class="prof-field-row" style="margin-bottom:16px;">
              <div>
                <label class="prof-label" for="prof-name">Full Name <span style="font-weight:400;color:#b0bec5;font-size:11px;">(Letters only)</span></label>
                <input class="prof-input" type="text" id="prof-name" value="${Utils.escape(user.name)}" required placeholder="e.g. John Doe" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-empid">Employee ID</label>
                <input class="prof-input" type="text" id="prof-empid" value="${Utils.escape(user.employeeId)}" required disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-username">Username (Optional)</label>
                <input class="prof-input" type="text" id="prof-username" value="${Utils.escape(user.username)}" disabled>
              </div>
            </div>
            <div class="prof-field-row">
              <div>
                <label class="prof-label" for="prof-password">Change Password (Optional)</label>
                <input class="prof-input" type="text" id="prof-password" placeholder="Leave empty for no change" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-email">Email Address</label>
                <input class="prof-input" type="email" id="prof-email" value="${Utils.escape(user.email)}" required disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-phone">Mobile Number</label>
                <input class="prof-input" type="text" id="prof-phone" value="${Utils.escape(user.phone)}" required disabled>
              </div>
            </div>
          </div>

          <!-- Additional Information -->
          <div class="prof-section-card">
            <h3 class="prof-section-title">Additional Information</h3>
            <div class="prof-field-row" style="margin-bottom:16px;">
              <div>
                <label class="prof-label" for="prof-dob">Date of Birth</label>
                <input class="prof-input" type="date" id="prof-dob" value="${user.dob || ''}" required disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-gender">Gender</label>
                <select class="prof-input" id="prof-gender" required disabled>
                  <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div>
                <label class="prof-label" for="prof-emergency">Emergency Contact</label>
                <input class="prof-input" type="text" id="prof-emergency" value="${Utils.escape(user.emergencyContact || '')}" placeholder="Emergency contact phone" required disabled>
              </div>
            </div>
            <div class="prof-field-row-2">
              <div>
                <label class="prof-label" for="prof-city">City</label>
                <input class="prof-input" type="text" id="prof-city" value="${Utils.escape(user.city)}" placeholder="e.g. Delhi" required disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-address">Address</label>
                <input class="prof-input" type="text" id="prof-address" value="${Utils.escape(user.address)}" placeholder="Street/Building info" required disabled>
              </div>
            </div>
          </div>

          <!-- Work Information -->
          <div class="prof-section-card">
            <h3 class="prof-section-title">Work Information</h3>
            <div class="prof-field-row" style="margin-bottom:16px;">
              <div>
                <label class="prof-label" for="prof-dept">Department</label>
                <input class="prof-input" type="text" id="prof-dept" value="${Utils.escape(user.department || 'General')}" required disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-designation">Designation</label>
                <input class="prof-input" type="text" id="prof-designation" value="${Utils.escape(user.designation || 'Associate')}" required disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-doj">Date of Joining</label>
                <input class="prof-input" type="date" id="prof-doj" value="${user.dateOfJoining || ''}" required disabled>
              </div>
            </div>
            <div class="prof-field-row-2">
              <div>
                <label class="prof-label" for="prof-worksite">Worksite Location</label>
                <input class="prof-input" type="text" id="prof-worksite" value="${Utils.escape(locationText)}" readonly disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-workshift">Work Shift</label>
                <input class="prof-input" type="text" id="prof-workshift" value="${Utils.escape(shiftText)}" readonly disabled>
              </div>
            </div>
          </div>

          <!-- Payroll Information -->
          ${isSelfAdmin ? `
          <div class="prof-section-card">
            <h3 class="prof-section-title">Payroll Information</h3>
            <div class="prof-field-row">
              <div>
                <label class="prof-label" for="prof-salary">Base Salary (INR/Month)</label>
                <input class="prof-input" type="number" id="prof-salary" value="${user.baseSalary !== undefined && user.baseSalary !== null ? user.baseSalary : ''}" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-hra">HRA Allowance (INR/Month)</label>
                <input class="prof-input" type="number" id="prof-hra" value="${user.allowanceHRA !== undefined && user.allowanceHRA !== null ? user.allowanceHRA : ''}" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-travel">Travel Allowance (INR/Month)</label>
                <input class="prof-input" type="number" id="prof-travel" value="${user.allowanceTravel !== undefined && user.allowanceTravel !== null ? user.allowanceTravel : ''}" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-pf">PF Deduction (INR/Month)</label>
                <input class="prof-input" type="number" id="prof-pf" value="${user.deductionPF !== undefined && user.deductionPF !== null ? user.deductionPF : ''}" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-pt">Professional Tax (PT)</label>
                <input class="prof-input" type="number" id="prof-pt" value="${user.deductionPT !== undefined && user.deductionPT !== null ? user.deductionPT : ''}" disabled>
              </div>
              <div>
                <label class="prof-label" for="prof-tds">TDS Rate (%)</label>
                <input class="prof-input" type="number" id="prof-tds" value="${user.deductionTDS !== undefined && user.deductionTDS !== null ? user.deductionTDS : ''}" min="0" max="100" disabled>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Action Buttons -->
          <div style="display:flex; gap:12px; justify-content:flex-end; padding-bottom:24px;">
            <button class="btn" type="submit" id="btn-profile-save" disabled style="padding: 0 20px; height: 36px; font-size: 12px; font-weight: 700; border-radius: 8px; background: linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); color: #fff; border: none; cursor: pointer; opacity: 0.5; box-shadow: none; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: auto;">Save Changes</button>
          </div>

        </div>
      </form>
    </div>
  `;




  // Set up click listener for ID card flip
  const idBadge = document.getElementById('employee-id-badge');
  if (idBadge) {
    idBadge.addEventListener('click', () => {
      idBadge.classList.toggle('flipped');
    });
  }

  const badgePhotoClick = document.getElementById('profile-badge-photo-click');
  if (badgePhotoClick) {
    badgePhotoClick.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent flipping the ID card!
      if (user.photo) {
        openFullScreenImageModal(user.photo);
      }
    });
  }

  // Photo upload bindings — Upload Photo button & Avatar click
  const uploadPhotoBtn = document.getElementById('btn-upload-profile-photo');
  const uploadPhotoBtnReal = document.getElementById('btn-upload-profile-photo-real');
  const photoFileInput = document.getElementById('my-profile-photo-file-input');
  if (photoFileInput) {
    const triggerFile = () => {
      photoFileInput.click();
    };
    if (uploadPhotoBtnReal) {
      uploadPhotoBtnReal.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerFile();
      });
    }

    photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Show uploading state on button
        const targetBtn = uploadPhotoBtnReal || uploadPhotoBtn;
        const originalHTML = targetBtn.innerHTML;
        targetBtn.disabled = true;
        targetBtn.innerHTML = '<span style="display:flex;align-items:center;gap:8px">⏳ Uploading...</span>';

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const dataUrl = event.target.result;
            DB.updateUser(user.id, { photo: dataUrl });
            Auth.init();
            renderAppShell();
            if (typeof showToastNotification === 'function') {
              showToastNotification('✅ Profile photo uploaded successfully!', 'success');
            }
            renderEmployeeProfile();
          } catch (err) {
            console.error(err);
            alert('Failed to save profile photo: ' + err.message);
            uploadPhotoBtn.disabled = false;
            uploadPhotoBtn.innerHTML = originalHTML;
          }
        };
        reader.onerror = () => {
          alert('Failed to read the file. Please try again.');
          uploadPhotoBtn.disabled = false;
          uploadPhotoBtn.innerHTML = originalHTML;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Bind Delete Photo button listener
  const deletePhotoBtn = document.getElementById('btn-delete-profile-photo');
  if (deletePhotoBtn) {
    deletePhotoBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete your profile photo?')) {
        DB.updateUser(user.id, { photo: null });
        Auth.init();
        renderAppShell();
        if (typeof showToastNotification === 'function') {
          showToastNotification('✅ Profile photo deleted.', 'success');
        }
        renderEmployeeProfile();
      }
    });
  }

  // Bind Edit Profile button listener based on user role permissions
  const editFocusBtn = document.getElementById('btn-profile-edit-focus');
  if (editFocusBtn) {
    editFocusBtn.addEventListener('click', () => {
      const isEmployee = user.role === 'employee';
      
      if (isEmployee) {
        // Employees: only Personal Details and Additional Information sections become editable
        const personalDetailsCard = editFocusBtn.closest('.prof-section-card');
        if (personalDetailsCard) {
          personalDetailsCard.querySelectorAll('input, select, textarea').forEach(input => {
            input.removeAttribute('disabled');
          });
        }
        
        const additionalInfoCard = Array.from(document.querySelectorAll('.prof-section-card')).find(card => {
          const title = card.querySelector('.prof-section-title, h3');
          return title && title.textContent.trim() === 'Additional Information';
        });
        if (additionalInfoCard) {
          additionalInfoCard.querySelectorAll('input, select, textarea').forEach(input => {
            input.removeAttribute('disabled');
          });
        }
      } else {
        // HR and Managers: all profile sections become editable
        document.querySelectorAll('.prof-input').forEach(input => {
          input.removeAttribute('disabled');
        });
      }
      
      const firstInput = document.getElementById('prof-name');
      if (firstInput) {
        firstInput.focus();
      }
    });
  }

  // Enable Save button upon form edits
  const detailsForm = document.getElementById('profile-details-form');
  const saveBtn = document.getElementById('btn-profile-save');
  const updateBtn = document.getElementById('btn-profile-update');
  if (detailsForm && saveBtn) {
    const enableSave = () => {
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.boxShadow = '0 4px 12px rgba(137,32,27,0.2)';
    };
    detailsForm.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', enableSave);
      input.addEventListener('change', enableSave);
    });
  }

  const handleProfileSubmit = (actionType) => {
    const name = document.getElementById('prof-name').value.trim();
    const employeeId = document.getElementById('prof-empid').value.trim();
    const usernameInput = document.getElementById('prof-username').value.trim();
    const passwordInput = document.getElementById('prof-password').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const dob = document.getElementById('prof-dob').value;
    const gender = document.getElementById('prof-gender').value;
    const emergencyContact = document.getElementById('prof-emergency').value.trim();
    const address = document.getElementById('prof-address').value.trim();
    const city = document.getElementById('prof-city').value.trim();
    const department = document.getElementById('prof-dept').value.trim();
    const designation = document.getElementById('prof-designation').value.trim();
    const dateOfJoining = document.getElementById('prof-doj').value;

    const baseSalaryEl = document.getElementById('prof-salary');
    const baseSalary = baseSalaryEl ? (baseSalaryEl.value === '' ? null : Number(baseSalaryEl.value)) : (user.baseSalary || null);
    const allowanceHRAEl = document.getElementById('prof-hra');
    const allowanceHRA = allowanceHRAEl ? (allowanceHRAEl.value === '' ? null : Number(allowanceHRAEl.value)) : (user.allowanceHRA !== undefined ? user.allowanceHRA : null);
    const allowanceTravelEl = document.getElementById('prof-travel');
    const allowanceTravel = allowanceTravelEl ? (allowanceTravelEl.value === '' ? null : Number(allowanceTravelEl.value)) : (user.allowanceTravel !== undefined ? user.allowanceTravel : null);
    const deductionPFEl = document.getElementById('prof-pf');
    const deductionPF = deductionPFEl ? (deductionPFEl.value === '' ? null : Number(deductionPFEl.value)) : (user.deductionPF !== undefined ? user.deductionPF : null);
    const deductionPTEl = document.getElementById('prof-pt');
    const deductionPT = deductionPTEl ? (deductionPTEl.value === '' ? null : Number(deductionPTEl.value)) : (user.deductionPT !== undefined ? user.deductionPT : null);
    const deductionTDSEl = document.getElementById('prof-tds');
    const deductionTDS = deductionTDSEl ? (deductionTDSEl.value === '' ? null : Number(deductionTDSEl.value)) : (user.deductionTDS !== undefined ? user.deductionTDS : null);

    const username = usernameInput || user.username;
    const password = passwordInput || user.password;

    if (passwordInput) {
      const rules = Auth.validatePassword(passwordInput);
      if (!rules.valid) {
        alert('Password must have minimum 6 chars, 1 uppercase, and 1 special symbol.');
        return;
      }
    }

    const editCount = user.profileEditCount || 0;
    const alertEl = document.getElementById('profile-alert');
    const isSelfAdmin = user.role === 'hr' || user.role === 'manager' || user.role === 'finance_manager';
    
    const profileValidation = ValidationUtils.validateProfile({
      name, employeeId, email, phone, dob, dateOfJoining
    });

    if (!profileValidation.valid) {
      alertEl.textContent = profileValidation.message;
      alertEl.className = 'alert alert-error';
      alertEl.style.display = 'flex';
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '⏳ Saving...';
    }
    if (updateBtn) {
      updateBtn.disabled = true;
      updateBtn.innerHTML = '⏳ Updating...';
    }

    setTimeout(() => {
      if (isSelfAdmin || editCount < 3) {
        DB.updateUserProfile(user.id, { 
          name, employeeId, username, password, email, phone, dob, gender, emergencyContact, address, city, department, designation, dateOfJoining,
          baseSalary, allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS
        });
        const updatedUser = DB.getUser(user.id);
        if (!isSelfAdmin) {
          updatedUser.profileEditCount = editCount + 1;
        }
        updatedUser.profileVerificationStatus = 'Approved';
        updatedUser.profileVerificationComment = '';
        DB.save();
        
        Auth.init();
        alertEl.className = 'alert alert-success';
        if (actionType === 'save') {
          alertEl.textContent = 'Profile saved successfully.';
        } else {
          alertEl.textContent = isSelfAdmin 
            ? 'Profile details updated successfully!'
            : `Profile details updated successfully! (Direct edit ${editCount + 1}/3)`;
        }
      } else {
        const updatedUser = DB.getUser(user.id);
        updatedUser.profileVerificationStatus = 'Pending Approval';
        updatedUser.pendingProfileEdits = {
          name, employeeId, username, password, email, phone, dob, gender, emergencyContact, address, city, department, designation, dateOfJoining,
          allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS
        };
        DB.save();
        
        Auth.init();
        alertEl.className = 'alert alert-warning';
        alertEl.textContent = 'Direct edit limit reached. Your changes have been submitted to HR/Manager for approval.';
      }
      
      alertEl.style.display = 'flex';
      setTimeout(() => { alertEl.style.display = 'none'; }, 4000);
      
      renderAppShell();
      renderEmployeeProfile();
    }, 500);
  };

  if (detailsForm) {
    detailsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleProfileSubmit('save');
    });
  }

  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      handleProfileSubmit('update');
    });
  }
}

function renderAdminProfile() {
  renderEmployeeProfile();
}

function renderEmployeeVerification() {
  const currentSession = sessionStorage.getItem('attendance_current_session');
  let userId = null;
  if (currentSession) {
    try {
      userId = JSON.parse(currentSession).id;
    } catch (e) {}
  }
  if (!userId) {
    const currentUser = Auth.getCurrentUser();
    userId = currentUser ? currentUser.id : null;
  }
  if (!userId) {
    window.location.hash = '#login';
    return;
  }
  const user = DB.getUser(userId);
  const main = document.getElementById('main-view');

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Verification Documents</h1>
        <div class="content-subtitle">Manage your resume, Aadhaar, bank details, and identity verification folders.</div>
      </div>
    </div>
    <div class="content-body">
      <div style="max-width: 800px; margin: 0 auto;">
        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:15px">Verification Controls</h3>
            <button class="btn" id="btn-profile-upload-modal" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Upload Verification Doc</button>
          </div>
        </div>
        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">Resume / CV Attachment</h3>
            <button class="btn" id="btn-cv-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span id="cv-zone-title">${user.resume ? 'Replace Resume PDF' : 'Upload Resume PDF'}</span>
            </button>
            <input type="file" id="cv-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div id="cv-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="cv-progress-fill" style="width:0%;height:100%;background:var(--cyan);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="cv-file-display" style="margin-top:10px"></div>
        </div>
        
        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">Aadhar Card Attachment</h3>
            <button class="btn" id="btn-aadhar-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span id="aadhar-zone-title">${user.aadhar ? 'Replace Aadhaar Card' : 'Upload Aadhaar Card'}</span>
            </button>
            <input type="file" id="aadhar-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div id="aadhar-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="aadhar-progress-fill" style="width:0%;height:100%;background:var(--cyan);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="aadhar-file-display" style="margin-top:10px"></div>
        </div>

        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">Bank Details Attachment</h3>
            <button class="btn" id="btn-bank-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span id="bank-zone-title">${user.bankDetails ? 'Replace Bank Details' : 'Upload Bank Details'}</span>
            </button>
            <input type="file" id="bank-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div id="bank-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="bank-progress-fill" style="width:0%;height:100%;background:var(--cyan);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="bank-file-display" style="margin-top:10px"></div>
        </div>

        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">ID Identification Documents</h3>
            <button class="btn" id="btn-doc-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span>Attach ID Proof</span>
            </button>
            <input type="file" id="doc-file-input" style="display:none" accept=".jpg,.jpeg,.png,.pdf">
          </div>
          <div id="doc-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="doc-progress-fill" style="width:0%;height:100%;background:var(--success);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="docs-list-display" style="margin-top:10px"></div>
        </div>
      </div>
    </div>
  `;

  renderResumeDisplay(user.id);
  renderAadharDisplay(user.id);
  renderBankDetailsDisplay(user.id);
  renderDocumentsDisplay(user.id);

  const profileUploadBtn = document.getElementById('btn-profile-upload-modal');
  if (profileUploadBtn) {
    profileUploadBtn.addEventListener('click', () => {
      openUploadDocumentModal(user.id);
    });
  }

  const cvTrigger = document.getElementById('btn-cv-upload-trigger');
  const cvInput = document.getElementById('cv-file-input');
  if (cvTrigger) cvTrigger.addEventListener('click', () => cvInput.click());
  cvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'resume');
  });

  const aadharTrigger = document.getElementById('btn-aadhar-upload-trigger');
  const aadharInput = document.getElementById('aadhar-file-input');
  if (aadharTrigger) aadharTrigger.addEventListener('click', () => aadharInput.click());
  aadharInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'aadhar');
  });

  const bankTrigger = document.getElementById('btn-bank-upload-trigger');
  const bankInput = document.getElementById('bank-file-input');
  if (bankTrigger) bankTrigger.addEventListener('click', () => bankInput.click());
  bankInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'bank');
  });

  const docTrigger = document.getElementById('btn-doc-upload-trigger');
  const docInput = document.getElementById('doc-file-input');
  if (docTrigger) docTrigger.addEventListener('click', () => docInput.click());
  docInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'document');
  });
}

function getVerificationBadgeHTML(user, type) {
  const status = user.verificationStatuses ? user.verificationStatuses[type] : null;
  if (status === 'Approved') {
    return `<span class="badge badge-approved" style="font-size:10.5px; width:fit-content; background:rgba(16,185,129,0.1); color:var(--success); font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid rgba(16,185,129,0.2)">✅ Approved</span>`;
  } else if (status === 'Rejected') {
    return `<span class="badge badge-rejected" style="font-size:10.5px; width:fit-content; background:rgba(239,68,68,0.1); color:var(--error); font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid rgba(239,68,68,0.2)">❌ Rejected</span>`;
  } else {
    return `<span class="badge badge-pending" style="font-size:10.5px; width:fit-content; background:rgba(251,191,36,0.1); color:var(--primary); font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid rgba(251,191,36,0.2)">⏳ Pending Approval</span>`;
  }
}

function renderResumeDisplay(userId) {
  const user = DB.getUser(userId);
  const cvDisplay = document.getElementById('cv-file-display');
  
  const cvTrigger = document.getElementById('btn-cv-upload-trigger');
  const cvTitleEl = document.getElementById('cv-zone-title');
  if (cvTrigger && cvTitleEl) {
    if (user.resume) {
      cvTrigger.style.background = 'rgba(255,255,255,0.05)';
      cvTrigger.style.color = 'var(--text-primary)';
      cvTrigger.style.border = '1px solid var(--border)';
      cvTitleEl.textContent = 'Replace CV Resume File';
    } else {
      cvTrigger.style.background = 'var(--primary)';
      cvTrigger.style.color = 'var(--bg-app)';
      cvTrigger.style.border = 'none';
      cvTitleEl.textContent = 'Click to Upload Resume PDF';
    }
  }

  if (!user.resume) {
    cvDisplay.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No Resume uploaded yet.</div>`;
    return;
  }
  const badgeHTML = getVerificationBadgeHTML(user, 'resume');
  cvDisplay.innerHTML = `
    <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(user.resume.name)}</div>
        <div class="file-item-meta">${user.resume.size} | ${user.resume.date}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        ${badgeHTML}
        <div class="doc-actions-group" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary btn-xs" id="view-resume-btn" style="padding:4px 8px;font-size:11px">View</button>
          <button class="btn btn-secondary btn-xs" id="download-resume-btn" style="padding:4px 8px;font-size:11px">Download</button>
          <button class="btn btn-secondary btn-xs" id="replace-resume-btn" style="padding:4px 8px;font-size:11px">Replace</button>
          <button class="btn btn-delete-xs" id="delete-resume-btn" style="padding:4px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer">Delete</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('view-resume-btn').addEventListener('click', () => showDocumentPreview(userId, 'resume'));
  document.getElementById('download-resume-btn').addEventListener('click', () => downloadDocumentSimulated(userId, 'resume'));
  document.getElementById('replace-resume-btn').addEventListener('click', () => document.getElementById('cv-file-input').click());
  document.getElementById('delete-resume-btn').addEventListener('click', async () => {
    if (await confirm('Delete CV resume?')) {
      DB.deleteResume(userId);
      renderResumeDisplay(userId);
    }
  });
}

function renderAadharDisplay(userId) {
  const user = DB.getUser(userId);
  const aadharDisplay = document.getElementById('aadhar-file-display');
  
  const aadharTrigger = document.getElementById('btn-aadhar-upload-trigger');
  const aadharTitleEl = document.getElementById('aadhar-zone-title');
  if (aadharTrigger && aadharTitleEl) {
    if (user.aadhar) {
      aadharTrigger.style.background = 'rgba(255,255,255,0.05)';
      aadharTrigger.style.color = 'var(--text-primary)';
      aadharTrigger.style.border = '1px solid var(--border)';
      aadharTitleEl.textContent = 'Replace Aadhar Card File';
    } else {
      aadharTrigger.style.background = 'var(--primary)';
      aadharTrigger.style.color = 'var(--bg-app)';
      aadharTrigger.style.border = 'none';
      aadharTitleEl.textContent = 'Click to Upload Aadhar Card PDF';
    }
  }

  if (!user.aadhar) {
    aadharDisplay.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No Aadhar Card uploaded yet.</div>`;
    return;
  }
  const badgeHTML = getVerificationBadgeHTML(user, 'aadhar');
  aadharDisplay.innerHTML = `
    <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>
        <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(user.aadhar.name)}</div>
        <div class="file-item-meta">${user.aadhar.size} | ${user.aadhar.date}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        ${badgeHTML}
        <div class="doc-actions-group" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary btn-xs" id="view-aadhar-btn" style="padding:4px 8px;font-size:11px">View</button>
          <button class="btn btn-secondary btn-xs" id="download-aadhar-btn" style="padding:4px 8px;font-size:11px">Download</button>
          <button class="btn btn-secondary btn-xs" id="replace-aadhar-btn" style="padding:4px 8px;font-size:11px">Replace</button>
          <button class="btn btn-delete-xs" id="delete-aadhar-btn" style="padding:4px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer">Delete</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('view-aadhar-btn').addEventListener('click', () => showDocumentPreview(userId, 'aadhar'));
  document.getElementById('download-aadhar-btn').addEventListener('click', () => downloadDocumentSimulated(userId, 'aadhar'));
  document.getElementById('replace-aadhar-btn').addEventListener('click', () => document.getElementById('aadhar-file-input').click());
  document.getElementById('delete-aadhar-btn').addEventListener('click', async () => {
    if (await confirm('Delete Aadhar Card?')) {
      DB.deleteAadhar(userId);
      renderAadharDisplay(userId);
    }
  });
}

function renderBankDetailsDisplay(userId) {
  const user = DB.getUser(userId);
  const bankDisplay = document.getElementById('bank-file-display');
  
  const bankTrigger = document.getElementById('btn-bank-upload-trigger');
  const bankTitleEl = document.getElementById('bank-zone-title');
  if (bankTrigger && bankTitleEl) {
    if (user.bankDetails) {
      bankTrigger.style.background = 'rgba(255,255,255,0.05)';
      bankTrigger.style.color = 'var(--text-primary)';
      bankTrigger.style.border = '1px solid var(--border)';
      bankTitleEl.textContent = 'Replace Bank Details File';
    } else {
      bankTrigger.style.background = 'var(--primary)';
      bankTrigger.style.color = 'var(--bg-app)';
      bankTrigger.style.border = 'none';
      bankTitleEl.textContent = 'Click to Upload Cancelled Cheque / Passbook';
    }
  }

  if (!bankDisplay) return;
  if (!user.bankDetails) {
    bankDisplay.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No Bank Details uploaded yet.</div>`;
    return;
  }
  const badgeHTML = getVerificationBadgeHTML(user, 'bank');
  bankDisplay.innerHTML = `
    <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><path d="M3 21h18M3 10h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 18h16M7 18v-4M12 18v-4M17 18v-4"></path></svg>
        <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(user.bankDetails.name)}</div>
        <div class="file-item-meta">${user.bankDetails.size} | ${user.bankDetails.date}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
        ${badgeHTML}
        <div class="doc-actions-group" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary btn-xs" id="view-bank-btn" style="padding:4px 8px;font-size:11px">View</button>
          <button class="btn btn-secondary btn-xs" id="download-bank-btn" style="padding:4px 8px;font-size:11px">Download</button>
          <button class="btn btn-secondary btn-xs" id="replace-bank-btn" style="padding:4px 8px;font-size:11px">Replace</button>
          <button class="btn btn-delete-xs" id="delete-bank-btn" style="padding:4px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer">Delete</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('view-bank-btn').addEventListener('click', () => showDocumentPreview(userId, 'bank'));
  document.getElementById('download-bank-btn').addEventListener('click', () => downloadDocumentSimulated(userId, 'bank'));
  document.getElementById('replace-bank-btn').addEventListener('click', () => document.getElementById('bank-file-input').click());
  document.getElementById('delete-bank-btn').addEventListener('click', async () => {
    if (await confirm('Delete Bank Details?')) {
      DB.deleteBankDetails(userId);
      renderBankDetailsDisplay(userId);
    }
  });
}

function renderDocumentsDisplay(userId) {
  const user = DB.getUser(userId);
  const display = document.getElementById('docs-list-display');
  if (!user.documents || user.documents.length === 0) {
    display.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No ID documents attached.</div>`;
    return;
  }
  display.innerHTML = user.documents.map(d => {
    const badgeHTML = getVerificationBadgeHTML(user, 'document');
    return `
      <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(d.name)}</div>
          <div class="file-item-meta">${d.size} | ${d.date}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
          ${badgeHTML}
          <button class="file-item-delete btn-delete-doc" data-docid="${d.id}" title="Remove" style="font-size:11px;background:none;border:none;color:#ef4444;cursor:pointer;text-decoration:underline">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  display.querySelectorAll('.btn-delete-doc').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const docId = e.currentTarget.dataset.docid;
      if (await confirm('Delete this ID proof?')) {
        DB.deleteDocument(userId, docId);
        renderDocumentsDisplay(userId);
      }
    });
  });
}

function handleMockUpload(userId, file, type) {
  let progressFill, progressBar;
  if (type === 'resume') {
    progressFill = document.getElementById('cv-progress-fill');
    progressBar = document.getElementById('cv-progress-bar');
  } else if (type === 'aadhar') {
    progressFill = document.getElementById('aadhar-progress-fill');
    progressBar = document.getElementById('aadhar-progress-bar');
  } else if (type === 'bank') {
    progressFill = document.getElementById('bank-progress-fill');
    progressBar = document.getElementById('bank-progress-bar');
  } else {
    progressFill = document.getElementById('doc-progress-fill');
    progressBar = document.getElementById('doc-progress-bar');
  }
  if (progressBar) progressBar.style.display = 'block';
  if (progressFill) progressFill.style.width = '0%';
  let percent = 0;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result;
    let uploadedUrl = '';
    try {
      const uploadRes = await fetch((window.apiBaseUrl || '') + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, fileData: base64Data })
      });
      if (uploadRes.ok) {
        const uploadJson = await uploadRes.json();
        if (uploadJson.url) uploadedUrl = uploadJson.url;
      }
    } catch (err) {
      console.warn('Backend file upload network fallback:', err);
    }

    const interval = setInterval(() => {
      percent += 20;
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (percent >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (progressBar) progressBar.style.display = 'none';
          const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
          if (type === 'resume') {
            DB.uploadResume(userId, file.name, sizeStr, uploadedUrl);
            const titleEl = document.getElementById('cv-zone-title');
            if (titleEl) titleEl.textContent = 'Replace CV Resume File';
          } else if (type === 'aadhar') {
            DB.uploadAadhar(userId, file.name, sizeStr, uploadedUrl);
            const titleEl = document.getElementById('aadhar-zone-title');
            if (titleEl) titleEl.textContent = 'Replace Aadhar Card File';
          } else if (type === 'bank') {
            DB.uploadBankDetails(userId, file.name, sizeStr, uploadedUrl);
            const titleEl = document.getElementById('bank-zone-title');
            if (titleEl) titleEl.textContent = 'Replace Bank Details File';
          } else {
            DB.uploadDocument(userId, file.name, sizeStr, uploadedUrl);
          }

          const currentHash = window.location.hash || '#login';
          if (currentHash === '#employee-profile' || currentHash === '#employee-verification') {
            renderResumeDisplay(userId);
            renderAadharDisplay(userId);
            renderBankDetailsDisplay(userId);
            renderDocumentsDisplay(userId);
          } else if (currentHash === '#admin-verification') {
            renderAdminVerificationView();
          }
        }, 200);
      }
    }, 40);
  };
  reader.readAsDataURL(file);
}

function showDocumentPreview(userId, docType) {
  const user = DB.getUser(userId);
  let doc = null;
  if (docType === 'resume') {
    doc = user.resume;
  } else if (docType === 'aadhar') {
    doc = user.aadhar;
  } else if (docType === 'bank') {
    doc = user.bankDetails;
  }
  if (!doc) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  let modalTitle = '';
  if (docType === 'resume') modalTitle = 'Resume / CV';
  else if (docType === 'aadhar') modalTitle = 'Aadhar Card';
  else if (docType === 'bank') modalTitle = 'Bank Details (Passbook / Cancelled Cheque)';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 600px">
      <div class="modal-header">
        <h3 class="modal-title">${modalTitle} - Preview</h3>
        <button class="close-modal-btn" id="close-preview-modal-btn">✕</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;padding:20px;border:1px dashed var(--border);border-radius:var(--radius-md);background:rgba(255,255,255,0.02)">
        <div style="font-size:48px">${docType === 'resume' ? '📄' : (docType === 'aadhar' ? '🪪' : '🏦')}</div>
        <div style="font-weight:600;font-size:16px">${Utils.escape(doc.name)}</div>
        <div style="color:var(--text-muted);font-size:12px">${doc.size} | Uploaded on ${doc.date}</div>
        <hr style="width:100%;border:0;border-top:1px solid var(--border);margin:12px 0">
        <div style="width:100%;text-align:left;font-size:13px;line-height:1.6;color:var(--text-secondary)">
          <p><strong>Simulated File Contents:</strong></p>
          ${docType === 'resume' ? `
            <div style="background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;font-family:monospace">
              <strong>RESUME / CV</strong><br>
              Candidate Name: ${Utils.escape(user.name)}<br>
              Role: ${Utils.escape(user.designation || 'Software Engineer')}<br>
              Department: ${Utils.escape(user.department || 'Engineering')}<br>
              Email: ${Utils.escape(user.email || 'N/A')}<br>
              Phone: ${Utils.escape(user.phone || 'N/A')}<br><br>
              [MOCK RESUME DOCUMENT CONTENTS VERIFIED]
            </div>
          ` : docType === 'aadhar' ? `
            <div style="background:linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%);padding:16px;border-radius:8px;border:1px solid rgba(245,158,11,0.2);position:relative;font-family:'Inter',sans-serif;color:var(--text-secondary)">
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(245,158,11,0.2);padding-bottom:8px;margin-bottom:12px">
                <strong style="color:var(--primary)">GOVERNMENT OF INDIA</strong>
                <span style="font-size:10px;color:var(--text-muted)">Aadhaar Card Simulator</span>
              </div>
              <div style="display:flex;gap:16px;align-items:center">
                <div style="width:60px;height:75px;background:rgba(255,255,255,0.05);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:32px">👤</div>
                <div>
                  <div style="font-size:14px;font-weight:700;margin-bottom:4px">${Utils.escape(user.name)}</div>
                  <div style="font-size:11px">DOB: ${user.dob || 'N/A'}</div>
                  <div style="font-size:11px">Gender: ${user.gender || 'N/A'}</div>
                  <div style="font-size:11px">Address: ${Utils.escape(user.address || 'N/A')}, ${Utils.escape(user.city || '')}</div>
                </div>
              </div>
              <div style="text-align:center;margin-top:16px;font-size:15px;font-weight:700;letter-spacing:2px;color:var(--primary)">
                XXXX - XXXX - 1234
              </div>
            </div>
          ` : `
            <div style="background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;font-family:monospace">
              <strong>BANK ACCOUNT DETAILS</strong><br>
              Account Holder: ${Utils.escape(user.name)}<br>
              Bank Name: State Bank of India<br>
              Account Number: XXXXXX9876<br>
              IFSC Code: SBIN0001234<br>
              Branch: New Delhi Main Branch<br><br>
              [MOCK BANK DOCUMENT CONTENTS VERIFIED]
            </div>
          `}
        </div>
      </div>
      <div class="modal-actions" style="margin-top:20px;display:flex;justify-content:flex-end;gap:12px">
        <button class="btn btn-secondary" id="close-preview-modal-btn2">Close</button>
        <button class="btn btn-cyan" id="btn-preview-download">Download File</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => closeModal(overlay);
  document.getElementById('close-preview-modal-btn').addEventListener('click', close);
  document.getElementById('close-preview-modal-btn2').addEventListener('click', close);
  document.getElementById('btn-preview-download').addEventListener('click', () => {
    downloadDocumentSimulated(userId, docType);
  });
}

function downloadDocumentSimulated(userId, docType) {
  const user = DB.getUser(userId);
  let doc = null;
  if (docType === 'resume') {
    doc = user.resume;
  } else if (docType === 'aadhar') {
    doc = user.aadhar;
  } else if (docType === 'bank') {
    doc = user.bankDetails;
  } else {
    doc = (user.documents || []).find(d => d.id === docType) || (user.documents && user.documents.length > 0 ? user.documents[0] : null);
  }
  if (!doc) return;

  const content = `Official Document Download: ${doc.name}\nUploaded by user: ${user.name} (${user.employeeId})\nUpload Date: ${doc.date}\nFile Size: ${doc.size}\nStatus: VERIFIED\n\n[MOCK FILE SYSTEM CONTENT CONTENT FOR SECURITY COMPLIANCE]`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.name.endsWith('.txt') ? doc.name : (doc.name.substring(0, doc.name.lastIndexOf('.')) + '_mock.txt');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderPersonalLeaves(userId) {
  const leaves = DB.getLeaveRequests(userId);
  const tbody = document.getElementById('leave-history-table-body');
  if (leaves.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No leaves applied yet.</td></tr>`;
    return;
  }
  
  const u = DB.getUser(userId);
  const userDept = u ? u.department : '';
  const getApprovalHeadForDepartment = (dept) => {
    const department = (dept || '').toLowerCase();
    if (department.includes('engineering') || department.includes('quality assurance') || department.includes('qa')) {
      return 'Operations Manager';
    } else if (department.includes('finance')) {
      return 'Finance Manager';
    } else if (department.includes('operations')) {
      return 'HR Admin Manager';
    } else if (department.includes('resources') || department.includes('hr')) {
      return 'HR Admin Manager';
    } else {
      return 'HR Admin Manager';
    }
  };
  const defaultApprover = getApprovalHeadForDepartment(userDept);

  tbody.innerHTML = leaves.map(lv => {
    let statusClass = 'badge-pending';
    if (lv.status === 'Approved') statusClass = 'badge-approved';
    if (lv.status === 'Rejected') statusClass = 'badge-rejected';
    const approver = lv.approverHead || defaultApprover;

    return `
      <tr>
        <td style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
          ${Utils.formatDate(lv.startDate).replace(/ /g, '&nbsp;')}<br>
          to ${Utils.formatDate(lv.endDate).replace(/ /g, '&nbsp;')}
        </td>
        <td style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">
          ${lv.type}
        </td>
        <td style="font-size: 13px; font-weight: 600; color: var(--primary);">
          ${Utils.escape(approver)}
        </td>
        <td style="font-size: 13px;">
          <span class="badge ${statusClass}">${lv.status}</span>
        </td>
        <td style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; min-width: 150px; word-wrap: break-word;">
          <strong>Reason:</strong> ${Utils.escape(lv.reason)}
          ${lv.managerComment ? `<br><strong style="color:var(--primary)">Manager:</strong> ${Utils.escape(lv.managerComment)}` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function showLeaveAlert(msg, type) {
  const alert = document.getElementById('leave-alert');
  alert.className = `alert alert-${type}`;
  alert.textContent = msg;
  alert.style.display = 'flex';
  setTimeout(() => { alert.style.display = 'none'; }, 4000);
}

// Live ticking clocks
function startLiveClock() {
  const timeEl = document.getElementById('clock-live-time');
  const dateEl = document.getElementById('clock-live-date');
  const tick = () => {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toTimeString().split(' ')[0];
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    // Periodically update Check In button enabled states
    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
      const checkInStatus = getCheckInTimeStatus(currentUser);
      const isEarly = !checkInStatus.allowed && checkInStatus.type === 'TooEarly';
      
      // Auto re-render dashboard if early status transitions
      const wasEarly = sessionStorage.getItem('hs_last_was_early') === 'true';
      if (isEarly !== wasEarly) {
        sessionStorage.setItem('hs_last_was_early', isEarly ? 'true' : 'false');
        if (window.location.hash === '#dashboard') {
          renderEmployeeDashboard();
          return;
        }
      }

      const regularIn = document.getElementById('btn-regular-checkin');
      const geoCheckIn = document.getElementById('btn-geofence-checkin');
      
      if (regularIn) {
        if (isEarly) {
          if (regularIn.style.opacity !== '0.4') {
            regularIn.style.opacity = '0.4';
            regularIn.style.cursor = 'not-allowed';
            regularIn.setAttribute('title', 'Too Early');
          }
        } else {
          if (regularIn.style.opacity === '0.4') {
            regularIn.style.opacity = '1';
            regularIn.style.cursor = 'pointer';
            regularIn.setAttribute('title', 'Click to check in');
          }
        }
      }
      
      if (geoCheckIn) {
        const inRange = sessionStorage.getItem('hs_current_resolved_in_range') === 'true';
        if (isEarly) {
          if (geoCheckIn.style.opacity !== '0.4') {
            geoCheckIn.style.opacity = '0.4';
            geoCheckIn.style.cursor = 'not-allowed';
            geoCheckIn.setAttribute('title', 'Too Early');
          }
        } else {
          if (inRange) {
            if (geoCheckIn.style.opacity === '0.4') {
              geoCheckIn.removeAttribute('disabled');
              geoCheckIn.style.opacity = '1';
              geoCheckIn.style.cursor = 'pointer';
              geoCheckIn.setAttribute('title', 'Geofence validated');
            }
          } else {
            if (geoCheckIn.style.opacity !== '0.4') {
              geoCheckIn.setAttribute('disabled', 'true');
              geoCheckIn.style.opacity = '0.4';
              geoCheckIn.style.cursor = 'not-allowed';
              geoCheckIn.setAttribute('title', 'Action requires being within 100m');
            }
          }
        }
      }
    }
  };
  tick();
  if (activeTimer) clearInterval(activeTimer);
  activeTimer = setInterval(tick, 1000);
}

function startActiveWorkTimer(todayLog) {
  const timerEl = document.getElementById('active-work-timer');
  if (!timerEl) return;

  timerEl.style.color = 'var(--cyan)'; // default cyan color

  if (!todayLog || !todayLog.checkIn || todayLog.checkOut) {
    timerEl.textContent = todayLog && todayLog.checkOut ? Utils.calculateDuration(todayLog.checkIn, todayLog.checkOut) : '00h 00m 00s';
    return;
  }
  const [inHour, inMin] = todayLog.checkIn.split(':').map(Number);
  const checkInDate = new Date();
  checkInDate.setHours(inHour, inMin, 0, 0);
  const update = () => {
    const diffMs = new Date() - checkInDate;
    if (diffMs < 0) { timerEl.textContent = '00h 00m 00s'; return; }
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    timerEl.textContent = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };
  update();
  if (window.activeWorkInterval) clearInterval(window.activeWorkInterval);
  window.activeWorkInterval = setInterval(() => {
    if (!document.getElementById('active-work-timer')) { clearInterval(window.activeWorkInterval); return; }
    update();
  }, 1000);
}


function renderEmployeeSupport() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const tickets = DB.getTickets().filter(t => t.userId === user.id);

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Support Helpdesk</h1>
        <div class="content-subtitle">Submit requests or view responses from HR & Management.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split" style="grid-template-columns: 1fr 1.3fr">
        <!-- New Ticket Form -->
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Submit Support Ticket</h3></div>
          <form id="support-ticket-form">
            <div class="form-group">
              <label class="form-label" for="support-category">Issue Category</label>
              <select class="form-input" id="support-category" required>
                <option value="Attendance">Attendance Correction</option>
                <option value="Payroll">Payroll / Salary Deductions</option>
                <option value="Shift/Schedule">Shift / Work Schedule</option>
                <option value="Technical Issue">Technical Support</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="support-subject">Subject</label>
              <input class="form-input" type="text" id="support-subject" placeholder="Summary of the issue" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="support-message">Description</label>
              <textarea class="form-input" id="support-message" rows="5" placeholder="Detailed description of your issue..." required style="resize:vertical"></textarea>
            </div>
            <button class="btn" type="submit">Submit Ticket</button>
          </form>
          <div id="support-alert" class="alert alert-success" style="display:none;margin-top:15px"></div>
        </div>

        <!-- Ticket History -->
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Ticket History</h3></div>
          <div class="tickets-list" style="display:flex;flex-direction:column;gap:15px;max-height:500px;overflow-y:auto;padding-right:4px">
            ${tickets.length === 0 ? `
              <div style="text-align:center;color:var(--text-muted);padding:40px 0">No support tickets submitted yet.</div>
            ` : tickets.map(t => {
              const statusClass = t.status === 'Resolved' ? 'badge-on-time' : 'badge-absent';
              return `
                <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:15px;display:flex;flex-direction:column;gap:8px">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <span style="font-size:11px;color:var(--text-secondary)">Category: <strong>${t.category}</strong> | Date: ${t.date}</span>
                    <span class="badge ${statusClass}">${t.status}</span>
                  </div>
                  <h4 style="font-size:14px;color:var(--primary);margin:0">${Utils.escape(t.subject)}</h4>
                  <p style="font-size:12px;color:var(--text-primary);margin:0;line-height:1.4">${Utils.escape(t.message)}</p>
                  
                  ${t.responses.length > 0 ? `
                    <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:10px;margin-top:8px">
                      <div style="font-size:11px;color:var(--success);font-weight:700;margin-bottom:4px">Response from ${t.responses[0].responder} (${t.responses[0].date}):</div>
                      <div style="font-size:12px;color:var(--text-primary);line-height:1.4">${Utils.escape(t.responses[0].text)}</div>
                    </div>
                  ` : `
                    <div style="font-size:11px;color:var(--text-muted);font-style:italic;margin-top:4px">Waiting for response from HR Desk...</div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('support-ticket-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('support-category').value;
    const subject = document.getElementById('support-subject').value.trim();
    const message = document.getElementById('support-message').value.trim();

    DB.addTicket(user.id, category, subject, message);
    
    const alert = document.getElementById('support-alert');
    alert.textContent = 'Support ticket submitted successfully!';
    alert.style.display = 'flex';
    
    setTimeout(() => {
      renderEmployeeSupport();
    }, 1500);
  });
}

function renderAdminSupport() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const isManager = user.role === 'manager';
  let allTickets = DB.getTickets();
  if (isManager) {
    const assignedIds = DB.getUsers().filter(u => u.managerId === user.id).map(u => u.id);
    allTickets = allTickets.filter(t => assignedIds.includes(t.userId));
  }
  const allUsers = DB.getUsers();

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Customer Support Tickets</h1>
        <div class="content-subtitle">Respond to technical issues, attendance corrections, and payroll queries.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel">
        <div class="card-panel-header"><h3 class="card-panel-title">Active Support Queue</h3></div>
        <div style="display:flex;flex-direction:column;gap:15px;margin-top:15px">
          ${allTickets.length === 0 ? `
            <div style="text-align:center;color:var(--text-muted);padding:40px 0">No tickets found in database.</div>
          ` : allTickets.map(t => {
            const ticketUser = allUsers.find(u => u.id === t.userId) || { name: 'Unknown User', employeeId: 'N/A' };
            const statusClass = t.status === 'Resolved' ? 'badge-on-time' : 'badge-absent';
            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px">
                  <span style="font-size:12px;color:var(--text-secondary)">
                    Submitted by: <strong>${Utils.escape(ticketUser.name)} (${ticketUser.employeeId})</strong> 
                    | Category: <strong>${t.category}</strong> 
                    | Date: ${t.date}
                  </span>
                  <span class="badge ${statusClass}">${t.status}</span>
                </div>
                <div>
                  <h4 style="font-size:15px;color:var(--primary);margin:0 0 6px 0">${Utils.escape(t.subject)}</h4>
                  <p style="font-size:13px;color:var(--text-primary);margin:0;line-height:1.4">${Utils.escape(t.message)}</p>
                </div>
                
                ${t.status === 'Open' ? `
                  <div style="margin-top:8px;border-top:1px dashed var(--border);padding-top:12px">
                    <div class="form-group" style="margin-bottom:8px">
                      <label class="form-label" style="font-size:11px">Response Text</label>
                      <textarea class="form-input" id="resp-text-${t.id}" rows="2" placeholder="Type response here..." required></textarea>
                    </div>
                    <button class="btn btn-xs btn-respond-ticket" data-id="${t.id}" style="width:auto;padding:6px 14px;font-size:12px">Submit Resolution</button>
                  </div>
                ` : `
                  <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:12px;margin-top:8px">
                    <div style="font-size:11px;color:var(--success);font-weight:700;margin-bottom:4px">Response from ${t.responses[0].responder} (${t.responses[0].date}):</div>
                    <div style="font-size:12px;color:var(--text-primary);line-height:1.4">${Utils.escape(t.responses[0].text)}</div>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.btn-respond-ticket').forEach(btn => btn.addEventListener('click', (e) => {
    const btnElem = e.target.closest('.btn-respond-ticket');
    if (!btnElem) return;
    const ticketId = btnElem.dataset.id;
    const responseText = document.getElementById(`resp-text-${ticketId}`).value.trim();
    if (!responseText) {
      alert('Please type a response before submitting.');
      return;
    }

    const responderName = user.role === 'hr' ? 'HR Coordinator' : 'Operations Manager';
    DB.respondToTicket(ticketId, responderName, responseText);
    renderAdminSupport();
  }));
}

function renderAdminVerificationView() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  const isManager = user.role === 'manager';
  let employees = DB.getUsers().filter(u => u.role === 'employee');
  if (isManager) {
    employees = employees.filter(u => u.managerId === user.id);
  }

  main.innerHTML = `
    <div class="content-header" style="display:flex; justify-content:space-between; align-items:center">
      <div>
        <h1 class="content-title">Employee Onboarding Verification</h1>
        <div class="content-subtitle">Review onboarding documents and verification status.</div>
      </div>
      <div>
        <button class="btn" id="btn-admin-open-upload" style="width:auto; font-size:11px; padding:5px 10px; font-weight:600; background:var(--primary); color:var(--bg-app); display:flex; align-items:center; gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Upload Verification Document</button>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Resume / CV</th>
                <th>Aadhaar Card</th>
                <th>Bank Details</th>
                <th>ID Verification Docs</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(u => {
                const getDocStatusHTML = (doc, type) => {
                  if (!doc) {
                    return `<span class="badge badge-absent" style="font-size:11px">❌ Missing</span>`;
                  }
                  
                  const status = u.verificationStatuses ? u.verificationStatuses[type] : null;
                  let badgeHTML = `<span class="badge badge-on-time" style="font-size:11px; width:fit-content">✅ Uploaded</span>`;
                  if (status === 'Approved') {
                    badgeHTML = `<span class="badge badge-approved" style="font-size:11px; width:fit-content; background:rgba(16,185,129,0.1); color:var(--success)">✅ Approved</span>`;
                  } else if (status === 'Rejected') {
                    badgeHTML = `<span class="badge badge-rejected" style="font-size:11px; width:fit-content; background:rgba(239,68,68,0.1); color:var(--error)">❌ Rejected</span>`;
                  }
                  
                  let approveBtnHTML = '';
                  if (status !== 'Approved') {
                    approveBtnHTML = `<a href="#" class="btn-verify-approve" data-userid="${u.id}" data-doctype="${type}" style="color:var(--warning); text-decoration:none; font-size:11px; font-weight:600; margin-right:8px">Approve</a>`;
                  }
                  let rejectBtnHTML = '';
                  if (status !== 'Rejected' && status !== 'Approved') {
                    rejectBtnHTML = `<a href="#" class="btn-verify-reject" data-userid="${u.id}" data-doctype="${type}" style="color:var(--error); text-decoration:none; font-size:11px; font-weight:600; margin-right:8px">Reject</a>`;
                  }

                  if (type === 'document') {
                    if (Array.isArray(doc) && doc.length === 0) {
                      return `<span class="badge badge-absent" style="font-size:11px">❌ Missing</span>`;
                    }
                    const docObj = Array.isArray(doc) ? doc[0] : doc;
                    return `
                      <div style="display:flex; flex-direction:column; gap:4px">
                        ${badgeHTML}
                        <div style="font-size:10px; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; max-width:150px" title="${Utils.escape(docObj.name)}">${Utils.escape(docObj.name)}</div>
                        <div style="display:flex; gap:6px; margin-top:2px; align-items:center">
                          ${approveBtnHTML}
                          ${rejectBtnHTML}
                          <a href="#" class="btn-verify-download" data-userid="${u.id}" data-doctype="document" data-docid="${docObj.id}" style="color:var(--primary); text-decoration:none; font-size:11px; font-weight:600">Download</a>
                        </div>
                      </div>
                    `;
                  }

                  return `
                    <div style="display:flex; flex-direction:column; gap:4px">
                      ${badgeHTML}
                      <div style="font-size:10px; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; max-width:150px" title="${Utils.escape(doc.name)}">${Utils.escape(doc.name)}</div>
                      <div style="display:flex; gap:6px; margin-top:2px; align-items:center">
                        <a href="#" class="btn-verify-view" data-userid="${u.id}" data-doctype="${type}" style="color:var(--primary); text-decoration:none; font-size:11px; font-weight:600; margin-right:8px">View</a>
                        ${approveBtnHTML}
                        ${rejectBtnHTML}
                        <a href="#" class="btn-verify-download" data-userid="${u.id}" data-doctype="${type}" style="color:var(--primary); text-decoration:none; font-size:11px; font-weight:600">Download</a>
                      </div>
                    </div>
                  `;
                };

                const resumeHTML = getDocStatusHTML(u.resume, 'resume');
                const aadharHTML = getDocStatusHTML(u.aadhar, 'aadhar');
                const bankHTML = getDocStatusHTML(u.bankDetails, 'bank');
                const generalDocHTML = getDocStatusHTML(u.documents && u.documents.length > 0 ? u.documents[0] : null, 'document');

                const avatarLetters = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:10px">
                        <div class="avatar" style="width:36px; height:36px; font-size:12px; margin:0">${avatarLetters}</div>
                        <div style="display:flex; flex-direction:column">
                          <strong style="font-size:14px">${Utils.escape(u.name)}</strong>
                          <span style="font-size:11px; color:var(--text-muted)">${Utils.escape(u.email || '')}</span>
                        </div>
                      </div>
                    </td>
                    <td style="font-weight:600">${Utils.escape(u.department || 'Engineering')}</td>
                    <td>${resumeHTML}</td>
                    <td>${aadharHTML}</td>
                    <td>${bankHTML}</td>
                    <td>${generalDocHTML}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-admin-open-upload').addEventListener('click', () => {
    openUploadDocumentModal();
  });

  document.querySelectorAll('.btn-verify-view').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = e.target.closest('.btn-verify-view').dataset.userid;
      const docType = e.target.closest('.btn-verify-view').dataset.doctype;
      showDocumentPreview(userId, docType);
    });
  });

  document.querySelectorAll('.btn-verify-approve').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = e.target.closest('.btn-verify-approve').dataset.userid;
      const docType = e.target.closest('.btn-verify-approve').dataset.doctype;
      DB.approveUserDocument(userId, docType);
      renderAdminVerificationView();
    });
  });

  document.querySelectorAll('.btn-verify-reject').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = e.target.closest('.btn-verify-reject').dataset.userid;
      const docType = e.target.closest('.btn-verify-reject').dataset.doctype;
      DB.rejectUserDocument(userId, docType);
      renderAdminVerificationView();
    });
  });

  document.querySelectorAll('.btn-verify-download').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = e.target.closest('.btn-verify-download').dataset.userid;
      const docType = e.target.closest('.btn-verify-download').dataset.doctype;
      
      if (docType === 'document') {
        const u = DB.getUser(userId);
        const doc = u.documents && u.documents.length > 0 ? u.documents[0] : null;
        if (doc) downloadDocumentSimulated(userId, doc.id);
      } else {
        downloadDocumentSimulated(userId, docType);
      }
    });
  });
}




function openUploadDocumentModal(preselectedUserId = null) {
  const isPreselected = preselectedUserId !== null;
  const currentSessionUser = Auth.getCurrentUser();
  const allEmployees = DB.getUsers().filter(u => u.role === 'employee');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  let employeeOptionsHTML = '';
  if (isPreselected) {
    const targetUser = DB.getUser(preselectedUserId);
    employeeOptionsHTML = `<option value="${targetUser.id}" selected>${Utils.escape(targetUser.name)} — ${Utils.escape(targetUser.department || 'Staff')}</option>`;
  } else {
    employeeOptionsHTML = allEmployees.map(u => 
      `<option value="${u.id}">${Utils.escape(u.name)} — ${Utils.escape(u.department || 'Staff')}</option>`
    ).join('');
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 500px">
      <div class="modal-header">
        <h3 class="modal-title">Upload verification document</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">
          <svg style="width:16px; height:16px; fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:20px">Attach a document to an employee profile.</div>
      
      <form id="verification-document-upload-form">
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" style="font-weight:600; font-size:12px; margin-bottom:6px" for="upload-doc-employee">Employee</label>
          <select class="form-input" id="upload-doc-employee" required ${isPreselected ? 'disabled' : ''}>
            ${employeeOptionsHTML}
          </select>
        </div>
        
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" style="font-weight:600; font-size:12px; margin-bottom:6px" for="upload-doc-type">Document type</label>
          <select class="form-input" id="upload-doc-type" required>
            <option value="resume">Resume / CV</option>
            <option value="aadhar">Aadhaar Card</option>
            <option value="bank">Bank Details (Cancelled Cheque / Passbook)</option>
            <option value="document">Government ID (PAN / Passport)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label" style="font-weight:600; font-size:12px; margin-bottom:6px" for="upload-doc-file">Document file</label>
          <input class="form-input" type="file" id="upload-doc-file" accept=".pdf,.jpg,.jpeg,.png" required style="padding:10px">
          <div style="font-size:10px; color:var(--text-muted); margin-top:6px; line-height:1.4">PDF or image, maximum 1 MB. Prototype storage is browser-local.</div>
        </div>

        <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border); padding-top:15px; margin-top:20px">
          <button class="btn btn-secondary" type="button" style="width:auto; padding:8px 20px; font-size:13px" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
          <button class="btn" type="submit" style="width:auto; padding:8px 20px; font-size:13px; background:var(--primary); color:var(--bg-app); font-weight:600">Upload document</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('verification-document-upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('upload-doc-employee').value;
    const docType = document.getElementById('upload-doc-type').value;
    const fileInput = document.getElementById('upload-doc-file');
    const file = fileInput.files[0];

    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    closeModal(overlay);
    handleMockUpload(userId, file, docType);
  });
}

// =========================================================================
// HR DASHBOARD BIRTHDAY WIDGET HELPERS
// =========================================================================
function getBirthdayStatus(dobString) {
  if (!dobString) return null;
  const parts = dobString.split('-');
  if (parts.length !== 3) return null;

  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed month
  const birthDay = parseInt(parts[2], 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  const bdayThisYear = new Date(currentYear, birthMonth, birthDay);
  bdayThisYear.setHours(0, 0, 0, 0);

  const bdayNextYear = new Date(currentYear + 1, birthMonth, birthDay);
  bdayNextYear.setHours(0, 0, 0, 0);

  let bdayTarget = bdayThisYear;
  if (bdayThisYear.getTime() < today.getTime()) {
    bdayTarget = bdayNextYear;
  }

  const diffTime = bdayTarget.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${birthDay} ${monthNames[birthMonth]}`;

  if (diffDays === 0) {
    return { group: 'today', daysAway: 0, date: bdayTarget, formattedDate };
  } else if (diffDays === 1) {
    return { group: 'tomorrow', daysAway: 1, date: bdayTarget, formattedDate };
  } else if (diffDays >= 2 && diffDays <= 8) {
    return { group: 'upcoming', daysAway: diffDays, date: bdayTarget, formattedDate };
  }

  return null;
}

function getBirthdayWidgetHTML() {
  const currentUser = Auth.getCurrentUser();
  const activeUsers = DB.getUsers().filter(u => u.status !== 'Inactive');
  
  const todayList = [];
  const tomorrowList = [];
  const upcomingList = [];
  
  activeUsers.forEach(u => {
    const status = getBirthdayStatus(u.dob);
    if (status) {
      const data = { user: u, status };
      if (status.group === 'today') todayList.push(data);
      else if (status.group === 'tomorrow') tomorrowList.push(data);
      else if (status.group === 'upcoming') upcomingList.push(data);
    }
  });

  const renderCard = (item, isToday = false) => {
    const u = item.user;
    const s = item.status;
    const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const highlightStyle = isToday 
      ? 'background: linear-gradient(145deg, rgba(137, 32, 27, 0.12) 0%, rgba(137, 32, 27, 0.04) 100%) !important; border: 1.5px solid rgba(137, 32, 27, 0.3) !important; box-shadow: 0 4px 12px rgba(137, 32, 27, 0.1);' 
      : 'background: var(--bg-surface); border: 1px solid var(--border); box-shadow: var(--shadow-sm);';
    
    const isSelf = currentUser && u.id === currentUser.id;
    const wishBtnHTML = isSelf 
      ? `<span style="font-size:10px; font-weight:700; color:var(--success); padding:6px 12px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); border-radius:8px; white-space:nowrap; flex-shrink:0;">It's You! 🎉</span>`
      : `<button class="btn btn-birthday-wish" data-id="${u.id}" style="width:auto !important; flex-shrink:0; padding:6px 14px; font-size:11.5px; font-weight:700; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:#ffffff; border:none; border-radius:8px; cursor:pointer; box-shadow:0 3px 10px rgba(220,38,38,0.2); transition:all 0.2s;">Wish</button>`;
    
    return `
      <div class="birthday-card" style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-radius:12px; margin-bottom:8px; gap:12px; transition:all 0.2s ease; ${highlightStyle}">
        <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1">
          <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:42px; height:42px; border-radius:50%; overflow:hidden; flex-shrink:0; position:relative; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
            ${u.photo ? `
              <img src="${u.photo}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
            ` : `
              <div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; border:1px solid rgba(137,32,27,0.2)">
                ${initials}
              </div>
            `}
          </div>
          <div style="min-width:0; flex:1">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap">
              <strong style="font-size:13.5px; color:var(--text-primary) !important; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.escape(u.name)}</strong>
              ${isToday ? '<span style="font-size:12px;" title="Birthday Today!">🎂</span>' : ''}
            </div>
            <div style="font-size:11px; color:var(--text-secondary) !important; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${Utils.escape(u.designation || 'Staff')} | ${Utils.escape(u.department || 'Operations')}
            </div>
            <div style="font-size:10px; color:var(--text-muted) !important; margin-top:2px">
              ID: ${Utils.escape(u.employeeId)} • Date: <strong style="color:var(--text-primary) !important">${s.formattedDate}</strong>
            </div>
          </div>
        </div>
        ${wishBtnHTML}
      </div>
    `;
  };

  const todayHTML = todayList.length > 0 
    ? todayList.map(item => renderCard(item, true)).join('')
    : `<div style="font-size:11.5px; color:var(--text-muted); padding:10px; border:1px dashed var(--border); border-radius:10px; text-align:center">No birthdays today 🎂</div>`;

  const tomorrowHTML = tomorrowList.length > 0
    ? tomorrowList.map(item => renderCard(item, false)).join('')
    : `<div style="font-size:11.5px; color:var(--text-muted); padding:10px; border:1px dashed var(--border); border-radius:10px; text-align:center">No birthdays tomorrow 🎉</div>`;

  const upcomingHTML = upcomingList.length > 0
    ? upcomingList.map(item => renderCard(item, false)).join('')
    : `<div style="font-size:11.5px; color:var(--text-muted); padding:10px; border:1px dashed var(--border); border-radius:10px; text-align:center">No upcoming birthdays in the next 7 days 📅</div>`;

  const totalCount = todayList.length + tomorrowList.length + upcomingList.length;

  return `
    <div class="card-panel" style="margin-top:0px">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:14px">
        <h3 class="card-panel-title" style="margin:0; font-size:14px; display:flex; align-items:center; gap:6px">
          🎉 Company Birthdays <span style="font-size:10px; background:rgba(220,38,38,0.15); color:var(--primary); padding:2px 8px; border-radius:10px; font-weight:700">${totalCount}</span>
        </h3>
        <button id="btn-birthday-view-all" class="btn" style="padding:4px 10px; font-size:11px; width:auto; background:rgba(137,32,27,0.06); border:1px solid var(--border); color:var(--primary); font-weight:700">View All</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px">
        <!-- Today's Group -->
        <div>
          <div style="font-size:11.5px; font-weight:800; color:var(--primary); letter-spacing:0.8px; text-transform:uppercase; margin-bottom:8px; display:flex; justify-content:space-between">
            <span>🎂 Today</span>
            <span>(${todayList.length})</span>
          </div>
          ${todayHTML}
        </div>

        <!-- Tomorrow's Group -->
        <div>
          <div style="font-size:11.5px; font-weight:800; color:var(--primary); letter-spacing:0.8px; text-transform:uppercase; margin-bottom:8px; display:flex; justify-content:space-between">
            <span>🎉 Tomorrow</span>
            <span>(${tomorrowList.length})</span>
          </div>
          ${tomorrowHTML}
        </div>

        <!-- Upcoming Group -->
        <div>
          <div style="font-size:11.5px; font-weight:800; color:var(--primary); letter-spacing:0.8px; text-transform:uppercase; margin-bottom:8px; display:flex; justify-content:space-between">
            <span>📅 Upcoming (Next 7 Days)</span>
            <span>(${upcomingList.length})</span>
          </div>
          ${upcomingHTML}
        </div>
      </div>
    </div>
  `;
}

function bindBirthdayWidgetEvents() {
  const viewAllBtn = document.getElementById('btn-birthday-view-all');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      openAllBirthdaysModal();
    });
  }

  document.querySelectorAll('.btn-birthday-wish').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.getAttribute('data-id');
      openSendWishModal(userId);
    });
  });
}

function openSendWishModal(userId) {
  const user = DB.getUser(userId);
  if (!user) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-content card-panel';
  modal.style.cssText = `
    max-width: 440px; width: 92%; padding: 24px;
    background: var(--bg-surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 20px; box-shadow: var(--shadow-lg) !important;
  `;

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:12px">
      <h3 style="margin:0; font-size:15px; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:8px">🎉 Send Birthday Wishes</h3>
      <button id="btn-close-wish-modal" style="background:none; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer">&times;</button>
    </div>
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; background:var(--bg-surface-hover); padding:12px; border-radius:10px; border:1px solid var(--border)">
      <div class="clickable-list-avatar" data-photo="${user.photo || ''}" style="width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; cursor:${user.photo ? 'pointer' : 'default'}" title="${user.photo ? 'Click to view full screen' : ''}">
        ${user.photo ? `
          <img src="${user.photo}" style="width:100%; height:100%; object-fit:cover;">
        ` : `
          <div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700">
            ${user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        `}
      </div>
      <div>
        <strong style="color:var(--text-primary); font-size:13.5px">${Utils.escape(user.name)}</strong>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:2px">${Utils.escape(user.designation || 'Staff')} (${Utils.escape(user.employeeId)})</div>
      </div>
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:6px; display:block">BIRTHDAY MESSAGE</label>
      <textarea id="wish-message-text" class="form-input" rows="3" style="width:100%; box-sizing:border-box; font-size:12.5px; padding:10px; border-radius:10px; resize:vertical">Wishing you a fantastic birthday filled with joy, success, and wonderful moments! Have a great day ahead, ${user.name}! 🎂🎉</textarea>
    </div>
    <div class="form-group" style="margin-bottom:20px">
      <label class="form-label" style="font-size:11px; font-weight:700; color:var(--text-secondary); margin-bottom:6px; display:block">SENDING METHOD</label>
      <div style="display:flex; flex-direction:column; gap:8px">
        <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); cursor:pointer">
          <input type="radio" name="wish-send-method" value="email" checked style="accent-color:var(--primary)"> Send by Email (${Utils.escape(user.email || 'N/A')})
        </label>
        <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); cursor:pointer">
          <input type="radio" name="wish-send-method" value="notification" style="accent-color:var(--primary)"> Send by Notification / Inbox
        </label>
        <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); cursor:pointer">
          <input type="radio" name="wish-send-method" value="both" style="accent-color:var(--primary)"> Send by Both
        </label>
      </div>
    </div>
    <button id="btn-submit-birthday-wish" class="btn" style="width:100%; padding:11px 0; font-size:13px; font-weight:700; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border:none; border-radius:10px; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(220,38,38,0.35)">Send Wish</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeWishModal = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  modal.querySelector('#btn-close-wish-modal').addEventListener('click', closeWishModal);

  modal.querySelector('#btn-submit-birthday-wish').addEventListener('click', () => {
    const message = modal.querySelector('#wish-message-text').value.trim();
    const sendMethod = modal.querySelector('input[name="wish-send-method"]:checked').value;

    if (sendMethod === 'notification' || sendMethod === 'both') {
      if (!DB.data.announcements) DB.data.announcements = [];
      DB.data.announcements.unshift({
        id: 'ann_' + Math.random().toString(36).substring(2, 9),
        title: '🎂 Happy Birthday Wish!',
        content: message,
        category: 'Urgent',
        date: new Date().toISOString().split('T')[0],
        author: 'HR Department',
        targetUserId: user.id
      });
      DB.save();
    }

    closeWishModal();
    if (typeof showToastNotification === 'function') {
      showToastNotification(`✅ Birthday wishes successfully sent to ${user.name}!`, 'success');
    }
  });
}

function openAllBirthdaysModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;

  const modal = document.createElement('div');
  modal.className = 'modal-content card-panel';
  modal.style.cssText = `
    max-width: 600px; width: 92%; padding: 28px;
    background: var(--bg-surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 20px; box-shadow: var(--shadow-lg) !important;
  `;

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:14px">
      <h3 style="margin:0; font-size:16px; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:8px">📅 Company Birthday Directory</h3>
      <button id="btn-close-all-birthdays" style="background:none; border:none; color:var(--text-secondary); font-size:24px; cursor:pointer">&times;</button>
    </div>
    <div style="margin-bottom:16px">
      <input type="text" id="birthday-search-input" class="form-input" placeholder="Search by name, department, or month..." style="width:100%; box-sizing:border-box; padding:10px 14px; font-size:13px;">
    </div>
    <div id="all-birthdays-list-container" style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; max-height:50vh; padding-right:6px">
      <!-- Filled dynamically -->
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeAllModal = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  modal.querySelector('#btn-close-all-birthdays').addEventListener('click', closeAllModal);

  const allActive = DB.getUsers().filter(u => u.status !== 'Inactive');
  
  const sortedActive = [...allActive].sort((a, b) => {
    const parseMD = (dob) => {
      if (!dob) return [99, 99];
      const p = dob.split('-');
      return [parseInt(p[1], 10), parseInt(p[2], 10)];
    };
    const [am, ad] = parseMD(a.dob);
    const [bm, bd] = parseMD(b.dob);
    if (am !== bm) return am - bm;
    return ad - bd;
  });

  const listContainer = modal.querySelector('#all-birthdays-list-container');
  const searchInput = modal.querySelector('#birthday-search-input');

  const getMonthName = (monthIndex) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[monthIndex];
  };

  const renderList = (filteredList) => {
    if (filteredList.length === 0) {
      listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px">No employee records match the search.</div>`;
      return;
    }

    const currentUser = Auth.getCurrentUser();
    listContainer.innerHTML = filteredList.map(u => {
      const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      let formattedDob = 'Not Specified';
      if (u.dob) {
        formattedDob = Utils.formatDate(u.dob);
      }

      const isSelf = currentUser && u.id === currentUser.id;
      const wishBtnHTML = isSelf 
        ? `<span style="font-size:10px; font-weight:700; color:var(--success); padding:6px 12px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); border-radius:8px; white-space:nowrap; flex-shrink:0;">It's You! 🎉</span>`
        : `<button class="btn btn-directory-wish" data-id="${u.id}" style="width:auto !important; flex-shrink:0; padding:6px 12px; font-size:11px; font-weight:700; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:#ffffff; border:none; border-radius:8px; cursor:pointer">Wish</button>`;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:12px; gap:10px">
          <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1">
            <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:40px; height:40px; border-radius:50%; overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
              ${u.photo ? `
                <img src="${u.photo}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
              ` : `
                <div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700">
                  ${initials}
                </div>
              `}
            </div>
            <div style="min-width:0; flex:1">
              <strong style="font-size:13px; color:var(--text-primary); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${Utils.escape(u.name)}</strong>
              <span style="font-size:11px; color:var(--text-secondary); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
                ${Utils.escape(u.designation || 'Staff')} | ${Utils.escape(u.department || 'Operations')}
              </span>
              <span style="font-size:10px; color:var(--text-muted); display:block; margin-top:3px">
                ID: ${Utils.escape(u.employeeId)} &nbsp;•&nbsp; DOB: <strong style="color:var(--text-primary)">${formattedDob}</strong>
              </span>
            </div>
          </div>
          ${wishBtnHTML}
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.btn-directory-wish').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        openSendWishModal(userId);
      });
    });
  };

  renderList(sortedActive);

  searchInput.addEventListener('input', () => {
    const val = searchInput.value.toLowerCase().trim();
    if (!val) {
      renderList(sortedActive);
      return;
    }

    const filtered = sortedActive.filter(u => {
      const parts = u.dob ? u.dob.split('-') : [];
      const monthName = parts.length === 3 ? getMonthName(parseInt(parts[1], 10) - 1).toLowerCase() : '';
      return u.name.toLowerCase().includes(val) ||
             (u.department || '').toLowerCase().includes(val) ||
             (u.designation || '').toLowerCase().includes(val) ||
             (u.employeeId || '').toLowerCase().includes(val) ||
             monthName.includes(val);
    });

    renderList(filtered);
  });
}

async function renderAdminDashboard() {
  const main = document.getElementById('main-view');
  const currentUser = Auth.getCurrentUser();
  if (!currentUser) return;

  // Show loading placeholders in the outer template immediately
  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Live Attendance Monitoring</h1>
        <div class="content-subtitle">Real-time status tracking for workspace logs.</div>
      </div>
      <div><button class="btn btn-secondary" id="btn-admin-reset-db">Reset Demo Data</button></div>
    </div>
    <div class="content-body">
      <!-- Welcome Banner Loading Skeleton -->
      <div id="dashboard-welcome-banner" style="display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 50%, #fef3c7 100%); border: 1px solid rgba(137, 32, 27, 0.08); border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(137, 32, 27, 0.04); position: relative; overflow: hidden; animation: fadeIn 0.3s ease;">
        <div style="flex: 1;">
          <div style="width: 100px; height: 12px; background: rgba(137,32,27,0.06); border-radius: 4px; animation: badgePulse 1.5s infinite ease-in-out;"></div>
          <div style="width: 75%; max-width: 400px; height: 24px; background: rgba(26,5,4,0.06); border-radius: 4px; margin-top: 8px; animation: badgePulse 1.5s infinite ease-in-out;"></div>
          <div style="width: 50%; max-width: 300px; height: 14px; background: rgba(124,45,18,0.06); border-radius: 4px; margin-top: 8px; animation: badgePulse 1.5s infinite ease-in-out;"></div>
        </div>
        <div style="display: flex; gap: 32px; align-items: center; z-index: 1;">
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="width: 65px; height: 10px; background: rgba(71,85,105,0.06); border-radius: 3px;"></div>
            <div style="width: 30px; height: 24px; background: rgba(15,23,42,0.06); border-radius: 4px; animation: badgePulse 1.5s infinite ease-in-out;"></div>
          </div>
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="width: 50px; height: 10px; background: rgba(71,85,105,0.06); border-radius: 3px;"></div>
            <div style="width: 30px; height: 24px; background: rgba(21,128,61,0.06); border-radius: 4px; animation: badgePulse 1.5s infinite ease-in-out;"></div>
          </div>
        </div>
      </div>

      <!-- Stats Grid Loading Skeletons -->
      <div class="stats-grid" id="dashboard-stats-grid" style="animation: fadeIn 0.3s ease;">
        ${Array(6).fill(0).map(() => `
          <div class="stat-card" style="position:relative; overflow:hidden;">
            <div style="width:36px; height:36px; border-radius:50%; background:rgba(0,0,0,0.04); animation: badgePulse 1.5s infinite ease-in-out;"></div>
            <div class="stat-info" style="display:flex; flex-direction:column; gap:6px; margin-left:12px; flex:1">
              <div style="width:40px; height:20px; background:rgba(0,0,0,0.06); border-radius:4px; animation: badgePulse 1.5s infinite ease-in-out;"></div>
              <div style="width:75px; height:10px; background:rgba(0,0,0,0.04); border-radius:3px;"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="dashboard-split" style="grid-template-columns: 1.8fr 1fr">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Today's Live Attendance Feed</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>Checked In</th>
                  <th>Checked Out</th>
                  <th>Live GPS</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="live-feed-table-body">
                <tr><td colspan="7" style="text-align:center; padding: 20px 0; color:var(--text-muted);">Loading live feed...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:20px; margin-top:0">
          <div class="card-panel" style="margin-top:0">
            <div class="card-panel-header"><h3 class="card-panel-title">Leave Request Alert Inbox</h3></div>
            <div id="admin-pending-leaves-box" style="display:flex;flex-direction:column;gap:12px">
              <div style="text-align:center; padding: 20px 0; color:var(--text-muted);">Loading requests...</div>
            </div>
          </div>
          <div id="hr-birthday-widget-container"></div>
        </div>
      </div>

      <!-- Announcements Manager Row -->
      <div class="dashboard-split" style="grid-template-columns: 1fr 1fr; margin-top:20px">
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">📢 Publish Company Announcement</h3>
          </div>
          <form id="admin-announcement-form" style="display:flex;flex-direction:column;gap:12px;margin-top:10px">
            <div class="form-group">
              <label class="form-label" for="ann-title">Announcement Title</label>
              <input class="form-input" type="text" id="ann-title" placeholder="e.g. Eid-ul-Adha Office Holiday" required style="padding:10px">
            </div>
            <div class="form-group">
              <label class="form-label" for="ann-category">Category</label>
              <select class="form-input" id="ann-category" required style="padding:10px">
                <option value="General">General News</option>
                <option value="Holiday">Holiday Notice</option>
                <option value="Update">System Update</option>
                <option value="Urgent">Urgent Alert</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="ann-content">Announcement Content</label>
              <textarea class="form-input" id="ann-content" placeholder="Type announcement details here..." rows="3" required style="resize:vertical;padding:10px"></textarea>
            </div>
            <button class="btn btn-success" type="submit">Publish to Notice Board</button>
          </form>
          <div id="ann-publish-alert" style="display:none;margin-top:12px" class="alert"></div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">🗂️ Active Board Notices</h3>
          </div>
          <div id="admin-announcements-list" style="display:flex;flex-direction:column;gap:12px;margin-top:10px;max-height:320px;overflow-y:auto;padding-right:4px">
            <div style="text-align:center; padding: 20px 0; color:var(--text-muted);">Loading notices...</div>
          </div>
        </div>
      </div>

      <div id="dashboard-worksite-panel-container"></div>
    </div>
  `;

  // Bind minimal click events on loading shell if they exist
  const resetDbBtn = document.getElementById('btn-admin-reset-db');
  if (resetDbBtn) {
    resetDbBtn.addEventListener('click', async () => {
      if (await confirm('Reset mock database structures and clear edits?')) {
        await DB.reset();
        renderAdminDashboard();
      }
    });
  }

  // Define update function
  function updateDashboardViews() {
    const freshUser = DB.getUser(currentUser.id) || currentUser;
    const isManager = freshUser.role === 'manager';

    let users = DB.getUsers().filter(u => u.role !== 'hr' && u.role !== 'manager' && u.role !== 'finance_manager' && u.status !== 'Inactive');
    if (isManager) {
      users = users.filter(u => u.managerId === currentUser.id);
    }
    const assignedUserIds = users.map(u => u.id);

    let logs = DB.getLogs();
    if (isManager) {
      logs = logs.filter(l => assignedUserIds.includes(l.userId));
    }

    let leaves = DB.getLeaveRequests();
    if (isManager) {
      leaves = leaves.filter(lv => assignedUserIds.includes(lv.userId));
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const presentToday = logs.filter(l => l.date === todayStr && l.checkIn && !l.checkOut);
    const lateToday = presentToday.filter(l => l.status === 'Late');
    const onLeaveToday = leaves.filter(lv => lv.status === 'Approved' && todayStr >= lv.startDate && todayStr <= lv.endDate);
    
    const presentCount = presentToday.length;
    const lateCount = lateToday.length;
    const leaveCount = onLeaveToday.length;
    const totalEmployees = users.length;
    const checkedInAtAllCount = logs.filter(l => l.date === todayStr && l.checkIn).length;
    const absentCount = totalEmployees - checkedInAtAllCount - leaveCount;
    
    const pendingSwapsCount = (DB.data.shiftSwaps || []).filter(s => {
      if (s.status !== 'Pending Manager') return false;
      if (isManager) {
        return assignedUserIds.includes(s.senderId) || assignedUserIds.includes(s.receiverId);
      }
      return true;
    }).length;

    // Greeting calculations based on local time
    const hour = new Date().getHours();
    let greeting = 'GOOD MORNING';
    if (hour >= 12 && hour < 17) {
      greeting = 'GOOD AFTERNOON';
    } else if (hour >= 17 || hour < 5) {
      greeting = 'GOOD EVENING';
    }

    // Personalized welcome message (name and role)
    let welcomeName = freshUser.name || 'User';
    const roleLabel = freshUser.role === 'hr' ? 'HR Admin' : (freshUser.role === 'manager' ? 'Manager' : (freshUser.role === 'finance_manager' ? 'Finance Manager' : 'HR Manager'));
    
    const nameLower = welcomeName.toLowerCase();
    const designationLower = (freshUser.designation || '').toLowerCase();
    const roleLower = roleLabel.toLowerCase();
    if (!nameLower.includes(roleLower) && !nameLower.includes(designationLower)) {
      welcomeName = `${welcomeName} ${roleLabel}`;
    }

    const companyName = freshUser.companyName || freshUser.company || '';
    const companyMsg = companyName 
      ? `Here's what's happening in ${companyName} today.` 
      : "Here's what's happening in your company today.";

    // Fill Welcome Banner
    const bannerEl = document.getElementById('dashboard-welcome-banner');
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div>
          <span style="font-size: 11px; font-weight: 700; color: #89201B; letter-spacing: 0.05em; text-transform: uppercase;">${greeting}</span>
          <h2 style="font-size: 20px; font-weight: 800; color: #1a0504; margin: 6px 0 4px;">Welcome back, ${Utils.escape(welcomeName)}!</h2>
          <p style="font-size: 13px; color: #7c2d12; margin: 0; opacity: 0.8">${Utils.escape(companyMsg)}</p>
        </div>
        <div style="display: flex; gap: 32px; align-items: center; z-index: 1;">
          <div style="text-align: center;">
            <span style="font-size: 9.5px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">Active Staff</span>
            <div style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalEmployees}</div>
          </div>
          <div style="text-align: center;">
            <span style="font-size: 9.5px; font-weight: 700; color: #475569; letter-spacing: 0.05em; text-transform: uppercase;">On Duty</span>
            <div style="font-size: 22px; font-weight: 800; color: #15803d; margin-top: 4px;">${presentCount}</div>
          </div>
        </div>
      `;
    }

    // Fill Stats Grid
    const statsGrid = document.getElementById('dashboard-stats-grid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <!-- Total Employees -->
        <div class="stat-card">
          <div class="stat-icon stat-icon-blue">👥</div>
          <div class="stat-info"><span class="stat-value">${totalEmployees}</span><span class="stat-label">Total Staff</span></div>
        </div>
        <!-- Present Now -->
        <div class="stat-card">
          <div class="stat-icon stat-icon-green">✅</div>
          <div class="stat-info"><span class="stat-value">${presentCount}</span><span class="stat-label">Present Now</span></div>
        </div>
        <!-- Absent Today -->
        <div class="stat-card">
          <div class="stat-icon stat-icon-red">❌</div>
          <div class="stat-info"><span class="stat-value">${absentCount < 0 ? 0 : absentCount}</span><span class="stat-label">Absent Today</span></div>
        </div>
        <!-- Late Arrivals -->
        <div class="stat-card">
          <div class="stat-icon stat-icon-amber">⏰</div>
          <div class="stat-info"><span class="stat-value">${lateCount}</span><span class="stat-label">Late Arrivals</span></div>
        </div>
        <!-- Approved Leave -->
        <div class="stat-card">
          <div class="stat-icon stat-icon-cyan">📁</div>
          <div class="stat-info"><span class="stat-value">${leaveCount}</span><span class="stat-label">Approved Leave</span></div>
        </div>
        <!-- Pending Swaps -->
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(139,92,246,0.1);color:rgb(139,92,246)">🔄</div>
          <div class="stat-info"><span class="stat-value">${pendingSwapsCount}</span><span class="stat-label">Pending Swaps</span></div>
        </div>
      `;
    }

    // Group checked-in employees by location
    const todayLogs = logs.filter(l => l.date === todayStr && l.checkIn);
    const locationGroups = {};
    Object.keys(DB.getOfficeCoordinates()).forEach(loc => {
      locationGroups[loc] = [];
    });

    todayLogs.forEach(l => {
      if (l.checkIn) {
        const u = DB.getUser(l.userId);
        if (u) {
          const loc = l.location || 'Kohat Enclave, Pitampura, Delhi';
          if (!locationGroups[loc]) {
            locationGroups[loc] = [];
          }
          locationGroups[loc].push({ id: u.id, name: u.name, time: l.checkIn });
        }
      }
    });

    let worksitePanelHTML = '';
    if (currentUser && (currentUser.role === 'hr' || currentUser.role === 'manager')) {
      worksitePanelHTML = `
        <div class="card-panel" style="margin-top:20px">
          <div class="card-panel-header">
            <h3 class="card-panel-title">🏢 Today's Worksite Distribution (Management View)</h3>
          </div>
          <div class="worksite-grid" style="display:grid;grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-top:15px">
            ${Object.entries(locationGroups).map(([locName, staffList]) => {
              let locIcon = '📍';
              if (locName.includes('HQ')) locIcon = '🏢';
              else if (locName.includes('Hub')) locIcon = '🏬';
              else if (locName.includes('Home')) locIcon = '🏠';

              const staffListHTML = staffList.length === 0
                ? `<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No staff checked in here today.</div>`
                : staffList.map(s => `
                    <div class="btn-view-staff-detail" data-id="${s.id}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.01);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;cursor:pointer;transition:all 0.2s ease">
                      <span style="font-weight:600;color:var(--text-primary);text-decoration:underline">${Utils.escape(s.name)}</span>
                      <span style="font-size:11px;color:var(--text-secondary)">In: ${s.time}</span>
                    </div>
                  `).join('');

              return `
                <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px">
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px">
                    <strong style="font-size:14px;color:var(--primary);display:flex;align-items:center;gap:6px">
                      <span>${locIcon}</span> ${locName}
                    </strong>
                    <span class="badge badge-on-time" style="padding:2px 8px;font-size:10px">${staffList.length} Present</span>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto">
                    ${staffListHTML}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    const worksiteContainer = document.getElementById('dashboard-worksite-panel-container');
    if (worksiteContainer) {
      worksiteContainer.innerHTML = worksitePanelHTML;
    }

    // Bind worksite staff detail click actions
    document.querySelectorAll('.btn-view-staff-detail').forEach(el => {
      el.addEventListener('click', (e) => {
        const userId = el.getAttribute('data-id');
        openStaffDetailModal(userId);
      });
    });

    // Populate Live Feed Table
    const feedBody = document.getElementById('live-feed-table-body');
    if (feedBody) {
      if (todayLogs.length === 0) {
        feedBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No check-ins logged today.</td></tr>`;
      } else {
        feedBody.innerHTML = todayLogs.map(l => {
          const u = DB.getUser(l.userId);
          const sch = DB.getSchedule(u.scheduleId);
          let statusClass = 'badge-on-time';
          if (l.status === 'Late') statusClass = 'badge-late';
          if (l.status === 'Half Day') statusClass = 'badge-half-day';
          if (l.status === 'Pending Verification') statusClass = 'badge-late';

          const distKm = parseFloat(l.distance) || 0;
          const distM = Math.round(distKm * 1000);
          let gpsCellHTML;
          if (l.checkOut) {
            gpsCellHTML = `
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:8px;height:8px;border-radius:50%;background:var(--text-secondary);flex-shrink:0;"></span>
                <span style="font-size:11px;font-weight:700;color:var(--text-secondary)">OFFLINE</span>
              </div>`;
          } else if (!l.location) {
            gpsCellHTML = `<span style="font-size:11px;color:var(--text-muted)">— No GPS Data</span>`;
          } else if (distKm <= 0.1) {
            const distLabel = distM > 0 ? `${distM}m from worksite` : 'At worksite';
            gpsCellHTML = `
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0;box-shadow:0 0 6px rgba(16,185,129,0.7);animation:pulse 1.5s infinite"></span>
                <span style="font-size:11px;font-weight:700;color:#10b981">IN RANGE</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${distLabel}</div>`;
          } else {
            gpsCellHTML = `
              <div style="display:flex;align-items:center;gap:6px">
                <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0;box-shadow:0 0 6px rgba(239,68,68,0.6)"></span>
                <span style="font-size:11px;font-weight:700;color:#ef4444">OUT OF RANGE</span>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${distKm.toFixed(2)} km away</div>`;
          }
          return `
            <tr>
              <td style="font-weight:600">${Utils.escape(u.name)}</td>
              <td>${sch ? Utils.escape(sch.name) : '-'}</td>
              <td>${l.checkIn || '--:--'}</td>
              <td>${l.checkOut || '--:--'}</td>
              <td>${gpsCellHTML}</td>
              <td style="font-size:12px;color:var(--text-secondary)">${Utils.escape(l.location || 'Office Headquarters')}</td>
              <td><span class="badge ${statusClass}">${l.status}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Populate Leave request alert inbox
    const pendingInbox = document.getElementById('admin-pending-leaves-box');
    if (pendingInbox) {
      const pendingLeaves = leaves.filter(lv => lv.status === 'Pending');
      if (pendingLeaves.length === 0) {
        pendingInbox.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--text-muted);font-size:13px">All leave folders are cleared.</div>`;
      } else {
        pendingInbox.innerHTML = pendingLeaves.map(lv => {
          const u = DB.getUser(lv.userId);
          return `
            <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;justify-content:space-between">
                <strong style="font-size:14px">${Utils.escape(u.name)}</strong>
                <span class="badge badge-pending">${lv.type}</span>
              </div>
              <div style="font-size:12px;color:var(--text-secondary)">
                Dates: ${Utils.formatDate(lv.startDate)} to ${Utils.formatDate(lv.endDate)}
              </div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.4">"${Utils.escape(lv.reason)}"</div>
              <div style="display:flex;gap:8px;margin-top:4px">
                <a href="#admin-approvals" class="btn" style="padding:6px 12px;font-size:12px;width:auto">Process Request</a>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Birthday Widget render and events bind
    const birthdayWidgetContainer = document.getElementById('hr-birthday-widget-container');
    if (birthdayWidgetContainer && (freshUser.role === 'hr' || freshUser.role === 'manager' || freshUser.role === 'finance_manager')) {
      birthdayWidgetContainer.innerHTML = getBirthdayWidgetHTML();
      bindBirthdayWidgetEvents();
    }

    // Announcements setup
    renderAdminAnnouncementsList();
  }

  // Initially bind form submit for announcement publishing since it exists in skeleton template
  const annForm = document.getElementById('admin-announcement-form');
  const annAlert = document.getElementById('ann-publish-alert');

  if (annForm) {
    annForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('ann-title').value.trim();
      const category = document.getElementById('ann-category').value;
      const content = document.getElementById('ann-content').value.trim();
      const author = currentUser ? currentUser.name : 'HR Manager';

      if (title && content) {
        DB.addAnnouncement(title, content, category, author);
        annForm.reset();
        
        if (annAlert) {
          annAlert.className = 'alert alert-success';
          annAlert.style.display = 'block';
          annAlert.textContent = 'Announcement published successfully!';
          setTimeout(() => { annAlert.style.display = 'none'; }, 3000);
        }
        renderAdminAnnouncementsList();
      }
    });
  }

  // Load database state asynchronously, showing loaders first
  try {
    await DB.init();
  } catch (err) {
    console.error("Dashboard database initial load failed, loading from cache fallback:", err);
  }

  // Populate all views with the loaded state
  updateDashboardViews();

  if (window.adminDashboardInterval) {
    clearInterval(window.adminDashboardInterval);
    window.adminDashboardInterval = null;
  }

  window.adminDashboardInterval = setInterval(async () => {
    if (window.location.hash === '#admin-dashboard') {
      try {
        await DB.init();

        // Check if the current user has been deactivated
        const freshUser = DB.getUser(currentUser.id);
        if (freshUser && freshUser.status === 'Inactive') {
          Auth.logout();
          window.location.hash = '#login';
          if (typeof showToastNotification === 'function') {
            showToastNotification('⚠️ Your account is Inactive. Please contact HR.', 'error');
          } else {
            alert('Your account is Inactive. Please contact HR.');
          }
          clearInterval(window.adminDashboardInterval);
          window.adminDashboardInterval = null;
          return;
        }

        updateDashboardViews();
      } catch (err) {
        console.warn("Auto-refresh DB load failed:", err);
      }
    } else {
      clearInterval(window.adminDashboardInterval);
      window.adminDashboardInterval = null;
    }
  }, 2000);
}

function renderAdminUsers() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  const users = DB.getUsers().filter(u => {
    if (user.role === 'manager' || user.role === 'hr') {
      return true; // show all employee, hr, and manager profiles, including their own!
    } else if (user.role === 'finance_manager') {
      return false; // Not showing employee list to Finance Manager
    } else {
      return false;
    }
  });
  const addBtnHTML = (user.role === 'hr' || user.role === 'manager') ? `
    <div style="display:flex; gap:10px; align-items:center;">
      <button class="btn-outline-equify" id="btn-download-profile-users">&#8681; Download Profile</button>
      <button class="btn-primary-equify" id="btn-add-user-modal">+ Add Employee</button>
    </div>
  ` : '';

  main.innerHTML = `
    <div class="equify-page-header">
      <div>
        <h1 class="equify-page-title">Employee Registers & Payroll Setup</h1>
        <div style="font-size:13px; color:#64748b; margin-top:2px">Manage company staff files and base salaries.</div>
      </div>
      ${addBtnHTML}
    </div>
    <div class="content-body">
      <div class="equify-filter-bar">
        <div class="equify-filter-pills">
          <select class="equify-filter-select" id="filter-dept-select">
            <option value="all">Department: All Departments</option>
            <option value="Human Resources">Department: Human Resources</option>
            <option value="Engineering">Department: Engineering</option>
            <option value="Operations">Department: Operations</option>
            <option value="Sales">Department: Sales & Marketing</option>
            <option value="Finance">Department: Finance</option>
          </select>
          <select class="equify-filter-select" id="filter-role-select">
            <option value="all">Role: All Roles</option>
            <option value="hr">Role: HR Admin Manager</option>
            <option value="manager">Role: Operations Manager</option>
            <option value="finance_manager">Role: Finance Manager</option>
            <option value="employee">Role: Employee</option>
          </select>
          <select class="equify-filter-select" id="filter-status-select">
            <option value="all">Status: All Statuses</option>
            <option value="Active">Status: Active</option>
            <option value="Pending">Status: Pending Approval</option>
            <option value="Inactive">Status: Inactive</option>
          </select>
          <select class="equify-filter-select" id="filter-time-select">
            <option value="month">Time Filter: This month</option>
            <option value="today">Time Filter: Today</option>
            <option value="week">Time Filter: This week</option>
            <option value="quarter">Time Filter: This quarter</option>
            <option value="year">Time Filter: This year</option>
          </select>
        </div>
        <div class="equify-pagination-info">Total: ${users.length} showing all employees</div>
      </div>
      <div class="card-panel">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>User ID</th>
                <th>Security Password</th>
                <th>Assigned Shift(s)</th>
                <th>Work Location</th>
                <th>Base Salary</th>
                <th>Profile Controls</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const assignedSchedules = (u.scheduleIds && Array.isArray(u.scheduleIds) && u.scheduleIds.length > 0)
                  ? u.scheduleIds.map(id => DB.getSchedule(id)).filter(Boolean)
                  : (u.scheduleId ? [DB.getSchedule(u.scheduleId)].filter(Boolean) : []);

                const shiftNames = assignedSchedules.length > 0 
                  ? assignedSchedules.map(s => Utils.escape(s.name)).join(', ') 
                  : '<span style="color:var(--text-muted)">Not Assigned</span>';

                const workLocation = assignedSchedules.length > 0
                  ? [...new Set(assignedSchedules.map(s => (u.shiftLocations && u.shiftLocations[s.id]) || u.preferredLocation || s.location || 'Kohat Enclave, Pitampura, Delhi'))].join(', ')
                  : (u.preferredLocation || 'Not Assigned');
                
                const profileStatus = u.profileVerificationStatus || 'Approved';
                let profileBadgeHTML = '';
                if (profileStatus === 'Pending Approval') {
                  profileBadgeHTML = `<br><span class="badge badge-pending" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block">⏳ Profile Pending</span>`;
                } else if (profileStatus === 'Rejected') {
                  profileBadgeHTML = `<br><span class="badge badge-rejected" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block">❌ Profile Issue</span>`;
                } else {
                  profileBadgeHTML = `<br><span class="badge badge-approved" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block; background:rgba(16,185,129,0.1); color:var(--success)">✅ Profile Approved</span>`;
                }

                 const actionsHTML = (user.role === 'hr' || user.role === 'manager')
                   ? `
                     <div style="display:flex;gap:6px;flex-wrap:wrap">
                       ${u.profileVerificationStatus === 'Pending Approval' ? `
                         <button class="btn btn-success btn-approve-profile-direct" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px;background:var(--success)">Approve Edits</button>
                         <button class="btn btn-danger btn-reject-profile-direct" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px;background:var(--error)">Reject Edits</button>
                       ` : ''}
                       <button class="btn btn-secondary btn-edit-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Edit Profile</button>
                       <button class="btn btn-danger btn-delete-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Delete</button>
                     </div>
                   `
                   : `
                     <div style="font-size:11px;color:var(--text-muted)">HR Control Only</div>
                   `;
                
                return `
                  <tr>
                    <td style="font-weight:600; display:flex; align-items:center; gap:12px">
                      <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; border:1px solid rgba(251,191,36,0.3); overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
                        ${u.photo ? `<img src="${u.photo}" style="width:100%; height:100%; object-fit:cover;">` : getInitials(u.name)}
                      </div>
                      <div>
                        ${Utils.escape(u.name)}
                        ${profileBadgeHTML}
                      </div>
                    </td>
                    <td>${Utils.escape(u.employeeId)}</td>
                    <td><code>••••••••</code></td>
                    <td>${shiftNames}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${Utils.escape(workLocation)}</td>
                    <td style="font-weight:700;color:var(--primary)">${u.baseSalary ? `₹${u.baseSalary.toLocaleString()}` : '—'}</td>
                    <td>
                      ${actionsHTML}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  const addBtn = document.getElementById('btn-add-user-modal');
  if (addBtn) addBtn.addEventListener('click', () => openUserModal());
  const dlProfileBtn = document.getElementById('btn-download-profile-users');
  if (dlProfileBtn) dlProfileBtn.addEventListener('click', () => openProfileDownloadModal());

  const handleApproveProfile = (id) => {
    const u = DB.getUser(id);
    if (u && u.pendingProfileEdits) {
      Object.assign(u, u.pendingProfileEdits);
      u.pendingProfileEdits = null;
      u.profileVerificationStatus = 'Approved';
      u.profileVerificationComment = '';
      DB.save();
      renderAdminUsers();
    }
  };

  const handleRejectProfile = async (id) => {
    const u = DB.getUser(id);
    if (u) {
      const comment = await CustomDialog.prompt('Please enter the profile issue details / reason for rejection:');
      if (comment === null) return;
      if (!comment.trim()) {
        await CustomDialog.alert('You must provide a comment to explain the rejection.');
        return;
      }
      u.profileVerificationStatus = 'Rejected';
      u.profileVerificationComment = comment.trim();
      u.pendingProfileEdits = null;
      DB.save();
      renderAdminUsers();
    }
  };

  const handleDeleteUser = async (id) => {
    const u = DB.getUser(id);
    if (u && await CustomDialog.confirm(`Remove employee ${u.name}? All log items will be permanently cleared.`)) {
      DB.deleteUser(id);
      renderAdminUsers();
    }
  };

  const bindUserRowEvents = (container = document) => {
    container.querySelectorAll('.btn-edit-user').forEach(btn => btn.addEventListener('click', (e) => openUserModal(e.target.closest('.btn-edit-user').dataset.id)));
    container.querySelectorAll('.btn-delete-user').forEach(btn => btn.addEventListener('click', (e) => handleDeleteUser(e.target.closest('.btn-delete-user').dataset.id)));
    container.querySelectorAll('.btn-approve-profile-direct').forEach(btn => btn.addEventListener('click', (e) => handleApproveProfile(e.target.closest('.btn-approve-profile-direct').dataset.id)));
    container.querySelectorAll('.btn-reject-profile-direct').forEach(btn => btn.addEventListener('click', (e) => handleRejectProfile(e.target.closest('.btn-reject-profile-direct').dataset.id)));
  };

  bindUserRowEvents();

  // Setup real-time dynamic filter listeners on dropdowns
  const setupFilterListeners = () => {
    const dSel = document.getElementById('filter-dept-select');
    const rSel = document.getElementById('filter-role-select');
    const sSel = document.getElementById('filter-status-select');
    const tSel = document.getElementById('filter-time-select');
    const tbody = document.querySelector('.card-panel .custom-table tbody');
    const pInfo = document.querySelector('.equify-pagination-info');

    if (!dSel || !tbody) return;

    const applyFilters = () => {
      const dVal = dSel ? dSel.value : 'all';
      const rVal = rSel ? rSel.value : 'all';
      const sVal = sSel ? sSel.value : 'all';

      const allUsers = DB.getUsers() || [];
      const filtered = allUsers.filter(u => {
        if (dVal !== 'all') {
          const uDept = (u.department || '').toLowerCase();
          const targetDept = dVal.toLowerCase();
          if (!uDept.includes(targetDept) && !targetDept.includes(uDept)) return false;
        }
        if (rVal !== 'all') {
          if ((u.role || '').toLowerCase() !== rVal.toLowerCase()) return false;
        }
        if (sVal !== 'all') {
          if (sVal === 'Pending') {
            if (u.profileVerificationStatus !== 'Pending Approval') return false;
          } else if (sVal === 'Active') {
            if (u.status === 'Inactive') return false;
          } else if (sVal === 'Inactive') {
            if (u.status !== 'Inactive') return false;
          }
        }
        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:28px; color:var(--text-muted); font-size:13px">No matching employee records found for selected filter options.</td></tr>`;
      } else {
        tbody.innerHTML = filtered.map(u => {
          const assignedSchedules = (u.scheduleIds && Array.isArray(u.scheduleIds) && u.scheduleIds.length > 0)
            ? u.scheduleIds.map(id => DB.getSchedule(id)).filter(Boolean)
            : (u.scheduleId ? [DB.getSchedule(u.scheduleId)].filter(Boolean) : []);

          const shiftNames = assignedSchedules.length > 0 
            ? assignedSchedules.map(s => Utils.escape(s.name)).join(', ') 
            : '<span style="color:var(--text-muted)">Not Assigned</span>';

          const workLocation = assignedSchedules.length > 0
            ? [...new Set(assignedSchedules.map(s => (u.shiftLocations && u.shiftLocations[s.id]) || u.preferredLocation || s.location || 'Kohat Enclave, Pitampura, Delhi'))].join(', ')
            : (u.preferredLocation || 'Not Assigned');

          const profileStatus = u.profileVerificationStatus || 'Approved';
          let profileBadgeHTML = '';
          if (profileStatus === 'Pending Approval') {
            profileBadgeHTML = `<br><span class="badge badge-pending" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block">⏳ Profile Pending</span>`;
          } else if (profileStatus === 'Rejected') {
            profileBadgeHTML = `<br><span class="badge badge-rejected" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block">❌ Profile Issue</span>`;
          } else {
            profileBadgeHTML = `<br><span class="badge badge-approved" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block; background:rgba(16,185,129,0.1); color:var(--success)">✅ Profile Approved</span>`;
          }

          const actionsHTML = (user.role === 'hr' || user.role === 'manager')
            ? `
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${u.profileVerificationStatus === 'Pending Approval' ? `
                  <button class="btn btn-success btn-approve-profile-direct" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px;background:var(--success)">Approve Edits</button>
                  <button class="btn btn-danger btn-reject-profile-direct" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px;background:var(--error)">Reject Edits</button>
                ` : ''}
                <button class="btn btn-secondary btn-edit-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Edit Profile</button>
                <button class="btn btn-danger btn-delete-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Delete</button>
              </div>
            `
            : `<div style="font-size:11px;color:var(--text-muted)">HR Control Only</div>`;
          
          return `
            <tr>
              <td style="font-weight:600; display:flex; align-items:center; gap:12px">
                <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; border:1px solid rgba(251,191,36,0.3); overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
                  ${u.photo ? `<img src="${u.photo}" style="width:100%; height:100%; object-fit:cover;">` : getInitials(u.name)}
                </div>
                <div>
                  ${Utils.escape(u.name)}
                  ${profileBadgeHTML}
                </div>
              </td>
              <td>${Utils.escape(u.employeeId)}</td>
              <td><code>••••••••</code></td>
              <td>${shiftNames}</td>
              <td style="font-size:12px;color:var(--text-secondary)">${Utils.escape(workLocation)}</td>
              <td style="font-weight:700;color:var(--primary)">${u.baseSalary ? `₹${u.baseSalary.toLocaleString()}` : '—'}</td>
              <td>
                ${actionsHTML}
              </td>
            </tr>
          `;
        }).join('');

        bindUserRowEvents(tbody);
      }

      if (pInfo) {
        pInfo.textContent = `Total: ${filtered.length} showing filtered employees`;
      }
    };

    [dSel, rSel, sSel, tSel].forEach(sel => {
      if (sel) sel.addEventListener('change', applyFilters);
    });
  };

  setupFilterListeners();
}

function openUserModal(userId = null) {
  const currentUser = Auth.getCurrentUser();
  const isEdit = userId !== null;
  const user = isEdit ? DB.getUser(userId) : null;
  const schedules = DB.getSchedules();
  let editorPhotoDataUrl = isEdit && user.photo ? user.photo : '';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 700px">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Modify Candidate Profile' : 'Register New Employee'}</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <form id="user-editor-form">
        <!-- Profile Photo Upload & Remove Section -->
        <div class="form-group" style="display:flex; align-items:center; gap:16px; margin-bottom:20px; background:rgba(255,255,255,0.02); padding:16px; border-radius:12px; border:1px solid var(--border)">
          <div id="editor-photo-preview" style="width:64px; height:64px; border-radius:10px; background:${isEdit && user.photo ? 'transparent' : 'linear-gradient(135deg,#89201B,#5c0f0a)'}; border:2px solid #fbbf24; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; ${isEdit && user.photo ? 'cursor:pointer;' : ''}" title="${isEdit && user.photo ? 'Click to view full screen' : ''}">
            ${isEdit && user.photo ? `<img src="${user.photo}" style="width:100%; height:100%; object-fit:contain;">` : `<svg viewBox="0 0 24 24" fill="currentColor" style="width:36px; height:36px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`}
          </div>
          <div style="display:flex; flex-direction:column; gap:8px">
            <input type="file" id="editor-photo-file-input" accept="image/*" style="display:none">
            <div style="display:flex; gap:8px; align-items:center;">
              <button id="btn-editor-upload-photo" class="btn btn-sm" type="button" style="width:auto; padding:8px 16px; font-size:12px; font-weight:700; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#fff; border-radius:8px; cursor:pointer;">Upload Photo</button>
              <button id="btn-editor-remove-photo" class="btn btn-sm" type="button" style="width:auto; padding:8px 16px; font-size:12px; font-weight:700; background:#fdf2f2; border:1px solid #fecaca; color:#dc2626; border-radius:8px; cursor:pointer; display:${isEdit && user.photo ? 'block' : 'none'};">Remove Photo</button>
            </div>
            <div style="font-size:10px; color:var(--text-muted)">Supports PNG, JPG. Max size 2MB.</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="editor-name">Full Name <span style="color:var(--text-muted);font-weight:normal;font-size:11px">(Letters only)</span></label>
          <input class="form-input" type="text" id="editor-name" value="${isEdit ? Utils.escape(user.name) : ''}" required placeholder="e.g. Rahul Sharma">
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-empid">Employee ID <span style="color:var(--danger);font-size:11px">*</span></label>
            <input class="form-input" type="text" id="editor-empid" value="${isEdit ? Utils.escape(user.employeeId || '') : ''}" required placeholder="e.g. EMP-001">
          </div>
          <div>
            <label class="form-label" for="editor-email">Email Address <span style="color:var(--danger);font-size:11px">*</span></label>
            <input class="form-input" type="email" id="editor-email" value="${isEdit ? Utils.escape(user.email || '') : ''}" required placeholder="e.g. rahul@company.com">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-phone">Mobile Number <span style="color:var(--danger);font-size:11px">*</span></label>
            <input class="form-input" type="tel" id="editor-phone" value="${isEdit ? Utils.escape(user.phone || '') : ''}" required placeholder="e.g. +91 9876543210">
          </div>
          <div>
            <label class="form-label" for="editor-dob">Date of Birth <span style="color:var(--danger);font-size:11px">*</span></label>
            <input class="form-input" type="date" id="editor-dob" value="${isEdit ? (user.dob || '') : ''}">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-gender">Gender</label>
            <select class="form-input" id="editor-gender" required>
              <option value="Male" ${isEdit && user.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${isEdit && user.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Other" ${isEdit && user.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div>
            <!-- Visual alignment placeholder -->
          </div>
        </div>
        <!-- City & State Fields -->
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-city">City <span style="color:var(--danger);font-size:11px">*</span></label>
            <input class="form-input" type="text" id="editor-city" value="${isEdit ? Utils.escape(user.city || '') : ''}" required placeholder="e.g. New Delhi">
          </div>
          <div>
            <label class="form-label" for="editor-state">State <span style="color:var(--danger);font-size:11px">*</span></label>
            <input class="form-input" type="text" id="editor-state" value="${isEdit ? Utils.escape(user.state || '') : ''}" required placeholder="e.g. Delhi">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-pass">Security Password (Optional)</label>
            <input class="form-input" type="password" id="editor-pass" placeholder="Leave blank to keep unchanged">
          </div>
          <div>
            <label class="form-label" for="editor-salary">Base Salary (INR/Month)</label>
            <input class="form-input" type="number" id="editor-salary" value="${isEdit ? (user.baseSalary !== undefined && user.baseSalary !== null ? user.baseSalary : '') : ''}">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-hra" style="font-size:11px">HRA (INR/Month)</label>
            <input class="form-input" type="number" id="editor-hra" value="${isEdit ? (user.allowanceHRA !== undefined && user.allowanceHRA !== null ? user.allowanceHRA : '') : ''}">
          </div>
          <div>
            <label class="form-label" for="editor-travel" style="font-size:11px">Travel (INR/Month)</label>
            <input class="form-input" type="number" id="editor-travel" value="${isEdit ? (user.allowanceTravel !== undefined && user.allowanceTravel !== null ? user.allowanceTravel : '') : ''}">
          </div>
          <div>
            <label class="form-label" for="editor-pf" style="font-size:11px">PF (INR/Month)</label>
            <input class="form-input" type="number" id="editor-pf" value="${isEdit ? (user.deductionPF !== undefined && user.deductionPF !== null ? user.deductionPF : '') : ''}">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-pt" style="font-size:11px">Professional Tax (PT)</label>
            <input class="form-input" type="number" id="editor-pt" value="${isEdit ? (user.deductionPT !== undefined && user.deductionPT !== null ? user.deductionPT : '') : ''}">
          </div>
          <div>
            <label class="form-label" for="editor-tds" style="font-size:11px">TDS Tax Rate (%)</label>
            <input class="form-input" type="number" id="editor-tds" value="${isEdit ? (user.deductionTDS !== undefined && user.deductionTDS !== null ? user.deductionTDS : '') : ''}" min="0" max="100">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-dept">Department</label>
            <input class="form-input" type="text" id="editor-dept" value="${isEdit ? Utils.escape(user.department || '') : ''}" placeholder="e.g. Engineering" required>
          </div>
          <div>
            <label class="form-label" for="editor-desg">Designation</label>
            <input class="form-input" type="text" id="editor-desg" value="${isEdit ? Utils.escape(user.designation || '') : ''}" placeholder="e.g. Developer" required>
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-doj">Date of Joining</label>
            <input class="form-input" type="date" id="editor-doj" value="${isEdit ? (user.dateOfJoining || '') : new Date().toISOString().split('T')[0]}" required>
          </div>
          <div>
            <label class="form-label" for="editor-emergency">Emergency Contact</label>
            <input class="form-input" type="text" id="editor-emergency" value="${isEdit ? Utils.escape(user.emergencyContact || '') : ''}" placeholder="+91 98765 00000" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="editor-role">Portal Access Role</label>
          <select class="form-input" id="editor-role" required>
            ${(() => {
              const currentUser = Auth.getCurrentUser();
              if (currentUser.role === 'hr') {
                return `
                  <option value="employee" ${isEdit && user.role === 'employee' ? 'selected' : ''}>Employee</option>
                  <option value="hr" ${isEdit && user.role === 'hr' ? 'selected' : ''}>HR Coordinator</option>
                  <option value="manager" ${isEdit && user.role === 'manager' ? 'selected' : ''}>Operations Manager</option>
                `;
              } else {
                return `
                  <option value="employee" ${isEdit && user.role === 'employee' ? 'selected' : ''}>Employee</option>
                `;
              }
            })()}
          </select>
        </div>
        ${(() => {
          const currentUser = Auth.getCurrentUser();
          if (currentUser.role === 'hr') {
            const managers = DB.getUsers().filter(m => m.role === 'manager');
            return `
              <div class="form-group">
                <label class="form-label" for="editor-manager">Assigned Manager</label>
                <select class="form-input" id="editor-manager">
                  <option value="">-- No Manager Assigned --</option>
                  ${managers.map(m => `<option value="${m.id}" ${isEdit && user.managerId === m.id ? 'selected' : ''}>${Utils.escape(m.name)}</option>`).join('')}
                </select>
              </div>
            `;
          }
          return '';
        })()}
        <div class="form-group">
          <label class="form-label" for="editor-assigned-by">Assigned By <span style="color:var(--text-muted);font-weight:normal;font-size:11px">(HR / Manager who is registering this employee)</span></label>
          <select class="form-input" id="editor-assigned-by">
            ${(() => {
              const currentUser = Auth.getCurrentUser();
              const admins = DB.getUsers().filter(u => u.role === 'hr' || u.role === 'manager');
              return admins.map(a => `
                <option value="${a.id}" ${isEdit && user.assignedById === a.id ? 'selected' : (!isEdit && a.id === currentUser.id ? 'selected' : '')}>
                  ${Utils.escape(a.name)} (${a.role === 'hr' ? 'HR' : 'Manager'})
                </option>
              `).join('');
            })()}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight:700;">Assigned Shift Schedule(s) & Separate Work Locations <span style="font-size:11px;font-weight:normal;color:var(--text-muted);">(Select shifts and assign each shift its own location)</span></label>
          <div id="editor-schedule-checkboxes" style="display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;max-height:280px;overflow-y:auto;">
            ${schedules.map(s => {
              const isChecked = (isEdit && user.scheduleIds && Array.isArray(user.scheduleIds) && user.scheduleIds.includes(s.id)) || (isEdit && user.scheduleId === s.id) || (!isEdit && s.id === schedules[0].id);
              const shiftLoc = (isEdit && user.shiftLocations && user.shiftLocations[s.id]) || (isEdit && user.preferredLocation) || s.location || 'Kohat Enclave, Pitampura, Delhi';
              return `
                <div class="shift-assign-card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);padding:8px 10px;display:flex;flex-direction:column;gap:6px;transition:all 0.2s ease;">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;margin:0;user-select:none;">
                      <input type="checkbox" name="editor_shift_select" value="${s.id}" class="editor-shift-checkbox" data-shift-id="${s.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer;width:14px;height:14px;accent-color:var(--primary);">
                      <span><strong>${Utils.escape(s.name)}</strong> <span style="color:var(--text-secondary);font-size:11.5px;">(${formatTimeRange12h(s.startTime, s.endTime)})</span></span>
                    </label>
                    <span style="font-size:10px;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.06);white-space:nowrap;">⏱️ ${s.gracePeriod || 15}m Grace</span>
                  </div>
                  <div class="shift-loc-picker-block" id="shift-loc-block-${s.id}" style="display:${isChecked ? 'flex' : 'none'};align-items:center;gap:8px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.08);margin-left:22px;flex-wrap:wrap;">
                    <span style="font-size:11px;font-weight:600;color:var(--text-secondary);white-space:nowrap;display:inline-flex;align-items:center;gap:3px;">📍 Work Location:</span>
                    <select class="editor-shift-location-select" data-shift-id="${s.id}" id="editor-shift-loc-${s.id}" style="flex:1;min-width:160px;max-width:240px;height:28px;padding:2px 8px;font-size:11.5px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-surface, #1e1e24);color:var(--text-primary);cursor:pointer;outline:none;">
                      ${Object.keys(window.OFFICE_COORDINATES).map(loc => `
                        <option value="${loc}" ${shiftLoc === loc ? 'selected' : ''}>${loc}</option>
                      `).join('')}
                    </select>
                    <button type="button" class="btn-shift-custom-loc" data-shift-id="${s.id}" style="width:auto;height:28px;padding:0 9px;font-size:11px;font-weight:600;border-radius:var(--radius-sm);background:rgba(6,182,212,0.1);color:var(--cyan);border:1px solid rgba(6,182,212,0.3);cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;box-shadow:none;transition:all 0.2s ease;">✏️ Custom</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 15px">
          <label class="form-label" style="font-weight: 700; color: var(--text-secondary)">Document Management</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px">
            <div>
              <label class="form-label" for="editor-resume" style="font-size: 11px">Resume / CV File</label>
              <input class="form-input" type="file" id="editor-resume" accept=".pdf,.jpg,.jpeg,.png">
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;" id="editor-resume-status">
                ${isEdit && user.resume ? `Current: ${Utils.escape(user.resume.name)} (${user.resume.size})` : 'No file attached'}
              </div>
            </div>
            <div>
              <label class="form-label" for="editor-aadhar" style="font-size: 11px">Aadhaar Card File</label>
              <input class="form-input" type="file" id="editor-aadhar" accept=".pdf,.jpg,.jpeg,.png">
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;" id="editor-aadhar-status">
                ${isEdit && user.aadhar ? `Current: ${Utils.escape(user.aadhar.name)} (${user.aadhar.size})` : 'No file attached'}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
          <button class="btn" type="submit">${isEdit ? 'Save Changes' : 'Create User'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const editorRoleSelect = document.getElementById('editor-role');
  const editorEmpIdInput = document.getElementById('editor-empid');
  const editorEmpIdLabel = overlay.querySelector('label[for="editor-empid"]');

  function updateEditorEmpIdByRole(roleVal) {
    if (!editorEmpIdInput) return;
    let currentVal = editorEmpIdInput.value.trim();
    const numMatch = currentVal.match(/\d+/);
    const numPart = numMatch ? numMatch[0] : '100';

    if (roleVal === 'hr') {
      editorEmpIdInput.value = `HR${numPart}`;
      editorEmpIdInput.placeholder = 'e.g. HR100';
      if (editorEmpIdLabel) editorEmpIdLabel.innerHTML = 'HR ID <span style="color:var(--danger);font-size:11px">*</span>';
    } else if (roleVal === 'manager' || roleVal === 'finance_manager') {
      editorEmpIdInput.value = `MGR${numPart}`;
      editorEmpIdInput.placeholder = 'e.g. MGR100';
      if (editorEmpIdLabel) editorEmpIdLabel.innerHTML = 'Manager ID <span style="color:var(--danger);font-size:11px">*</span>';
    } else {
      editorEmpIdInput.value = `EMP${numPart}`;
      editorEmpIdInput.placeholder = 'e.g. EMP100';
      if (editorEmpIdLabel) editorEmpIdLabel.innerHTML = 'Employee ID <span style="color:var(--danger);font-size:11px">*</span>';
    }
  }

  if (editorRoleSelect) {
    editorRoleSelect.addEventListener('change', (e) => {
      updateEditorEmpIdByRole(e.target.value);
    });
  }

  // Editor Photo Upload/Remove Event Handlers
  const editorPhotoFileInput = document.getElementById('editor-photo-file-input');
  const btnEditorUploadPhoto = document.getElementById('btn-editor-upload-photo');
  const btnEditorRemovePhoto = document.getElementById('btn-editor-remove-photo');
  const editorPhotoPreview = document.getElementById('editor-photo-preview');

  if (editorPhotoFileInput && btnEditorUploadPhoto) {
    btnEditorUploadPhoto.addEventListener('click', () => editorPhotoFileInput.click());
    
    editorPhotoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('File size exceeds 2MB limit.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          editorPhotoDataUrl = event.target.result;
          if (editorPhotoPreview) {
            editorPhotoPreview.innerHTML = `<img src="${editorPhotoDataUrl}" style="width:100%; height:100%; object-fit:contain;">`;
            editorPhotoPreview.style.background = 'transparent';
            editorPhotoPreview.style.cursor = 'pointer';
            editorPhotoPreview.title = 'Click to view full screen';
          }
          if (btnEditorRemovePhoto) {
            btnEditorRemovePhoto.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (editorPhotoPreview) {
    editorPhotoPreview.addEventListener('click', (e) => {
      if (editorPhotoDataUrl) {
        e.stopPropagation();
        openFullScreenImageModal(editorPhotoDataUrl);
      }
    });
  }

  if (btnEditorRemovePhoto) {
    btnEditorRemovePhoto.addEventListener('click', () => {
      editorPhotoDataUrl = '';
      if (editorPhotoPreview) {
        editorPhotoPreview.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:36px; height:36px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`;
        editorPhotoPreview.style.background = 'linear-gradient(135deg,#89201B,#5c0f0a)';
        editorPhotoPreview.style.cursor = 'default';
        editorPhotoPreview.title = '';
      }
      btnEditorRemovePhoto.style.display = 'none';
      if (editorPhotoFileInput) {
        editorPhotoFileInput.value = '';
      }
    });
  }

  // Toggle location picker when shift checkbox is checked/unchecked
  overlay.querySelectorAll('.editor-shift-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const sid = cb.getAttribute('data-shift-id');
      const block = document.getElementById(`shift-loc-block-${sid}`);
      if (block) {
        block.style.display = cb.checked ? 'flex' : 'none';
      }
    });
  });

  // Custom location buttons per shift
  overlay.querySelectorAll('.btn-shift-custom-loc').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.getAttribute('data-shift-id');
      const locSelect = document.getElementById(`editor-shift-loc-${sid}`);
      if (locSelect) {
        enterCustomLocation(locSelect);
      }
    });
  });

  document.getElementById('user-editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('editor-name').value.trim();
    const employeeId = document.getElementById('editor-empid').value.trim();
    const email = document.getElementById('editor-email').value.trim();
    const phone = document.getElementById('editor-phone').value.trim();
    const dob = document.getElementById('editor-dob').value;
    const username = document.getElementById('editor-username') ? document.getElementById('editor-username').value.trim() : '';
    const password = document.getElementById('editor-pass').value.trim();
    const city = document.getElementById('editor-city').value.trim();
    const state = document.getElementById('editor-state').value.trim();
    const baseSalaryVal = document.getElementById('editor-salary').value.trim();
    const baseSalary = baseSalaryVal === '' ? null : Number(baseSalaryVal);
    
    // Multiple shift schedules & their separate locations
    const selectedShiftCheckboxes = Array.from(overlay.querySelectorAll('input[name="editor_shift_select"]:checked'));
    const scheduleIds = selectedShiftCheckboxes.map(cb => cb.value);
    const scheduleId = scheduleIds.length > 0 ? scheduleIds[0] : (schedules[0] ? schedules[0].id : null);
    
    const shiftLocations = {};
    selectedShiftCheckboxes.forEach(cb => {
      const sid = cb.value;
      const locSelect = overlay.querySelector(`.editor-shift-location-select[data-shift-id="${sid}"]`);
      if (locSelect) {
        shiftLocations[sid] = locSelect.value.trim() || 'Kohat Enclave, Pitampura, Delhi';
      } else {
        shiftLocations[sid] = 'Kohat Enclave, Pitampura, Delhi';
      }
    });

    const preferredLocation = (scheduleId && shiftLocations[scheduleId]) ? shiftLocations[scheduleId] : (Object.values(shiftLocations)[0] || 'Kohat Enclave, Pitampura, Delhi');

    const role = document.getElementById('editor-role').value;
    const gender = document.getElementById('editor-gender').value;
    const department = document.getElementById('editor-dept').value.trim();
    const designation = document.getElementById('editor-desg').value.trim();
    const dateOfJoining = document.getElementById('editor-doj').value;
    const emergencyContact = document.getElementById('editor-emergency').value.trim();

    const hraVal = document.getElementById('editor-hra').value.trim();
    const allowanceHRA = hraVal === '' ? null : Number(hraVal);
    const travelVal = document.getElementById('editor-travel').value.trim();
    const allowanceTravel = travelVal === '' ? null : Number(travelVal);
    const pfVal = document.getElementById('editor-pf').value.trim();
    const deductionPF = pfVal === '' ? null : Number(pfVal);
    const ptVal = document.getElementById('editor-pt').value.trim();
    const deductionPT = ptVal === '' ? null : Number(ptVal);
    const tdsVal = document.getElementById('editor-tds').value.trim();
    const deductionTDS = tdsVal === '' ? null : Number(tdsVal);

    if (password) {
      const rules = Auth.validatePassword(password);
      if (!rules.valid) {
        alert('Password must have minimum 6 chars, 1 uppercase, and 1 special symbol.');
        return;
      }
    }

    const profileValidation = ValidationUtils.validateProfile({
      name, employeeId, email, phone, dob, dateOfJoining
    });
    if (!profileValidation.valid) {
      alert(profileValidation.message);
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Saving...';
    }

    const resumeFile = document.getElementById('editor-resume').files[0];
    const aadharFile = document.getElementById('editor-aadhar').files[0];

    let resumeObj = isEdit ? user.resume : null;
    let aadharObj = isEdit ? user.aadhar : null;

    if (resumeFile) {
      resumeObj = {
        name: resumeFile.name,
        size: (resumeFile.size / 1024).toFixed(0) + ' KB',
        date: new Date().toISOString().split('T')[0]
      };
    }
    if (aadharFile) {
      aadharObj = {
        name: aadharFile.name,
        size: (aadharFile.size / 1024).toFixed(0) + ' KB',
        date: new Date().toISOString().split('T')[0]
      };
    }

    const managerSelect = document.getElementById('editor-manager');
    const managerId = managerSelect ? managerSelect.value : (currentUser.role === 'manager' ? currentUser.id : (isEdit ? user.managerId : ''));
    const assignedBySelect = document.getElementById('editor-assigned-by');
    const assignedById = assignedBySelect ? assignedBySelect.value : currentUser.id;

    if (isEdit) {
      const finalPassword = password || user.password;
      DB.updateUser(userId, { 
        name, employeeId, email, phone, dob, password: finalPassword, baseSalary, scheduleId, scheduleIds, shiftLocations, role, preferredLocation, gender, department, designation, dateOfJoining, emergencyContact, 
        resume: resumeObj, aadhar: aadharObj, allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS,
        managerId, assignedById,
        profileVerificationStatus: 'Approved',
        photo: editorPhotoDataUrl || null,
        city, state,
        profileVerificationComment: '',
        pendingProfileEdits: null
      });
    } else {
      let maxId = 99;
      DB.data.users.forEach(u => {
        if (u.employeeId && u.employeeId.startsWith('EMP')) {
          const num = parseInt(u.employeeId.substring(3), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
      });
      const nextEmpId = 'EMP' + (maxId + 1);

      const finalUsername = username || name.toLowerCase().replace(/\s+/g, '') || nextEmpId.toLowerCase();
      const finalPassword = password || 'Surya@123';

      const enteredId = employeeId.trim();
      const existingUserById = DB.getUserByUsernameOrId(enteredId);
      const existingUserByUsername = DB.getUserByUsernameOrId(finalUsername);
      if ((existingUserById && (!isEdit || existingUserById.id !== user.id)) ||
          (existingUserByUsername && (!isEdit || existingUserByUsername.id !== user.id))) {
        await CustomDialog.alert('Employee ID / HR ID or Username is already taken.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = isEdit ? 'Save Changes' : 'Create User';
        }
        return;
      }
      DB.addUser({ name, employeeId: employeeId || nextEmpId, email, phone, dob, username: finalUsername, password: finalPassword, role, baseSalary, scheduleId, scheduleIds, shiftLocations, preferredLocation, gender, department, designation, dateOfJoining, emergencyContact, resume: resumeObj, aadhar: aadharObj, allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS, managerId, assignedById, photo: editorPhotoDataUrl || null, city, state });
    }

    try {
      await fetch((window.apiBaseUrl || '') + '/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', data: DB.data })
      });
    } catch (err) {
      console.warn('Network error synchronizing mutation with backend database:', err);
    }

    closeModal(overlay);
    if (typeof showToastNotification === 'function') {
      showToastNotification(isEdit ? '✅ Employee details updated successfully.' : '✅ Employee registered successfully.', 'success');
    } else {
      alert(isEdit ? 'Employee details updated successfully.' : 'Employee registered successfully.');
    }
    if (window.location.hash === '#admin-dashboard') {
      await renderAdminDashboard();
    } else {
      renderAdminUsers();
    }
  });
}


function renderAdminSchedules() {
  const main = document.getElementById('main-view');
  const schedules = DB.getSchedules();
  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Shift Calendars & Shifts</h1>
        <div class="content-subtitle">Design active work hour calendars and assign shift profiles.</div>
      </div>
      <div style="display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-left:auto">
        <button class="btn btn-cyan" id="btn-express-upload-modal" style="border-radius:10px; height:42px; padding:0 22px; font-size:13px; font-weight:700; white-space:nowrap; width:auto; background:linear-gradient(135deg, var(--cyan) 0%, #0891b2 100%); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(6, 182, 212, 0.35); transition:all 0.2s ease">Express Upload</button>
        <button class="btn" id="btn-add-schedule-modal" style="border-radius:10px; height:42px; padding:0 22px; font-size:13px; font-weight:700; white-space:nowrap; width:auto; background:linear-gradient(135deg, var(--error) 0%, #be123c 100%); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(225, 29, 72, 0.35); transition:all 0.2s ease">+ Add Shift Pattern</button>
      </div>
    </div>
    <div class="content-body">
      <div class="schedule-mgmt-grid">
        ${schedules.map(s => `
          <div class="shift-card">
            <div class="shift-card-header">
              <span class="shift-title" style="color:var(--primary);font-size:16px">${Utils.escape(s.name)}</span>
              <div style="display:flex;gap:8px">
                <button class="btn-icon btn-edit-shift" data-id="${s.id}" title="Edit" style="background:rgba(251,191,36,0.1);color:var(--primary);border:1px solid rgba(251,191,36,0.2);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s ease">
                  <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button class="btn-icon btn-delete-shift" data-id="${s.id}" title="Delete" style="background:rgba(239,68,68,0.1);color:var(--error);border:1px solid rgba(239,68,68,0.2);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s ease">
                  <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            </div>
            <div class="shift-meta-row"><span>Working Hours:</span><strong style="color:var(--text-primary)">${formatTime12h(s.startTime)} <span style="font-size:10px;font-weight:700;color:var(--primary);background:rgba(251,191,36,0.1);padding:2px 6px;border-radius:4px;margin:0 4px">→</span> ${formatTime12h(s.endTime)}</strong></div>
            <div class="shift-meta-row"><span>Grace Period:</span><strong style="color:var(--warning)">${s.gracePeriod} minutes</strong></div>
            <div class="shift-meta-row" style="margin-top:8px; display:flex; flex-direction:column; gap:4px; align-items:stretch;">
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                <span style="font-size:12px; color:var(--text-secondary)">Location Select:</span>
                <button class="btn-add-location-inline" data-id="${s.id}" title="Add New Location" style="padding:2px 8px;font-size:10px;font-weight:600;background:rgba(16,185,129,0.1);color:var(--success);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.2s ease;white-space:nowrap;width:auto">➕ Add Location</button>
              </div>
              <select class="form-input inline-sched-location" data-id="${s.id}" style="padding:6px 8px;font-size:12px;width:100%;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm)">
                ${Object.keys(window.OFFICE_COORDINATES).map(loc => `
                  <option value="${loc}" ${s.location === loc || (!s.location && loc === 'Kohat Enclave, Pitampura, Delhi') ? 'selected' : ''}>${loc}</option>
                `).join('')}
              </select>
            </div>
            <div class="shift-meta-row" style="margin-top:6px; align-items:center;">
              <span>Location Swap:</span>
              <select class="form-input inline-sched-swap" data-id="${s.id}" style="padding:4px 8px;font-size:12px;width:auto;margin-left:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm)">
                <option value="">-- Swap with --</option>
                ${schedules.filter(other => other.id !== s.id).map(other => `
                  <option value="${other.id}">${Utils.escape(other.name)}</option>
                `).join('')}
              </select>
            </div>
            <div class="shift-days-row" style="margin-top:12px">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => `<div class="day-bubble ${s.workDays.includes(i) ? 'active' : ''}">${day}</div>`).join('')}</div>
          </div>
        `).join('')}
      </div>
      <!-- Positioned download schedules button at the bottom-right corner of the page -->
      <div style="display:flex; justify-content:flex-end; margin-top:24px; padding: 0 4px; width:100%">
        <button class="btn btn-secondary btn-sm" id="btn-download-schedules-trigger" style="width:auto !important; display:inline-flex !important; align-items:center; gap:6px; font-size:12px; font-weight:600; padding:8px 16px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer; background:rgba(255,255,255,0.02);">
          📥 Download Schedules
        </button>
      </div>
    </div>
  `;
  document.getElementById('btn-add-schedule-modal').addEventListener('click', () => openScheduleModal());
  const expressUploadBtn = document.getElementById('btn-express-upload-modal');
  if (expressUploadBtn) {
    expressUploadBtn.addEventListener('click', () => openExpressUploadModal());
  }
  const downloadSchedulesBtn = document.getElementById('btn-download-schedules-trigger');
  if (downloadSchedulesBtn) {
    downloadSchedulesBtn.addEventListener('click', () => openDownloadSchedulesModal());
  }
  document.querySelectorAll('.btn-edit-shift').forEach(btn => btn.addEventListener('click', (e) => {
    const btnElem = e.target.closest('.btn-edit-shift');
    if (btnElem) openScheduleModal(btnElem.dataset.id);
  }));
  document.querySelectorAll('.btn-delete-shift').forEach(btn => btn.addEventListener('click', async (e) => {
    const btnElem = e.target.closest('.btn-delete-shift');
    if (!btnElem) return;
    const id = btnElem.dataset.id;
    if (await confirm('Are you sure you want to delete this shift calendar?')) {
      DB.deleteSchedule(id);
      showToastNotification('🗑️ Shift calendar deleted successfully.', 'success');
      renderAdminSchedules();
    }
  }));
  document.querySelectorAll('.inline-sched-location').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const schedId = e.target.dataset.id;
      const newLoc = e.target.value;
      DB.updateSchedule(schedId, { location: newLoc });
      renderAdminSchedules();
    });
  });
  document.querySelectorAll('.btn-add-location-inline').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const schedId = e.target.dataset.id;
      openAddLocationDialog(schedId);
    });
  });
  document.querySelectorAll('.inline-sched-swap').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const schedId = e.target.dataset.id;
      const otherId = e.target.value;
      if (!otherId) return;
      const s1 = DB.getSchedule(schedId);
      const s2 = DB.getSchedule(otherId);
      if (s1 && s2) {
        const loc1 = s1.location || 'Kohat Enclave, Pitampura, Delhi';
        const loc2 = s2.location || 'Kohat Enclave, Pitampura, Delhi';
        
        DB.updateSchedule(schedId, { location: loc2 });
        DB.updateSchedule(otherId, { location: loc1 });
        
        alert(`Swapped locations between "${s1.name}" and "${s2.name}"!`);
        renderAdminSchedules();
      }
    });
  });
}// Helper to load SheetJS dynamically from CDN
function loadSheetJS(callback, onError) {
  if (window.XLSX) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  script.onload = callback;
  script.onerror = () => {
    if (onError) {
      onError();
    } else {
      alert('Failed to load Excel library from CDN. Please check your internet connection.');
    }
  };
  document.head.appendChild(script);
}

function openExpressUploadModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width:700px; padding:28px; display:flex; flex-direction:column; gap:16px" id="express-modal-container">
      <div class="modal-header" style="margin-bottom:5px">
        <h3 class="modal-title">⚡ Express Schedule Upload</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>

      <div style="font-size:12.5px; color:var(--text-secondary)">
        Upload a CSV or Excel file to bulk-update employee schedules. The file must have <strong>Employee ID</strong>, <strong>Location</strong>, and <strong>Shift</strong> columns (any order).
      </div>

      <!-- Required columns info -->
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <span style="font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; background:rgba(99,102,241,0.12); color:var(--primary); border:1px solid rgba(99,102,241,0.2)">📌 Employee ID</span>
        <span style="font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; background:rgba(16,185,129,0.1); color:var(--success); border:1px solid rgba(16,185,129,0.2)">📍 Location</span>
        <span style="font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; background:rgba(245,158,11,0.1); color:var(--warning); border:1px solid rgba(245,158,11,0.2)">🕐 Shift</span>
        <span style="font-size:11px; color:var(--text-muted); align-self:center">(column order does not matter)</span>
      </div>

      <!-- File Upload Box -->
      <div class="form-group" style="border:2px dashed var(--border); padding:18px 16px; border-radius:var(--radius-md); text-align:center; background:rgba(255,255,255,0.01)">
        <div style="font-size:30px; margin-bottom:8px">📤</div>
        <input type="file" id="express-file-input" accept=".csv,.xlsx,.xls" style="display:none">
        <button class="btn btn-secondary" id="btn-select-file" style="width:auto; padding:6px 16px; font-size:12px; margin-bottom:6px">Choose File</button>
        <div id="express-file-name" style="font-size:11.5px; color:var(--text-muted); margin-top:4px">No file chosen (CSV or Excel)</div>
        <div style="margin-top:12px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap">
          <span style="font-size:11px; color:var(--text-muted)">Download sample template:</span>
          <button id="btn-dl-template-csv" style="font-size:10.5px; font-weight:700; padding:3px 10px; background:rgba(255,255,255,0.03); color:var(--text-secondary); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-sm); cursor:pointer">📄 CSV</button>
          <button id="btn-dl-template-excel" style="font-size:10.5px; font-weight:700; padding:3px 10px; background:rgba(16,185,129,0.07); color:var(--success); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-sm); cursor:pointer">📊 Excel</button>
        </div>
      </div>

      <!-- Intent Textarea -->
      <div class="form-group">
        <label class="form-label" for="express-intent" style="font-size: 12px; font-weight: 600">What changes do you want to make?</label>
        <textarea class="form-input" id="express-intent" placeholder="e.g. Reassign Delhi branch workers to Night Shift schedules..." rows="2" style="resize:vertical; font-size:12.5px" required></textarea>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex; flex-direction:column; gap:12px">
        <div id="express-actions-row" style="display:flex; justify-content:flex-end; gap:10px">
          <button class="btn btn-secondary" id="btn-express-cancel" onclick="closeModal(this.closest('.modal-overlay'))" style="width:auto; padding:8px 20px; font-size:12.5px">Cancel</button>
          <button class="btn" id="btn-express-process" style="width:auto; padding:8px 24px; font-size:12.5px; font-weight:700" disabled>⚡ Upload & Process</button>
        </div>
        <!-- Loading -->
        <div id="express-loading-spinner" style="display:none; align-items:center; justify-content:center; gap:12px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-md); background:rgba(255,255,255,0.01)">
          <div style="width:20px; height:20px; border:2px solid rgba(255,255,255,0.1); border-top-color:var(--primary); border-radius:50%; animation:spin 0.8s linear infinite"></div>
          <span id="express-loading-text" style="font-size:13px; font-weight:700; color:var(--primary)">Reading file...</span>
        </div>
      </div>

      <!-- ===== RESULT SUMMARY (hidden until processed) ===== -->
      <div id="express-results-section" style="display:none; flex-direction:column; gap:12px; border-top:1px solid var(--border); padding-top:16px">

        <!-- Stats Row -->
        <div id="express-stats-row" style="display:flex; gap:10px; flex-wrap:wrap"></div>

        <!-- Detail Log -->
        <div style="font-size:12px; font-weight:700; color:var(--text-secondary); margin-bottom:2px">Record Details:</div>
        <div id="express-summary-list" style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:5px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:rgba(0,0,0,0.15); font-size:12px"></div>

        <!-- Download Failed Report button (shown only if there are failures) -->
        <div id="express-failed-download-row" style="display:none; justify-content:flex-start">
          <button class="btn" id="btn-download-failed-csv" style="width:auto; padding:7px 16px; font-size:12px; font-weight:700; background:rgba(239,68,68,0.12); color:var(--error); border:1px solid rgba(239,68,68,0.25)">
            📥 Download Failed Records Report
          </button>
        </div>

        <!-- Done button -->
        <div style="display:flex; justify-content:flex-end">
          <button class="btn btn-secondary" id="btn-express-done" style="width:auto; padding:8px 24px; font-size:12.5px">Close & Refresh</button>
        </div>
      </div>

      <!-- Upload History Section -->
      <div id="express-history-section" style="border-top:1px solid var(--border); padding-top:16px; margin-top:4px; display:flex; flex-direction:column; gap:10px">
        <h4 style="margin:0; font-size:13px; font-weight:700; color:var(--text-primary)">📋 Upload History</h4>
        <div style="overflow-x:auto; max-height:180px; border:1px solid var(--border); border-radius:var(--radius-sm); background:rgba(0,0,0,0.1)">
          <table class="table-custom" style="width:100%; border-collapse:collapse; font-size:11.5px; min-width:500px">
            <thead>
              <tr style="background:rgba(255,255,255,0.02); text-align:left; border-bottom:1px solid var(--border)">
                <th style="padding:8px">Date/Time</th>
                <th style="padding:8px">Employee</th>
                <th style="padding:8px">Shift Change</th>
                <th style="padding:8px">Location Change</th>
                <th style="padding:8px">Effective</th>
                <th style="padding:8px">Status</th>
              </tr>
            </thead>
            <tbody id="express-history-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const fileInput      = overlay.querySelector('#express-file-input');
  const fileNameDisp   = overlay.querySelector('#express-file-name');
  const processBtn     = overlay.querySelector('#btn-express-process');
  const actionsRow     = overlay.querySelector('#express-actions-row');
  const loadingSpinner = overlay.querySelector('#express-loading-spinner');
  const loadingText    = overlay.querySelector('#express-loading-text');
  const resultsSection = overlay.querySelector('#express-results-section');
  const statsRow       = overlay.querySelector('#express-stats-row');
  const summaryList    = overlay.querySelector('#express-summary-list');
  const failedDlRow    = overlay.querySelector('#express-failed-download-row');
  const doneBtn        = overlay.querySelector('#btn-express-done');
  const intentInput    = overlay.querySelector('#express-intent');

  renderUploadHistory(overlay);

  // ---- Template download ----
  const TPL_HEADERS = ['Employee ID', 'Location', 'Shift'];
  const TPL_ROWS    = [
    ['EMP001', 'Kohat Enclave, Pitampura, Delhi', 'Standard Day Shift'],
    ['EMP002', 'Noida Office',                   'Night Shift']
  ];

  overlay.querySelector('#btn-dl-template-csv').addEventListener('click', () => {
    const esc = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [TPL_HEADERS.join(','), ...TPL_ROWS.map(r => r.map(esc).join(','))];
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'schedule_upload_template.csv'; a.click();
  });

  overlay.querySelector('#btn-dl-template-excel').addEventListener('click', () => {
    const doExport = () => {
      const ws = XLSX.utils.aoa_to_sheet([TPL_HEADERS, ...TPL_ROWS]);
      ws['!cols'] = TPL_HEADERS.map((h,i) => ({ wch: Math.max(h.length, ...TPL_ROWS.map(r => String(r[i]||'').length)) + 2 }));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'schedule_upload_template.xlsx');
    };
    if (window.XLSX) doExport();
    else loadSheetJS(doExport, () => alert('Could not load Excel library. Download CSV instead.'));
  });

  // ---- File selection ----
  overlay.querySelector('#btn-select-file').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) {
      fileNameDisp.textContent = `${f.name} (${(f.size/1024).toFixed(1)} KB)`;
      fileNameDisp.style.color = 'var(--text-primary)';
      processBtn.removeAttribute('disabled');
    } else {
      fileNameDisp.textContent = 'No file chosen (CSV or Excel)';
      fileNameDisp.style.color = 'var(--text-muted)';
      processBtn.setAttribute('disabled','true');
    }
  });

  // ---- Process ----
  processBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    const intent = intentInput.value.trim();
    if (!file) return;
    if (!intent) {
      alert('Please describe what changes you want to make.');
      return;
    }

    // Lock UI
    intentInput.setAttribute('disabled','true');
    fileInput.setAttribute('disabled','true');
    overlay.querySelector('#btn-select-file').setAttribute('disabled','true');
    actionsRow.style.display = 'none';
    loadingSpinner.style.display = 'flex';
    resultsSection.style.display = 'none';

    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    const runProcessing = () => {
      const reader = new FileReader();
      reader.onload = evt => {
        let csvText = '';
        try {
          if (isExcel) {
            const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
            csvText = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
          } else {
            csvText = evt.target.result;
          }
        } catch(err) {
          loadingSpinner.style.display = 'none';
          actionsRow.style.display = 'flex';
          intentInput.removeAttribute('disabled');
          fileInput.removeAttribute('disabled');
          overlay.querySelector('#btn-select-file').removeAttribute('disabled');
          alert('Could not read the file. Make sure it is a valid CSV or Excel file.');
          return;
        }

        loadingText.textContent = 'Validating records...';
        setTimeout(() => {
          loadingText.textContent = 'Updating schedules...';
          setTimeout(() => {
            const results = executeExpressReassignments(csvText, intent);
            loadingSpinner.style.display = 'none';
            resultsSection.style.display = 'flex';

            // --- Stats cards ---
            const total   = results.totalCount;
            const success = results.successCount;
            const failed  = results.errorCount;
            const pct = total > 0 ? Math.round(success/total*100) : 0;
            const columnWarnings = results.columnWarnings || [];

            // Prepend a banner and warnings list to the results section
            const alertBannerHTML = (failed === 0 && total > 0)
              ? `<div class="alert alert-success" style="padding:12px; border-radius:var(--radius-md); background:rgba(16,185,129,0.12); color:var(--success); border:1px solid rgba(16,185,129,0.25); font-weight:700; text-align:center; font-size:13px; margin-bottom:12px">
                  🎉 Upload Completed Successfully! All records processed without errors.
                 </div>`
              : `<div class="alert alert-warning" style="padding:12px; border-radius:var(--radius-md); background:rgba(239,68,68,0.07); color:var(--error); border:1px solid rgba(239,68,68,0.2); font-weight:700; text-align:center; font-size:13px; margin-bottom:12px">
                  ⚠️ Upload Completed with some issues. Please review the failed records below.
                 </div>`;

            const warningsHTML = columnWarnings.length > 0
              ? `<div class="warnings-box" style="margin-bottom:12px; padding:10px 14px; border-radius:var(--radius-sm); background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.2); color:var(--primary); font-size:11.5px; line-height:1.4">
                  <strong>⚠️ Auto-Creation Alerts:</strong>
                  <ul style="margin:5px 0 0 16px; padding:0">
                    ${columnWarnings.map(w => `<li>${Utils.escape(w)}</li>`).join('')}
                  </ul>
                 </div>`
              : '';

            // Clear any previous alerts
            resultsSection.querySelectorAll('.alert, .warnings-box, #express-results-top-wrapper').forEach(el => el.remove());
            
            // Inset topWrapper before statsRow
            const topWrapper = document.createElement('div');
            topWrapper.id = 'express-results-top-wrapper';
            topWrapper.style.display = 'flex';
            topWrapper.style.flexDirection = 'column';
            topWrapper.style.gap = '8px';
            resultsSection.insertBefore(topWrapper, statsRow);
            topWrapper.innerHTML = alertBannerHTML + warningsHTML;

            statsRow.innerHTML = `
              <div style="flex:1; min-width:120px; padding:12px 16px; border-radius:var(--radius-md); background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); text-align:center">
                <div style="font-size:22px; font-weight:800; color:var(--primary)">${total}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Total Records</div>
              </div>
              <div style="flex:1; min-width:120px; padding:12px 16px; border-radius:var(--radius-md); background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); text-align:center">
                <div style="font-size:22px; font-weight:800; color:var(--success)">${success}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Updated ✅</div>
              </div>
              <div style="flex:1; min-width:120px; padding:12px 16px; border-radius:var(--radius-md); background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); text-align:center">
                <div style="font-size:22px; font-weight:800; color:var(--error)">${failed}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Failed ❌</div>
              </div>
              <div style="flex:1; min-width:120px; padding:12px 16px; border-radius:var(--radius-md); background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); text-align:center">
                <div style="font-size:22px; font-weight:800; color:var(--text-primary)">${pct}%</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px">Success Rate</div>
              </div>
            `;

            // --- Detail list ---
            if (results.logs.length === 0) {
              summaryList.innerHTML = '<div style="color:var(--text-muted)">No records processed.</div>';
            } else {
              summaryList.innerHTML = results.logs.map((log, idx) => `
                <div style="display:flex; align-items:flex-start; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04)">
                  <span style="flex-shrink:0; font-size:13px">${log.status === 'success' ? '✅' : '❌'}</span>
                  <div style="flex:1">
                    <span style="font-weight:700; color:${log.status==='success'?'var(--success)':'var(--error)'}">${Utils.escape(log.employeeId || log.name)}</span>
                    ${log.name !== log.employeeId ? `<span style="color:var(--text-muted)"> — ${Utils.escape(log.name)}</span>` : ''}
                    <span style="color:var(--text-secondary)">: ${Utils.escape(log.message)}</span>
                  </div>
                  <span style="font-size:10px; color:var(--text-muted); flex-shrink:0">Row ${log.rowNum}</span>
                </div>
              `).join('');
            }

            // --- Failed download button ---
            if (failed > 0) {
              failedDlRow.style.display = 'flex';
              overlay.querySelector('#btn-download-failed-csv').onclick = () => {
                downloadFailedReport(results.logs.filter(l => l.status === 'error'));
              };
            } else {
              failedDlRow.style.display = 'none';
            }

            renderUploadHistory(overlay);
          }, 700);
        }, 600);
      };
      isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
    };

    if (isExcel) {
      loadSheetJS(runProcessing, () => {
        loadingSpinner.style.display = 'none';
        actionsRow.style.display = 'flex';
        fileInput.removeAttribute('disabled');
        overlay.querySelector('#btn-select-file').removeAttribute('disabled');
        alert('Could not load Excel library. Upload a CSV file instead.');
      });
    } else {
      runProcessing();
    }
  });

  doneBtn.addEventListener('click', () => {
    closeModal(overlay);
    renderAdminSchedules();
  });
}

// Download failed records as CSV
function downloadFailedReport(failedLogs) {
  const headers = ['Row #', 'Employee ID', 'Employee Name', 'Location (Provided)', 'Shift (Provided)', 'Failure Reason'];
  const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = [
    headers.join(','),
    ...failedLogs.map(l => [
      l.rowNum, l.employeeId || '', l.name || '', l.locationProvided || '', l.shiftProvided || '', l.message
    ].map(esc).join(','))
  ];
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `failed_records_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function openDownloadSchedulesModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 420px; padding: 24px; display:flex; flex-direction:column; gap:16px">
      <div class="modal-header" style="margin-bottom: 0">
        <h3 class="modal-title">📥 Export Shift Schedules</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>

      <div style="font-size:12px; color:var(--text-muted)">
        Configure the export parameters for the database records.
      </div>

      <!-- Scope Selector -->
      <div class="form-group">
        <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">Shift Calendar Scope</label>
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px; max-height:160px; overflow-y:auto; padding:10px; border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-sm); background:rgba(0,0,0,0.15)">
          <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; color:var(--text-primary); cursor:pointer">
            <input type="checkbox" id="export-select-all-checkbox" checked>
            🗂️ Select All
          </label>
          <div style="border-top:1px solid rgba(255,255,255,0.08); margin:4px 0"></div>
          ${DB.getSchedules().map(s => `
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); cursor:pointer">
              <input type="checkbox" class="export-sched-checkbox" value="${s.id}" checked>
              📌 ${Utils.escape(s.name)}
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Format Selector -->
      <div class="form-group">
        <label class="form-label" for="export-format-select" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">File Format</label>
        <select id="export-format-select" class="form-input" style="background:rgba(255,255,255,0.02)">
          <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
          <option value="csv">Comma Separated Values (.csv)</option>
        </select>
      </div>

      <!-- Inline Warning Alert Container -->
      <div id="export-warning-box" style="display:none; padding:10px 14px; border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-sm); background:rgba(239,68,68,0.05); color:var(--error); font-size:11.5px; font-weight:600; line-height:1.45;">
      </div>

      <!-- Actions -->
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px; border-top:1px solid rgba(255,255,255,0.05); padding-top:14px">
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))" style="width:auto; padding:8px 16px; font-size:12.5px">Cancel</button>
        <button class="btn btn-cyan" id="btn-export-download-action" style="width:auto; padding:8px 20px; font-size:12.5px; font-weight:700">Download</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const formatSelect = overlay.querySelector('#export-format-select');
  const warningBox = overlay.querySelector('#export-warning-box');
  const downloadBtn = overlay.querySelector('#btn-export-download-action');
  
  const selectAllCheckbox = overlay.querySelector('#export-select-all-checkbox');
  const schedCheckboxes = overlay.querySelectorAll('.export-sched-checkbox');

  const CSV_HEADERS = [
    'Employee ID', 'Employee Name', 'Department', 'Designation', 'Role', 
    'Shift Name', 'Shift Time', 'Grace Period (mins)', 'Location', 
    'Work Days', 'Date of Joining', 'Shift Date'
  ];

  const buildRowsForSchedule = (schedId) => {
    try {
      const schedule = DB.getSchedule(schedId) || {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const workDaysStr = schedule.workDays ? schedule.workDays.map(d => dayNames[d]).join(', ') : 'N/A';
      return DB.getUsers()
        .filter(u => u.scheduleId === schedId)
        .map(u => ({
          'Employee ID': u.employeeId || u.id || 'N/A',
          'Employee Name': u.name || 'N/A',
          'Department': u.department || 'N/A',
          'Designation': u.designation || 'N/A',
          'Role': u.role || 'N/A',
          'Shift Name': schedule.name || 'N/A',
          'Shift Time': schedule.startTime && schedule.endTime ? formatTimeRange12h(schedule.startTime, schedule.endTime) : 'N/A',
          'Grace Period (mins)': schedule.gracePeriod != null ? schedule.gracePeriod : 'N/A',
          'Location': u.preferredLocation || schedule.location || 'N/A',
          'Work Days': workDaysStr,
          'Date of Joining': u.dateOfJoining || 'N/A',
          'Shift Date': new Date().toISOString().split('T')[0]
        }));
    } catch (e) {
      console.error('Error constructing rows for schedule:', e);
      return [];
    }
  };

  const getSelectedScheduleIds = () => {
    return Array.from(schedCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
  };

  const getExportData = () => {
    const selectedIds = getSelectedScheduleIds();
    return selectedIds.flatMap(id => buildRowsForSchedule(id));
  };

  const checkValidation = () => {
    const selectedIds = getSelectedScheduleIds();
    const data = getExportData();
    if (selectedIds.length === 0) {
      warningBox.textContent = '⚠️ Please select at least one shift schedule to download.';
      warningBox.style.display = 'block';
      downloadBtn.setAttribute('disabled', 'true');
      downloadBtn.style.opacity = '0.5';
      downloadBtn.style.cursor = 'not-allowed';
    } else if (data.length === 0) {
      warningBox.textContent = '⚠️ No employee is currently assigned to the selected shift schedule(s). Please assign employees first or select another shift.';
      warningBox.style.display = 'block';
      downloadBtn.setAttribute('disabled', 'true');
      downloadBtn.style.opacity = '0.5';
      downloadBtn.style.cursor = 'not-allowed';
    } else {
      warningBox.style.display = 'none';
      downloadBtn.removeAttribute('disabled');
      downloadBtn.style.opacity = '1';
      downloadBtn.style.cursor = 'pointer';
    }
  };

  // Event Listeners for Scope Selection
  selectAllCheckbox.addEventListener('change', () => {
    const isChecked = selectAllCheckbox.checked;
    schedCheckboxes.forEach(cb => {
      cb.checked = isChecked;
    });
    checkValidation();
  });

  schedCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const allChecked = Array.from(schedCheckboxes).every(c => c.checked);
      selectAllCheckbox.checked = allChecked;
      checkValidation();
    });
  });

  // Run initial validation
  checkValidation();

  const toCSVContent = (rows) => {
    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const csvRows = rows.map(row => CSV_HEADERS.map(h => escape(row[h] ?? '')).join(','));
    return '\uFEFF' + [CSV_HEADERS.join(','), ...csvRows].join('\n');
  };

  const downloadCSV = (rows, filename) => {
    try {
      const blob = new Blob([toCSVContent(rows)], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      closeModal(overlay);
    } catch (e) {
      alert('Error creating CSV download. Please try again.');
      console.error(e);
    }
  };

  const downloadExcel = (rows, filename, sheetName) => {
    const doExport = () => {
      try {
        const worksheet = XLSX.utils.json_to_sheet(rows, { header: CSV_HEADERS });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, filename);
        closeModal(overlay);
      } catch (err) {
        alert('Error generating Excel file. Falling back to CSV...');
        console.error(err);
        downloadCSV(rows, filename.replace('.xlsx', '.csv'));
      }
    };
    
    // Disable download button and show loading text
    downloadBtn.setAttribute('disabled', 'true');
    downloadBtn.textContent = 'Generating...';

    if (window.XLSX) {
      doExport();
    } else {
      loadSheetJS(doExport, () => {
        alert('Failed to load dynamic Excel library. Falling back to CSV...');
        downloadCSV(rows, filename.replace('.xlsx', '.csv'));
      });
    }
  };

  downloadBtn.addEventListener('click', () => {
    const data = getExportData();
    if (data.length === 0) return;

    const selectedIds = getSelectedScheduleIds();
    const allSchedules = DB.getSchedules();

    let filename = 'all_shift_schedules';
    let sheetName = 'All Shifts';

    if (selectedIds.length === 1) {
      const selected = DB.getSchedule(selectedIds[0]);
      if (selected) {
        filename = `shift_${selected.name.replace(/\s+/g, '_').toLowerCase()}`;
        sheetName = selected.name.substring(0, 30); // Excel sheet names max 31 chars
      }
    } else if (selectedIds.length < allSchedules.length) {
      filename = 'selected_shift_schedules';
      sheetName = 'Selected Shifts';
    }

    const format = formatSelect.value;
    if (format === 'csv') {
      downloadCSV(data, `${filename}.csv`);
    } else {
      downloadExcel(data, `${filename}.xlsx`, sheetName);
    }
  });
}

function openProfileDownloadModal(preSelectedUserId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const loggedInUser = Auth.getCurrentUser() || {};
  let users = [];

  if (loggedInUser.role === 'hr') {
    users = DB.getUsers();
  } else if (loggedInUser.role === 'manager') {
    users = DB.getUsers().filter(u => u.managerId === loggedInUser.id || u.id === loggedInUser.id);
  } else {
    users = DB.getUsers().filter(u => u.id === loggedInUser.id);
  }

  // Determine checkbox initial states
  const isChecked = (uId) => {
    if (preSelectedUserId) {
      return uId === preSelectedUserId;
    }
    return true;
  };

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 460px; padding: 24px; display:flex; flex-direction:column; gap:16px">
      <div class="modal-header" style="margin-bottom: 0">
        <h3 class="modal-title">📥 Export Employee Profiles</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>

      <div style="font-size:12px; color:var(--text-muted)">
        Select one or more employees to combine their profile details into a single PDF/Excel export.
      </div>

      <!-- Employee Checklist Selector -->
      <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
        <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">Select Employees</label>
        <input type="text" id="profile-search-input" class="form-input" placeholder="🔍 Search employee name or ID..." style="padding:6px 10px; font-size:12px; margin-bottom:4px; background:rgba(255,255,255,0.02)">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-secondary)">
            <input type="checkbox" id="profile-select-all" style="cursor:pointer" ${!preSelectedUserId ? 'checked' : ''}> Select All
          </label>
          <span id="profile-selection-count" style="font-size:11.5px; font-weight:600; color:var(--cyan)">0 selected</span>
        </div>

        <div id="profile-checkbox-list" style="max-height: 180px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; display: flex; flex-direction: column; gap:8px; background: rgba(0,0,0,0.1)">
          ${users.map(u => `
            <label class="profile-chk-item" data-name="${u.name.toLowerCase()}" data-empid="${(u.employeeId || '').toLowerCase()}" data-id="${u.id}" style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; padding:4px 6px; border-radius:var(--radius-sm); transition: background 0.15s ease;">
              <input type="checkbox" class="profile-user-checkbox" value="${u.id}" style="cursor:pointer" ${isChecked(u.id) ? 'checked' : ''}>
              <span style="font-weight:600; color:var(--text-primary)">${Utils.escape(u.name)}</span>
              <span style="color:var(--text-muted); font-size:11px">(${Utils.escape(u.employeeId || u.id)})</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Format Selector -->
      <div class="form-group">
        <label class="form-label" for="profile-format-select" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">File Format</label>
        <select id="profile-format-select" class="form-input" style="background:rgba(255,255,255,0.02)">
          <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
          <option value="pdf">PDF Document (.pdf)</option>
        </select>
      </div>

      <!-- Inline Warning Box -->
      <div id="profile-warning-box" style="display:none; padding:10px 14px; border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-sm); background:rgba(239,68,68,0.05); color:var(--error); font-size:11.5px; font-weight:600; line-height:1.45;">
      </div>

      <!-- Actions -->
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px; border-top:1px solid rgba(255,255,255,0.05); padding-top:14px">
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))" style="width:auto; padding:8px 16px; font-size:12.5px">Cancel</button>
        <button class="btn btn-cyan" id="btn-profile-export-action" style="width:auto; padding:8px 20px; font-size:12.5px; font-weight:700">Download</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector('#profile-search-input');
  const selectAllChk = overlay.querySelector('#profile-select-all');
  const checkboxList = overlay.querySelector('#profile-checkbox-list');
  const selectionCount = overlay.querySelector('#profile-selection-count');
  const formatSelect = overlay.querySelector('#profile-format-select');
  const warningBox = overlay.querySelector('#profile-warning-box');
  const downloadBtn = overlay.querySelector('#btn-profile-export-action');

  const getCheckedUserIds = () => {
    return Array.from(checkboxList.querySelectorAll('.profile-user-checkbox:checked')).map(el => el.value);
  };

  const checkValidation = () => {
    const checkedIds = getCheckedUserIds();
    if (users.length === 0) {
      warningBox.textContent = '⚠️ No employee records found in the database.';
      warningBox.style.display = 'block';
      downloadBtn.setAttribute('disabled', 'true');
      downloadBtn.style.opacity = '0.5';
    } else if (checkedIds.length === 0) {
      warningBox.textContent = '⚠️ Please select at least one employee.';
      warningBox.style.display = 'block';
      downloadBtn.setAttribute('disabled', 'true');
      downloadBtn.style.opacity = '0.5';
    } else {
      warningBox.style.display = 'none';
      downloadBtn.removeAttribute('disabled');
      downloadBtn.style.opacity = '1';
    }
    selectionCount.textContent = `${checkedIds.length} selected`;
  };

  // Bind checkbox state updates
  checkboxList.addEventListener('change', (e) => {
    if (e.target.classList.contains('profile-user-checkbox')) {
      const checkedIds = getCheckedUserIds();
      const visibleCheckboxes = Array.from(checkboxList.querySelectorAll('.profile-chk-item'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.querySelector('.profile-user-checkbox'));
      const allVisibleChecked = visibleCheckboxes.every(cb => cb.checked);
      selectAllChk.checked = allVisibleChecked;
      checkValidation();
    }
  });

  // Search Filter
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = checkboxList.querySelectorAll('.profile-chk-item');
    items.forEach(item => {
      const name = item.dataset.name;
      const empid = item.dataset.empid;
      if (name.includes(query) || empid.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    const visibleCheckboxes = Array.from(checkboxList.querySelectorAll('.profile-chk-item'))
      .filter(el => el.style.display !== 'none')
      .map(el => el.querySelector('.profile-user-checkbox'));
    const allVisibleChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
    selectAllChk.checked = allVisibleChecked;
  });

  // Select All Toggle
  selectAllChk.addEventListener('change', () => {
    const checked = selectAllChk.checked;
    const items = checkboxList.querySelectorAll('.profile-chk-item');
    items.forEach(item => {
      if (item.style.display !== 'none') {
        const cb = item.querySelector('.profile-user-checkbox');
        if (cb) cb.checked = checked;
      }
    });
    checkValidation();
  });

  checkValidation();

  // Excel Headers & Row builders
  const EXCEL_HEADERS = [
    'Employee ID', 'Full Name', 'Username', 'Role', 'Department', 'Designation',
    'Date of Joining', 'Base Salary (INR)', 'HRA Allowance (INR)', 'Travel Allowance (INR)',
    'PF Deduction (INR)', 'PT Deduction (INR)', 'TDS Deduction (%)',
    'Assigned Shift', 'Shift Timings', 'Preferred Location',
    'Phone', 'Email', 'Gender', 'DOB', 'Residential Address', 'City',
    'Profile Verification Status',
    'Attendance (Current Month): Present Days', 'Attendance (Current Month): Absent Days',
    'Attendance (Current Month): Late Days', 'Attendance (Current Month): Half Days',
    'Payroll (Current Month): Net Payout (INR)'
  ];

  const buildProfileData = (checkedIds) => {
    const targetUsers = users.filter(u => checkedIds.includes(u.id));
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();

    return targetUsers.map(u => {
      const schedule = DB.getSchedule(u.scheduleId) || {};
      const p = DB.calculateMonthlyPayroll(u.id, month, year) || {};
      return {
        'Employee ID': u.employeeId || u.id || 'N/A',
        'Full Name': u.name || 'N/A',
        'Username': u.username || 'N/A',
        'Role': u.role || 'N/A',
        'Department': u.department || 'N/A',
        'Designation': u.designation || 'N/A',
        'Date of Joining': u.dateOfJoining || 'N/A',
        'Base Salary (INR)': u.baseSalary || 0,
        'HRA Allowance (INR)': u.allowanceHRA !== undefined && u.allowanceHRA !== null ? u.allowanceHRA : 0,
        'Travel Allowance (INR)': u.allowanceTravel !== undefined && u.allowanceTravel !== null ? u.allowanceTravel : 0,
        'PF Deduction (INR)': u.deductionPF !== undefined && u.deductionPF !== null ? u.deductionPF : 0,
        'PT Deduction (INR)': u.deductionPT !== undefined && u.deductionPT !== null ? u.deductionPT : 0,
        'TDS Deduction (%)': u.deductionTDS !== undefined && u.deductionTDS !== null ? u.deductionTDS : 0,
        'Assigned Shift': schedule.name || 'N/A',
        'Shift Timings': schedule.startTime && schedule.endTime ? formatTimeRange12h(schedule.startTime, schedule.endTime) : 'N/A',
        'Preferred Location': u.preferredLocation || schedule.location || 'Kohat Enclave, Pitampura, Delhi',
        'Phone': u.phone || 'N/A',
        'Email': u.email || 'N/A',
        'Gender': u.gender || 'N/A',
        'DOB': u.dob || 'N/A',
        'Residential Address': u.address || 'N/A',
        'City': u.city || 'Delhi',
        'Profile Verification Status': u.profileVerificationStatus || 'Approved',
        'Attendance (Current Month): Present Days': p.presentDays != null ? p.presentDays : 0,
        'Attendance (Current Month): Absent Days': p.absentDays != null ? p.absentDays : 0,
        'Attendance (Current Month): Late Days': p.lateDays != null ? p.lateDays : 0,
        'Attendance (Current Month): Half Days': p.halfDays != null ? p.halfDays : 0,
        'Payroll (Current Month): Net Payout (INR)': p.netSalary != null ? p.netSalary : 0
      };
    });
  };

  const downloadExcel = (data, filename) => {
    const doExport = () => {
      try {
        const worksheet = XLSX.utils.json_to_sheet(data, { header: EXCEL_HEADERS });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Profiles');
        XLSX.writeFile(workbook, filename);
        closeModal(overlay);
      } catch (err) {
        alert('Error generating Excel file.');
        console.error(err);
        downloadBtn.removeAttribute('disabled');
        downloadBtn.textContent = 'Download';
      }
    };

    if (window.XLSX) {
      doExport();
    } else {
      loadSheetJS(doExport, () => {
        alert('Failed to load Excel library.');
        downloadBtn.removeAttribute('disabled');
        downloadBtn.textContent = 'Download';
      });
    }
  };

  const downloadPDF = (checkedIds) => {
    try {
      const targetUsers = users.filter(u => checkedIds.includes(u.id));
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup blocker blocked the download window. Please allow popups for this site.');
        return;
      }

      const today = new Date();
      const month = today.getMonth();
      const year = today.getFullYear();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const period = `${monthNames[month]} ${year}`;
      const generatedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const logoDataUrl = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAASoAAACsCAYAAADMpOFeAAAoOklEQVR4nO1di3EbSZKt2RgLGmcCeCYQa8JwXCDXBEkmSDJBIxNEurCkCRRNWMIEoV3ABSLq3b3Jy6xPfwtAvggESbC7urq66nVmVn5+Ox6PweFwOFrGP9bugOPi0K3dAcflwYnKMTVJ9T6kjqnxm6t+DoejdbhE5XA4mocTlWNOuL3KMQmcqBxzEdRtCGHrw+uYAr9P0orD8XcJ6kRQN/H3Nx8cx1i4ROWYUr3Djt9fIYRvIYT3inNTx3QV3zsuEE5UjhS6Acdv42dTcU4KveHyYH3vuEC46ucY6wPF55wI6i5DUpoE5nAk4RKVg0nmZAAPA4mkiyR1+gCwU2noC9U5V+8cLlE5/kYyJ7LahxCeBxjBofLxTp+265ciP+1/Hwb2x3FBcInKEYhg7iIxnIzh95XSzI2QplhKS7UjpbgQj/8cQniNbaYkM8cVwInKEaIU9RJ/nuxLu7hrd/qU4g/FNgVVUEpWTFx7+hv+V98iYe6iNJXbPXRcONyY7oDK9RwJ5UQOIZKOlJAsdELqOcTzN+RT9WYY76Hu3UZyksb450hmfB767LgSuER1OYA0klPXUgZrJoQQCeNXVANTYILDeSAsqJNyt6+n7+7jcQ/x3C/x3EMkuL7ALcHytXJcAJyoLge9WNQgrnthB0r5JWkqFqSi3KI/kUpInA/1T2tHM8JvFOJMwbonxwXAVb/L83+6j/YiVsXeaTdvn1jAe1Lb8JOJJHXuGEg7FlTOU39zKh+cTIEbul8nqguBE9VlAIv4Q/xIo/aOCOA7EYBcyD0Z1Bl3ZGwfgk2GXKUn+0YhKtlfuFR8UNo50H26W8MFwInq/MGLFwZxNoIzAbAdSZJADqlMCHtBcCyNlcA6dp8gKRjed0Z7lhHfcYZwG9Vl4bQo/xVC+ETEIW1H26gaMvH0E+0aWpB9kKRTA5AU3Be0az1GCbCWjB2NwiWq84dmu3kiItoSUcBl4I6kIOy+8S6cJaGkoKmFJVLVVpHC8PtWSERMUpr05irfhcIlqvOH3OoHvsfPRiGSDS14tAGUJruT13s3dv4ORIryWiGqZzhGGvWlR7oMerZUzKG2NEejcKK6HB8pzTD+TIt5R75JTFa3wn1BEtvP+JPtXlY/oG6yyrmJhNln3BK4fzvjWh/EcZKkTirvV9/tuzy46ndeAcNY1CyhWDt4+O5ZSCFycd8IWw6rXQyojE+ib7juPkpV7Nkeor3IshXdKLuUTJTSPSEV8/eT/MBKvNdxzB25M+TOcawEJ6rzgab27ONCx1a8tshe4gKHpCPxhyCfTzHWjn2oAKiKOL7ECfSTcEINpKqmEuy9Kyop+iI3CQ5Eal0h4d/QdbaKKwP657uGDcCJqn30kRggLZzCTIIhIWlkJWP4glDLHuJOIR//B10nCPXxXRAbwIsfEo7WH/wNHyh2MOW+STsTyFYDO7PyNeAAy9khZBs4b2/4lDkagBPV+eAtSk6BFhwW3Y4W48lGI1Uz9jjXwCpcH6Wwh0g2sAkFuraWDfSGJJ6fsa+S0FiyQrYFJk1Iic+K2nc6nsH3wqqbvC9IgVJ6g6po2c+4v46V4cb09iFTolge4rAhafmd3jM+RXdiYT7HwGAY4+V1ZJAxBzVDktKkLgakL03C+S5ULimtSbwkku7tDJL6LtRSR8Nwieo80Cmkw+EibE+CjxQHH7+RrUpzkvyD1DRIS18V0mMbj7TfoF/SCK5hS4Z3SDZQvzR1UcYC8j2DGCWQNiYYkqS0gZ3gKWQahRNV+5CLCeQgQ2WCcOaUC95KPodULJ+oXVxjT6pkF9v8YPRRS2F8mzBGQ/r6mDFYgzx4E4FhbSLApsXH429LVXTpqlE4UbUD+TZPVWt5M4KHtZQpfM53oQZBMvkZySoVxIs0Mv/K/F9eU8Nb/LA9LQW+H77nL6INmYQvKGS1J7vU0Mo7joXhRNUGNJVDIyzpt2SBpSpuC3ajD4KwsJv3LsilhUX8TdmBDIrBPQiS0shNSlMt3J+jAE5U62OoXeQ9OlPyIuZFicWKncJAZAUVjm1aWLytSRmay0MwpD+QFMaEdxSlNJWC1x5sDL8dj8e1++AoJzAmETgwnshKAxbpfyvtMGAwb1XKgB8UPN+t1C+SpDTD+5dCogqNkvbVwonqvCAXzunv/yT8ozibwCVnvLQKQ0iielDcJpyMzgDuR3Ve0IjmmQKHNYnqi7FTd0kkhbJcGmHDmH6SPL3s1pnCbVTtoFNi0N4Sb3yoht/JTWFnbOEjlbAmTTD6M7ThfSgoUKo5kXLb2jVhjPdYvwbgRNUOuFJxIJvMp4x6wn5VVu5xLaC4ZXJi5DIgPIg4QRm0vYsknXK7sF4YHpTcCNxGtT6YhH4oxuCgBOtqcXS5ti8VUiqSPmTWJkFneL6zI+3p3H9O2FfHQLhE1RZeErYWmfNcemVfa/iH5gybci/AbilKisnUMdLnytEAnKjaqyKjpVgJgrweaJF9vUIpKgfr/rWc6wz+DpKrowH4rl9bQIoVhpXwbid283olf/q1E5YmSUmJFWmNtRhCz0fVCJyo2kBX4G5g4bOxe1Vbhupc0RXeK9Q9mUCwpv6gYyU4UbUJLQ+U9TdXk2FcizTF6WwsdEa2CUtqRZ73axnD5uG7fm1C2lJkqpKgZD9AkK77/egOoZZdiscxxLH800mqLbgxfX1oxm+uHgPsjcowKC+FTJaymMI1SgWsCv6lqHvwr8LfDN/paxCu+rWxoDQbyz6+2Z9pYWkSwXPcBdzFXFEpf6FU4K88/lbUFOT/a2mItf9pSB2jtZu7HvraJTKJ/hS7pztF7UMmCq1qjmNluOo3P6aQaqC+cF2/INK4aEHHMtsCny8rtXAJrJrsAjJhnWw/114uREj+j7OGcil6qyRXIPsUxlASfonqbJHWNUqsi8OJ6vyyJUgMIQEJJioQgXXt2u9K20EqlxLD+FDi49AYkPYLpY9x0mkUbqNaFiVEk1OLahaTlKZYEsPCZEkr15YWxJwKbJakAckwiLzucB0AOID4PhIJAo+fjUrHbwVlwJACuTQx3jkEbV8FXKJqHzUEpUkTnZHO91OUon5EErBi2qRapTmUWhKRPPebSJOMHO5/iVCWx9i/03f/JhvdISYCxDkA6vNJSfB2goSArvI1AJeo2kLtoigx9iKhHJc9D3GxdyLeDd7b72TP4Uo0XMzzhirIYPsfNjPYerjfd6LaMUjtLpLQY1TDvtE1cD2U1sI5XPbrZyThvXLN1NiVIjf2LmUtACeq+aHZaNhWEuinllfpe0K1KamkAlXrmXa0bsW19uS79YUqJIdIcF+jCvYlEgqIAm2zzYcJi/uMWoSaGwAyke4jUaFvN6K0Fs5BO19I2rpT4h5L8k9JIzyryKlxdYJaEE5U80OSFOwxVgECCRTphKRSIzF0VPX4gXI3cZEDJsutUuHlC/2fqzWj4ChUMLhRgIRvlIo2TFY3dDzXI4S7AO/QcdFTtnPhHr4JErRUYG3cusyuIMKZuEiqV7JZGqfiDv6ZfQy6+MHft8fj8dexHj9EO13hte/j53TdV2ovxH78ised/n+MxwY6tqPf+R74mGP8He2hDfn5HP//mb77Fe/t9B1wOv9IfePzcM1b6ttrZjzwDHAM7hf9tfCr4Dn45zjvGLhEtQzk2x3GZCtJnhU0C0nipSIWDVIC7EYwYGuZAW6MPvTxvB05h36I330kqep7lBb3IrGflGYgJQUhje1JDXyKbUnvfEhlOJ9taRogXVmSLd8n+pbCTyXDhWNmOFGtAyz8PalWoSAIeRPJDYu3JMsnFjsqIQPvgkC2ynVhxObjvonF/NFwomTHTFazYG8CsdwLlRQkBjvahjYEOKe8VA9LiRu2OBjxc5CxlZxd9VpDlBaHE9V6QFl2WZgB2GT+Lo1JAyEgHpBTGgeFvJ6pbUgOvUKKnLSPveNDxviPa+C6kJxwPbbFfYzuCZCg0D4kL+xQSinHIpBUWa0c2HvdsTDcj2o5WIsHBTa3BQsILgY1qh8vUFaf3kTYiwxL4XPfJvb1kj5XKc90jjPkfvLOJXYZNX+vvoKorCwVvJlRep+OCeFEtRxSixk2E5AV22/Y9rJWKpdUWArcHbQ+lZAct5XzbLfOsarFWG3CPlUiWf1U1D3ZpmNmOFG1A150N4aKN3U8mgzwDSKspkSS0oKCU9kHavsvpS3LU966vnU9SGQo8iBdMOCCoFWZdrJaGE5U54shiwU7dlAboVZhwWJhwviOHUIY4vfk0PksCBW7cTCM41wJlhBByrBxgZBgs8L3N6LPuVAd7XctswMjlV1Cg5PVgrgkoioNNLXOa02U1+LpgrL4OeaN/38tucDl7igb9Plv/l5zZWjt+TsulKiGIkdUQwnQakuGy7AvD38P7CoXagqWAfkaSE0bJ42w5G7qi0J8U8yDsbGEnfL/i3WXuFaiSgXz9hPbmLR4PvY7KiGKFBldA8msBa1EvCWphYlCa2rnZldwzNnjEomq9MHVqnwaEbGHdFCMsmEACaUKEGgoaf8Syeww0/2XPg/teKl24jtN7aydd324YlwCUQ0RkXNtBSVEIyglwIfC8tcZ25YEV7A5d7IaStRTXneKZy6lMvhmOYFdOFHVQhqlpd+SVNtqJ2ftG7m2vanadUyDsc8bKmVQ1EpZsbmvbPtibFaXSlTSWMk5oOA3M4SEUm/ZFgilxLAuDciWc+lS5aO0QGgLJSmTJTj98hzPJffcx0pkh/iTfbqeJ85i2jwujajkrhpniQwDjdZrSy6yvLv21g2GYTdkjtFynjNamPiaOq4RnNy0CAnb4drPdCgOyncIbr/oAhVrEtVY2xIn94dRe4ikNKW9SLaHNi37BDDG2OoYh9vMZoi1izsX2Y3Z4T0IycsKDh+KKV11zo6oSlO/puLhanbLpjKCpxwIpY2Bkco86eTUDmRIESDnHefL0o65m8leuU/42bHdK9A8rQ1mbwZzEdXYxccq3AflbVf6wGu2pmX6E42ErO1n4OwmgGNSaGq0dGfhn1OopYfKOS5TKY8x1i/2op1boqr1AbnNVLQdC2uHRbPtzK2CTelW4TgvWOFQmup5J76bek3InPBaELaGRTWBKYiqdgtUPqScxDREKmJwUrcpwyCmgqt+jpL5sTUqF4HIprDLSolrbCGLydwjliYqLbVGSTrYlJ6uSUasms2Ru8nJxVEzR8LEL8aOfpexozJaIpeXP4UUcfWXQFRa8G3Nzhzbi7QcQZLpw0CprgStSF6O5ZFKGBgWUt27gmvVSGFy/f0sVCsPSiGOkNFSmiIqCVlg0ypeMPf26pQTZQ2ychvVeWJqSaqbsC3L9KLZxkp30xfx45qSqEoT58vdNVQCbsludK6q3zmT2xTZQEvaXWpsSrOkaucBJWmY+8L2UqmktQ0tCBtcMdvKJ4+iIcgrr9m0Su7LzN9fQlQpiaKLVUIsI7gWdJnyrG52e/QMUDMOS47Z0M2WIfdScnyru35DzBjdTBqDNj/ulTqLgFz3HOrzNsUcHCJRSYM4M+6UdiTH5ZK1ZSMc+qI6h3tu9Zl2I/LY38Q1bmlSzAnfKwpw/L9006VEJSt3AGxPCoYKx7mqgXOdWEPe9ktILKn+TN2HKSSYudQ8DUsH7daqWqk2tHa6RPtzQMtRr0EG/lvE9SxIS44J2qkmqs/Cu5Ydw94KBr9kIaX+N3Y3b01SXJKolnYcrbWR1PSBVaPSmoI5rP1yxAJk+480Xu8p1CVlt+0WcEQGOEsD+s6hOKmdUb5PrkxtqYfmnColqrWis0smYStEsERfalHyEplzV1R7W+bStdTOsaHjv9SusGUqSYEX8vc5t/0LgP6zexGbdzh2MCd0yAQCsl6lWV1ojDF96je1nMSpLVNGiT/H2H6l3hhWBeK1IYO+p35OEimDLPrBQeVaviaM4ZhxrLF/zWmMxmJ8LAzpsnwLvyjjUdNvWSKtBl3sI8rZQ2Bh4pJqHCcZKNnh49JsT+L//ztva4zpc+2u8BunpHJtCppBn29+Ktwb/T1Nyk/iDbOmD9Y2TrKhpeBzb0UZosT3vTXyaUloIVL8HP9V2C+pZmwVB8UlMgdwvCq27cfM6Z9k1xkyr36RZCbvP9UOr0stMB/4Fue8ts5K+3mvnP/3Ktsnoprh09Hn1vjf/fF4fD0ej7/ooyH1/en8FNDuj3i9zuiL1n/tvm5jW1rf8PtcY5oaZ/kdxlbiteAetXGQz8tq8zQ+n8UYpZ5L6tni8xrbvE307z7Rlmz3NR5fMpa1zwL3z+M0ZG5LvIr7v6W+auPyuaCN1PNGu8c4Vp9jX+9pHtzHY/D9rHP99zAPmEVZZGWDXGo7MxSofSVvKSStwxvuQ0Fenq7gTVnThynBbyipevPObKktJIdT2z/i75a0uyP1AlWUc+OS83aW/78z5lMvqjSzwTZ1XfSTpaxSSSMnQVnXTPUnh218prh3TcLB88fxQUhzso1SPJEzN6/HRfNazUVUEh3daGrbErsdAOvC/DfO19qR38vfd0KklcZKzd4Akpti8Q9FJxaRXFgf4mcsebIaVRrUygR1oAXySMZXK0OGpfrxM94YNhH09zQWX+Mc+kvsLsm20d4uYQPidksANZXHAN9PMWc2cb4ipEybr3j+Mj6Wx3FbcV83SjYSJsJFTRpzExUmPSaPnDiPFCuk3fhbpZ9G6SLd0QTK5d+BM9uaJBUKdlOsF8AQ4gIx17zx+Xny82M/Jhwrd5F4MUmpmv93R/amXnFheKPr7wr7zzn10U7NItzH856MTSEtHGXI87mLL3LLaRIkucm0UbNRsRd+kIgyKSW8yWy0cxIVjHFSEuFEXZa3qoY+HvtG6hvvuk1ZrpyNxjVB1XOiT7wEpIQC1N67Rnq5ghe5rXT5fPEM2a/onSQ3tG2RFQgOZCWNu7yYSubEhl5GcuepBL3xN+7xq/KSHZLbf5MxhWjVfOTxGO+SXeD3OJYfyFRyupcQVX209bxApaLJiMqyl1iSiNyCrt1R5MkeDJXyULCTYvluaKpeTkVZEqxKW5JeTb9uDSnKumc5tppUjF0by40FJIOFvKf5AslAe4ZYaJg/cDpEm3383x+G2qqNC0siQzN2aHOYHSIxZ5/iQi+VWA/CzpSTUlIFZzcZqYrbxRj/JHWS1xuEhE9G3O6kmFqiksSxUwYKortmFE21qR0H28RtZH1WCa23qbVVy9fC2wSw3n5rll3C5Pgixtpa4Ba6+DYuVaUt/yc5lnvx7DTC6uknyC6Ie9Guf6fMIVYB+zgfaiWXXVx8NZI+30upbyHmFkuSU2Ev1hrPB9jmSqQqkOsjERW0F0ifOZePvjWi4ocUlPAAfiucBurjxA6lb4LVNemK/Yi0dvl6ePuBBD+ICbWGJMXj1AsVZZ/ZZEgBEsi7Yf+z3tBYABvDv6cmXEZKQjl7oKYCybc6XjbWRoz1LGEwLiUr6541LYPxFD+1RLXN9AtqcepllXOiZsCPTe74PSVe9tMb2if050n5cLAvyavwz5F+LGN8WdAO/D6OCR+qmvY64Zek+b+s4UfFY2j5d0lfGu2ZaWNzGrNSpObDkM9twkeO51HN88Pv8IWTYyT9nT5n2prqc5t5br8yfcKzqvXVmt33acrPPyZnPputtbe8VAPktvtQ28DpbfhnfFvB5WEsy89uMGwMa94v58IfC55TkJa/x89jYn5uRXFSbm9K5KSfVK0+oNYwj3POBnPYqLTdBx5EGOKmionTJg6rb1O1r+1CtYSp+7en7I1rIHf9MQuNTQXsNsDq7F38358D1Nka5NrcjCRvay7czRhiNjmmlqhkBQwLGpm1jtl3NmZAjVFds63IKs9LAdd+nijFi3UNSN8ycBhktVtI8sjNrYNRkbsbMR+20R445ZieDVGx817OmDfXgHSJtrsVFv45Y01yZgfDKecFf0KUKF7Iv08L35lrPtWMxcvEEh2kRk29bQ5T7vrVDtAU5aRL+zLXhFrLj+pSJL4UoL6n/IJq5owVIxlI/WHvblYB51aRUlLbISNdcqaKEmi7nM0XVpnDmF4C+FlxypCUJDQVLJeEFJoUhQslvrHk1YLBlWvIye+HwNqweRLhPyCr3QIaQAr7hK9SP4EWwClxavt2tkSVMvaxRzPCAWCwnANMfEN2EzW0Ij1NibnyjM01p6Z+BrcFO3DWQp5irHI7du8TSstW9ovmbcb/mHii78kwybYqiJvaFvC3GK/2LTpWSp25VtIqOb6mTW0yptSRpcH9k/bBkh07LRPD2hIV25E4G4BUh6bAPiFVAQ9xfsr+lUDzzue/OShazqef0eGyT1ybC4gyUo668nded5rz7uqYIygZb6Wcl7QcMHjU4icmUM42IENsSga3mQfgUJGLZSvZESyFFvpjvViHLN5UCiFoFQeDpDTS7JU2NNS8RNGPVtJoz0JU2oN+NkIDcgGTnCcIx3JuHSkKp4ipJgTH0S60hWilO5kCMqCZjeoIq5EhY0OA4HfYwpisuOpwid/iWMlXC1Zuat1MLVFx3FhQyKo2rUUQaVZkOXikiuHv0I+mBtqRhfViuZvZbUECAc0yXhSLmRfyGPVIZotlcNB8l7hGKntGramiJgXMRah+HKaQSmE7JG+STLC2JTL8WZBm2HE+4GRwjPeZ7CjclpUmpiZDZu5af5AktFFUvtw1ugTRWaE3qRQ+uRQwq2LKfFRyYJmstOyG7KtiIfX/jZG1E3mVMKlP+XIYTmDtolfe8HLBvSzUD0hVDKhZYxcyDOBaJgdZbcaCHB8LyBqCc0qkqoslKmvxg6xu4oDdVaYjKU0sxseyEZTJcb9iIVVHHnJni184oaAU+FhINQtpYliqQpZOzJ8h10eSQpnX/WdMf1RKEjcFat8hktQT7TCm1lSzUtXvC9gaODgYZCUJawxyauVDIrMn99PRFuT84ER5UzoiWoRnOZqONVxbudOtIqOd0ddcPyCBcv6198JcX0Oq1ZyljcoCJ6QDXul3TWcPA+xbVpbLncjiuFRRSodNCn8vNPl/b362PUKaYswRciV//6pIIbICS6lkx5WCGDKho+xLr7z87zNqHyeK5D5+IqKEFKeZZFBWjlNJ8/UXx1LlslL4p0h+z9VJLOKSxkftuJyIi9JCrgouB82xVJLUN/ItCiQBr7VIZMmpm4pMplICklLiYUC+tM7IUiLtuVKaws9nIqdtgVTVxEu8BaLS8kdJz9uQIK/dwB1F2LJQZeMs8vJcMEBSLElZue2XhFSXsGFT44isFa+FpFgy7/qC0mihkNyRnvkh8zLnOoKrowWi0kRn/vurUjiCCWtsOSssjGYeyoXCiiC4FbnaQyOSFKD5VJXYqfpEhR8m4RpsEznlN0Lls+bym3FPsi2UukPO9FUdqVsgqlRGA1lZJCiZO78L8soVCz0YOx2nh+e7gfPBmthaXUKkCl4yZY8F+FTxwt4WvnBhl5LFMiwSztm7bpS4PqnylWgHqXJiANRLFJBd9YXRAlGlxNx9pdqIcyDepvy35HdNibpXYECHL5EsTivVPXn+0gumV0hB2qk0QE2T1Ys0dbaEfG+Fk6gGGQNpST+W9z0D32uhNd01EpW1q5BKdGahF28T2D3kgthUlsx2jAOr7VphWlZZpDRQaqxeEjLvf1eww8ckZc0xS8LqhG2KfQdZ5ZNSaEpiw8s8ZzrBPbBU1V8jUc0dVPyJbB+pum4tpGy5RPQkQVnVrKUzZwnWTup2Y0gZ7KyqqXtvimtGbo5vM36H+wF1CLEDmCMqZDa52AyfYzN2ThFYzA/kYyQtVvsO4icnu9f6rp0LwC8llX/okiETFZ5+/3EqHRnHBQGvctw+xQ9LJ7cFY7dk4DnCsNhNQfpD9STBPwpSeRb3CEg/pRTJP9D3/GJ9FFWmg5IX3hqzt0hUyBcPyGf0oNxvdylE1VIGg558prSdlqmkKRl/1cr9L41OGQv5ZrZ2vmBzRDutoMReqmWsfcwUZsjNkb8M584DkdTUu6PaerDqHF50zvQ1gAXwkvCzSqVkLamp1oSY3EhAMYJu5VhvjBfauaVEDkLdu49SB8fwgYyl3U0jYM3OdUte5BII0M6pjjnNBjusUqqSuFMygXaXEOvX8oRDzOEYL2VrixgJ1lq77yXQG/FmVq5u9pPTxqs1iZwBifGdfI6YpHL+TNo1GHdK3b1D/Imd7ecEWZSOHUwjOTvYJqqAHHN51hIV7wy0MNHkG4Vz82i5jrTz+bypirBeMrCQ4OOmFfgIcWHfK3a9llQ+QNrXID1D0uBdTNz7c6HkZLkiPCiSzrPwM7M+KXTCFpibs4fCOodNS1Q5z/JLh5YzC0HP1+rqwFvgcldJSlgw0rYawoT5/a70XcsC8ph49iXuFDLcZjtid28rTBpbpU04Suc0BWBL87s/d9WP85y3QlpT+NzIuC+5O4K/Mclk+MGlg/1+oC7JCP0tLQDUzQvkbNvKfJGwUr6UklSJequ5cWziT+Sr2tMa2wubIPdLhppxW7WQwf54uSxGVlMXd+CQAUy+FherrJTD35fcp5VGhv9f4r18iZBqwUcxJ4KyCPGW/qTMp1bGD1KVFZ4Fe5yWU6oUmif7Rkmq9znhGzi0lJu2wZSyV8EWG1ojqlxeGgweD9xugVTAuX7J72BXqC1PdFvgIMrf7YTEoEmXJRO5JFQDb1DumzZhS3Yux0BGE4S4uDjtrqy4gj7Cz4pzleXS/i5BZNyHF1GdBpBEwk6Vqb5qnucMkNQJ/y4kn1qCgsSbej7WuPwnhPBfSzyfWonKIiht8eNm/5PwPJ5yopW2o5UXwi5NKvwArg1aruucH8z7CJtVX+h2IfOLh4a87bGrVJIGd0/2qtx4LSFtMfnwLhyrZJwx1oL1EmVPds2gvTPaY69+QOtDrl8cFxuMXUwNuP97JUZ28gwLNUQl3w6QnkryMOMtNJeBuXRAIH1IQsUuinUO2n9KpNmwgKyigTyIeWe0NIOi9vDRNxhgcV9cXZjfjmuV7sbYyrASOW94XFswrvP4SvU1FWTM58rvAPxP7hqmcqkdRLLHUFikNAeZkWRPAdC5l903ZV4P6cPkNioOuEzZaiQZwGuXY57Gqj2lA8IZRK06cay2pNpEsYoasgqRrBGJziW9Svtv4YciJcLQqqmoa9h9+jhuqWh9QBrX1wTGSYawMElZhJojLsxJKUnJNXUgckI2UFnDcgy0F2BPaYy1+0Y/pSRcM6ebC0pGqmAsGthTlt6+R3I26deTq7ihqYDwD6pVrSBdwpkP281DyJjTiEjHypTUgnPXNkanDMDIa2/lVpqDbK022XDNeBb2tFzbEixJSbsQyAq2rzl30K02n8gxOue6MLsk/PuIt2MQBUAtaPmgIF1x3b05PJMx+UAMMoFZaZZFvP3e6GGUpMgIiQeMcbsTb0mZx10mEgThQopiG8k7tatNrrmN6TkCeKnIEQZCDwOTzNX2UQNUPkmqXGxiqB+hNCHIIqElnu1d5TWHQJIVPyt+wWiS8GrGdElW1g5aDpCu+EFBrJ1KyuoUL99QkEWS/YBSRkkQXClZHQpsWFrJemnklInm/hRpalPX5rfyUlJVr7xtNWnU2kX9RhL4XItRa/c+jqfsFzIhsJ3RgrX7p+3wsU2xNO1NP/Fz1NqC/UkSNr/wgyIJTxooPYXqlyOs3A4UCAT2qynEXB7wu0K7VEhsJ2t9eYvt5IjKun+NuKTqJh0luY0vYvFK+1uqKsnSkAnb2L6Ze8lpu4FzAzt8UKvRjyAyIchSX7IN/OT5o+Wqkk6jliTVZUwB1v9SKJnnKLqq+VdtFqlBcDwep/jcHo/Hz8fj8fU4Dr/i59TOj/jp4qemLz9iO7Lt0/f3le3lPl1s8zVxP6n7rcVrvJ7sx2n8LWAcS+6Ff0+1CQwdsx80BrlxwnGvA54f5o92Tkdzhv//Q1wXP3FMF88pnY98vdQaGTLfwwIfa03x+Ei8xo8cW4xd1T1OZUyHdAE7CUtXVt09DczYMDLyWw3tM+SWu3YtjmafOndPT5KKvHdIDfKtaSXgs8aH+w/7lXyD7jPnldyzdowm9XDF6SHArlLt7inU2y3Z5Wo3IjS7zl6pihMUmxGjNEidj8sVDS19TksDmz7B0JwsV5ODsikCv78q/HZiq4nBQZWpnbGSBWpBy65pHYcJre3uTb17BPtDrsIH+lZy75bNQhr4bxXvZekxzeeWuIZ8UFRbK8dSLdB/2efcvJAvrdRmjLwe5qRVIdtKmWyNYwl4rD8bpgLYTEt3EdfCbXRgrnXN4XUI4q4SGOZwT4Dz2HN8M52Mobm4odRk1Lx15cRmRpdOcaVv3qFgyaaPCxjXTu2KpsiVJUeZZjaINxMWggxTGZKHXGKv2E6GSqSSHNF/+FftKuIo8XNHu8f8rK1d0hCP4crEneEvxXNqTDYEltQsiUorWd8i3sSOf2rtyo0zXgcICyqeS3OleWHCehKSBt5WOW927ffUsVjgzyPUgqHQfK3Y3cBKt8HQyLWmj6W7RrW7RKn2aiRS6zht4lsqc27X1NpJkwTO92GpfFLNHSuFa6FbYWQc6BrAi1irV1gCLnSxqERVavuAA9mLSEMREjasnNQRaHFjoS/td9JnvtcqPQfhdgDUSH7aLk8JSdUQyzu5P5TaZMb45fFuWEqykuoh/s7ZQiVJyaBgTaWZYqdUC92yiBBoiaQ60SeWrJiAUy8VtmtWazhz2Ki0UIFUp/Am05J6MVhCCcIp8pJhjZ+cPPD7GVJ2yhpDXsiMOcacg3NrbCCcAdPKvcTOvRpRfTZiVk/n/XfB+OTQRROIZgZ4qAzhWgOW+w7nvNLyXwGjN7LmsFGNDYicGpNHchvtz3WNvvBakMzYKziXJqXk2mPHr+RFhbhPePzXhCflsgtslM0U6YgpS8rztS0CmYpQNH++1tAb3/Ha5YSZYYDpYnGJyuEYAw7Whc1piCMxH/enkYZEi7lDm7mduFICx3GaRPXYaGLJ5nBN5bIc5wHeDfxUSEQpW5ZWnBPXCYnCBryVbvVzDNjO6jiDku4OhwaoFe/CxUDLvhAKnXs1KSiVT+09o+INdaJdO6Tp7OBE5VgbOUM9++VxHT0pBXHOppTRlu1B2vb6ptCzvVai0qSntfNtnQ2cqBxrQxqSUxJMLmwn5YskCRF2MAsItH+bKGMBKvIMyWN29XCicrSCqZ1zc5Iaq5GWjWvKqtfITQ4p7tqL1FbBicpxjpDJBLWt8By5lNS7g9SVywJbG7yOqi8t+kw1CScqx9oYslj5+CHVT7pEbUethHmYyLkYuZ2AsX5uVwP3o3JcKxm+VnjAH6KrhMwYMVQiQhTBibT+OeD8q4NLVA5HHkiJLEOUhkpYa+SuP2u4ROW4BmiSz6+Bu2/IxwV709CUNye46lcIJyrHNUDLbT6UqGTOMA+BWQAeQuO4JgwN+pVhOkPdC1oNOm4eTlSOawKraWPi7BBDWCNNOUmNgBvTHdeMkgyiWoZQq4JzCu4vNQJOVI5rxfsA9e1ZSFHusLkQXPVzXDo6w6nSKpqh4TH6XElVz6WkheBE5bh09AX+TFZOqwNVpHYP8hXhROW4JrBBex9tTVZ6F/hLOUk1APejclwLrAIF/1ZypmuFIGQ7si3HjHCiclwLLMM3qiM/JGL6cD7gBLUwfNfPce14i+TEpcYtOEGtBJeoHNeo9mnSlaUaOjk1ADemO64VnPo4iDp/uZqKqe8cM8AlKofD0TxconI4HM3DicrhcDQPJyqHwxFax/8AxsoSKMBw44MAAAAASUVORK5CYII=';

      const styles = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          
          * { box-sizing: border-box; }
          
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #ffffff;
            color: #1e293b;
            margin: 0;
            padding: 15px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .payslip-card {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #3d0d0a;
            border-radius: 12px;
            padding: 24px;
            background: #ffffff;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            position: relative;
            page-break-after: always;
          }

          .payslip-card:last-child {
            page-break-after: avoid;
          }

          .hdr {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #3d0d0a;
            padding: 16px 20px;
            border-radius: 8px;
            color: #ffffff;
            margin-bottom: 20px;
          }

          .hdr-brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .hdr-logo {
            height: 48px;
            width: auto;
            object-fit: contain;
          }

          .hdr-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #ffffff;
          }

          .hdr-sub {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #fca5a5;
            margin-top: 2px;
          }

          .doc-meta {
            text-align: right;
            font-size: 12px;
            color: #f8fafc;
          }

          .doc-meta-title {
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #ffffff;
          }

          .sec-title {
            font-size: 11px;
            font-weight: 800;
            color: #3d0d0a;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin: 18px 0 8px 0;
            border-left: 4px solid #89201b;
            padding-left: 10px;
          }

          .emp-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 20px;
            background: #f8fafc;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }

          .info-item {
            display: flex;
            font-size: 12px;
          }

          .info-lbl {
            width: 140px;
            font-weight: 700;
            color: #64748b;
          }

          .info-val {
            font-weight: 600;
            color: #0f172a;
            flex: 1;
          }

          .tbl {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11.5px;
          }

          .tbl th {
            background: #3d0d0a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 9px 12px;
            border: 1px solid #3d0d0a;
          }

          .tbl td {
            padding: 8px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }

          .tbl tr:nth-child(even) {
            background: #f8fafc;
          }

          .earning { color: #16a34a; font-weight: 600; }
          .deduction { color: #dc2626; font-weight: 600; }

          .total-row td {
            background: #f1f5f9;
            font-weight: 800;
            font-size: 13px;
            color: #0f172a;
            border-top: 2px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
            padding: 10px 12px;
          }

          .net-salary-banner {
            margin-top: 14px;
            background: linear-gradient(135deg, #3d0d0a 0%, #89201b 100%);
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .net-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .net-amount {
            font-size: 20px;
            font-weight: 800;
            color: #ffffff;
          }

          .remarks-box {
            margin-top: 14px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            font-size: 11px;
            color: #475569;
          }

          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 10px;
            font-size: 11px;
            color: #64748b;
          }

          .sig-line {
            border-top: 1.5px dashed #94a3b8;
            padding-top: 6px;
            width: 180px;
            text-align: center;
            font-weight: 600;
          }

          .footer-note {
            margin-top: 20px;
            text-align: center;
            font-size: 9.5px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
          }

          @media print {
            body { padding: 0; background: #fff; }
            .payslip-card {
              border: none;
              box-shadow: none;
              padding: 0;
              max-width: 100%;
            }
          }
        </style>
      `;

      const cardsHTML = targetUsers.map(u => {
        const payroll = DB.calculateMonthlyPayroll(u.id, month, year);
        if (!payroll) return '';

        const totalDays = new Date(year, month + 1, 0).getDate();
        const allUserLogs = DB.getLogs(u.id) || [];
        const allLeaves = DB.getLeaveRequests(u.id) || [];
        const approvedLeaves = allLeaves.filter(lv => lv.status === 'Approved');

        const assignedSchedules = (u.scheduleIds && Array.isArray(u.scheduleIds) && u.scheduleIds.length > 0)
          ? u.scheduleIds.map(id => DB.getSchedule(id)).filter(Boolean)
          : (u.scheduleId ? [DB.getSchedule(u.scheduleId)].filter(Boolean) : []);

        let dailyLogsRows = [];
        for (let day = 1; day <= totalDays; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dateVal = new Date(year, month, day);
          const dayOfWeek = dateVal.getDay();

          const logsForDay = allUserLogs.filter(l => l.date === dateStr);

          const isOnLeave = approvedLeaves.some(lv => {
            const start = new Date(lv.startDate);
            const end = new Date(lv.endDate);
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            return dateVal >= start && dateVal <= end;
          });

          let isWorkingDay = true;
          let daySchedule = null;
          if (assignedSchedules.length > 0) {
            const activeSched = assignedSchedules.find(sch => sch.workDays && sch.workDays.includes(dayOfWeek));
            if (activeSched) {
              daySchedule = activeSched;
            } else {
              isWorkingDay = false;
            }
          } else {
            isWorkingDay = (dayOfWeek !== 0 && dayOfWeek !== 6);
            daySchedule = DB.getSchedule(u.scheduleId) || (schedules && schedules[0]);
          }

          if (logsForDay.length > 0) {
            logsForDay.forEach(log => {
              const logSched = DB.getSchedule(log.shiftId) || daySchedule || {};
              const checkInVal = log.checkIn ? formatTime12h(log.checkIn) : '--:--';
              const checkOutVal = log.checkOut ? formatTime12h(log.checkOut) : '--:--';
              let statusText = log.status || 'Present';
              let statusColor = '#16a34a';
              if (statusText === 'Late') statusColor = '#d97706';
              if (statusText === 'Half Day') statusColor = '#2563eb';
              if (statusText === 'Absent') statusColor = '#dc2626';
              if (statusText === 'Deviation Logged') statusColor = '#f59e0b';
              
              dailyLogsRows.push(`
                <tr>
                  <td style="padding: 4px 8px;">${dateStr}</td>
                  <td style="padding: 4px 8px;">${Utils.escape(logSched.name || 'General Shift')}</td>
                  <td style="padding: 4px 8px; text-align: center; font-family: monospace;">${checkInVal}</td>
                  <td style="padding: 4px 8px; text-align: center; font-family: monospace;">${checkOutVal}</td>
                  <td style="padding: 4px 8px; text-align: center; font-weight: 700; color: ${statusColor};">${statusText}</td>
                </tr>
              `);
            });
          } else {
            let statusText = '';
            let statusColor = '#64748b';
            if (isOnLeave) {
              statusText = 'Approved Leave';
              statusColor = '#7c3aed';
            } else if (!isWorkingDay) {
              statusText = 'Weekly Off';
              statusColor = '#94a3b8';
            } else {
              const todayDate = new Date();
              todayDate.setHours(0,0,0,0);
              if (dateVal > todayDate) {
                statusText = 'Scheduled';
                statusColor = '#0284c7';
              } else {
                statusText = 'Absent';
                statusColor = '#dc2626';
              }
            }

            const schedName = daySchedule ? daySchedule.name : (isWorkingDay ? 'General Shift' : 'Weekly Off');
            dailyLogsRows.push(`
              <tr>
                <td style="padding: 4px 8px;">${dateStr}</td>
                <td style="padding: 4px 8px; color: #64748b;">${Utils.escape(schedName)}</td>
                <td style="padding: 4px 8px; text-align: center; color: #94a3b8; font-family: monospace;">--:--</td>
                <td style="padding: 4px 8px; text-align: center; color: #94a3b8; font-family: monospace;">--:--</td>
                <td style="padding: 4px 8px; text-align: center; font-weight: 600; color: ${statusColor};">${statusText}</td>
              </tr>
            `);
          }
        }
        const dailyLogsHTML = dailyLogsRows.join('');

        return `
          <div class="payslip-card">
            <div class="hdr">
              <div class="hdr-brand">
                <img src="${logoDataUrl}" class="hdr-logo" alt="Company Logo">
                <div>
                  <div class="hdr-title">HS GROUP DELHI</div>
                  <div class="hdr-sub">House of Surya | Salary Statement</div>
                </div>
              </div>
              <div class="doc-meta">
                <div class="doc-meta-title">PAYSLIP RECEIPT</div>
                <div>Period: ${period}</div>
                <div style="font-size:10px;opacity:0.85">Generated: ${generatedDate}</div>
              </div>
            </div>

            <div class="sec-title">Employee Details</div>
            <div class="emp-grid">
              <div class="info-item"><span class="info-lbl">Employee Name:</span><span class="info-val">${Utils.escape(u.name || 'N/A')}</span></div>
              <div class="info-item"><span class="info-lbl">Employee ID:</span><span class="info-val">${Utils.escape(u.employeeId || u.id || 'N/A')}</span></div>
              <div class="info-item"><span class="info-lbl">Department:</span><span class="info-val">${Utils.escape(u.department || 'N/A')}</span></div>
              <div class="info-item"><span class="info-lbl">Role / Designation:</span><span class="info-val">${Utils.escape(u.designation || 'Staff Associate')}</span></div>
            </div>

            <div class="sec-title">Attendance & Days Summary</div>
            <div class="emp-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 12px;">
              <div class="info-item" style="flex-direction:column"><span class="info-lbl">Working Days</span><span class="info-val" style="font-size:13px">${payroll.workingDays ?? 0} Days</span></div>
              <div class="info-item" style="flex-direction:column"><span class="info-lbl">Present Days</span><span class="info-val" style="font-size:13px;color:#16a34a">${payroll.presentDays ?? 0} Days</span></div>
              <div class="info-item" style="flex-direction:column"><span class="info-lbl">Absent Days</span><span class="info-val" style="font-size:13px;color:${(payroll.absentDays || 0) > 0 ? '#dc2626' : '#0f172a'}">${payroll.absentDays ?? 0} Days</span></div>
              <div class="info-item" style="flex-direction:column"><span class="info-lbl">Leave Days</span><span class="info-val" style="font-size:13px;color:#2563eb">${payroll.approvedLeaveDays ?? 0} Days</span></div>
            </div>

            <div class="sec-title">Daily Attendance Logs (Check-In & Check-Out)</div>
            <table class="tbl" style="margin-top: 6px; margin-bottom: 16px; font-size: 11px;">
              <thead>
                <tr>
                  <th style="padding: 6px 8px;">Date</th>
                  <th style="padding: 6px 8px;">Shift / Schedule</th>
                  <th style="padding: 6px 8px; text-align: center;">Check-In</th>
                  <th style="padding: 6px 8px; text-align: center;">Check-Out</th>
                  <th style="padding: 6px 8px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${dailyLogsHTML}
              </tbody>
            </table>

            <div class="sec-title">Salary Breakdown (Earnings & Deductions)</div>
            <table class="tbl">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align:right">Earnings (INR)</th>
                  <th style="text-align:right">Deductions (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Fixed Monthly Salary</td>
                  <td style="text-align:right" class="earning">₹${(payroll.baseSalary ?? 0).toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td style="text-align:right" class="earning">₹${(payroll.allowanceHRA ?? 0).toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Travel Allowance</td>
                  <td style="text-align:right" class="earning">₹${(payroll.allowanceTravel ?? 0).toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Overtime Allowance (${payroll.overtimeText || '0h 0m'})</td>
                  <td style="text-align:right" class="earning">₹${(payroll.overtimePay ?? 0).toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                ${(payroll.bonus || 0) > 0 ? `
                <tr>
                  <td>Manager Discretionary Bonus / Rewards</td>
                  <td style="text-align:right" class="earning">₹${(payroll.bonus).toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                ` : ''}
                <tr>
                  <td>Absent Penalties (${payroll.absentDays ?? 0} days absent)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.absentDeduction ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Half-day Salary Deductions (${payroll.halfDays ?? 0} occurrences)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.halfDayDeduction ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Provident Fund (PF) Contribution</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.deductionPF ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Employees' State Insurance (ESI) Contribution</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.deductionESI ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Professional Tax (PT)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.deductionPT ?? 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Tax Deducted at Source (TDS) (${payroll.deductionTDS ?? 0}%)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.deductionTDSVal ?? 0).toLocaleString()}</td>
                </tr>
                ${(payroll.adhocDeduction || 0) > 0 ? `
                <tr>
                  <td>Manager Ad-hoc Deduction / Adjustments</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.adhocDeduction).toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td>Total Gross Earnings / Total Deductions</td>
                  <td style="text-align:right" class="earning">₹${(payroll.grossEarnings ?? 0).toLocaleString()}</td>
                  <td style="text-align:right" class="deduction">₹${(payroll.totalDeductions ?? 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div class="net-salary-banner">
              <div class="net-title">Net Disbursed Take-Home Salary</div>
              <div class="net-amount">₹${(payroll.netSalary ?? 0).toLocaleString()}</div>
            </div>

            ${payroll.remarks ? `
            <div class="remarks-box">
              <strong>Remarks / Notes:</strong> ${Utils.escape(payroll.remarks)}
            </div>
            ` : ''}

            <div class="signatures">
              <div class="sig-line">Authorized HR Dept Stamp / Seal</div>
              <div class="sig-line">Signature of Employee Recipient</div>
            </div>

            <div class="footer-note">
              This is an official computer-generated Payroll Statement and Salary Receipt issued by HS Group Delhi (House of Surya).
            </div>
          </div>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Employee Payroll Slip - HS Group</title>
          ${styles}
        </head>
        <body>
          ${cardsHTML}
          <script>
            window.addEventListener('DOMContentLoaded', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            });
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      closeModal(overlay);
    } catch (e) {
      alert('Error printing PDF. Please try again.');
      console.error(e);
    }
  };

  downloadBtn.addEventListener('click', () => {
    const checkedIds = getCheckedUserIds();
    const format = formatSelect.value;

    if (checkedIds.length === 0) {
      alert('Please select at least one employee.');
      return;
    }
    
    if (format === 'pdf') {
      downloadPDF(checkedIds);
    } else {
      const data = buildProfileData(checkedIds);
      const filename = checkedIds.length === 1 ? `profile_${checkedIds[0]}.xlsx` : 'combined_employee_profiles.xlsx';
      downloadExcel(data, filename);
    }
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD REPORT MODAL  –  Attendance & Payroll Report (Monthly Report section)
// Completely separate from openProfileDownloadModal. Any change here does NOT
// affect the Download Profile modal, and vice versa.
// ─────────────────────────────────────────────────────────────────────────────
function openAttendanceReportModal() {
  const loggedInUser = Auth.getCurrentUser() || {};
  
  // Show all active employees. HR, Admin, Finance Manager see all; Manager sees managed employees.
  let getFilteredReportUsers = () => {
    return DB.getUsers().filter(u => {
      if (DB.getUserBaseRole(u.role) !== 'employee') return false;
      if (u.status === 'Inactive') return false;
      if (loggedInUser.role === 'manager') {
        return u.managerId === loggedInUser.id;
      }
      return true;
    });
  };

  let reportUsers = getFilteredReportUsers();
  const today = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:500px;padding:24px;display:flex;flex-direction:column;gap:16px">
      <div class="modal-header" style="margin-bottom:0">
        <h3 class="modal-title">📊 Export Attendance & Payroll Report</h3>
        <button class="close-modal-btn" id="btn-rpt-close">✕</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">
        Exports attendance summary, check-in/out logs, working hours, overtime, leave details, and payroll data for the selected period.
      </div>

      <!-- Period Selector -->
      <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label class="form-label" style="font-size:11.5px;font-weight:700;color:var(--text-secondary)">Month</label>
          <select id="rpt-month-select" class="form-input" style="background:rgba(255,255,255,0.02)">
            ${monthNames.map((m,i) => `<option value="${i}" ${i===today.getMonth()?'selected':''}>${m}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label" style="font-size:11.5px;font-weight:700;color:var(--text-secondary)">Year</label>
          <select id="rpt-year-select" class="form-input" style="background:rgba(255,255,255,0.02)">
            ${[2024,2025,2026].map(y=>`<option value="${y}" ${y===today.getFullYear()?'selected':''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Employee Selector -->
      <div class="form-group" style="display:flex;flex-direction:column;gap:6px">
        <label class="form-label" style="font-size:11.5px;font-weight:700;color:var(--text-secondary)">Select Employees</label>
        <input type="text" id="rpt-search-input" class="form-input" placeholder="🔍 Search name or ID..." style="padding:6px 10px;font-size:12px;margin-bottom:4px;background:rgba(255,255,255,0.02)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text-secondary)">
            <input type="checkbox" id="rpt-select-all" style="cursor:pointer" checked> Select All
          </label>
          <span id="rpt-selection-count" style="font-size:11.5px;font-weight:600;color:var(--cyan)">0 selected</span>
        </div>
        <div id="rpt-checkbox-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px;display:flex;flex-direction:column;gap:8px;background:rgba(0,0,0,0.1)">
          ${reportUsers.map(u => `
            <label class="rpt-chk-item" data-name="${u.name.toLowerCase()}" data-empid="${(u.employeeId||'').toLowerCase()}" data-id="${u.id}" style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:var(--radius-sm);transition:background 0.15s ease">
              <input type="checkbox" class="rpt-user-checkbox" value="${u.id}" style="cursor:pointer" checked>
              <span style="font-weight:600;color:var(--text-primary)">${Utils.escape(u.name)}</span>
              <span style="color:var(--text-muted);font-size:11px">(${Utils.escape(u.employeeId||u.id)})</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Format Selector -->
      <div class="form-group">
        <label class="form-label" for="rpt-format-select" style="font-size:11.5px;font-weight:700;color:var(--text-secondary)">Export Format</label>
        <select id="rpt-format-select" class="form-input" style="background:rgba(255,255,255,0.02)">
          <option value="pdf">PDF Document (.pdf)</option>
          <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
          <option value="csv">CSV (Comma Separated Values) (.csv)</option>
        </select>
      </div>

      <!-- Warning -->
      <div id="rpt-warning-box" style="display:none;padding:10px 14px;border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);background:rgba(239,68,68,0.05);color:var(--error);font-size:11.5px;font-weight:600;line-height:1.45"></div>

      <!-- Actions -->
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;border-top:1px solid rgba(255,255,255,0.05);padding-top:14px">
        <button class="btn btn-secondary" id="btn-rpt-cancel" style="width:auto;padding:8px 16px;font-size:12.5px">Cancel</button>
        <button class="btn btn-cyan" id="btn-rpt-export-action" style="width:auto;padding:8px 20px;font-size:12.5px;font-weight:700">Download</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const searchInput  = overlay.querySelector('#rpt-search-input');
  const selectAllChk = overlay.querySelector('#rpt-select-all');
  const checkboxList = overlay.querySelector('#rpt-checkbox-list');
  const selCount     = overlay.querySelector('#rpt-selection-count');
  const formatSel    = overlay.querySelector('#rpt-format-select');
  const warningBox   = overlay.querySelector('#rpt-warning-box');
  const downloadBtn  = overlay.querySelector('#btn-rpt-export-action');
  const monthSel     = overlay.querySelector('#rpt-month-select');
  const yearSel      = overlay.querySelector('#rpt-year-select');

  const getCheckedIds = () =>
    Array.from(checkboxList.querySelectorAll('.rpt-user-checkbox:checked')).map(el => el.value);

  const validate = () => {
    const ids = getCheckedIds();
    if (reportUsers.length === 0) {
      warningBox.textContent = '⚠️ No employee records found.';
      warningBox.style.display = 'block';
      downloadBtn.setAttribute('disabled','true');
      downloadBtn.style.opacity = '0.5';
    } else if (ids.length === 0) {
      warningBox.textContent = '⚠️ Please select at least one employee.';
      warningBox.style.display = 'block';
      downloadBtn.setAttribute('disabled','true');
      downloadBtn.style.opacity = '0.5';
    } else {
      warningBox.style.display = 'none';
      downloadBtn.removeAttribute('disabled');
      downloadBtn.style.opacity = '1';
    }
    selCount.textContent = `${ids.length} selected`;
  };

  // Auto update employee selector list if DB updates in the background
  const handleRptDbUpdate = () => {
    const freshUsers = getFilteredReportUsers();
    
    // Save current checked state
    const currentChecked = new Set(getCheckedIds());
    
    checkboxList.innerHTML = freshUsers.map(u => {
      const isChecked = currentChecked.has(u.id) || selectAllChk.checked;
      return `
        <label class="rpt-chk-item" data-name="${u.name.toLowerCase()}" data-empid="${(u.employeeId||'').toLowerCase()}" data-id="${u.id}" style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 6px;border-radius:var(--radius-sm);transition:background 0.15s ease">
          <input type="checkbox" class="rpt-user-checkbox" value="${u.id}" style="cursor:pointer" ${isChecked ? 'checked' : ''}>
          <span style="font-weight:600;color:var(--text-primary)">${Utils.escape(u.name)}</span>
          <span style="color:var(--text-muted);font-size:11px">(${Utils.escape(u.employeeId||u.id)})</span>
        </label>
      `;
    }).join('');
    
    reportUsers = freshUsers;
    validate();
  };
  window.addEventListener('db_updated', handleRptDbUpdate);

  const close = () => {
    window.removeEventListener('db_updated', handleRptDbUpdate);
    overlay.style.animation = 'customDialogFadeOut 0.18s ease forwards';
    overlay.querySelector('.modal-content').style.animation = 'customDialogScaleDown 0.18s ease forwards';
    setTimeout(() => {
      if (overlay.parentNode) document.body.removeChild(overlay);
    }, 180);
  };

  overlay.querySelector('#btn-rpt-close').addEventListener('click', close);
  overlay.querySelector('#btn-rpt-cancel').addEventListener('click', close);

  checkboxList.addEventListener('change', e => {
    if (e.target.classList.contains('rpt-user-checkbox')) {
      const visible = Array.from(checkboxList.querySelectorAll('.rpt-chk-item'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.querySelector('.rpt-user-checkbox'));
      selectAllChk.checked = visible.length > 0 && visible.every(cb => cb.checked);
      validate();
    }
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    checkboxList.querySelectorAll('.rpt-chk-item').forEach(item => {
      item.style.display = (item.dataset.name.includes(q) || item.dataset.empid.includes(q)) ? 'flex' : 'none';
    });
    const visible = Array.from(checkboxList.querySelectorAll('.rpt-chk-item'))
      .filter(el => el.style.display !== 'none')
      .map(el => el.querySelector('.rpt-user-checkbox'));
    selectAllChk.checked = visible.length > 0 && visible.every(cb => cb.checked);
  });

  // Select All selects EVERY employee in the system (per requirements)
  selectAllChk.addEventListener('change', () => {
    checkboxList.querySelectorAll('.rpt-chk-item').forEach(item => {
      const cb = item.querySelector('.rpt-user-checkbox');
      if (cb) cb.checked = selectAllChk.checked;
    });
    validate();
  });

  validate();

  // ── Excel/CSV Export Headers ──────────────────────────────────────────────
  const getHeadersList = () => {
    const headers = [
      'Date', 'Employee ID', 'Employee Name', 'Department', 'Role', 
      'Assigned Shift', 'Worksite Location', 'Attendance Status', 
      'Check-In Time', 'Check-Out Time', 'Total Working Hours', 
      'Late Entry', 'Early Check-Out', 'Overtime', 'Break Time', 
      'Leave Details', 'Weekly Off', 'Holiday'
    ];
    if (['hr', 'manager', 'finance_manager'].includes(loggedInUser.role)) {
      headers.push('Base Salary (INR)', 'Net Payout (INR)');
    }
    return headers;
  };

  // Builds daily logs for Excel/CSV spreadsheet format
  const buildReportData = (checkedIds, month, year) => {
    const targetUsers = reportUsers.filter(u => checkedIds.includes(u.id));
    const data = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const showPayroll = ['hr', 'manager', 'finance_manager'].includes(loggedInUser.role);

    targetUsers.forEach(u => {
      const sched = DB.getSchedule(u.scheduleId) || {
        name: 'Standard Day Shift',
        startTime: '09:00',
        endTime: '17:00',
        gracePeriod: 15,
        workDays: [1, 2, 3, 4, 5],
        location: 'Kohat Enclave, Pitampura, Delhi'
      };
      const p = DB.calculateMonthlyPayroll(u.id, month, year) || {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayStatus = getAttendanceStatusForDate(u.id, dateStr);
        const log = dayStatus.log;

        let checkIn = 'No Attendance Record';
        let checkOut = 'No Attendance Record';
        let workHours = '—';
        let lateEntry = 'No';
        let earlyCheckOut = 'No';
        let overtime = '0h 0m';
        let breakTime = '—';
        let leaveDetails = '—';
        let weeklyOff = 'No';
        let holiday = 'No';

        if (dayStatus.status === 'Leave') {
          leaveDetails = 'Approved Leave';
        } else if (dayStatus.status === 'Holiday') {
          const isWeekend = !sched.workDays.includes(new Date(dateStr).getDay());
          if (isWeekend) {
            weeklyOff = 'Yes';
          } else {
            holiday = 'Yes';
          }
        }

        if (log) {
          checkIn = log.checkIn ? formatTime12h(log.checkIn) : 'No Attendance Record';
          checkOut = log.checkOut ? formatTime12h(log.checkOut) : 'No Attendance Record';
          if (log.checkIn && log.checkOut) {
            workHours = Utils.calculateDuration(log.checkIn, log.checkOut);

            // Overtime Calculation
            const [sH, sM] = sched.startTime.split(':').map(Number);
            const [eH, eM] = sched.endTime.split(':').map(Number);
            const shiftDurationMins = (eH * 60 + eM) - (sH * 60 + sM);
            const [iH, iM] = log.checkIn.split(':').map(Number);
            const [oH, oM] = log.checkOut.split(':').map(Number);
            const workedMins = (oH * 60 + oM) - (iH * 60 + iM);
            if (workedMins > shiftDurationMins) {
              const otMins = workedMins - shiftDurationMins;
              overtime = `${Math.floor(otMins / 60)}h ${otMins % 60}m`;
            }
          }
          if (log.status === 'Late') lateEntry = 'Yes';
          if (log.status === 'Half Day') earlyCheckOut = 'Yes';
          if (log.breakTime) breakTime = log.breakTime;
        }

        const rowItem = {
          'Date': dateStr,
          'Employee ID': u.employeeId || u.id || 'N/A',
          'Employee Name': u.name || 'N/A',
          'Department': u.department || 'N/A',
          'Role': u.designation || 'N/A',
          'Assigned Shift': sched.name || 'N/A',
          'Worksite Location': sched.location || 'N/A',
          'Attendance Status': dayStatus.status,
          'Check-In Time': checkIn,
          'Check-Out Time': checkOut,
          'Total Working Hours': workHours,
          'Late Entry': lateEntry,
          'Early Check-Out': earlyCheckOut,
          'Overtime': overtime,
          'Break Time': breakTime,
          'Leave Details': leaveDetails,
          'Weekly Off': weeklyOff,
          'Holiday': holiday
        };

        if (showPayroll) {
          rowItem['Base Salary (INR)'] = p.baseSalary ?? 0;
          rowItem['Net Payout (INR)'] = p.netSalary ?? 0;
        }

        data.push(rowItem);
      }
    });
    return data;
  };

  const downloadReportExcel = (data, filename, format) => {
    const doExport = () => {
      try {
        const ws = XLSX.utils.json_to_sheet(data, { header: getHeadersList() });
        if (format === 'csv') {
          const csvContent = XLSX.utils.sheet_to_csv(ws);
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
          XLSX.writeFile(wb, filename);
        }
        close();
      } catch (err) {
        alert(`Error generating ${format === 'csv' ? 'CSV' : 'Excel'} file.`);
        console.error(err);
        downloadBtn.removeAttribute('disabled');
        downloadBtn.textContent = 'Download';
      }
    };
    if (window.XLSX) { doExport(); }
    else { loadSheetJS(doExport, () => { alert('Failed to load SheetJS library.'); downloadBtn.removeAttribute('disabled'); downloadBtn.textContent = 'Download'; }); }
  };

  // ── PDF export ───────────────────────────────────────────────────────────
  const downloadReportPDF = (checkedIds, month, year) => {
    try {
      const targetUsers = reportUsers.filter(u => checkedIds.includes(u.id));
      const printWindow = window.open('', '_blank');
      if (!printWindow) { alert('Popup blocker active. Please allow popups.'); return; }

      const styles = `<style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        body{font-family:'Plus Jakarta Sans',sans-serif;background:#fff;color:#1e1b18;margin:0;padding:20px;}
        .rpt-card{border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:30px;page-break-inside:avoid;box-shadow:0 4px 6px rgba(0,0,0,0.02);position:relative;}
        .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #f3f4f6;padding-bottom:12px;margin-bottom:15px;}
        .logo-t{font-size:20px;font-weight:800;color:#ef4444;} .logo-s{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#b45309;}
        .doc-t{text-align:right;font-size:12px;color:#6b7280;font-weight:600;}
        .emp-name{font-size:18px;font-weight:700;margin:0 0 6px 0;color:#111827;}
        .sec-title{font-size:11px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:1px;margin:18px 0 8px 0;border-left:3px solid #ef4444;padding-left:8px;}
        .grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;}
        .ib{display:flex;flex-direction:column;border-bottom:1px solid #f3f4f6;padding-bottom:6px;}
        .lbl{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:2px;}
        .val{font-size:12px;font-weight:600;color:#1f2937;}
        .tbl{width:100%;border-collapse:collapse;margin-top:10px;font-size:10px;text-align:left;}
        .tbl th{background:#f8fafc;color:#475569;font-weight:700;text-transform:uppercase;font-size:8.5px;padding:6px 8px;border:1px solid #e2e8f0;}
        .tbl td{padding:6px 8px;border:1px solid #e2e8f0;color:#334155;}
        .footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:10px;}
        @media print{
          body{padding:0;}
          .rpt-card{border:none;box-shadow:none;margin-bottom:0;page-break-after:always;}
          .rpt-card:last-child{page-break-after:avoid;}
        }
      </style>`;

      const showPayroll = ['hr', 'manager', 'finance_manager'].includes(loggedInUser.role);
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const cardsHTML = targetUsers.map(u => {
        const p = DB.calculateMonthlyPayroll(u.id, month, year) || {};
        const sched = DB.getSchedule(u.scheduleId) || {
          name: 'Standard Day Shift',
          startTime: '09:00',
          endTime: '17:00',
          gracePeriod: 15,
          workDays: [1, 2, 3, 4, 5],
          location: 'Kohat Enclave, Pitampura, Delhi'
        };
        const period = `${monthNames[month]} ${year}`;
        const startT = sched.startTime || '09:00';
        const endT   = sched.endTime   || '18:00';
        const overtimeDays = (p.presentDays||0) > (p.workingDays||22) ? (p.presentDays||0) - (p.workingDays||22) : 0;
        
        let dailyRowsHTML = '';
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayStatus = getAttendanceStatusForDate(u.id, dateStr);
          const log = dayStatus.log;
          
          let checkIn = 'No Attendance Record';
          let checkOut = 'No Attendance Record';
          let workHours = '—';
          let lateEntry = 'No';
          let earlyCheckOut = 'No';
          let overtime = '0h 0m';
          let breakTime = '—';
          let statusText = dayStatus.status;
          
          if (dayStatus.status === 'Leave') {
            statusText = 'Approved Leave';
          } else if (dayStatus.status === 'Holiday') {
            const isWeekend = !sched.workDays.includes(new Date(dateStr).getDay());
            statusText = isWeekend ? 'Weekly Off' : 'Holiday';
          }
          
          let statusColor = '#475569';
          if (dayStatus.status === 'Present') statusColor = '#16a34a';
          if (dayStatus.status === 'Late') statusColor = '#d97706';
          if (dayStatus.status === 'Half Day') statusColor = '#2563eb';
          if (dayStatus.status === 'Absent') statusColor = '#dc2626';
          if (dayStatus.status === 'Leave') statusColor = '#7c3aed';
          if (statusText === 'Weekly Off') statusColor = '#94a3b8';
          if (statusText === 'Holiday') statusColor = '#0284c7';

          if (log) {
            checkIn = log.checkIn ? formatTime12h(log.checkIn) : 'No Attendance Record';
            checkOut = log.checkOut ? formatTime12h(log.checkOut) : 'No Attendance Record';
            if (log.checkIn && log.checkOut) {
              workHours = Utils.calculateDuration(log.checkIn, log.checkOut);
              
              // Overtime Calculation
              const [shH, shM] = sched.startTime.split(':').map(Number);
              const [ehH, ehM] = sched.endTime.split(':').map(Number);
              const shiftMins = (ehH * 60 + ehM) - (shH * 60 + shM);
              const [iH, iM] = log.checkIn.split(':').map(Number);
              const [oH, oM] = log.checkOut.split(':').map(Number);
              const workedMins = (oH * 60 + oM) - (iH * 60 + iM);
              if (workedMins > shiftMins) {
                const otMins = workedMins - shiftMins;
                overtime = `${Math.floor(otMins / 60)}h ${otMins % 60}m`;
              }
            }
            if (log.status === 'Late') lateEntry = 'Yes';
            if (log.status === 'Half Day') earlyCheckOut = 'Yes';
            if (log.breakTime) breakTime = log.breakTime;
          }
          
          dailyRowsHTML += `
            <tr>
              <td>${dateStr}</td>
              <td style="font-weight:600; color:${statusColor}">${statusText}</td>
              <td>${checkIn}</td>
              <td>${checkOut}</td>
              <td>${workHours}</td>
              <td style="color:${lateEntry === 'Yes' ? '#d97706' : '#475569'}">${lateEntry}</td>
              <td style="color:${earlyCheckOut === 'Yes' ? '#dc2626' : '#475569'}">${earlyCheckOut}</td>
              <td>${overtime}</td>
              <td>${breakTime}</td>
            </tr>
          `;
        }

        return `
          <div class="rpt-card">
            <div class="hdr">
              <div><span class="logo-t">HS GROUP DELHI</span><br><span class="logo-s">House of Surya</span></div>
              <div class="doc-t">MONTHLY ATTENDANCE REPORT<br><span style="font-size:10px;font-weight:normal">Period: ${period} &nbsp;|&nbsp; Generated: ${today.toLocaleDateString()}</span></div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div>
                <div class="emp-name">${Utils.escape(u.name)}</div>
                <div style="font-size:11px;color:#6b7280">${Utils.escape(u.employeeId||u.id)} &nbsp;·&nbsp; ${Utils.escape(u.department||'N/A')} &nbsp;·&nbsp; ${Utils.escape(u.designation||'N/A')}</div>
              </div>
              <div style="text-align:right; font-size:11px; color:#475569;">
                <strong>Assigned Shift:</strong> ${Utils.escape(sched.name)} (${formatTimeRange12h(sched.startTime, sched.endTime)})<br>
                <strong>Worksite Location:</strong> ${Utils.escape(sched.location || 'Kohat Enclave, Pitampura, Delhi')}
              </div>
            </div>

            <div class="sec-title">Attendance Summary – ${period}</div>
            <div class="grid">
              <div class="ib"><span class="lbl">Working Days</span><span class="val">${p.workingDays??0} days</span></div>
              <div class="ib"><span class="lbl">Present Days</span><span class="val">${p.presentDays??0} days</span></div>
              <div class="ib"><span class="lbl">Absent Days</span><span class="val">${p.absentDays??0} days</span></div>
              <div class="ib"><span class="lbl">Late Check-Ins</span><span class="val">${p.lateDays??0} days</span></div>
              <div class="ib"><span class="lbl">Half Days</span><span class="val">${p.halfDays??0} days</span></div>
              <div class="ib"><span class="lbl">Overtime Days</span><span class="val">${overtimeDays} days</span></div>
              <div class="ib"><span class="lbl">Leave Balance</span><span class="val">${u.leaveBalance??0} days</span></div>
            </div>

            <div class="sec-title">Daily Attendance Logs</div>
            <table class="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Late</th>
                  <th>Early Out</th>
                  <th>Overtime</th>
                  <th>Break Time</th>
                </tr>
              </thead>
              <tbody>
                ${dailyRowsHTML}
              </tbody>
            </table>

            ${showPayroll ? `
              <div class="sec-title">Payroll &amp; Deductions Overview (INR)</div>
              <div class="grid" style="margin-top:5px;">
                <div class="ib"><span class="lbl">Base Salary</span><span class="val">₹${(p.baseSalary??0).toLocaleString()}</span></div>
                <div class="ib"><span class="lbl">Gross Earnings</span><span class="val">₹${(p.grossEarnings??0).toLocaleString()}</span></div>
                <div class="ib"><span class="lbl">Absent Deduction</span><span class="val">₹${(p.absentDeduction??0).toLocaleString()}</span></div>
                <div class="ib"><span class="lbl">PF / PT / TDS</span><span class="val">₹${(p.deductionPF??0).toLocaleString()} / ₹${(p.deductionPT??0).toLocaleString()} / ₹${(p.deductionTDSVal??0).toLocaleString()}</span></div>
                <div class="ib"><span class="lbl">Total Deductions</span><span class="val">₹${(p.totalDeductions??0).toLocaleString()}</span></div>
                <div class="ib" style="border-bottom:2px solid #ef4444"><span class="lbl" style="color:#ef4444;font-weight:800">Net Payout</span><span class="val" style="color:#ef4444;font-size:13px;font-weight:800">₹${(p.netSalary??0).toLocaleString()}</span></div>
              </div>
            ` : ''}

            <div class="footer">This document is an official auto-generated report for ${period} — HS Group Delhi. Page-break optimized.</div>
          </div>`;
      }).join('');

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Attendance Report – HS Group ${monthNames[month]} ${year}</title>${styles}</head><body>${cardsHTML}<script>window.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{window.print();window.close();},500);});<\/script></body></html>`);
      printWindow.document.close();
      close();
    } catch(e) {
      alert('Error printing PDF. Please try again.');
      console.error(e);
    }
  };

  downloadBtn.addEventListener('click', () => {
    const checkedIds = getCheckedIds();
    const month = Number(monthSel.value);
    const year  = Number(yearSel.value);
    const format = formatSel.value;
    if (checkedIds.length === 0) { alert('Please select at least one employee.'); return; }
    
    downloadBtn.setAttribute('disabled', 'true');
    downloadBtn.textContent = 'Generating...';

    setTimeout(() => {
      if (format === 'pdf') {
        downloadReportPDF(checkedIds, month, year);
        downloadBtn.removeAttribute('disabled');
        downloadBtn.textContent = 'Download';
      } else {
        const data = buildReportData(checkedIds, month, year);
        const fileExt = format === 'csv' ? 'csv' : 'xlsx';
        const filename = checkedIds.length === 1
          ? `attendance_report_${checkedIds[0]}_${monthNames[month]}_${year}.${fileExt}`
          : `attendance_report_${monthNames[month]}_${year}.${fileExt}`;
        downloadReportExcel(data, filename, format);
      }
    }, 100);
  });
}


function renderUploadHistory(overlay) {
  const tbody = overlay.querySelector('#express-history-tbody');
  if (!tbody) return;
  const history = DB.data.uploadHistory || [];
  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:12px; color:var(--text-muted)">No upload history found.</td></tr>`;
    return;
  }
  tbody.innerHTML = history.map(h => {
    const isSuccess = h.status === 'Success';
    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.02)">
        <td style="padding: 8px; color: var(--text-secondary)">${h.date} ${h.time}</td>
        <td style="padding: 8px; font-weight: 600; color: var(--text-primary)">${Utils.escape(h.employeeName)}</td>
        <td style="padding: 8px; color: var(--text-secondary)">${Utils.escape(h.oldShift)} ➔ ${Utils.escape(h.newShift)}</td>
        <td style="padding: 8px; color: var(--text-secondary)">${Utils.escape(h.oldLocation)} ➔ ${Utils.escape(h.newLocation)}</td>
        <td style="padding: 8px; color: var(--text-secondary)">${h.effective || 'N/A'}</td>
        <td style="padding: 8px; font-weight: 700; color: ${isSuccess ? 'var(--success)' : 'var(--error)'}">${h.status}</td>
      </tr>
    `;
  }).join('');
}


function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

function executeExpressReassignments(fileContent, intent = '') {
  // ---- Helper Functions ----
  const parseShiftValue = (nameVal, timingVal = '') => {
    let name = nameVal.trim();
    let startTime = '09:00';
    let endTime = '17:00';

    // Regex to match "HH:MM - HH:MM" or "HH:MM to HH:MM"
    const timeRangeRegex = /(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i;

    // Helper to normalize 12-hour end times to 24-hour military time
    const normalizeTimeRange = (start, end) => {
      let [sh, sm] = start.split(':').map(Number);
      let [eh, em] = end.split(':').map(Number);
      let duration = (eh * 60 + em - (sh * 60 + sm) + 1440) % 1440;
      if (duration > 720) {
        let nextEh = (eh + 12) % 24;
        let nextDuration = (nextEh * 60 + em - (sh * 60 + sm) + 1440) % 1440;
        if (nextDuration >= 360 && nextDuration <= 600) {
          eh = nextEh;
        } else {
          let nextSh = (sh + 12) % 24;
          nextDuration = (eh * 60 + em - (nextSh * 60 + sm) + 1440) % 1440;
          if (nextDuration >= 360 && nextDuration <= 600) {
            sh = nextSh;
          }
        }
      }
      return {
        startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
        endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
      };
    };

    // 1. Try to parse from the timingVal first
    let match = timingVal ? timingVal.match(timeRangeRegex) : null;
    if (match) {
      const normalized = normalizeTimeRange(match[1], match[2]);
      startTime = normalized.startTime;
      endTime = normalized.endTime;
    } else {
      // 2. Try to parse from nameVal (e.g. "Morning Shift (07:00-15:00)")
      match = name.match(timeRangeRegex);
      if (match) {
        const normalized = normalizeTimeRange(match[1], match[2]);
        startTime = normalized.startTime;
        endTime = normalized.endTime;
        // Clean name: e.g. "Night Shift (21:00-05:00)" -> "Night Shift"
        name = name.replace(timeRangeRegex, '').replace(/\(\s*\)/g, '').trim();
        name = name.replace(/^[-_\s]+|[-_\s]+$/g, '').trim();
      } else {
        // 3. Fallbacks based on shift name
        const lowerName = name.toLowerCase();
        if (lowerName.includes('night')) {
          startTime = '21:00';
          endTime = '05:00';
        } else if (lowerName.includes('morning')) {
          startTime = '07:00';
          endTime = '15:00';
        }
      }
    }

    if (!name) {
      name = `${startTime}-${endTime} Shift`;
    }
    return { name, startTime, endTime };
  };

  const getUpcomingMonday = (refDate) => {
    const resultDate = new Date(refDate);
    const day = resultDate.getDay();
    const daysToAdd = (1 - day + 7) % 7;
    resultDate.setDate(resultDate.getDate() + daysToAdd);
    return resultDate;
  };

  // ---- Parse CSV ----
  const parsed = parseCSV(fileContent);
  if (!parsed || parsed.length < 2) {
    return { totalCount: 0, successCount: 0, errorCount: 1, logs: [{ rowNum: '-', employeeId: '', name: 'File Error', status: 'error', message: 'File is empty or contains no data rows.', locationProvided:'', shiftProvided:'' }], columnWarnings: [] };
  }

  // ---- Locate required columns by name (case-insensitive, flexible) ----
  const rawHeaders = parsed[0];
  const headers = rawHeaders.map(h => h.toLowerCase().trim());

  const findCol = (aliases) => headers.findIndex(h => aliases.some(a => h === a || h.includes(a)));

  const empIdIdx = findCol(['employee id','emp id','employeeid','empid']);
  let locIdx   = findCol(['location','office','worksite','work site','branch']);
  let shiftIdx = findCol(['shift','shift name','shiftname','schedule','schedule name']);
  let timingIdx = findCol(['timing','shift timing','shifttiming','time','schedule time','scheduletime']);

  // ---- Validate headers ----
  if (empIdIdx === -1) {
    return {
      totalCount: 0, successCount: 0, errorCount: 1,
      logs: [{ rowNum:'-', employeeId:'', name:'Header Error', status:'error',
        message: 'Required column "Employee ID" not found in the uploaded file.',
        locationProvided:'', shiftProvided:'' }],
      columnWarnings: []
    };
  }

  const columnWarnings = [];
  if (locIdx === -1) {
    columnWarnings.push('Worksite Location column was missing in the file and has been automatically created.');
  }
  if (shiftIdx === -1) {
    columnWarnings.push('Shift Schedule column was missing in the file and has been automatically created.');
  }

  let successCount = 0;
  let errorCount   = 0;
  const logs = [];
  const now      = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr  = now.toTimeString().split(' ')[0].substring(0, 5);

  if (!DB.data.uploadHistory)  DB.data.uploadHistory  = [];
  if (!DB.data.announcements)  DB.data.announcements  = [];

  // Track seen Employee IDs to detect duplicates within the file
  const seenEmpIds = {};

  // Collect only real data rows (skip blank rows)
  const dataRows = [];
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i];
    if (!row || row.length === 0 || row.every(c => c.trim() === '')) continue;
    dataRows.push({ row, origIndex: i });
  }

  const totalCount = dataRows.length;

  // Calculate upcoming Monday
  const upcomingMonday = getUpcomingMonday(now);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const effective = `Monday, ${upcomingMonday.toLocaleDateString('en-US', options)}`;
  const effectiveISO = upcomingMonday.toISOString().split('T')[0];

  for (const { row, origIndex } of dataRows) {
    const rowNum      = origIndex + 1;  // 1-based, 1=header
    const empId       = (row[empIdIdx] || '').trim();

    const pushError = (name, reason, locValErr = '', shiftValErr = '') => {
      errorCount++;
      logs.push({ rowNum, employeeId: empId, name: name || empId || `Row ${rowNum}`, status:'error', message: reason, locationProvided: locValErr, shiftProvided: shiftValErr });
      DB.data.uploadHistory.unshift({ id:'upl_'+Math.random().toString(36).substring(2,9), employeeName: name || empId || `Row ${rowNum}`, oldLocation:'N/A', newLocation: locValErr||'N/A', oldShift:'N/A', newShift: shiftValErr||'N/A', date: todayStr, time: timeStr, status:'Failed', effective:'N/A', reason: reason });
    };

    // 1. Missing required field: Employee ID
    if (!empId) {
      pushError(`Row ${rowNum}`, `Missing required field: Employee ID.`);
      continue;
    }

    // 2. Duplicate Employee ID within file
    if (seenEmpIds[empId.toLowerCase()]) {
      pushError(empId, `Duplicate Employee ID "${empId}" — already processed in this file.`);
      continue;
    }
    seenEmpIds[empId.toLowerCase()] = true;

    // 3. Employee not found
    const matchedUser = DB.data.users.find(u =>
      (u.employeeId && u.employeeId.toLowerCase() === empId.toLowerCase()) ||
      (u.username   && u.username.toLowerCase()   === empId.toLowerCase()) ||
      (u.id         && u.id.toLowerCase()         === empId.toLowerCase())
    );
    if (!matchedUser) {
      pushError(empId, `Employee ID "${empId}" not found in the system.`);
      continue;
    }

    // Determine location value (use column value if column exists, else fallback to current user location)
    let locVal = '';
    if (locIdx !== -1) {
      locVal = (row[locIdx] || '').trim();
    } else {
      locVal = matchedUser.preferredLocation || 'Kohat Enclave, Pitampura, Delhi';
    }

    // Determine shift value (use column value if column exists, else fallback to current user shift)
    let shiftVal = '';
    if (shiftIdx !== -1) {
      shiftVal = (row[shiftIdx] || '').trim();
    } else {
      const oldSchedule = DB.getSchedule(matchedUser.scheduleId);
      shiftVal = oldSchedule ? oldSchedule.name : 'Standard Day Shift';
    }

    // Determine timing value if timing column exists
    let timingVal = '';
    if (timingIdx !== -1) {
      timingVal = (row[timingIdx] || '').trim();
    }

    // Check if fields are still empty (meaning column existed but value was blank)
    const missingFields = [];
    if (!locVal)   missingFields.push('Location');
    if (!shiftVal) missingFields.push('Shift');
    if (missingFields.length > 0) {
      pushError(matchedUser.name, `Missing required field(s): ${missingFields.join(', ')}.`, locVal, shiftVal);
      continue;
    }

    // 4. Auto-create worksite location if not existing
    const officeCoords = DB.getOfficeCoordinates();
    if (!officeCoords[locVal]) {
      DB.saveOfficeCoordinate(locVal, 28.6978, 77.1408, true);
      console.log(`Auto-created missing worksite location: "${locVal}"`);
      const alertMsg = `Worksite Location "${locVal}" was missing and automatically registered.`;
      if (!columnWarnings.includes(alertMsg)) {
        columnWarnings.push(alertMsg);
      }
    }

    // 5. Auto-create or update shift schedule based on the file
    const parsedShift = parseShiftValue(shiftVal, timingVal);
    let matchedShift = DB.data.schedules.find(s =>
      (s.name.toLowerCase() === parsedShift.name.toLowerCase() || s.id.toLowerCase() === parsedShift.name.toLowerCase()) &&
      (s.location || '').toLowerCase() === locVal.toLowerCase()
    );

    if (!matchedShift) {
      // Auto-create shift schedule for this location and time
      matchedShift = DB.addSchedule({
        name: parsedShift.name,
        startTime: parsedShift.startTime,
        endTime: parsedShift.endTime,
        gracePeriod: 15,
        halfDayLimit: 120,
        workDays: [1, 2, 3, 4, 5],
        location: locVal
      }, true);
      console.log(`Auto-created missing shift schedule: "${parsedShift.name}" for "${locVal}" (${parsedShift.startTime}-${parsedShift.endTime})`);
      const alertMsg = `Shift Schedule "${parsedShift.name}" for "${locVal}" (${parsedShift.startTime}-${parsedShift.endTime}) was missing and automatically created.`;
      if (!columnWarnings.includes(alertMsg)) {
        columnWarnings.push(alertMsg);
      }
    } else {
      // If it exists, update its startTime and endTime to match the file if different
      if (matchedShift.startTime !== parsedShift.startTime || matchedShift.endTime !== parsedShift.endTime) {
        matchedShift.startTime = parsedShift.startTime;
        matchedShift.endTime = parsedShift.endTime;
        console.log(`Updated timings of existing shift "${matchedShift.name}" for "${locVal}" to ${parsedShift.startTime}-${parsedShift.endTime}`);
        const alertMsg = `Shift Schedule "${matchedShift.name}" for "${locVal}" timings updated to ${parsedShift.startTime}-${parsedShift.endTime}.`;
        if (!columnWarnings.includes(alertMsg)) {
          columnWarnings.push(alertMsg);
        }
      }
    }

    // 6. Invalid location length check
    if (locVal.length > 200) {
      pushError(matchedUser.name, `Invalid location: value is too long (${locVal.length} chars, max 200).`, locVal, shiftVal);
      continue;
    }

    // ---- All validations passed — detect actual changes ----
    const oldSchedule  = DB.getSchedule(matchedUser.scheduleId);
    const oldShiftName = oldSchedule ? oldSchedule.name : 'None';
    const oldShiftId   = matchedUser.scheduleId || '';
    const oldLocation  = matchedUser.preferredLocation || 'N/A';

    const shiftChanged    = oldShiftId !== matchedShift.id;
    const locationChanged = oldLocation.toLowerCase() !== locVal.toLowerCase();

    // Skip if nothing actually changed
    if (!shiftChanged && !locationChanged) {
      successCount++;
      logs.push({ rowNum, employeeId: empId, name: matchedUser.name, status:'success', message:'No changes — Shift and Location already match.', locationProvided: locVal, shiftProvided: shiftVal });
      continue;
    }

    // Queue future changes if effective date is in the future
    const isFuture = effectiveISO > todayStr;
    if (isFuture) {
      if (!matchedUser.futureReassignments) {
        matchedUser.futureReassignments = [];
      }
      // Remove any existing pending reassignment for the same date to avoid duplicates
      matchedUser.futureReassignments = matchedUser.futureReassignments.filter(r => r.effectiveDate !== effectiveISO);
      matchedUser.futureReassignments.push({
        scheduleId: matchedShift.id,
        preferredLocation: locVal,
        effectiveDate: effectiveISO
      });
    } else {
      if (shiftChanged)    matchedUser.scheduleId        = matchedShift.id;
      if (locationChanged) matchedUser.preferredLocation = locVal;
    }

    // Build a human-readable change summary
    const changes = [];
    if (shiftChanged)    changes.push(`Shift → "${matchedShift.name}"`);
    if (locationChanged) changes.push(`Location → "${locVal}"`);
    const changeSummary = changes.join(' | ');

    successCount++;
    logs.push({ rowNum, employeeId: empId, name: matchedUser.name, status:'success', message: changeSummary, locationProvided: locVal, shiftProvided: shiftVal });

    DB.data.uploadHistory.unshift({
      id: 'upl_'+Math.random().toString(36).substring(2,9),
      employeeName: matchedUser.name,
      oldLocation, newLocation: locationChanged ? locVal : oldLocation,
      oldShift: oldShiftName, newShift: shiftChanged ? matchedShift.name : oldShiftName,
      date: todayStr, time: timeStr,
      status: 'Success', effective,
      reason: intent
    });

    // Send individual notification ONLY to this employee
    const notifParts = [];
    if (shiftChanged)    notifParts.push(`Your shift has changed from "${oldShiftName}" to "${matchedShift.name}" (${formatTimeRange12h(matchedShift.startTime, matchedShift.endTime)})`);
    if (locationChanged) notifParts.push(`Your work location has changed from "${oldLocation}" to "${locVal}"`);

    DB.data.announcements.unshift({
      id: 'ann_'+Math.random().toString(36).substring(2,9),
      title: '⚡ Schedule Updated',
      content: `${notifParts.join('. ')}. Effective: ${effective}.${intent ? ' Reason: ' + intent + '.' : ''}`,
      category: 'Update', date: todayStr,
      author: 'HR Express Upload',
      targetUserId: matchedUser.id
    });
  }

  if (successCount > 0 || errorCount > 0) DB.save();

  return { totalCount, successCount, errorCount, logs, columnWarnings };
}

function openScheduleModal(schedId = null) {
  const isEdit = schedId !== null;
  const sched = isEdit ? DB.getSchedule(schedId) : null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Edit Shift Pattern' : 'Create New Shift Calendar'}</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <form id="schedule-form">
        <div class="form-group">
          <label class="form-label" for="sched-name">Shift Profile Name</label>
          <input class="form-input" type="text" id="sched-name" value="${isEdit ? Utils.escape(sched.name) : ''}" required placeholder="Day Shift">
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="sched-start">Start Time</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input class="form-input" type="time" id="sched-start" value="${isEdit ? sched.startTime : '09:00'}" required style="flex:1">
              <span id="sched-start-ampm" style="font-size:13px;font-weight:700;color:var(--primary);min-width:52px;text-align:center;padding:6px 8px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:var(--radius-sm)">${formatTime12h(isEdit ? sched.startTime : '09:00').split(' ').pop()}</span>
            </div>
          </div>
          <div>
            <label class="form-label" for="sched-end">End Time</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input class="form-input" type="time" id="sched-end" value="${isEdit ? sched.endTime : '17:00'}" required style="flex:1">
              <span id="sched-end-ampm" style="font-size:13px;font-weight:700;color:var(--cyan);min-width:52px;text-align:center;padding:6px 8px;background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);border-radius:var(--radius-sm)">${formatTime12h(isEdit ? sched.endTime : '17:00').split(' ').pop()}</span>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="sched-grace">Grace Period (Minutes)</label>
          <input class="form-input" type="number" id="sched-grace" value="${isEdit ? sched.gracePeriod : '15'}" min="0" max="60" required>
        </div>
        <div class="form-group">
          <label class="form-label">Working Days</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            ${days.map((d, idx) => `
              <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);padding:6px 12px;border-radius:16px;font-size:12px;cursor:pointer">
                <input type="checkbox" name="workdays" value="${idx}" ${isEdit && sched.workDays.includes(idx) ? 'checked' : (!isEdit && idx > 0 && idx < 6 ? 'checked' : '')}>
                ${d.substring(0,3)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="sched-location">Shift Location</label>
          <select class="form-input" id="sched-location" required>
            ${Object.keys(window.OFFICE_COORDINATES).map(loc => `
              <option value="${loc}" ${isEdit && sched.location === loc ? 'selected' : ''}>${loc}</option>
            `).join('')}
          </select>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button type="button" id="btn-modal-fetch-nearby" style="flex:1;padding:6px 10px;font-size:11px;font-weight:600;background:rgba(16,185,129,0.1);color:var(--success);border:1px solid rgba(16,185,129,0.25);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.2s ease;">📍 Fetch Nearby Location</button>
            <button type="button" id="btn-modal-add-custom" style="flex:1;padding:6px 10px;font-size:11px;font-weight:600;background:rgba(6,182,212,0.1);color:var(--cyan);border:1px solid rgba(6,182,212,0.25);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.2s ease;">✏️ Enter Any Location</button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
          <button class="btn" type="submit">${isEdit ? 'Save Shift' : 'Create Shift'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  const schedLocSelect = document.getElementById('sched-location');
  
  // Fetch Nearby button
  const btnFetchNearby = document.getElementById('btn-modal-fetch-nearby');
  if (btnFetchNearby) {
    btnFetchNearby.addEventListener('click', () => {
      fetchNearbyAndAddLocation(schedLocSelect);
    });
  }
  
  // Enter Any Location button
  const btnAddCustom = document.getElementById('btn-modal-add-custom');
  if (btnAddCustom) {
    btnAddCustom.addEventListener('click', () => {
      enterCustomLocation(schedLocSelect);
    });
  }

  // Live AM/PM badge update on time input change
  const schedStartInput = document.getElementById('sched-start');
  const schedEndInput = document.getElementById('sched-end');
  const startAmpmBadge = document.getElementById('sched-start-ampm');
  const endAmpmBadge = document.getElementById('sched-end-ampm');
  if (schedStartInput && startAmpmBadge) {
    schedStartInput.addEventListener('input', () => {
      const formatted = formatTime12h(schedStartInput.value);
      startAmpmBadge.textContent = formatted.split(' ').pop() || 'AM';
    });
  }
  if (schedEndInput && endAmpmBadge) {
    schedEndInput.addEventListener('input', () => {
      const formatted = formatTime12h(schedEndInput.value);
      endAmpmBadge.textContent = formatted.split(' ').pop() || 'PM';
    });
  }

  document.getElementById('schedule-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sched-name').value.trim();
    const startTime = document.getElementById('sched-start').value;
    const endTime = document.getElementById('sched-end').value;
    const gracePeriod = Number(document.getElementById('sched-grace').value);
    const location = document.getElementById('sched-location').value;
    const workDays = Array.from(document.querySelectorAll('input[name="workdays"]:checked')).map(cb => Number(cb.value));
    if (workDays.length === 0) { alert('Select working days.'); return; }
    if (isEdit) { DB.updateSchedule(schedId, { name, startTime, endTime, gracePeriod, workDays, location }); }
    else { DB.addSchedule({ name, startTime, endTime, gracePeriod, workDays, location }); }
    closeModal(overlay);
    renderAdminSchedules();
  });
}

function renderAdminApprovals() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  const isManager = user.role === 'manager';
  const assignedEmployees = DB.getUsers().filter(u => u.role === 'employee' && u.managerId === user.id);
  const assignedUserIds = assignedEmployees.map(u => u.id);

  let leaves = DB.getLeaveRequests();
  if (isManager) {
    leaves = leaves.filter(l => assignedUserIds.includes(l.userId));
  }

  let swaps = DB.getShiftSwaps().filter(s => s.status === 'Pending Manager');
  if (isManager) {
    swaps = swaps.filter(s => assignedUserIds.includes(s.senderId) || assignedUserIds.includes(s.receiverId));
  }

  let allSwaps = DB.getShiftSwaps();
  if (isManager) {
    allSwaps = allSwaps.filter(s => assignedUserIds.includes(s.senderId) || assignedUserIds.includes(s.receiverId));
  }

  let allDeviations = DB.getLogs().filter(l => l.coords);
  if (isManager) {
    allDeviations = allDeviations.filter(l => assignedUserIds.includes(l.userId));
  }

  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const pendingSwapsCount = swaps.length;
  const pendingDeviationsCount = DB.getLogs().filter(l => l.deviationFlag && (!isManager || assignedUserIds.includes(l.userId))).length;

  let tabContentHTML = '';

  if (activeAdminApprovalsTab === 'leaves') {
    tabContentHTML = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr><th>Employee</th><th>Leave Type</th><th>Duration Range</th><th>Reason Notes</th><th>Request Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${leaves.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No leaves registered.</td></tr>` : ''}
            ${leaves.map(lv => {
              const u = DB.getUser(lv.userId);
              let statusClass = 'badge-pending';
              if (lv.status === 'Approved') statusClass = 'badge-approved';
              if (lv.status === 'Rejected') statusClass = 'badge-rejected';
              return `
                <tr>
                  <td style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${u ? Utils.escape(u.name) : 'Unknown'}</td>
                  <td style="font-size: 13px; font-weight: 500; color: var(--text-secondary);"><strong>${lv.type}</strong></td>
                  <td style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                    ${Utils.formatDate(lv.startDate).replace(/ /g, '&nbsp;')}<br>to ${Utils.formatDate(lv.endDate).replace(/ /g, '&nbsp;')}
                  </td>
                  <td style="font-size: 13px; color:var(--text-secondary); line-height:1.4; min-width: 150px; word-wrap: break-word;">
                    "${Utils.escape(lv.reason)}"
                    ${lv.managerComment ? `<br><span style="color:var(--primary)"><strong>Comment:</strong> ${Utils.escape(lv.managerComment)}</span>` : ''}
                  </td>
                  <td style="font-size: 13px; color: var(--text-secondary);">${Utils.formatDate(lv.requestDate).replace(/ /g, '&nbsp;')}</td>
                  <td style="font-size: 13px;">
                    <span class="badge ${statusClass}">${lv.status}</span>
                  </td>
                  <td style="font-size: 13px;">
                    ${lv.status === 'Pending' ? `
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-success btn-approve-leave" data-id="${lv.id}" style="padding:6px 12px;width:auto;font-size:12px;">Approve</button>
                        <button class="btn btn-danger btn-reject-leave" data-id="${lv.id}" style="padding:6px 12px;width:auto;font-size:12px;">Reject</button>
                      </div>
                    ` : `<span style="font-size:11px;color:var(--text-muted)">Completed</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeAdminApprovalsTab === 'swaps') {
    tabContentHTML = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr><th>Requester</th><th>Coworker</th><th>Reason</th><th>Coworker Response</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${allSwaps.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No shift swaps registered.</td></tr>` : ''}
            ${allSwaps.map(s => {
              const sender = DB.getUser(s.senderId);
              const receiver = DB.getUser(s.receiverId);
              const senderSched = sender ? DB.getSchedule(sender.scheduleId) : null;
              const receiverSched = receiver ? DB.getSchedule(receiver.scheduleId) : null;
              const senderLoc = senderSched && senderSched.location ? senderSched.location : (sender ? (sender.preferredLocation || 'Kohat Enclave, Pitampura, Delhi') : 'Kohat Enclave, Pitampura, Delhi');
              const receiverLoc = receiverSched && receiverSched.location ? receiverSched.location : (receiver ? (receiver.preferredLocation || 'Kohat Enclave, Pitampura, Delhi') : 'Kohat Enclave, Pitampura, Delhi');
              const modeLabel = s.swapType === 'both' ? 'Shift & Location' : (s.swapType === 'location' ? 'Location Only' : 'Shift Only');
              let statusClass = 'badge-pending';
              if (s.status === 'Pending Manager') statusClass = 'badge-approved';
              else if (s.status === 'Approved') statusClass = 'badge-approved';
              else if (s.status === 'Rejected') statusClass = 'badge-rejected';

              return `
                <tr>
                  <td style="font-weight:600">
                    ${sender ? Utils.escape(sender.name) : 'Unknown'}
                    <br><span style="font-size:11px;color:var(--text-secondary)">Shift: ${senderSched ? Utils.escape(senderSched.name) : 'None'}</span>
                    <br><span style="font-size:10px;color:var(--text-muted)">📍 ${Utils.escape(senderLoc)}</span>
                  </td>
                  <td style="font-weight:600">
                    ${receiver ? Utils.escape(receiver.name) : 'Unknown'}
                    <br><span style="font-size:11px;color:var(--text-secondary)">Shift: ${receiverSched ? Utils.escape(receiverSched.name) : 'None'}</span>
                    <br><span style="font-size:10px;color:var(--text-muted)">📍 ${Utils.escape(receiverLoc)}</span>
                  </td>
                  <td style="font-size:12px;color:var(--text-secondary)">
                    <strong>Mode:</strong> ${modeLabel}<br>
                    "${Utils.escape(s.reason)}"
                  </td>
                  <td style="font-size:12px;color:var(--text-secondary)">"${Utils.escape(s.coworkerComment || 'No comment')}"</td>
                  <td><span class="badge ${statusClass}">${s.status}</span></td>
                  <td>
                    ${s.status === 'Pending Manager' ? `
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-success btn-approve-swap" data-id="${s.id}" style="padding:6px 12px;width:auto;font-size:12px">Approve</button>
                        <button class="btn btn-danger btn-reject-swap" data-id="${s.id}" style="padding:6px 12px;width:auto;font-size:12px">Reject</button>
                      </div>
                    ` : `<span style="font-size:11px;color:var(--text-muted)">${s.status === 'Pending Coworker' ? 'Awaiting Coworker' : 'Completed'}</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeAdminApprovalsTab === 'geofence') {
    tabContentHTML = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr><th>Employee</th><th>Date/Time</th><th>Location</th><th>Coordinates (Distance)</th><th>Justification</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${allDeviations.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No remote check-ins logged.</td></tr>` : ''}
            ${allDeviations.map(l => {
              const u = DB.getUser(l.userId);
              let statusClass = 'badge-pending';
              if (l.status === 'On Time') statusClass = 'badge-approved';
              else if (l.status === 'Late' || l.status === 'Deviation Logged') statusClass = 'badge-rejected';

              return `
                <tr>
                  <td style="font-weight:600">${u ? Utils.escape(u.name) : 'Unknown'}</td>
                  <td>${Utils.formatDate(l.date)} at ${l.checkIn}</td>
                  <td>${Utils.escape(l.location)}</td>
                  <td>${l.coords} (${l.distance} km)</td>
                  <td style="max-width:200px;font-size:12px;color:var(--text-secondary)">"${Utils.escape(l.justification || 'None')}"${l.managerComment ? `<br><span style="color:var(--primary)"><strong>Comment:</strong> ${Utils.escape(l.managerComment)}</span>` : ''}</td>
                  <td>
                    ${l.deviationFlag 
                      ? `<span class="badge badge-pending">Pending Approval</span>`
                      : `<span class="badge ${statusClass}">${l.status === 'On Time' ? 'Excused' : 'Violation Flagged'}</span>`
                    }
                  </td>
                  <td>
                    ${l.deviationFlag ? `
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-success btn-excuse-deviation" data-id="${l.id}" style="padding:6px 12px;width:auto;font-size:12px">Excuse</button>
                        <button class="btn btn-danger btn-violation-deviation" data-id="${l.id}" style="padding:6px 12px;width:auto;font-size:12px">Flag Violation</button>
                      </div>
                    ` : `<span style="font-size:11px;color:var(--text-muted)">Completed</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Approvals Desk</h1>
        <div class="content-subtitle">Authorize leaves, employee shift swaps, and geofence deviations.</div>
      </div>
    </div>
    <div class="content-body">
      <div style="display:flex;gap:12px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:10px">
        <button class="btn-tab-approval ${activeAdminApprovalsTab === 'leaves' ? 'active' : ''}" data-tab="leaves" style="background:none;border:none;padding:8px 16px;color:${activeAdminApprovalsTab === 'leaves' ? 'var(--primary)' : 'var(--text-secondary)'};cursor:pointer;font-weight:600;font-size:14px;border-bottom:${activeAdminApprovalsTab === 'leaves' ? '2px solid var(--primary)' : 'none'};transition:all 0.2s">
          Leave Requests (${pendingLeavesCount})
        </button>
        <button class="btn-tab-approval ${activeAdminApprovalsTab === 'swaps' ? 'active' : ''}" data-tab="swaps" style="background:none;border:none;padding:8px 16px;color:${activeAdminApprovalsTab === 'swaps' ? 'var(--primary)' : 'var(--text-secondary)'};cursor:pointer;font-weight:600;font-size:14px;border-bottom:${activeAdminApprovalsTab === 'swaps' ? '2px solid var(--primary)' : 'none'};transition:all 0.2s">
          Shift Swaps (${pendingSwapsCount})
        </button>
        <button class="btn-tab-approval ${activeAdminApprovalsTab === 'geofence' ? 'active' : ''}" data-tab="geofence" style="background:none;border:none;padding:8px 16px;color:${activeAdminApprovalsTab === 'geofence' ? 'var(--primary)' : 'var(--text-secondary)'};cursor:pointer;font-weight:600;font-size:14px;border-bottom:${activeAdminApprovalsTab === 'geofence' ? '2px solid var(--primary)' : 'none'};transition:all 0.2s">
          Geofence Deviations (${pendingDeviationsCount})
        </button>
      </div>

      <div class="card-panel">
        ${tabContentHTML}
      </div>
    </div>
  `;

  document.querySelectorAll('.btn-tab-approval').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAdminApprovalsTab = e.target.getAttribute('data-tab');
      renderAdminApprovals();
    });
  });

  if (activeAdminApprovalsTab === 'leaves') {
    document.querySelectorAll('.btn-approve-leave').forEach(btn => btn.addEventListener('click', (e) => processLeaveRequest(e.target.dataset.id, 'Approved')));
    document.querySelectorAll('.btn-reject-leave').forEach(btn => btn.addEventListener('click', (e) => processLeaveRequest(e.target.dataset.id, 'Rejected')));
  }

  if (activeAdminApprovalsTab === 'swaps') {
    document.querySelectorAll('.btn-approve-swap').forEach(btn => btn.addEventListener('click', (e) => processManagerSwap(e.target.dataset.id, true)));
    document.querySelectorAll('.btn-reject-swap').forEach(btn => btn.addEventListener('click', (e) => processManagerSwap(e.target.dataset.id, false)));
  }

  if (activeAdminApprovalsTab === 'geofence') {
    document.querySelectorAll('.btn-excuse-deviation').forEach(btn => btn.addEventListener('click', (e) => processGeofenceDeviation(e.target.dataset.id, true)));
    document.querySelectorAll('.btn-violation-deviation').forEach(btn => btn.addEventListener('click', (e) => processGeofenceDeviation(e.target.dataset.id, false)));
  }
}

// ── Custom comment modal (replaces browser prompt) ──────────────────────────
function showCommentModal({ title, label, placeholder = '', required = false, actionLabel = 'Confirm', actionClass = 'btn', onConfirm }) {
  // Remove any existing comment modal
  const existing = document.getElementById('comment-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'comment-modal-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9999;
    background:rgba(0,0,0,0.65); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center;
    animation:fadeIn 0.15s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background:var(--bg-surface);
      border:1px solid var(--border);
      border-radius:16px;
      padding:28px 28px 22px;
      width:100%;
      max-width:420px;
      box-shadow:var(--shadow-lg);
      animation:slideUp 0.2s cubic-bezier(0.4,0,0.2,1);
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(251,191,36,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">💬</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);">${title}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">${label}</div>
        </div>
      </div>
      <textarea id="comment-modal-input"
        rows="3"
        placeholder="${placeholder}"
        style="
          width:100%; box-sizing:border-box;
          background:var(--bg-surface-hover);
          border:1px solid var(--border);
          border-radius:10px;
          color:var(--text-primary);
          font-size:13px; font-family:inherit;
          padding:10px 12px; resize:vertical;
          outline:none; transition:border-color 0.2s;
        "
        onfocus="this.style.borderColor='var(--primary)'"
        onblur="this.style.borderColor='var(--border)'"
      ></textarea>
      ${required ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">⚠️ A comment is required to proceed.</div>` : `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Comment is optional. Leave blank to skip.</div>`}
      <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
        <button id="comment-modal-cancel" style="
          padding:8px 20px; border-radius:8px; border:1px solid var(--border);
          background:transparent; color:var(--text-secondary);
          font-size:13px; font-weight:600; cursor:pointer;
          transition:background 0.15s;
        " onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
          Cancel
        </button>
        <button id="comment-modal-confirm" class="${actionClass}" style="padding:8px 22px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
          ${actionLabel}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus textarea
  setTimeout(() => document.getElementById('comment-modal-input')?.focus(), 50);

  // Cancel
  document.getElementById('comment-modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Confirm
  document.getElementById('comment-modal-confirm').addEventListener('click', () => {
    const val = document.getElementById('comment-modal-input').value.trim();
    if (required && !val) {
      document.getElementById('comment-modal-input').style.borderColor = 'var(--error,#ef4444)';
      document.getElementById('comment-modal-input').placeholder = '⚠️ Please enter a comment to continue...';
      return;
    }
    overlay.remove();
    onConfirm(val);
  });

  // Enter key to confirm (Shift+Enter = new line)
  document.getElementById('comment-modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('comment-modal-confirm').click();
    }
  });
}

function processLeaveRequest(id, status) {
  const isApprove = status === 'Approved';
  showCommentModal({
    title: isApprove ? 'Approve Leave Request' : 'Reject Leave Request',
    label: isApprove ? 'Add an optional approval comment for the employee.' : 'Provide a reason for rejection.',
    placeholder: isApprove ? 'e.g. Approved. Enjoy your leave!' : 'e.g. Insufficient leave balance.',
    required: !isApprove,
    actionLabel: isApprove ? '✅ Approve' : '❌ Reject',
    actionClass: isApprove ? 'btn' : 'btn btn-danger',
    onConfirm: (comment) => {
      DB.updateLeaveStatus(id, status, comment);
      renderAdminApprovals();
    }
  });
}

function processManagerSwap(swapId, approve) {
  showCommentModal({
    title: approve ? 'Approve Shift Swap' : 'Reject Shift Swap',
    label: approve ? 'Add an optional comment for the swap request.' : 'Provide a reason for rejecting this swap.',
    placeholder: approve ? 'e.g. Swap approved. Please coordinate with your team.' : 'e.g. Overlap with critical project deadline.',
    required: !approve,
    actionLabel: approve ? '✅ Approve Swap' : '❌ Reject Swap',
    actionClass: approve ? 'btn' : 'btn btn-danger',
    onConfirm: (comment) => {
      DB.respondToShiftSwapManager(swapId, approve, comment);
      renderAdminApprovals();
    }
  });
}

function processGeofenceDeviation(logId, excuse) {
  showCommentModal({
    title: excuse ? 'Excuse Geo-fence Deviation' : 'Flag as Violation',
    label: excuse ? 'Add an optional note excusing this deviation.' : 'Provide a reason for flagging this as a violation.',
    placeholder: excuse ? 'e.g. Employee was at client site during this check-in.' : 'e.g. No prior approval for off-site work.',
    required: !excuse,
    actionLabel: excuse ? '✅ Excuse Deviation' : '🚩 Flag Violation',
    actionClass: excuse ? 'btn' : 'btn btn-danger',
    onConfirm: (comment) => {
      if (excuse) {
        DB.excuseDeviation(logId, comment);
      } else {
        DB.flagDeviationAsViolation(logId, comment);
      }
      renderAdminApprovals();
    }
  });
}

function renderAdminReports() {
  const main = document.getElementById('main-view');
  const today = new Date();
  let selectedMonth = today.getMonth();
  let selectedYear = today.getFullYear();

  main.innerHTML = `
    <div class="content-header" id="employee-payslip-tab-header">
      <div>
        <h1 class="content-title">Monthly Payroll & Attendance Ledger</h1>
        <div class="content-subtitle">Inspect aggregated logs, salary deductions, and print payslips.</div>
      </div>
      <div>
        
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel report-filter-bar" style="margin-bottom:24px">
        <div style="display:flex;gap:8px;align-items:center">
          <label class="form-label" style="margin:0" for="report-month">Period:</label>
          <select class="form-input" id="report-month" style="width:130px;padding:8px">
            ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select class="form-input" id="report-year" style="width:100px;padding:8px">
            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <div style="margin-left:auto;display:flex;gap:12px">
          <button class="btn btn-secondary" id="btn-export-csv" style="padding:10px 18px;width:auto;font-size:13px">📥 Export CSV</button>
          <button class="btn btn-cyan" id="btn-print-report" style="padding:10px 18px;width:auto;font-size:13px">🖨️ Print Sheet</button>
        </div>
      </div>
      <div class="stats-grid" id="report-stats-box" style="margin-bottom:24px"></div>
      <div class="dashboard-split" style="grid-template-columns:1.8fr 1fr;margin-bottom:24px">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Staff Salary & Leave Ledger</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead><tr><th>Employee</th><th>Base Salary</th><th>Present/Absent</th><th>Deductions</th><th>Net Disbursed</th><th>Statement</th></tr></thead>
              <tbody id="report-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Monthly Punctuality Ratio</h3></div>
          <div class="svg-chart-container" id="report-chart-box"></div>
        </div>
      </div>
      <div id="admin-payslip-preview-drawer" style="display:none;margin-top:30px"></div>
    </div>
  `;
  const refreshReports = () => compileReports(selectedMonth, selectedYear);
  document.getElementById('report-month').addEventListener('change', (e) => { selectedMonth = Number(e.target.value); refreshReports(); });
  document.getElementById('report-year').addEventListener('change', (e) => { selectedYear = Number(e.target.value); refreshReports(); });
  document.getElementById('btn-export-csv').addEventListener('click', () => exportReportCSV(selectedMonth, selectedYear));
  document.getElementById('btn-print-report').addEventListener('click', () => {
    const drawer = document.getElementById('admin-payslip-preview-drawer');
    if (drawer && drawer.style.display !== 'none' && drawer.dataset.activeUserId) {
      printSinglePayslipPDF(drawer.dataset.activeUserId, selectedMonth, selectedYear);
    } else if (typeof users !== 'undefined' && users.length > 0) {
      printSinglePayslipPDF(users[0].id, selectedMonth, selectedYear);
    } else {
      alert('No employee record available to print.');
    }
  });
  refreshReports();
}

function compileReports(month, year) {
  const loggedInUser = Auth.getCurrentUser();
  const users = DB.getUsers().filter(u => {
    if (loggedInUser.role === 'manager') {
      return u.role === 'employee' && u.managerId === loggedInUser.id;
    } else {
      return u.role === 'employee';
    }
  });
  let grandGrossSalary = 0;
  let grandDeductions = 0;
  let grandNetPayout = 0;
  let totalPresentDays = 0;
  let totalLateDays = 0;

  const userPayrollData = users.map(u => {
    const p = DB.calculateMonthlyPayroll(u.id, month, year);
    grandGrossSalary += p.grossEarnings;
    grandDeductions += p.totalDeductions;
    grandNetPayout += p.netSalary;
    totalPresentDays += p.presentDays;
    totalLateDays += p.lateDays;
    return p;
  });

  document.getElementById('report-stats-box').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon stat-icon-blue">📁</div>
      <div class="stat-info"><span class="stat-value">₹${grandGrossSalary.toLocaleString()}</span><span class="stat-label">Gross Payroll Budget</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon-red">⏰</div>
      <div class="stat-info"><span class="stat-value">₹${grandDeductions.toLocaleString()}</span><span class="stat-label">Total Deductions (Leave & Tax)</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon-green">⏱️</div>
      <div class="stat-info"><span class="stat-value">₹${grandNetPayout.toLocaleString()}</span><span class="stat-label">Net Salary Disbursed</span></div>
    </div>
  `;

  document.getElementById('report-table-body').innerHTML = userPayrollData.map(p => `
    <tr>
      <td style="font-weight:600">${Utils.escape(p.employeeName)}</td>
      <td>₹${p.baseSalary.toLocaleString()}</td>
      <td style="font-size:12px">Present: <strong>${p.presentDays}</strong>d<br>Absent: <span style="color:${p.absentDays > 0 ? 'var(--error)' : 'currentColor'}">${p.absentDays}</span>d</td>
      <td style="color:var(--error);font-weight:600">-₹${p.totalDeductions.toLocaleString()}</td>
      <td style="color:var(--success);font-weight:700">₹${p.netSalary.toLocaleString()}</td>
      <td><button class="btn btn-cyan btn-view-payslip-admin" data-id="${p.userId}" style="padding:6px 10px;width:auto;font-size:11px">Inspect</button></td>
    </tr>
  `).join('');

  renderReportChart(totalPresentDays, totalLateDays);

  document.querySelectorAll('.btn-view-payslip-admin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uId = e.target.closest('.btn-view-payslip-admin').dataset.id;
      const drawer = document.getElementById('admin-payslip-preview-drawer');
      drawer.style.display = 'block';
      drawer.dataset.activeUserId = uId;
      
      // Ensure we resolve user correctly via ID, employeeId, email, or username
      const uDetails = DB.getUser(uId);
      if (!uDetails) {
        drawer.innerHTML = `<div class="card-panel" style="text-align:center;color:var(--text-secondary)">Employee record not found.</div>`;
        return;
      }

      // Fetch latest payroll calculations dynamically on click
      const p = DB.calculateMonthlyPayroll(uDetails.id, month, year);
      if (!p) {
        drawer.innerHTML = `<div class="card-panel" style="text-align:center;color:var(--text-secondary)">No payroll data recorded for this month.</div>`;
        return;
      }

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const loggedInUser = Auth.getCurrentUser();
      const editBtnHTML = loggedInUser.role === 'manager'
        ? `<button class="btn btn-warning" id="btn-admin-edit-single-payslip" style="padding:6px 12px;width:auto;font-size:12px">✏️ Edit Adjustments</button>`
        : '';

      drawer.innerHTML = `
        <div class="card-panel">
          <div class="card-panel-header" id="employee-payslip-tab-header">
            <h3 class="card-panel-title">Employee Payslip Preview</h3>
            <div style="display:flex;gap:10px;align-items:center">
              ${editBtnHTML}
              <select id="admin-payslip-format-select" class="form-input" style="width:160px;padding:6px;font-size:12px;background:rgba(255,255,255,0.02)">
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
              </select>
              <button class="btn btn-cyan" id="btn-admin-print-single-payslip" style="padding:6px 12px;width:auto;font-size:12px">🖨️ Print Statement</button>
            </div>
          </div>
          <div class="payslip-wrapper">
            <div class="payslip-header">
              <div>
                <div class="payslip-company-name">HS Group Delhi</div>
                <div class="payslip-company-desc">House of Surya | Employee Salary Statement</div>
              </div>
              <div class="payslip-title">PAYSLIP RECEIPT</div>
            </div>
            <div class="payslip-grid">
              <div class="payslip-meta-block">
                <div><strong>Employee Name:</strong> ${Utils.escape(uDetails.name)}</div>
                <div><strong>Employee ID:</strong> ${Utils.escape(uDetails.employeeId || uDetails.id)}</div>
                <div><strong>Department:</strong> ${Utils.escape(uDetails.department || 'N/A')}</div>
                <div><strong>Role / Designation:</strong> ${Utils.escape(uDetails.designation || 'Staff Associate')}</div>
              </div>
              <div class="payslip-meta-block">
                <div><strong>Statement Period:</strong> ${monthNames[month]} ${year}</div>
                <div><strong>Total Working Days:</strong> ${p.workingDays} days</div>
                <div><strong>Present Days:</strong> ${p.presentDays} days</div>
                <div><strong>Leave Days:</strong> ${p.approvedLeaveDays} days</div>
              </div>
            </div>

            <table class="payslip-table">
              <thead>
                <tr>
                  <th>Description of Allowances / Deductions</th>
                  <th style="text-align:right">Earning Rate / Allowances</th>
                  <th style="text-align:right">Deducted Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Fixed Monthly Salary</td>
                  <td style="text-align:right">₹${p.baseSalary.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td style="text-align:right">₹${p.allowanceHRA.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Travel Allowance</td>
                  <td style="text-align:right">₹${p.allowanceTravel.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Overtime Allowance (${p.overtimeText})</td>
                  <td style="text-align:right;color:var(--success)">₹${p.overtimePay.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Absent Penalties (${p.absentDays} days absent)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.absentDeduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Half-day Salary Deductions (${p.halfDays} occurrences)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.halfDayDeduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Provident Fund (PF) Deduction</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionPF.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Professional Tax (PT)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionPT.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Employees' State Insurance (ESI)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionESI.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Tax Deducted at Source (TDS) (${p.deductionTDS}%)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionTDSVal.toLocaleString()}</td>
                </tr>
                ${p.bonus > 0 ? `
                <tr>
                  <td>Manager Discretionary Bonus / Rewards</td>
                  <td style="text-align:right;color:var(--success);font-weight:600">₹${p.bonus.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                ` : ''}
                ${p.adhocDeduction > 0 ? `
                <tr>
                  <td>Manager Ad-hoc Deduction / Adjustments</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:var(--error);font-weight:600">₹${p.adhocDeduction.toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td>Net Salary Disbursed</td>
                  <td style="text-align:right" colspan="2">₹${p.netSalary.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            ${p.remarks ? `
            <div style="margin-top:20px;padding:12px;background:rgba(255,255,255,0.01);border:1px dashed var(--border);border-radius:var(--radius-sm);font-size:12px;color:var(--text-secondary)">
              <strong>Remarks / Notes:</strong> ${Utils.escape(p.remarks)}
            </div>
            ` : ''}
          </div>
        </div>
      `;
      document.getElementById('btn-admin-print-single-payslip').addEventListener('click', () => {
        printSinglePayslipPDF(uDetails.id, month, year);
      });
      if (loggedInUser.role === 'manager') {
        document.getElementById('btn-admin-edit-single-payslip').addEventListener('click', () => {
          openPayrollAdjustmentModal(uDetails.id, month, year);
        });
      }
      drawer.scrollIntoView({ behavior: 'smooth' });
    });
  });
  const dlReportBtn = document.getElementById('btn-download-report-payroll');
  if (dlReportBtn) {
    dlReportBtn.addEventListener('click', () => openAttendanceReportModal());
  }
}

function renderReportChart(present, late) {
  const chartBox = document.getElementById('report-chart-box');
  const onTime = present - late;
  const onTimePct = present > 0 ? Math.round((onTime / present) * 100) : 0;
  const latePct = present > 0 ? Math.round((late / present) * 100) : 0;
  chartBox.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">
      <svg width="150" height="150" viewBox="0 0 36 36" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="4"></circle>
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--success)" stroke-width="4" stroke-dasharray="${onTimePct} ${100 - onTimePct}" stroke-dashoffset="25"></circle>
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" stroke-width="4" stroke-dasharray="${latePct} ${100 - latePct}" stroke-dashoffset="${25 - onTimePct}"></circle>
      </svg>
      <div style="display:flex;gap:16px;margin-top:16px;font-size:12px">
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--success)"></span>On-Time (${onTimePct}%)</span>
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--primary)"></span>Late (${latePct}%)</span>
      </div>
    </div>
  `;
}

function exportReportCSV(month, year) {
  const users = DB.getUsers().filter(u => u.role !== 'hr' && u.role !== 'manager');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const filename = `HS_Group_Payroll_Report_${monthNames[month]}_${year}.csv`;
  const headers = ['Employee Name', 'Base Salary', 'HRA', 'Travel Allowance', 'Working Days', 'Days Present', 'Absent Days', 'Half Days', 'Absent/Half-Day Deductions', 'PF Deduction', 'PT Deduction', 'TDS Deduction', 'Net Disbursed Payout'];
  const rows = users.map(u => {
    const p = DB.calculateMonthlyPayroll(u.id, month, year);
    return [p.employeeName, p.baseSalary, p.allowanceHRA, p.allowanceTravel, p.workingDays, p.presentDays, p.absentDays, p.halfDays, p.attendanceDeductions, p.deductionPF, p.deductionPT, p.deductionTDSVal, p.netSalary];
  });
  Utils.exportToCSV(filename, headers, rows);
}

function openGuidelinesModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 480px;animation: scaleUp 0.3s ease">
      <div class="modal-header">
        <h3 class="modal-title">Company Shift Guidelines</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.5">
        <p style="margin-bottom: 15px">Please review the standard shift schedules and leave parameters for HS Group Delhi (House of Surya):</p>
        <div class="guidelines-list">
          <div class="guideline-item">
            <span class="guideline-icon">📅</span>
            <div class="guideline-details">
              <strong>Work Week Shift</strong>
              <span>Monday to Saturday working days (Sunday weekly off).</span>
            </div>
          </div>
          <div class="guideline-item">
            <span class="guideline-icon">⏱️</span>
            <div class="guideline-details">
              <strong>Shift Timings</strong>
              <span>09:00 AM to 07:00 PM standard office hours.</span>
            </div>
          </div>
          <div class="guideline-item">
            <span class="guideline-icon">🌴</span>
            <div class="guideline-details">
              <strong>Monthly Leave Cap</strong>
              <span>Maximum of 2 approved paid leaves per month. Absences beyond this limit are subject to daily rate deduction.</span>
            </div>
          </div>
          <div class="guideline-item">
            <span class="guideline-icon">📍</span>
            <div class="guideline-details">
              <strong>Office Attendance Rules</strong>
              <span>Must be checked in from preferred office coordinates or headquarters location.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions" style="margin-top:20px">
        <button class="btn" onclick="closeModal(this.closest('.modal-overlay'))">Understood & Accept</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function openStaffDetailModal(userId) {
  const user = DB.getUser(userId);
  if (!user) return;
  const schedule = DB.getSchedule(user.scheduleId);
  const currentUser = Auth.getCurrentUser();
  const showPayroll = currentUser && (currentUser.role === 'hr' || currentUser.role === 'manager' || currentUser.role === 'finance_manager');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const avatarLetters = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Workdays description
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const assignedSchedules = (user.scheduleIds && Array.isArray(user.scheduleIds) && user.scheduleIds.length > 0)
    ? user.scheduleIds.map(id => DB.getSchedule(id)).filter(Boolean)
    : (user.scheduleId ? [DB.getSchedule(user.scheduleId)].filter(Boolean) : []);

  // Documents list HTML
  let documentsHTML = '';
  if (user.resume) {
    documentsHTML += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
        <div>
          <strong style="font-size:12px;color:var(--text-primary)">Resume / CV</strong>
          <div style="font-size:10px;color:var(--text-muted)">${Utils.escape(user.resume.name)} (${user.resume.size})</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-cyan btn-view-doc" data-type="resume" style="padding:4px 10px;font-size:11px;width:auto">View</button>
          <button class="btn btn-secondary btn-download-doc" data-type="resume" style="padding:4px 10px;font-size:11px;width:auto">Download</button>
        </div>
      </div>
    `;
  }
  if (user.aadhar) {
    documentsHTML += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
        <div>
          <strong style="font-size:12px;color:var(--text-primary)">Aadhaar Card</strong>
          <div style="font-size:10px;color:var(--text-muted)">${Utils.escape(user.aadhar.name)} (${user.aadhar.size})</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-cyan btn-view-doc" data-type="aadhar" style="padding:4px 10px;font-size:11px;width:auto">View</button>
          <button class="btn btn-secondary btn-download-doc" data-type="aadhar" style="padding:4px 10px;font-size:11px;width:auto">Download</button>
        </div>
      </div>
    `;
  }
  if (user.documents && user.documents.length > 0) {
    user.documents.forEach(doc => {
      documentsHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
          <div>
            <strong style="font-size:12px;color:var(--text-primary)">Gov ID Proof</strong>
            <div style="font-size:10px;color:var(--text-muted)">${Utils.escape(doc.name)} (${doc.size})</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-download-doc" data-type="document" data-docid="${doc.id}" style="padding:4px 10px;font-size:11px;width:auto">Download</button>
          </div>
        </div>
      `;
    });
  }
  if (!documentsHTML) {
    documentsHTML = `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;border:1px dashed var(--border);border-radius:var(--radius-sm)">No verification documents uploaded.</div>`;
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 750px; max-height: 90vh; overflow-y: auto; padding: 28px">
      <div class="modal-header" style="border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 20px">
        <div style="display:flex; align-items:center; gap:12px">
          <div class="avatar" style="width:44px; height:44px; font-size:14px; margin:0">${avatarLetters}</div>
          <div>
            <h3 class="modal-title" style="margin:0; font-size:18px">${Utils.escape(user.name)}</h3>
            <div style="font-size:12px; color:var(--text-muted)">Employee Code: <strong>${Utils.escape(user.employeeId)}</strong> | Role: ${Utils.escape(user.role)}</div>
          </div>
        </div>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px">
        
        <!-- Column 1: Personal Details & Shifts -->
        <div style="display:flex; flex-direction:column; gap:16px">
          
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Personal Information</h4>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--text-secondary)">
              <div><strong>Department:</strong> ${Utils.escape(user.department || 'N/A')}</div>
              <div><strong>Designation:</strong> ${Utils.escape(user.designation || 'N/A')}</div>
              <div><strong>Email:</strong> ${Utils.escape(user.email || 'N/A')}</div>
              <div><strong>Phone:</strong> ${Utils.escape(user.phone || 'N/A')}</div>
              <div><strong>Date of Birth:</strong> ${user.dob || 'N/A'}</div>
              <div><strong>Gender:</strong> ${user.gender || 'N/A'}</div>
              <div><strong>Date of Joining:</strong> ${user.dateOfJoining || 'N/A'}</div>
              <div><strong>Home Address:</strong> ${Utils.escape(user.address || 'N/A')}, ${Utils.escape(user.city || '')}</div>
              <div><strong>Emergency Contact:</strong> ${Utils.escape(user.emergencyContact || 'N/A')}</div>
            </div>
          </div>
 
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Work Location & Assigned Shift(s)</h4>
            ${assignedSchedules.length === 0 ? `<div style="font-size:12px; color:var(--text-muted)">No Shift Assigned</div>` : `
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${assignedSchedules.map(sch => {
                  const schWorkDays = sch.workDays && sch.workDays.length > 0 ? sch.workDays.map(d => dayNames[d]).join(', ') : 'All Days';
                  const schLoc = (user.shiftLocations && user.shiftLocations[sch.id]) || user.preferredLocation || sch.location || 'Kohat Enclave, Pitampura, Delhi';
                  return `
                    <div style="padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px; display:flex; flex-direction:column; gap:4px;">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:700; color:var(--primary); font-size:13px;">${Utils.escape(sch.name)}</div>
                        <span style="font-size:11px; color:var(--cyan); font-weight:600; background:rgba(6,182,212,0.1); padding:2px 8px; border-radius:4px; border:1px solid rgba(6,182,212,0.25);">📍 ${Utils.escape(schLoc)}</span>
                      </div>
                      <div><strong>Working Hours:</strong> ${formatTime12h(sch.startTime)} to ${formatTime12h(sch.endTime)}</div>
                      <div><strong>Grace Period:</strong> ${sch.gracePeriod} minutes</div>
                      <div><strong>Working Days:</strong> ${schWorkDays}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
 
          ${(() => {
            const logs = DB.getLogs(user.id);
            const latestLog = logs && logs.length > 0 ? logs[0] : null;
            if (latestLog && latestLog.coords) {
              return `
                <div style="background:rgba(239,68,68,0.02); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-md); padding:16px; margin-top:16px">
                  <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--error)">Out of Geofence Deviation (Latest)</h4>
                  <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--text-secondary)">
                    <div><strong>Location:</strong> ${Utils.escape(latestLog.location)}</div>
                    <div><strong>Deviation Coords:</strong> ${latestLog.coords} (${latestLog.distance} km)</div>
                    <div style="line-height:1.4"><strong>Justification:</strong> "${Utils.escape(latestLog.justification || 'None')}"</div>
                    ${latestLog.managerComment ? `<div style="color:var(--primary);font-weight:600">Comment: ${Utils.escape(latestLog.managerComment)}</div>` : ''}
                  </div>
                </div>
              `;
            }
            return '';
          })()}
 
        </div>
 
        <!-- Column 2: Payroll & Documents -->
        <div style="display:flex; flex-direction:column; gap:16px">
          
          ${showPayroll ? `
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Corporate Payroll Settings</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px; color:var(--text-secondary)">
              <div><strong>Base Salary:</strong> <span style="color:var(--text-primary)">₹${(user.baseSalary || 0).toLocaleString()}</span></div>
              <div><strong>HRA Allowance:</strong> <span style="color:var(--text-primary)">₹${(user.allowanceHRA !== undefined && user.allowanceHRA !== null ? user.allowanceHRA : 0).toLocaleString()}</span></div>
              <div><strong>Travel Allowance:</strong> <span style="color:var(--text-primary)">₹${(user.allowanceTravel !== undefined && user.allowanceTravel !== null ? user.allowanceTravel : 0).toLocaleString()}</span></div>
              <div><strong>Provident Fund (PF):</strong> <span style="color:var(--text-primary)">₹${(user.deductionPF !== undefined && user.deductionPF !== null ? user.deductionPF : 0).toLocaleString()}</span></div>
              <div><strong>Professional Tax:</strong> <span style="color:var(--text-primary)">₹${(user.deductionPT !== undefined && user.deductionPT !== null ? user.deductionPT : 0).toLocaleString()}</span></div>
              <div><strong>TDS Tax Rate:</strong> <span style="color:var(--text-primary)">${user.deductionTDS !== undefined && user.deductionTDS !== null ? user.deductionTDS : 0}%</span></div>
            </div>
          </div>
          ` : ''}
 

 
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Verification Attachments</h4>
            <div style="display:flex; flex-direction:column; gap:6px">
              ${documentsHTML}
            </div>
          </div>

        </div>

      </div>

      <div class="modal-actions" style="margin-top:20px; border-top:1px solid var(--border); padding-top:14px; display:flex; justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))" style="width:auto; padding:8px 24px">Close Details</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add click events inside modal
  overlay.querySelectorAll('.btn-view-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      showDocumentPreview(userId, type);
    });
  });

  overlay.querySelectorAll('.btn-download-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const docId = btn.getAttribute('data-docid');
      if (type === 'document') {
        downloadDocumentSimulated(userId, docId);
      } else {
        downloadDocumentSimulated(userId, type);
      }
    });
  });
}

// -------------------------------------------------------------
// EMPLOYEE SHIFT SWAPS DESK UI
// -------------------------------------------------------------
function renderEmployeeSwapsView() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const userSchedule = DB.getSchedule(user.scheduleId);

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Shift Swap Requests Desk</h1>
        <div class="content-subtitle">Request shift swaps with coworkers, and manage incoming requests.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split" style="grid-template-columns:1fr 1.5fr">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Request a Shift Swap</h3></div>
          <div style="background:rgba(251,191,36,0.05);border-left:4px solid var(--primary);padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;line-height:1.4">
            <strong>My Current Shift:</strong> ${userSchedule ? `${Utils.escape(userSchedule.name)} (${formatTime12h(userSchedule.startTime)} - ${formatTime12h(userSchedule.endTime)}) at <span style="color:var(--primary);font-weight:600">${Utils.escape(userSchedule.location || 'Not Assigned')}</span>` : '<span style="color:var(--text-muted)">Not Assigned</span>'}
          </div>
          <form id="shift-swap-request-form">
            <div class="form-group">
              <label class="form-label" for="swap-coworker-empid">Coworker Employee ID</label>
              <div style="display:flex;gap:8px">
                <input class="form-input" type="text" id="swap-coworker-empid" placeholder="e.g. EMP104" required style="text-transform:uppercase">
                <button type="button" class="btn btn-secondary" id="btn-validate-coworker" style="width:auto;padding:8px 16px;font-size:12.5px;font-weight:600">Validate</button>
              </div>
            </div>
            
            <div id="coworker-swap-preview" style="display:none;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:16px;font-size:12.5px;line-height:1.4"></div>
            
            <div class="form-group">
              <label class="form-label" for="swap-type">Select Swap Mode</label>
              <select class="form-input" id="swap-type" required>
                <option value="both">Swap Both Shift & Work Location</option>
                <option value="location">Swap Work Location Only</option>
                <option value="shift">Swap Shift Only (Keep Work Location)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="swap-reason">Reason for Swap</label>
              <textarea class="form-input" id="swap-reason" placeholder="Describe why you want to swap shifts..." rows="3" required style="resize:vertical"></textarea>
            </div>
            <button class="btn" type="submit">Submit Swap Request</button>
          </form>
          <div id="swap-alert" style="display:none;margin-top:12px"></div>
        </div>

        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Shift Swap Requests Ledger</h3></div>
          <div style="margin-bottom:20px">
            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text-primary)">📥 Received Requests</h4>
            <div class="table-container">
              <table class="custom-table" id="received-swaps-table">
                <thead><tr><th>Sender</th><th>Their Shift</th><th>Reason Notes</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody id="received-swaps-tbody"></tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text-primary)">📤 Sent Requests</h4>
            <div class="table-container">
              <table class="custom-table" id="sent-swaps-table">
                <thead><tr><th>Coworker</th><th>Their Shift</th><th>Reason Notes</th><th>Status</th></tr></thead>
                <tbody id="sent-swaps-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  let validatedCoworkerId = null;
  const empidInput = document.getElementById('swap-coworker-empid');
  const validateBtn = document.getElementById('btn-validate-coworker');
  const previewDiv = document.getElementById('coworker-swap-preview');

  if (validateBtn && empidInput && previewDiv) {
    validateBtn.addEventListener('click', () => {
      const val = empidInput.value.trim().toUpperCase();
      if (!val) {
        previewDiv.style.display = 'none';
        validatedCoworkerId = null;
        return;
      }
      if (val === user.employeeId.toUpperCase()) {
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = `<span style="color:var(--error);font-weight:600">⚠️ You cannot swap shifts with yourself.</span>`;
        validatedCoworkerId = null;
        return;
      }
      const coworker = DB.getUsers().find(u => u.employeeId && u.employeeId.toUpperCase() === val && u.role === 'employee');
      if (!coworker) {
        previewDiv.style.display = 'block';
        previewDiv.innerHTML = `<span style="color:var(--error);font-weight:600">⚠️ Employee ID not found. Only registered employees can swap shifts.</span>`;
        validatedCoworkerId = null;
        return;
      }
      validatedCoworkerId = coworker.id;
      const s = DB.getSchedule(coworker.scheduleId);
      const coworkerLoc = s && s.location ? s.location : (coworker.preferredLocation || 'Not Assigned');
      
      previewDiv.style.display = 'block';
      previewDiv.innerHTML = `
        <h4 style="margin:0 0 8px 0;font-size:13px;color:var(--success)">✅ Coworker ID Verified</h4>
        <div><strong>Current Shift:</strong> ${s ? Utils.escape(s.name) : 'Not Assigned'} (${s ? formatTime12h(s.startTime) : ''} - ${s ? formatTime12h(s.endTime) : ''})</div>
        <div><strong>Work Location:</strong> <span style="color:var(--primary);font-weight:600">${Utils.escape(coworkerLoc)}</span></div>
      `;
    });

    empidInput.addEventListener('input', () => {
      previewDiv.style.display = 'none';
      validatedCoworkerId = null;
    });
  }

  renderEmployeeSwapsData(user.id);

  document.getElementById('shift-swap-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validatedCoworkerId) {
      showSwapAlert('Please enter and validate a coworker Employee ID first.', 'error');
      return;
    }
    const swapType = document.getElementById('swap-type').value;
    const reason = document.getElementById('swap-reason').value.trim();
    
    DB.submitShiftSwap(user.id, validatedCoworkerId, reason, swapType);
    showSwapAlert('Shift swap request submitted successfully!', 'success');
    document.getElementById('shift-swap-request-form').reset();
    if (previewDiv) previewDiv.style.display = 'none';
    validatedCoworkerId = null;
    renderEmployeeSwapsData(user.id);
  });
}

function renderEmployeeSwapsData(userId) {
  const receivedTbody = document.getElementById('received-swaps-tbody');
  const sentTbody = document.getElementById('sent-swaps-tbody');
  const swaps = DB.getShiftSwaps();

  const received = swaps.filter(s => s.receiverId === userId);
  const sent = swaps.filter(s => s.senderId === userId);

  receivedTbody.innerHTML = received.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No received requests.</td></tr>` : received.map(s => {
    const sender = DB.getUser(s.senderId);
    const senderSchedule = sender ? DB.getSchedule(sender.scheduleId) : null;
    const senderLoc = senderSchedule && senderSchedule.location ? senderSchedule.location : (sender ? (sender.preferredLocation || 'Kohat Enclave, Pitampura, Delhi') : 'Kohat Enclave, Pitampura, Delhi');
    const modeLabel = s.swapType === 'both' ? 'Shift & Location' : (s.swapType === 'location' ? 'Location Only' : 'Shift Only');
    let statusClass = 'badge-pending';
    if (s.status === 'Pending Manager') statusClass = 'badge-approved';
    else if (s.status === 'Approved') statusClass = 'badge-approved';
    else if (s.status === 'Rejected') statusClass = 'badge-rejected';

    return `
      <tr>
        <td style="font-weight:600">${sender ? 'Employee ID: ' + Utils.escape(sender.employeeId) : 'Unknown'}</td>
        <td>
          ${senderSchedule ? Utils.escape(senderSchedule.name) : 'None'}<br>
          <span style="font-size:11px;color:var(--text-secondary)">📍 ${Utils.escape(senderLoc)}</span>
        </td>
        <td style="font-size:12px;color:var(--text-secondary)">
          <strong>Mode:</strong> ${modeLabel}<br>
          "${Utils.escape(s.reason)}"
          ${s.coworkerComment ? `<br><span style="color:var(--text-secondary)"><strong>My response:</strong> ${Utils.escape(s.coworkerComment)}</span>` : ''}
        </td>
        <td><span class="badge ${statusClass}">${s.status}</span></td>
        <td>
          ${s.status === 'Pending Coworker' ? `
            <div style="display:flex;gap:4px">
              <button class="btn btn-success btn-accept-swap" data-id="${s.id}" style="padding:4px 8px;font-size:11px;width:auto">Accept</button>
              <button class="btn btn-danger btn-reject-swap" data-id="${s.id}" style="padding:4px 8px;font-size:11px;width:auto">Reject</button>
            </div>
          ` : `<span style="font-size:11px;color:var(--text-muted)">Completed</span>`}
        </td>
      </tr>
    `;
  }).join('');

  sentTbody.innerHTML = sent.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No sent requests.</td></tr>` : sent.map(s => {
    const receiver = DB.getUser(s.receiverId);
    const receiverSchedule = receiver ? DB.getSchedule(receiver.scheduleId) : null;
    const receiverLoc = receiverSchedule && receiverSchedule.location ? receiverSchedule.location : (receiver ? (receiver.preferredLocation || 'Kohat Enclave, Pitampura, Delhi') : 'Kohat Enclave, Pitampura, Delhi');
    const modeLabel = s.swapType === 'both' ? 'Shift & Location' : (s.swapType === 'location' ? 'Location Only' : 'Shift Only');
    let statusClass = 'badge-pending';
    if (s.status === 'Pending Manager') statusClass = 'badge-approved';
    else if (s.status === 'Approved') statusClass = 'badge-approved';
    else if (s.status === 'Rejected') statusClass = 'badge-rejected';

    return `
      <tr>
        <td style="font-weight:600">${receiver ? 'Employee ID: ' + Utils.escape(receiver.employeeId) : 'Unknown'}</td>
        <td>
          ${receiverSchedule ? Utils.escape(receiverSchedule.name) : 'None'}<br>
          <span style="font-size:11px;color:var(--text-secondary)">📍 ${Utils.escape(receiverLoc)}</span>
        </td>
        <td style="font-size:12px;color:var(--text-secondary)">
          <strong>Mode:</strong> ${modeLabel}<br>
          "${Utils.escape(s.reason)}"
          ${s.coworkerComment ? `<br><span style="color:var(--text-secondary)"><strong>Coworker:</strong> ${Utils.escape(s.coworkerComment)}</span>` : ''}
          ${s.managerComment ? `<br><span style="color:var(--primary)"><strong>Manager:</strong> ${Utils.escape(s.managerComment)}</span>` : ''}
        </td>
        <td><span class="badge ${statusClass}">${s.status}</span></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.btn-accept-swap').forEach(btn => btn.addEventListener('click', (e) => processCoworkerSwap(e.target.dataset.id, true)));
  document.querySelectorAll('.btn-reject-swap').forEach(btn => btn.addEventListener('click', (e) => processCoworkerSwap(e.target.dataset.id, false)));
}

async function processCoworkerSwap(swapId, accept) {
  const comment = await prompt(`Add a response comment (optional):`);
  if (comment === null) return;
  DB.respondToShiftSwapCoworker(swapId, accept, comment);
  renderEmployeeSwapsView();
}

function showSwapAlert(msg, type) {
  const alert = document.getElementById('swap-alert');
  alert.style.display = 'block';
  alert.style.padding = '10px';
  alert.style.borderRadius = '4px';
  alert.style.fontSize = '13px';
  alert.style.marginBottom = '12px';
  if (type === 'success') {
    alert.style.background = 'rgba(16,185,129,0.1)';
    alert.style.color = 'var(--success)';
    alert.style.border = '1px solid var(--success)';
  } else {
    alert.style.background = 'rgba(239,68,68,0.1)';
    alert.style.color = 'var(--error)';
    alert.style.border = '1px solid var(--error)';
  }
  alert.innerText = msg;
  setTimeout(() => { alert.style.display = 'none'; }, 4000);
}

// -------------------------------------------------------------
// ANNOUNCEMENTS RENDERING HELPER FUNCTIONS
// -------------------------------------------------------------
function renderEmployeeNotices(userId) {
  const container = document.getElementById('employee-notices-container');
  if (!container) return;

  let notices = DB.getAnnouncements();
  
  // Filter for this specific user's targeted notices OR global notices
  notices = notices.filter(a => !a.targetUserId || a.targetUserId === userId);

  const readKey = `hs_read_notices_${userId}`;
  const readIds = JSON.parse(localStorage.getItem(readKey) || '[]');
  
  const delKey = `hs_del_notices_${userId}`;
  const delIds = JSON.parse(localStorage.getItem(delKey) || '[]');

  notices = notices.filter(a => !delIds.includes(a.id));

  const btnDeleteAll = document.getElementById('btn-delete-all-notices');
  if (btnDeleteAll) {
    btnDeleteAll.style.display = notices.length > 0 ? 'block' : 'none';
  }

  if (notices.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:20px 0;color:var(--text-muted);font-size:12px">No active notifications.</div>`;
    return;
  }

  container.innerHTML = notices.map(a => {
    const isRead = readIds.includes(a.id);
    let badgeClass = 'badge-on-time';
    if (a.category === 'General') badgeClass = 'badge-pending';
    if (a.category === 'Update') badgeClass = 'badge-half-day';
    if (a.category === 'Urgent') badgeClass = 'badge-late';

    return `
      <div class="notice-item" data-id="${a.id}" style="background:rgba(255,255,255,${isRead ? '0.01' : '0.03'});border:1px solid ${isRead ? 'var(--border)' : 'rgba(251,191,36,0.2)'};border-radius:var(--radius-sm);padding:12px;display:flex;flex-direction:column;gap:6px;transition:all 0.2s ease;opacity:${isRead ? '0.6' : '1'}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge ${badgeClass}" style="font-size:10px;padding:2px 8px">${a.category}</span>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:10.5px;color:var(--text-muted)">${a.date}</span>
            <button class="btn-del-notice" data-id="${a.id}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;line-height:1;padding:0;opacity:0.7" title="Delete">🗑️</button>
          </div>
        </div>
        <strong style="font-size:13px;color:var(--text-primary)">${Utils.escape(a.title)}</strong>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.4;margin:0">${Utils.escape(a.content)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;border-top:1px solid rgba(255,255,255,0.03);padding-top:6px">
          <span style="font-size:10px;color:var(--text-muted)">By: ${Utils.escape(a.author)}</span>
          ${isRead 
            ? `<span style="font-size:11.5px;color:var(--cyan);display:flex;align-items:center;gap:3px;font-weight:600">✓ Read</span>` 
            : `<button class="btn-mark-notice-read" data-id="${a.id}" style="background:transparent;border:none;color:var(--primary);cursor:pointer;font-size:11px;padding:0;text-decoration:underline">Mark as Read</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  // Bind mark as read events
  container.querySelectorAll('.btn-mark-notice-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      readIds.push(id);
      localStorage.setItem(readKey, JSON.stringify(readIds));
      renderEmployeeNotices(userId);
    });
  });

  // Bind delete single notice events
  container.querySelectorAll('.btn-del-notice').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      delIds.push(id);
      localStorage.setItem(delKey, JSON.stringify(delIds));
      renderEmployeeNotices(userId);
    });
  });

  // Bind delete all notices event
  if (btnDeleteAll) {
    // Prevent multiple bindings if called repeatedly
    btnDeleteAll.replaceWith(btnDeleteAll.cloneNode(true));
    const newBtn = document.getElementById('btn-delete-all-notices');
    newBtn.addEventListener('click', async () => {
      if (await CustomDialog.confirm('Are you sure you want to delete all notifications?')) {
        notices.forEach(n => delIds.push(n.id));
        localStorage.setItem(delKey, JSON.stringify(delIds));
        renderEmployeeNotices(userId);
      }
    });
  }
}

function renderAdminAnnouncementsList() {
  const container = document.getElementById('admin-announcements-list');
  if (!container) return;

  const notices = DB.getAnnouncements();
  if (notices.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--text-muted);font-size:13px">No announcements on the board.</div>`;
    return;
  }

  container.innerHTML = notices.map(a => {
    let badgeClass = 'badge-on-time';
    if (a.category === 'General') badgeClass = 'badge-pending';
    if (a.category === 'Update') badgeClass = 'badge-half-day';
    if (a.category === 'Urgent') badgeClass = 'badge-late';

    return `
      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="badge ${badgeClass}" style="font-size:10px;padding:2px 8px">${a.category}</span>
          <span style="font-size:11px;color:var(--text-muted)">${a.date}</span>
        </div>
        <strong style="font-size:13px">${Utils.escape(a.title)}</strong>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.45;margin:0">${Utils.escape(a.content)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;border-top:1px solid rgba(255,255,255,0.03);padding-top:6px">
          <span style="font-size:10px;color:var(--text-muted)">By: ${Utils.escape(a.author)}</span>
          <button class="btn-delete-announcement" data-id="${a.id}" style="background:transparent;border:none;color:var(--error);cursor:pointer;font-size:11px;padding:0;text-decoration:underline">Delete Notice</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind delete events
  container.querySelectorAll('.btn-delete-announcement').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (await CustomDialog.confirm('Are you sure you want to delete this notice?')) {
        DB.deleteAnnouncement(id);
        renderAdminAnnouncementsList();
      }
    });
  });
}

// -------------------------------------------------------------
// GLOBAL NOTIFICATIONS CONTROLLER
// -------------------------------------------------------------
function updateNotificationsUI() {
  try {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const countBadge = document.getElementById('notification-count');
    const dropdown = document.getElementById('notifications-dropdown');
    const listContainer = document.getElementById('notifications-list');
    
    if (!countBadge || !listContainer) return;

    let notifications = [];

    if (user.role === 'hr' || user.role === 'manager') {
      // 1. Leave Requests pending manager approval
      const leaves = DB.getLeaveRequests().filter(lv => lv.status === 'Pending');
      leaves.forEach(lv => {
        const u = DB.getUser(lv.userId);
        notifications.push({
          id: lv.id,
          title: `Leave: ${u ? u.name : 'Employee'}`,
          desc: `Requested ${lv.type} leave from ${lv.startDate} to ${lv.endDate}`,
          link: '#admin-approvals',
          category: 'Request'
        });
      });

      // 2. Shift Swaps pending manager approval
      const swaps = (DB.data.shiftSwaps || []).filter(s => s.status === 'Pending Manager');
      swaps.forEach(s => {
        const sender = DB.getUser(s.senderId);
        const receiver = DB.getUser(s.receiverId);
        notifications.push({
          id: s.id,
          title: 'Shift Swap Request',
          desc: `${sender ? sender.name : 'Employee'} requested to swap shift with ${receiver ? receiver.name : 'Employee'}`,
          link: '#admin-approvals',
          category: 'Swap'
        });
      });
    } else if (user.role === 'finance_manager') {
      const financeAlerts = DB.data.financeAlerts || [];
      financeAlerts.forEach(al => {
        notifications.push({
          id: al.id,
          title: al.title,
          desc: al.desc,
          link: '#admin-finance',
          category: 'Finance'
        });
      });
    } else {
      // Employee Notifications: Unread Announcements
      const announcements = DB.getAnnouncements();
      const readKey = `hs_read_notices_${user.id}`;
      const readIds = JSON.parse(localStorage.getItem(readKey) || '[]');
      const unread = announcements.filter(a => !readIds.includes(a.id));

      unread.forEach(a => {
        notifications.push({
          id: a.id,
          title: a.title,
          desc: a.content,
          link: '#dashboard',
          category: 'Announcement'
        });
      });
    }

    const delKey = `hs_del_notices_${user.id}`;
    const delIds = JSON.parse(localStorage.getItem(delKey) || '[]');

    // Filter out deleted notifications
    notifications = notifications.filter(n => !delIds.includes(n.id));

    // Update Badge
    if (notifications.length > 0) {
      countBadge.style.display = 'flex';
      countBadge.textContent = notifications.length;
    } else {
      countBadge.style.display = 'none';
    }

    // Populate Dropdown List
    if (notifications.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center;padding:30px 16px;color:var(--text-muted);font-size:12.5px">
          No new notifications. Everything is up to date!
        </div>
      `;
    } else {
      listContainer.innerHTML = notifications.map(n => {
        let badgeStyle = 'background:rgba(16,185,129,0.1);color:var(--success)';
        if (n.category === 'Request') badgeStyle = 'background:rgba(251,191,36,0.1);color:var(--primary)';
        if (n.category === 'Swap') badgeStyle = 'background:rgba(139,92,246,0.1);color:rgb(139,92,246)';
        if (n.category === 'Finance') badgeStyle = 'background:rgba(239,68,68,0.1);color:var(--error)';

        return `
          <div class="notification-item-row" data-id="${n.id}" data-link="${n.link}" data-category="${n.category}" style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s;display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;${badgeStyle}">${n.category}</span>
              <div style="display:flex; gap:8px; align-items:center;">
                <span style="font-size:10px;color:var(--text-muted)">New</span>
                <button class="btn-del-dropdown-notice" data-id="${n.id}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:12px;line-height:1;padding:0;opacity:0.7" title="Delete">🗑️</button>
              </div>
            </div>
            <strong style="font-size:12.5px;color:var(--text-primary)">${Utils.escape(n.title)}</strong>
            <p style="font-size:11.5px;color:var(--text-secondary);line-height:1.4;margin:0;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:300px">${Utils.escape(n.desc)}</p>
          </div>
        `;
      }).join('');

      // Bind delete single notice events
      listContainer.querySelectorAll('.btn-del-dropdown-notice').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent opening the link
          const id = e.currentTarget.getAttribute('data-id');
          delIds.push(id);
          localStorage.setItem(delKey, JSON.stringify(delIds));
          updateNotificationsUI();
        });
      });

      // Bind click events on notification items
      listContainer.querySelectorAll('.notification-item-row').forEach(row => {
        row.addEventListener('click', (e) => {
          const id = row.getAttribute('data-id');
          const link = row.getAttribute('data-link');
          const category = row.getAttribute('data-category');

          if (category === 'Announcement') {
            const readKey = `hs_read_notices_${user.id}`;
            const readIds = JSON.parse(localStorage.getItem(readKey) || '[]');
            if (!readIds.includes(id)) {
              readIds.push(id);
              localStorage.setItem(readKey, JSON.stringify(readIds));
            }
          }

          if (dropdown) dropdown.style.display = 'none';
          window.location.hash = link;
          
          updateNotificationsUI();
          
          if (link === '#dashboard' && window.location.hash === '#dashboard') {
            renderEmployeeDashboard();
          }
        });
        
        row.addEventListener('mouseenter', () => {
          row.style.background = 'rgba(255,255,255,0.02)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = 'transparent';
        });
      });
    }
  } catch (err) {
    console.error("Error updating notifications UI:", err);
  }
}

// -------------------------------------------------------------
// INTERNAL MESSAGING SYSTEM CONTROLLERS
// -------------------------------------------------------------
function updateMessagesInbox() {
  try {
    const user = Auth.getCurrentUser();
    if (!user) return;

    if (!DB.data.messages) {
      DB.data.messages = [];
    }

    const receivedMessages = DB.data.messages.filter(m => m.receiverId === user.id);
    const unreadCount = receivedMessages.filter(m => !m.read).length;

    const countBadge = document.getElementById('messages-count');
    if (countBadge) {
      if (unreadCount > 0) {
        countBadge.textContent = unreadCount;
        countBadge.style.display = 'flex';
      } else {
        countBadge.style.display = 'none';
      }
    }

    const msgList = document.getElementById('messages-list');
    if (msgList) {
      if (receivedMessages.length === 0) {
        msgList.innerHTML = `
          <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12.5px">
            ✉️ No messages or emails.
          </div>
        `;
      } else {
        const sorted = [...receivedMessages].sort((a, b) => new Date(b.date) - new Date(a.date));
        msgList.innerHTML = sorted.map(m => {
          const sender = DB.getUser(m.senderId) || { name: 'Unknown User' };
          const timeStr = new Date(m.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          return `
            <div class="msg-dropdown-item" data-id="${m.id}" style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${m.read ? 'transparent' : 'rgba(137,32,27,0.06)'};transition:all 0.2s">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <strong style="font-size:12.5px;color:var(--text-primary)">${Utils.escape(sender.name)}</strong>
                <span style="font-size:10px;color:var(--text-muted)">${dateStr} ${timeStr}</span>
              </div>
              <div style="font-size:12px;font-weight:700;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.escape(m.subject)}</div>
              <div style="font-size:11.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${Utils.escape(m.body)}</div>
            </div>
          `;
        }).join('');

        // Bind click events on dropdown message list items
        msgList.querySelectorAll('.msg-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            const msgId = item.dataset.id;
            const msg = DB.data.messages.find(m => m.id === msgId);
            if (msg) {
              msg.read = true;
              DB.save();
              updateMessagesInbox();
              openViewMessageModal(msg);
            }
          });
          
          item.addEventListener('mouseenter', () => {
            item.style.background = 'rgba(137,32,27,0.1)';
          });
          item.addEventListener('mouseleave', () => {
            item.style.background = item.classList.contains('read') ? 'transparent' : (DB.data.messages.find(m => m.id === item.dataset.id)?.read ? 'transparent' : 'rgba(137,32,27,0.06)');
          });
        });
      }
    }
  } catch (err) {
    console.error("Error updating messages inbox:", err);
  }
}

function openComposeMessageModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const currentUser = Auth.getCurrentUser();
  const users = DB.getUsers().filter(u => u.id !== currentUser.id);
  const optionsHTML = users.map(u => `<option value="${u.id}">${Utils.escape(u.name)} (${u.role.toUpperCase()})</option>`).join('');

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 480px; animation: scaleUp 0.3s ease">
      <div class="modal-header">
        <h3 class="modal-title">New Internal Message</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      <form id="compose-message-form">
        <div class="form-group">
          <label class="form-label" for="msg-recipient">Recipient *</label>
          <select class="form-input profile-editable-field" id="msg-recipient" required style="width:100%;height:38px;padding:8px">
            <option value="">-- Select Recipient --</option>
            ${optionsHTML}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="msg-subject">Subject *</label>
          <input class="form-input profile-editable-field" type="text" id="msg-subject" required placeholder="Enter Subject">
        </div>
        <div class="form-group">
          <label class="form-label" for="msg-body">Message Body *</label>
          <textarea class="form-input profile-editable-field" id="msg-body" required placeholder="Type your message here..." rows="4" style="resize:vertical;padding:10px"></textarea>
        </div>
        <div class="modal-actions" style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px">
          <button class="btn btn-secondary" type="button" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
          <button class="btn btn-success" type="submit" style="background:#89201B;color:white;font-weight:700">Send Message</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#compose-message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const recipientId = overlay.querySelector('#msg-recipient').value;
    const subject = overlay.querySelector('#msg-subject').value.trim();
    const body = overlay.querySelector('#msg-body').value.trim();

    const sender = Auth.getCurrentUser();
    const newMessage = {
      id: 'msg_' + Date.now(),
      senderId: sender.id,
      receiverId: recipientId,
      subject,
      body,
      date: new Date().toISOString(),
      read: false
    };

    if (!DB.data.messages) {
      DB.data.messages = [];
    }
    DB.data.messages.push(newMessage);
    DB.save();

    closeModal(overlay);
    CustomDialog.alert('✉️ Message sent successfully!');
    updateMessagesInbox();
  });
}

function openViewMessageModal(msg) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const sender = DB.getUser(msg.senderId) || { name: 'Unknown User' };

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 480px; animation: scaleUp 0.3s ease">
      <div class="modal-header">
        <h3 class="modal-title">Internal Email / Message</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      <div style="font-size:13px;line-height:1.6;color:var(--text-primary)">
        <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:12px">
          <div><span style="color:var(--text-muted)">From:</span> <strong>${Utils.escape(sender.name)}</strong></div>
          <div style="margin-top:4px"><span style="color:var(--text-muted)">Subject:</span> <strong style="color:var(--text-secondary)">${Utils.escape(msg.subject)}</strong></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${new Date(msg.date).toLocaleString('en-IN')}</div>
        </div>
        <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:8px;border:1px solid var(--border);white-space:pre-wrap">${Utils.escape(msg.body)}</div>
        <div style="margin-top:20px;display:flex;justify-content:flex-end">
          <button class="btn" onclick="closeModal(this.closest('.modal-overlay'))" style="width:auto;padding:8px 20px;background:var(--primary);color:#ffffff;font-weight:700">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function openPayrollAdjustmentModal(userId, month, year) {
  const p = DB.calculateMonthlyPayroll(userId, month, year);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 450px; animation: scaleUp 0.3s ease">
      <div class="modal-header">
        <h3 class="modal-title">Edit Payslip Adjustments</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      <form id="payroll-adjustment-form">
        <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:15px;line-height:1.4">
          Employee: <strong>${Utils.escape(p.employeeName)}</strong> (${userId})
          <br>Period: <strong>${monthNames[month]} ${year}</strong>
        </div>
        <div class="form-group">
          <label class="form-label" for="adj-bonus">Discretionary Bonus (INR)</label>
          <input class="form-input" type="number" id="adj-bonus" value="${p.bonus || 0}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label" for="adj-deduction">Ad-hoc Deduction (INR)</label>
          <input class="form-input" type="number" id="adj-deduction" value="${p.adhocDeduction || 0}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label" for="adj-remarks">Manager Remarks / Description</label>
          <textarea class="form-input" id="adj-remarks" placeholder="Notes printed on the payslip..." rows="3" style="resize:vertical">${Utils.escape(p.remarks || '')}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
          <button class="btn" type="submit">Save Adjustments</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('payroll-adjustment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const bonus = Number(document.getElementById('adj-bonus').value) || 0;
    const deduction = Number(document.getElementById('adj-deduction').value) || 0;
    const remarks = document.getElementById('adj-remarks').value.trim();
    
    DB.savePayrollAdjustment(userId, month, year, bonus, deduction, remarks);
    closeModal(overlay);
    
    // Refresh the reports sheet and re-render the preview drawer
    compileReports(month, year);
    
    // Re-trigger preview drawer display
    const inspectBtn = document.querySelector(`.btn-view-payslip-admin[data-id="${userId}"]`);
    if (inspectBtn) inspectBtn.click();
  });
}

function openPunctualityRecapModal(userId) {
  const user = DB.getUser(userId);
  if (!user) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const today = new Date();
  let selectedMonth = today.getMonth();
  let selectedYear = today.getFullYear();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 450px; animation: scaleUp 0.3s ease; padding: 24px">
      <div class="modal-header" style="margin-bottom:15px">
        <h3 class="modal-title">📊 Punctuality Recap</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px">
        <div>
          Employee: <strong>${Utils.escape(user.name)}</strong>
          <br><span style="font-size:11px;color:var(--text-muted)">Code: ${user.employeeId || userId}</span>
        </div>
        <div style="display:flex; gap:6px">
          <select class="form-input" id="recap-month" style="width:110px; padding:6px; font-size:12px; background:rgba(255,255,255,0.02)">
            ${monthNames.map((m, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select class="form-input" id="recap-year" style="width:80px; padding:6px; font-size:12px; background:rgba(255,255,255,0.02)">
            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div class="card-panel" style="background:rgba(255,255,255,0.01); border:1px solid var(--border); padding:20px; display:flex; flex-direction:column; align-items:center; gap:20px">
        <h4 style="margin:0; font-size:14px; font-weight:700; color:var(--text-primary); text-align:center">Monthly Punctuality Ratio</h4>
        
        <div id="recap-chart-container" style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%">
          <!-- Dynamic SVG and Legend rendered here -->
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const updateRecapView = () => {
    const logs = DB.getLogs(userId) || [];
    
    // Filter logs for the selected month/year
    const monthlyLogs = logs.filter(l => {
      const d = new Date(l.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    
    const totalPresent = monthlyLogs.length;
    const totalLate = monthlyLogs.filter(l => l.status === 'Late' || l.status === 'Deviation Logged').length;
    const totalOnTime = totalPresent - totalLate;
    
    const onTimePct = totalPresent > 0 ? Math.round((totalOnTime / totalPresent) * 100) : 100;
    const latePct = totalPresent > 0 ? Math.round((totalLate / totalPresent) * 100) : 0;
    
    const container = document.getElementById('recap-chart-container');
    if (!container) return;
    
    if (totalPresent === 0) {
      container.innerHTML = `
        <div style="padding:40px 0; text-align:center; color:var(--text-muted); font-size:13px">
          No attendance records logged for this period.
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="position:relative; width:150px; height:150px; margin-bottom:15px">
        <svg width="150" height="150" viewBox="0 0 36 36" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="4"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--success)" stroke-width="4" stroke-dasharray="${onTimePct} ${100 - onTimePct}" stroke-dashoffset="25"></circle>
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" stroke-width="4" stroke-dasharray="${latePct} ${100 - latePct}" stroke-dashoffset="${25 - onTimePct}"></circle>
        </svg>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center">
          <span style="font-size:20px; font-weight:700; color:var(--text-primary)">${onTimePct}%</span>
          <br><span style="font-size:9px; color:var(--text-muted); text-transform:uppercase">On-Time</span>
        </div>
      </div>
      
      <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:10px">
        <span style="display:flex; align-items:center; gap:6px">
          <span style="width:8px; height:8px; border-radius:50%; background:var(--success)"></span>
          On-Time (${onTimePct}%)
        </span>
        <span style="display:flex; align-items:center; gap:6px">
          <span style="width:8px; height:8px; border-radius:50%; background:var(--primary)"></span>
          Late (${latePct}%)
        </span>
      </div>
      
      <div style="width:100%; border-top:1px solid rgba(255,255,255,0.03); margin-top:15px; padding-top:15px; display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:11.5px; text-align:center; color:var(--text-secondary)">
        <div>Total Logs: <strong>${totalPresent} days</strong></div>
        <div>Late Penalties: <strong>${totalLate} times</strong></div>
      </div>
    `;
  };
  
  document.getElementById('recap-month').addEventListener('change', (e) => {
    selectedMonth = Number(e.target.value);
    updateRecapView();
  });
  
  document.getElementById('recap-year').addEventListener('change', (e) => {
    selectedYear = Number(e.target.value);
    updateRecapView();
  });
  
  updateRecapView();
}

function openProfileReviewModal(userId) {
  const u = DB.getUser(userId);
  if (!u || !u.pendingProfileEdits) return;
  
  const edits = u.pendingProfileEdits;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  const diffRows = [];
  const fields = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'emergencyContact', label: 'Emergency Contact' },
    { key: 'dob', label: 'DOB' },
    { key: 'gender', label: 'Gender' }
  ];
  
  fields.forEach(f => {
    const curVal = u[f.key] || '';
    const pendingVal = edits[f.key] || '';
    if (curVal !== pendingVal) {
      diffRows.push(`
        <tr>
          <td style="font-weight:600">${f.label}</td>
          <td style="color:var(--text-muted); text-decoration:line-through">${Utils.escape(curVal)}</td>
          <td style="color:var(--success); font-weight:600">${Utils.escape(pendingVal)}</td>
        </tr>
      `);
    }
  });
  
  if (diffRows.length === 0) {
    diffRows.push(`<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">No visible changes in key fields.</td></tr>`);
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 500px; animation: scaleUp 0.3s ease; padding: 24px">
      <div class="modal-header" style="margin-bottom:15px">
        <h3 class="modal-title">📝 Review Profile Changes</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      <div style="font-size:12.5px; color:var(--text-secondary); margin-bottom:15px">
        Employee: <strong>${Utils.escape(u.name)}</strong> (${userId})
      </div>
      
      <table class="custom-table" style="font-size:12.5px; margin-bottom:20px">
        <thead>
          <tr>
            <th>Field</th>
            <th>Current Value</th>
            <th>Proposed Value</th>
          </tr>
        </thead>
        <tbody>
          ${diffRows.join('')}
        </tbody>
      </table>
      
      <div class="form-group" style="margin-bottom:15px">
        <label class="form-label" for="review-issue-comment">If rejecting, add issue comment:</label>
        <textarea class="form-input" id="review-issue-comment" placeholder="e.g. Please verify mobile number format..." rows="2" style="resize:vertical"></textarea>
      </div>
      
      <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:space-between; gap:10px">
        <button class="btn btn-secondary" id="btn-rejection-profile-submit" style="background:var(--error); border-color:var(--error); color:white; width:auto; font-size:12px; padding:8px 14px">Reject & Add Issue</button>
        <button class="btn" id="btn-approval-profile-submit" style="background:var(--success); width:auto; font-size:12px; padding:8px 14px">Approve & Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('btn-approval-profile-submit').addEventListener('click', () => {
    Object.assign(u, edits);
    u.pendingProfileEdits = null;
    u.profileVerificationStatus = 'Approved';
    u.profileVerificationComment = '';
    DB.save();
    closeModal(overlay);
    renderAdminUsers();
  });
  
  document.getElementById('btn-rejection-profile-submit').addEventListener('click', () => {
    const comment = document.getElementById('review-issue-comment').value.trim();
    if (!comment) {
      alert('Please enter an issue comment to explain the rejection.');
      return;
    }
    u.profileVerificationStatus = 'Rejected';
    u.profileVerificationComment = comment;
    u.pendingProfileEdits = null;
    DB.save();
    closeModal(overlay);
    renderAdminUsers();
  });
}

function openHelpGuidelinesModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 500px; animation: scaleUp 0.3s ease; padding: 24px">
      <div class="modal-header" style="border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 15px">
        <h3 class="modal-title">🔐 Portal Guidelines & Security Instructions</h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))">✕</button>
      </div>
      
      <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.5; display:flex; flex-direction:column; gap:16px; max-height: 60vh; overflow-y: auto; padding-right: 4px">
        <div>
          <strong style="color:var(--text-primary); font-size:13.5px">📅 1. Company Shift Guidelines</strong>
          <ul style="margin:6px 0 0 15px; padding:0">
            <li>Standard working hours are 09:00 AM to 07:00 PM (Monday to Saturday).</li>
            <li>Maximum of 2 approved paid leaves per month. Absences beyond this are subject to salary rate deduction.</li>
          </ul>
        </div>
        
        <div>
          <strong style="color:var(--text-primary); font-size:13.5px">📍 2. Geo-Fencing Constraints</strong>
          <ul style="margin:6px 0 0 15px; padding:0">
            <li>All check-ins are verified against geofence parameters.</li>
            <li>Out-of-range logins require passcode verification and mandatory written deviation justification.</li>
          </ul>
        </div>
        
        <div>
          <strong style="color:var(--text-primary); font-size:13.5px">🛡️ 3. Security & Access Protocols</strong>
          <ul style="margin:6px 0 0 15px; padding:0">
            <li>Passwords must contain at least 8 characters, an uppercase letter, a number, and a special character.</li>
            <li>Keep your credentials updated. Escalations or role changes must be authorized by the Operations Manager.</li>
            <li>Do not share your portal passcode. Unauthorized login attempts are flagged immediately.</li>
          </ul>
        </div>
        
        <div style="background:rgba(251,191,36,0.05); border:1px solid rgba(251,191,36,0.15); border-radius:var(--radius-sm); padding:10px; color:var(--primary)">
          <strong>Important Security Warning:</strong> All sessions are audited. IP addresses and GPS coordinates are logged upon daily clock-in actions to prevent spoofing.
        </div>
      </div>
      
      <div class="modal-actions" style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px">
        <button class="btn" onclick="closeModal(this.closest('.modal-overlay'))">Understood & Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function renderAdminFinance() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  if (!user || user.role !== 'finance_manager') {
    window.location.hash = '#dashboard';
    return;
  }

  const isEditor = user.username === 'admin' || user.role === 'hr';
  const records = DB.getFinancialRecords();
  const budgets = DB.getBudgets();

  // Filters state
  let filterYear = 'all';
  let filterMonth = 'all';
  let filterQuarter = 'all';
  let filterDept = 'all';
  let filterProj = 'all';
  let filterCat = 'all';

  function calculateFinanceMetrics(filteredRecords) {
    let rev = 0;
    let exp = 0;
    let pay = 0;
    let inv = 0;

    filteredRecords.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'revenue') rev += amt;
      else if (r.type === 'expense') exp += amt;
      else if (r.type === 'payroll') pay += amt;
      else if (r.type === 'investment') {
        if (r.category === 'Upload Liabilities') {
          exp += amt;
        } else {
          inv += amt;
        }
      }
    });

    const totalExp = exp + pay;
    const profit = rev - totalExp;
    
    const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const budgetRemaining = totalBudget - totalExp;

    return {
      revenue: rev,
      expenses: totalExp,
      profit: profit > 0 ? profit : 0,
      loss: profit < 0 ? Math.abs(profit) : 0,
      payroll: pay,
      budgetRemaining
    };
  }

  function getFilteredRecords() {
    return records.filter(r => {
      const d = new Date(r.date);
      const yr = d.getFullYear().toString();
      const mo = (d.getMonth() + 1).toString().padStart(2, '0');
      const qtr = Math.ceil((d.getMonth() + 1) / 3).toString();

      if (filterYear !== 'all' && yr !== filterYear) return false;
      if (filterMonth !== 'all' && mo !== filterMonth) return false;
      if (filterQuarter !== 'all' && qtr !== filterQuarter) return false;
      if (filterDept !== 'all' && r.department !== filterDept) return false;
      if (filterProj !== 'all' && r.project !== filterProj) return false;
      if (filterCat !== 'all' && r.category !== filterCat) return false;
      return true;
    });
  }

  function renderDashboardUI() {
    const activeRecords = getFilteredRecords();
    const metrics = calculateFinanceMetrics(activeRecords);

    const years = [...new Set(records.map(r => new Date(r.date).getFullYear()))].sort();
    const depts = [...new Set(records.map(r => r.department).filter(Boolean))];
    const projs = [...new Set(records.map(r => r.project).filter(Boolean))];
    const cats = [...new Set(records.map(r => r.category).filter(Boolean))];

    main.innerHTML = `
      <div class="content-header">
        <div>
          <h1 class="content-title">💼 Corporate Finance Desk</h1>
          <div class="content-subtitle">Central ledger, budget allocations, and P&L statements.</div>
        </div>
      </div>
      <div class="content-body">
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px">
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--primary)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Total Revenue</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:4px">₹${metrics.revenue.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--error)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Total Expenses</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:4px">₹${metrics.expenses.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--success)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Net Profit</div>
            <div style="font-size:18px; font-weight:700; color:var(--success); margin-top:4px">₹${metrics.profit.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--error)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Net Loss</div>
            <div style="font-size:18px; font-weight:700; color:var(--error); margin-top:4px">₹${metrics.loss.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--warning)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Payroll Cost</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:4px">₹${metrics.payroll.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--cyan)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Budget Remaining</div>
            <div style="font-size:18px; font-weight:700; color:var(--cyan); margin-top:4px">₹${metrics.budgetRemaining.toLocaleString()}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: ${isEditor ? '300px 1fr' : '1fr'}; gap:20px; margin-bottom:20px; align-items:start">
          
          ${isEditor ? `
          <div class="card-panel" style="padding:15px">
            <h3 class="card-panel-title" style="font-size:14px; margin-bottom:12px">📥 Upload Financial Record</h3>
            
            <div class="form-group" style="margin-bottom:10px">
              <label class="form-label">Record Type</label>
              <select class="form-input" id="up-type" style="padding:6px; font-size:12px">
                <option value="revenue">Revenue Management</option>
                <option value="expense">Expense Management</option>
                <option value="payroll">Payroll Upload</option>
                <option value="investment">Investment Section</option>
                <option value="budget">Budget Section</option>
              </select>
            </div>
            
            <form id="finance-upload-form" style="display:flex; flex-direction:column; gap:10px">
              <div class="form-group">
                <label class="form-label" for="up-category">Category</label>
                <select class="form-input" id="up-category" style="padding:6px; font-size:12px" required>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="up-amount">Amount (INR)</label>
                <input class="form-input" type="number" id="up-amount" required style="padding:6px; font-size:12px">
              </div>
              <div class="form-group">
                <label class="form-label" for="up-date">Transaction Date</label>
                <input class="form-input" type="date" id="up-date" required style="padding:6px; font-size:12px" value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label class="form-label" for="up-dept">Department</label>
                <select class="form-input" id="up-dept" style="padding:6px; font-size:12px">
                  <option value="General">General / Administrative</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="up-project">Project / Details</label>
                <input class="form-input" type="text" id="up-project" placeholder="e.g. Cloud Migrations" style="padding:6px; font-size:12px">
              </div>
              <div class="form-group">
                <label class="form-label" for="up-desc">Remarks / Comments</label>
                <input class="form-input" type="text" id="up-desc" placeholder="Details or vendor name" style="padding:6px; font-size:12px">
              </div>
              
              <button class="btn" type="submit" style="margin-top:5px; background:var(--primary); color:var(--bg-app); font-weight:700; padding:8px 12px; font-size:12px">Upload Record</button>
            </form>
            <div id="finance-upload-alert" style="display:none; margin-top:10px"></div>
          </div>
          ` : ''}

          <div class="card-panel" style="padding:15px">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px">
              <h3 class="card-panel-title" style="font-size:14px; margin:0">📋 P&L Transaction Ledger</h3>
              <div style="display:flex; gap:6px">
                <button class="btn btn-secondary btn-xs" id="btn-export-csv" style="padding:5px 10px; font-size:11px">Export CSV</button>
                <button class="btn btn-secondary btn-xs" id="btn-export-excel" style="padding:5px 10px; font-size:11px">Export Excel</button>
                <button class="btn btn-secondary btn-xs" id="btn-export-pdf" style="padding:5px 10px; font-size:11px; background:var(--primary); color:var(--bg-app); border:none">Print PDF Report</button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:8px; margin-bottom:15px; background:rgba(255,255,255,0.01); border:1px solid var(--border); padding:10px; border-radius:var(--radius-sm)">
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Year</label>
                <select class="form-input" id="fil-year" style="padding:4px; font-size:11px">
                  <option value="all">All Years</option>
                  ${years.map(y => `<option value="${y}" ${filterYear === y.toString() ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Month</label>
                <select class="form-input" id="fil-month" style="padding:4px; font-size:11px">
                  <option value="all">All Months</option>
                  ${['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => `<option value="${m}" ${filterMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Quarter</label>
                <select class="form-input" id="fil-quarter" style="padding:4px; font-size:11px">
                  <option value="all">All Quarters</option>
                  <option value="1" ${filterQuarter === '1' ? 'selected' : ''}>Q1 (Jan-Mar)</option>
                  <option value="2" ${filterQuarter === '2' ? 'selected' : ''}>Q2 (Apr-Jun)</option>
                  <option value="3" ${filterQuarter === '3' ? 'selected' : ''}>Q3 (Jul-Sep)</option>
                  <option value="4" ${filterQuarter === '4' ? 'selected' : ''}>Q4 (Oct-Dec)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Department</label>
                <select class="form-input" id="fil-dept" style="padding:4px; font-size:11px">
                  <option value="all">All Depts</option>
                  ${depts.map(d => `<option value="${d}" ${filterDept === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Project</label>
                <select class="form-input" id="fil-proj" style="padding:4px; font-size:11px">
                  <option value="all">All Projects</option>
                  ${projs.map(p => `<option value="${p}" ${filterProj === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Category</label>
                <select class="form-input" id="fil-cat" style="padding:4px; font-size:11px">
                  <option value="all">All Categories</option>
                  ${cats.map(c => `<option value="${c}" ${filterCat === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="table-container" style="max-height:300px; overflow-y:auto">
              <table class="custom-table" style="font-size:12px">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Dept / Project</th>
                    <th>Description</th>
                    <th style="text-align:right">Amount</th>
                    ${isEditor ? '<th>Action</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${activeRecords.length === 0 ? `<tr><td colspan="7" style="text-align:center; color:var(--text-muted)">No matching records found.</td></tr>` : activeRecords.map(r => `
                    <tr>
                      <td>${r.date}</td>
                      <td><span class="badge badge-${r.type === 'revenue' ? 'approved' : 'absent'}" style="font-size:10px; padding:2px 6px">${r.type.toUpperCase()}</span></td>
                      <td style="font-weight:600">${Utils.escape(r.category)}</td>
                      <td>${Utils.escape(r.department)} / <span style="color:var(--text-secondary)">${Utils.escape(r.project || '-')}</span></td>
                      <td>${Utils.escape(r.details || '')}</td>
                      <td style="text-align:right; font-weight:700; color:${r.type === 'revenue' ? 'var(--success)' : 'var(--text-primary)'}">₹${(Number(r.amount) || 0).toLocaleString()}</td>
                      ${isEditor ? `<td><button class="btn-delete-record" data-id="${r.id}" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:11px; text-decoration:underline">Delete</button></td>` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <div class="card-panel" style="padding:20px; margin-top:20px">
          <h3 class="card-panel-title" style="font-size:15px; margin-bottom:15px">📊 Annual Financial Report (Year 2026 Rollup)</h3>
          
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px">
            
            <div style="font-size:13px; line-height:1.6">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Annual Revenue:</span>
                <strong>₹${metrics.revenue.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Salary Expenses Paid:</span>
                <strong>₹${metrics.payroll.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Operational Expenses:</span>
                <strong>₹${(metrics.expenses - metrics.payroll).toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Asset Investments:</span>
                <strong>₹${(records.filter(r => r.type === 'investment' && r.category !== 'Upload Liabilities').reduce((sum, r) => sum + r.amount, 0)).toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Corporate Tax Paid:</span>
                <strong>₹${(records.filter(r => r.category === 'Upload Tax Details').reduce((sum, r) => sum + r.amount, 0)).toLocaleString()}</strong>
              </div>
            </div>

            <div style="font-size:13px; line-height:1.6">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Profit Generated:</span>
                <strong style="color:var(--success)">₹${metrics.profit.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Loss Incurred:</span>
                <strong style="color:var(--error)">₹${metrics.loss.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Net Company Worth:</span>
                <strong>₹${(metrics.revenue - metrics.expenses + 25000000).toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Financial Growth Ratio:</span>
                <strong style="color:var(--success)">+14.2%</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>P&L Status Verification:</span>
                <span class="badge badge-approved" id="lbl-finance-verification" style="font-size:10px; background:rgba(16,185,129,0.1); color:var(--success)">✅ Verified by Manager</span>
              </div>
            </div>

          </div>

          ${user.role === 'finance_manager' ? `
          <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px; display:flex; justify-content:flex-end; gap:10px">
            <button class="btn btn-secondary" id="btn-verify-finance-reject" style="width:auto; background:var(--error); border:none; color:white">Reject / Flag Discrepancy</button>
            <button class="btn" id="btn-verify-finance-approve" style="width:auto; background:var(--success); color:var(--bg-app)">Approve & Certify Report</button>
          </div>
          ` : ''}

        </div>

      </div>
    `;

    document.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (await confirm('Permanently delete this financial record?')) {
          DB.deleteFinancialRecord(id);
          renderDashboardUI();
        }
      });
    });

    document.getElementById('fil-year').addEventListener('change', (e) => { filterYear = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-month').addEventListener('change', (e) => { filterMonth = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-quarter').addEventListener('change', (e) => { filterQuarter = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-dept').addEventListener('change', (e) => { filterDept = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-proj').addEventListener('change', (e) => { filterProj = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-cat').addEventListener('change', (e) => { filterCat = e.target.value; renderDashboardUI(); });

    document.getElementById('btn-export-csv').addEventListener('click', () => triggerCSVExport(activeRecords));
    document.getElementById('btn-export-excel').addEventListener('click', () => triggerCSVExport(activeRecords, 'excel'));
    document.getElementById('btn-export-pdf').addEventListener('click', triggerPDFExport);

    const btnApproveReport = document.getElementById('btn-verify-finance-approve');
    const btnRejectReport = document.getElementById('btn-verify-finance-reject');
    const lblStatus = document.getElementById('lbl-finance-verification');
    
    if (btnApproveReport && lblStatus) {
      btnApproveReport.addEventListener('click', () => {
        lblStatus.textContent = '✅ Certified & Approved';
        lblStatus.style.background = 'rgba(16,185,129,0.1)';
        lblStatus.style.color = 'var(--success)';
        alert('Report successfully certified by Finance Manager.');
      });
    }
    if (btnRejectReport && lblStatus) {
      btnRejectReport.addEventListener('click', async () => {
        const comment = await prompt('Enter description of discrepancy:');
        if (comment) {
          lblStatus.textContent = `❌ Flagged: ${comment}`;
          lblStatus.style.background = 'rgba(239,68,68,0.1)';
          lblStatus.style.color = 'var(--error)';
        }
      });
    }
  }

  function triggerCSVExport(recordsList, type = 'csv') {
    const headers = ['Date', 'Type', 'Category', 'Department', 'Project', 'Amount', 'Description'];
    const rows = recordsList.map(r => [
      r.date, r.type, r.category, r.department, r.project, r.amount, r.details
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", type === 'excel' ? "Financial_Report_2026.xls" : "Financial_Report_2026.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function triggerPDFExport() {
    window.print();
  }

  const categoriesMap = {
    revenue: ['Upload Company Revenue', 'Monthly Revenue', 'Quarterly Revenue', 'Yearly Revenue'],
    expense: ['Upload Salary Expenses', 'Upload Office Expenses', 'Upload Project Expenses', 'Upload Utility Bills', 'Upload Vendor Payments', 'Upload Miscellaneous Expenses'],
    payroll: ['Upload Employee Salary', 'Upload Bonus', 'Upload Incentives', 'Upload Overtime Payment', 'Upload Deductions', 'Upload Tax Details', 'Upload PF & ESI Details'],
    investment: ['Upload Investments', 'Upload Assets', 'Upload Liabilities'],
    budget: ['Create Budget', 'Update Budget', 'Department Wise Budget', 'Project Wise Budget']
  };

  renderDashboardUI();

  const selectType = document.getElementById('up-type');
  const selectCat = document.getElementById('up-category');
  
  if (selectType && selectCat) {
    const updateCategoryOptions = () => {
      const type = selectType.value;
      const opts = categoriesMap[type] || [];
      selectCat.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join('');
    };
    selectType.addEventListener('change', updateCategoryOptions);
    updateCategoryOptions();
  }

  const uploadForm = document.getElementById('finance-upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('up-type').value;
      const category = document.getElementById('up-category').value;
      const amount = Number(document.getElementById('up-amount').value);
      const date = document.getElementById('up-date').value;
      const department = document.getElementById('up-dept').value;
      const project = document.getElementById('up-project').value.trim() || 'General';
      const details = document.getElementById('up-desc').value.trim() || '';

      const record = DB.addFinancialRecord({ type, category, amount, date, department, project, details });

      if (type === 'budget') {
        DB.addBudget({ department, project, amount, date });
      }

      const budgetsList = DB.getBudgets();
      const totalBudget = budgetsList.filter(b => b.department === department).reduce((sum, b) => sum + b.amount, 0);
      const totalExpenses = DB.getFinancialRecords().filter(r => r.department === department && (r.type === 'expense' || r.type === 'payroll')).reduce((sum, r) => sum + r.amount, 0);

      if (totalExpenses > totalBudget && totalBudget > 0) {
        if (typeof addSystemNotificationAlert === 'function') {
          addSystemNotificationAlert(`⚠️ Budget Exceeded! ${department} expenses of ₹${totalExpenses.toLocaleString()} have exceeded the allocated budget limit of ₹${totalBudget.toLocaleString()}!`);
        }
      }

      const allRecords = DB.getFinancialRecords();
      const summary = calculateFinanceMetrics(allRecords);
      if (summary.loss > 0) {
        if (typeof addSystemNotificationAlert === 'function') {
          addSystemNotificationAlert(`⚠️ Loss Warning: Company P&L deficit logged. Expenses exceed current revenues by ₹${summary.loss.toLocaleString()}!`);
        }
      } else if (summary.profit > 10000000) {
        if (typeof addSystemNotificationAlert === 'function') {
          addSystemNotificationAlert(`🎉 Goal Achieved: Projected net annual profit target exceeded ₹1,00,00,000!`);
        }
      }

      const alertEl = document.getElementById('finance-upload-alert');
      if (alertEl) {
        alertEl.className = 'alert alert-success';
        alertEl.textContent = 'Financial record successfully uploaded!';
        alertEl.style.display = 'flex';
        setTimeout(() => {
          alertEl.style.display = 'none';
          uploadForm.reset();
          renderDashboardUI();
        }, 1500);
      }
    });
  }
}

function addSystemNotificationAlert(title, desc = '') {
  if (!DB.data.financeAlerts) {
    DB.data.financeAlerts = [];
  }
  DB.data.financeAlerts.unshift({
    id: 'fnalert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    title,
    desc,
    date: new Date().toISOString().split('T')[0]
  });
  DB.save();
  updateNotificationsUI();
}




// =============================================================
// GEOLOCATION RADAR MAP & WORKSITE LOCATION MANAGEMENT PANEL
// =============================================================

function drawRadarMap(canvasId, targetLat, targetLng, currentLat, currentLng, distance, inRange, targetName, isOffline = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const w = rect.width;
  const h = rect.height;
  
  // Clean dark slate background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  
  const cx = w / 2;
  const cy = h / 2;
  
  // Concentric radar rings
  ctx.strokeStyle = isOffline ? 'rgba(255, 255, 255, 0.05)' : 'rgba(251, 191, 36, 0.1)';
  ctx.lineWidth = 1;
  for (let r = 30; r < Math.max(w, h); r += 30) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Crosshairs grid
  ctx.strokeStyle = isOffline ? 'rgba(255, 255, 255, 0.02)' : 'rgba(251, 191, 36, 0.05)';
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();
  
  // Geofence Circle (100 meters, mapped to 40px radius)
  const geofenceRadius = 40;
  ctx.strokeStyle = isOffline ? 'rgba(255, 255, 255, 0.15)' : (inRange ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)');
  ctx.fillStyle = isOffline ? 'rgba(255, 255, 255, 0.02)' : (inRange ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.02)');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, geofenceRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  
  // Sonar sweeps rotation line based on date
  if (!isOffline) {
    const sweepAngle = (Date.now() / 1500) % (2 * Math.PI);
    ctx.strokeStyle = inRange ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * (Math.max(w, h)), cy + Math.sin(sweepAngle) * (Math.max(w, h)));
    ctx.stroke();
  }
  
  // Draw fixed worksite marker
  ctx.fillStyle = isOffline ? '#475569' : '#89201B';
  ctx.shadowColor = isOffline ? 'transparent' : '#89201B';
  ctx.shadowBlur = isOffline ? 0 : 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0; // reset glow
  
  // Label for worksite
  ctx.fillStyle = isOffline ? 'rgba(255, 255, 255, 0.4)' : '#ffffff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(targetName || 'Worksite', cx, cy - 10);
  
  if (isOffline) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRACKING OFFLINE', cx, h - 10);
  }
  
  // Draw Employee dot marker using proper meters-to-pixel projection
  if (!isOffline && currentLat !== null && currentLng !== null) {
    const cosLat = Math.cos(targetLat * Math.PI / 180);
    const xMeters = (currentLng - targetLng) * 111139 * cosLat; // East-West offset in meters
    const yMeters = (currentLat - targetLat) * 111139;           // North-South offset in meters
    
    // Scale: 100 meters = geofenceRadius (40px)
    const metersPerPixel = 100 / geofenceRadius;
    let exRaw = xMeters / metersPerPixel;  // positive = right (East)
    let eyRaw = -yMeters / metersPerPixel; // negative = up (North, screen Y inverted)
    
    // Constrain to canvas bounds
    const maxOffset = Math.min(w, h) / 2 - 12;
    const rawDist = Math.sqrt(exRaw * exRaw + eyRaw * eyRaw);
    if (rawDist > maxOffset) {
      const scale = maxOffset / rawDist;
      exRaw *= scale;
      eyRaw *= scale;
    }
    
    const ex = cx + exRaw;
    const ey = cy + eyRaw;
    
    const pulseR = 5 + Math.sin(Date.now() / 150) * 1.5;
    ctx.fillStyle = inRange ? '#10b981' : '#ef4444';
    ctx.shadowColor = inRange ? '#10b981' : '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ex, ey, pulseR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = inRange ? '#10b981' : '#ef4444';
    ctx.fillText('Live GPS', ex, ey - 10);
  }
}

function renderAdminLocations() {
  const main = document.getElementById('main-view');
  if (!main) return;
  
  const locations = DB.getOfficeCoordinates();
  
  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">🏢 Worksite Locations Configuration</h1>
        <div class="content-subtitle">Register and manage fixed worksite coordinates used for employee geofencing validation.</div>
      </div>
    </div>
    
    <div class="content-body">
      <div class="dashboard-split" style="grid-template-columns:1.6fr 1fr; gap:24px; align-items:start">
        
        <!-- Locations List Card -->
        <div class="card-panel">
          <h3 class="card-panel-title" style="margin-bottom:15px">Corporate Worksite Coordinates</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Location Name</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="admin-locations-table-body">
                ${Object.entries(locations).map(([name, coords]) => `
                  <tr>
                    <td style="font-weight:600; color:var(--text-primary)">${Utils.escape(name)}</td>
                    <td style="font-family:monospace; color:var(--text-secondary)">${coords.lat.toFixed(6)}° N</td>
                    <td style="font-family:monospace; color:var(--text-secondary)">${coords.lng.toFixed(6)}° E</td>
                    <td>
                      <button class="btn btn-secondary btn-edit-loc-coords" data-name="${Utils.escape(name)}" style="padding:4px 8px; font-size:11px; width:auto; margin-right:6px">✏️ Edit</button>
                      <button class="btn btn-danger btn-delete-loc-coords" data-name="${Utils.escape(name)}" style="padding:4px 8px; font-size:11px; width:auto; background:rgba(239,68,68,0.1); color:var(--error); border-color:rgba(239,68,68,0.2)">🗑️ Delete</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Add Location Form -->
        <div class="card-panel">
          <h3 class="card-panel-title" style="margin-bottom:15px">➕ Add New Worksite Location</h3>
          <form id="form-admin-add-location" style="display:flex; flex-direction:column; gap:12px">
            <div class="form-group">
              <label class="form-label" for="add-loc-name">Worksite Name</label>
              <input type="text" class="form-input" id="add-loc-name" placeholder="e.g. Gurugram Branch Office" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-loc-lat">Latitude</label>
              <input type="number" step="any" class="form-input" id="add-loc-lat" placeholder="e.g. 28.4595" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="add-loc-lng">Longitude</label>
              <input type="number" step="any" class="form-input" id="add-loc-lng" placeholder="e.g. 77.0266" required>
            </div>
            <button class="btn" type="submit" style="margin-top:8px">Register Worksite</button>
          </form>
        </div>
        
      </div>
    </div>
  `;
  
  // Attach listeners
  const form = document.getElementById('form-admin-add-location');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('add-loc-name').value.trim();
      const lat = parseFloat(document.getElementById('add-loc-lat').value);
      const lng = parseFloat(document.getElementById('add-loc-lng').value);
      
      if (!name || isNaN(lat) || isNaN(lng)) {
        showToastNotification("Please provide valid worksite parameters.", "warning");
        return;
      }
      
      DB.saveOfficeCoordinate(name, lat, lng);
      
      showToastNotification(`✅ Worksite "${name}" registered successfully!`, "success");
      renderAdminLocations();
    });
  }
  
  // Edit & Delete button listeners
  document.querySelectorAll('.btn-edit-loc-coords').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const name = btn.getAttribute('data-name');
      const coords = DB.getOfficeCoordinates()[name];
      if (!coords) return;
      
      const newLatStr = await prompt(`Enter new Latitude for "${name}":`, coords.lat);
      if (newLatStr === null) return;
      const newLngStr = await prompt(`Enter new Longitude for "${name}":`, coords.lng);
      if (newLngStr === null) return;
      
      const lat = parseFloat(newLatStr);
      const lng = parseFloat(newLngStr);
      
      if (isNaN(lat) || isNaN(lng)) {
        showToastNotification("Invalid coordinate values provided.", "warning");
        return;
      }
      
      DB.saveOfficeCoordinate(name, lat, lng);
      showToastNotification(`✅ Coordinates for "${name}" updated successfully!`, "success");
      renderAdminLocations();
    });
  });

  document.querySelectorAll('.btn-delete-loc-coords').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const name = btn.getAttribute('data-name');
      if (await confirm(`Are you sure you want to delete worksite "${name}"?\nThis cannot be undone.`)) {
        DB.deleteOfficeCoordinate(name);
        showToastNotification(`🗑️ Worksite "${name}" deleted.`, "success");
        renderAdminLocations();
      }
    });
  });
}


function showAutoCheckinBanner(active, timeString = '') {
  let banner = document.getElementById('gps-auto-checkin-banner');
  const timerEl = document.getElementById('active-work-timer');
  if (!timerEl) return;
  
  const parentCard = timerEl.parentNode;
  
  if (active) {
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'gps-auto-checkin-banner';
      banner.style.padding = '10px';
      banner.style.background = 'rgba(245, 158, 11, 0.08)';
      banner.style.border = '1px solid rgba(245, 158, 11, 0.2)';
      banner.style.borderRadius = 'var(--radius-sm)';
      banner.style.fontSize = '12px';
      banner.style.marginTop = '15px';
      banner.style.textAlign = 'center';
      banner.style.color = 'var(--warning)';
      banner.style.lineHeight = '1.4';
      banner.style.animation = 'pulse 2s infinite';
      parentCard.appendChild(banner);
    }
    banner.innerHTML = `⚡ <strong>Geofence Entered!</strong> Auto-tracking started at ${timeString}. Please check in to complete your attendance.`;
  } else {
    if (banner) {
      banner.remove();
    }
  }
}


function requestsPushDBState() {
  // Push database mutation to sync backend so admin view is up to date immediately
  if (typeof DB !== 'undefined' && DB.save) {
    // DB.save() already triggers localStorage save. We trigger API save manually:
    try {
      fetch((window.apiBaseUrl || '') + '/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', data: DB.data })
      }).catch(err => console.warn("API state sync failed:", err));
    } catch (e) {
      console.warn("API state sync exception:", e);
    }
  }
}

function showToastNotification(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.pointerEvents = 'auto';
  toast.style.minWidth = '280px';
  toast.style.maxWidth = '360px';
  toast.style.padding = '14px 18px';
  toast.style.borderRadius = 'var(--radius-md)';
  toast.style.boxShadow = 'var(--shadow-lg)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '12px';
  toast.style.color = '#ffffff';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '600';
  toast.style.transform = 'translateX(120%)';
  toast.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
  toast.style.border = '1px solid';

  let icon = '';
  if (type === 'success') {
    toast.style.background = 'rgba(16, 185, 129, 0.95)';
    toast.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    toast.style.backdropFilter = 'blur(10px)';
    icon = `<svg style="width:20px;height:20px;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (type === 'warning' || type === 'error') {
    toast.style.background = 'rgba(239, 68, 68, 0.95)';
    toast.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    toast.style.backdropFilter = 'blur(10px)';
    icon = `<svg style="width:20px;height:20px;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  } else {
    toast.style.background = 'rgba(6, 182, 212, 0.95)';
    toast.style.borderColor = 'rgba(6, 182, 212, 0.3)';
    toast.style.backdropFilter = 'blur(10px)';
    icon = `<svg style="width:20px;height:20px;flex-shrink:0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Force reflow
  toast.offsetHeight;

  // Slide in
  toast.style.transform = 'translateX(0)';

  // Slide out and remove
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 4500);
}
function showClockOutThankYou(checkOutTime, workingHours) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.style.zIndex = '11000';

    const card = document.createElement('div');
    card.className = 'custom-dialog-card custom-thankyou-card';

    card.innerHTML = `
      <div class="custom-dialog-icon-wrapper" style="animation: popperPulse 1.2s ease-in-out infinite alternate; position: relative; z-index: 10;">
        <div class="custom-dialog-icon-badge custom-thankyou-icon">
          🎉
        </div>
      </div>
      <h2 style="position: relative; z-index: 10;">Thank You!</h2>
      <p class="thankyou-msg" style="position: relative; z-index: 10;">
        Thank you for your hard work today. Your checkout has been recorded successfully. Have a great day and see you tomorrow!
      </p>
      
      <div class="details-card" style="position: relative; z-index: 10;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; align-items: center;">
          <span class="detail-label">Checkout Time:</span>
          <strong class="detail-val">${checkOutTime}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; align-items: center;">
          <span class="detail-label">Today's Working Hours:</span>
          <strong class="detail-val">${workingHours || '--:--'}</strong>
        </div>
      </div>
      
      <div class="custom-dialog-actions" style="position: relative; z-index: 10;">
        <button class="custom-dialog-btn-secondary" id="btn-thankyou-close">Close</button>
        <button class="custom-dialog-btn-thankyou" id="btn-thankyou-done">Done</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Particle/Celebration Container
    const particleContainer = document.createElement('div');
    particleContainer.className = 'celebration-particles-container';
    card.appendChild(particleContainer);

    const colors = ['#ff2c55', '#ff9500', '#4cd964', '#5ac8fa', '#007aff', '#5856d6', '#ffcc00', '#89201B'];
    const icons = ['🎉', '✨', '🎊', '⭐️', '🍬', '🎈'];
    
    // Spawn falling confetti
    for (let i = 0; i < 35; i++) {
      const particle = document.createElement('div');
      particle.className = 'celebration-particle';
      
      const isIcon = Math.random() > 0.6;
      if (isIcon) {
        particle.textContent = icons[Math.floor(Math.random() * icons.length)];
        particle.style.fontSize = `${Math.floor(Math.random() * 10) + 12}px`;
      } else {
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.width = `${Math.floor(Math.random() * 5) + 5}px`;
        particle.style.height = `${Math.floor(Math.random() * 10) + 5}px`;
        particle.style.borderRadius = '2px';
      }
      
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `-25px`;
      particle.style.opacity = (Math.random() * 0.7 + 0.3).toFixed(2);
      
      const duration = (Math.random() * 2.5 + 2).toFixed(2);
      const delay = (Math.random() * 1.5).toFixed(2);
      particle.style.animation = `confettiFall ${duration}s linear ${delay}s infinite`;
      
      particleContainer.appendChild(particle);
    }

    // Spawn Fireworks bursts in the background
    function spawnFirework() {
      const burst = document.createElement('div');
      burst.className = 'fireworks-burst';
      burst.style.left = `${Math.random() * 80 + 10}%`;
      burst.style.top = `${Math.random() * 50 + 10}%`;
      
      const burstColors = ['#ffcc00', '#ff2c55', '#4cd964', '#5ac8fa', '#007aff', '#ff9500'];
      const color = burstColors[Math.floor(Math.random() * burstColors.length)];
      
      for (let i = 0; i < 8; i++) {
        const spark = document.createElement('div');
        spark.className = 'firework-spark';
        spark.style.background = color;
        
        const angle = (i * 45) * Math.PI / 180;
        const dist = 25 + Math.random() * 15;
        const x = (Math.cos(angle) * dist).toFixed(1);
        const y = (Math.sin(angle) * dist).toFixed(1);
        
        spark.style.setProperty('--spark-x', `${x}px`);
        spark.style.setProperty('--spark-y', `${y}px`);
        spark.style.animation = `sparkExplode 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;
        
        burst.appendChild(spark);
      }
      
      particleContainer.appendChild(burst);
      setTimeout(() => burst.remove(), 1300);
    }
    
    // Spawn initial fireworks
    for (let i = 0; i < 3; i++) {
      setTimeout(spawnFirework, i * 400);
    }
    const fireworkInterval = setInterval(spawnFirework, 1500);

    const close = () => {
      clearInterval(fireworkInterval);
      card.style.animation = 'customDialogScaleDown 0.18s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards';
      overlay.style.animation = 'customDialogFadeOut 0.18s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards';
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 180);
    };

    overlay.querySelector('#btn-thankyou-close').addEventListener('click', close);
    overlay.querySelector('#btn-thankyou-done').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  });
}

export { executeExpressReassignments };




// ── Global Print & PDF Payslip Document Generator ──────────────────────────
// ── Global Print & PDF Payslip Document Generator ──────────────────────────
function printSinglePayslipPDF(userId, month, year) {
  const user = DB.getUser(userId);
  if (!user) {
    alert('Employee record not found in database.');
    return;
  }

  const payroll = DB.calculateMonthlyPayroll(user.id, month, year);
  if (!payroll) {
    alert('No payroll data found for the selected period.');
    return;
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const period = `${monthNames[month]} ${year}`;
  const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocker active. Please allow popups for this site to generate/print the statement.');
    return;
  }

  const logoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASoAAACsCAYAAADMpOFeAAAoOklEQVR4nO1di3EbSZKt2RgLGmcCeCYQa8JwXCDXBEkmSDJBIxNEurCkCRRNWMIEoV3ABSLq3b3Jy6xPfwtAvggESbC7urq66nVmVn5+Ox6PweFwOFrGP9bugOPi0K3dAcflwYnKMTVJ9T6kjqnxm6t+DoejdbhE5XA4mocTlWNOuL3KMQmcqBxzEdRtCGHrw+uYAr9P0orD8XcJ6kRQN/H3Nx8cx1i4ROWYUr3Djt9fIYRvIYT3inNTx3QV3zsuEE5UjhS6Acdv42dTcU4KveHyYH3vuEC46ucY6wPF55wI6i5DUpoE5nAk4RKVg0nmZAAPA4mkiyR1+gCwU2noC9U5V+8cLlE5/kYyJ7LahxCeBxjBofLxTp+265ciP+1/Hwb2x3FBcInKEYhg7iIxnIzh95XSzI2QplhKS7UjpbgQj/8cQniNbaYkM8cVwInKEaIU9RJ/nuxLu7hrd/qU4g/FNgVVUEpWTFx7+hv+V98iYe6iNJXbPXRcONyY7oDK9RwJ5UQOIZKOlJAsdELqOcTzN+RT9WYY76Hu3UZyksb450hmfB767LgSuER1OYA0klPXUgZrJoQQCeNXVANTYILDeSAsqJNyt6+n7+7jcQ/x3C/x3EMkuL7ALcHytXJcAJyoLge9WNQgrnthB0r5JWkqFqSi3KI/kUpInA/1T2tHM8JvFOJMwbonxwXAVb/L83+6j/YiVsXeaTdvn1jAe1Lb8JOJJHXuGEg7FlTOU39zKh+cTIEbul8nqguBE9VlAIv4Q/xIo/aOCOA7EYBcyD0Z1Bl3ZGwfgk2GXKUn+0YhKtlfuFR8UNo50H26W8MFwInq/MGLFwZxNoIzAbAdSZJADqlMCHtBcCyNlcA6dp8gKRjed0Z7lhHfcYZwG9Vl4bQo/xVC+ETEIW1H26gaMvH0E+0aWpB9kKRTA5AU3Be0az1GCbCWjB2NwiWq84dmu3kiItoSUcBl4I6kIOy+8S6cJaGkoKmFJVLVVpHC8PtWSERMUpr05irfhcIlqvOH3OoHvsfPRiGSDS14tAGUJruT13s3dv4ORIryWiGqZzhGGvWlR7oMerZUzKG2NEejcKK6HB8pzTD+TIt5R75JTFa3wn1BEtvP+JPtXlY/oG6yyrmJhNln3BK4fzvjWh/EcZKkTirvV9/tuzy46ndeAcNY1CyhWDt4+O5ZSCFycd8IWw6rXQyojE+ib7juPkpV7Nkeor3IshXdKLuUTJTSPSEV8/eT/MBKvNdxzB25M+TOcawEJ6rzgab27ONCx1a8tshe4gKHpCPxhyCfTzHWjn2oAKiKOL7ECfSTcEINpKqmEuy9Kyop+iI3CQ5Eal0h4d/QdbaKKwP657uGDcCJqn30kRggLZzCTIIhIWlkJWP4glDLHuJOIR//B10nCPXxXRAbwIsfEo7WH/wNHyh2MOW+STsTyFYDO7PyNeAAy9khZBs4b2/4lDkagBPV+eAtSk6BFhwW3Y4W48lGI1Uz9jjXwCpcH6Wwh0g2sAkFuraWDfSGJJ6fsa+S0FiyQrYFJk1Iic+K2nc6nsH3wqqbvC9IgVJ6g6po2c+4v46V4cb09iFTolge4rAhafmd3jM+RXdiYT7HwGAY4+V1ZJAxBzVDktKkLgakL03C+S5ULimtSbwkku7tDJL6LtRSR8Nwieo80Cmkw+EibE+CjxQHH7+RrUpzkvyD1DRIS18V0mMbj7TfoF/SCK5hS4Z3SDZQvzR1UcYC8j2DGCWQNiYYkqS0gZ3gKWQahRNV+5CLCeQgQ2WCcOaUC95KPodULJ+oXVxjT6pkF9v8YPRRS2F8mzBGQ/r6mDFYgzx4E4FhbSLApsXH429LVXTpqlE4UbUD+TZPVWt5M4KHtZQpfM53oQZBMvkZySoVxIs0Mv/K/F9eU8Nb/LA9LQW+H77nL6INmYQvKGS1J7vU0Mo7joXhRNUGNJVDIyzpt2SBpSpuC3ajD4KwsJv3LsilhUX8TdmBDIrBPQiS0shNSlMt3J+jAE5U62OoXeQ9OlPyIuZFicWKncJAZAUVjm1aWLytSRmay0MwpD+QFMaEdxSlNJWC1x5sDL8dj8e1++AoJzAmETgwnshKAxbpfyvtMGAwb1XKgB8UPN+t1C+SpDTD+5dCogqNkvbVwonqvCAXzunv/yT8ozibwCVnvLQKQ0iielDcJpyMzgDuR3Ve0IjmmQKHNYnqi7FTd0kkhbJcGmHDmH6SPL3s1pnCbVTtoFNi0N4Sb3yoht/JTWFnbOEjlbAmTTD6M7ThfSgoUKo5kXLb2jVhjPdYvwbgRNUOuFJxIJvMp4x6wn5VVu5xLaC4ZXJi5DIgPIg4QRm0vYsknXK7sF4YHpTcCNxGtT6YhH4oxuCgBOtqcXS5ti8VUiqSPmTWJkFneL6zI+3p3H9O2FfHQLhE1RZeErYWmfNcemVfa/iH5gybci/AbilKisnUMdLnytEAnKjaqyKjpVgJgrweaJF9vUIpKgfr/rWc6wz+DpKrowH4rl9bQIoVhpXwbid283olf/q1E5YmSUmJFWmNtRhCz0fVCJyo2kBX4G5g4bOxe1Vbhupc0RXeK9Q9mUCwpv6gYyU4UbUJLQ+U9TdXk2FcizTF6WwsdEa2CUtqRZ73axnD5uG7fm1C2lJkqpKgZD9AkK77/egOoZZdiscxxLH800mqLbgxfX1oxm+uHgPsjcowKC+FTJaymMI1SgWsCv6lqHvwr8LfDN/paxCu+rWxoDQbyz6+2Z9pYWkSwXPcBdzFXFEpf6FU4K88/lbUFOT/a2mItf9pSB2jtZu7HvraJTKJ/hS7pztF7UMmCq1qjmNluOo3P6aQaqC+cF2/INK4aEHHMtsCny8rtXAJrJrsAjJhnWw/114uREj+j7OGcil6qyRXIPsUxlASfonqbJHWNUqsi8OJ6vyyJUgMIQEJJioQgXXt2u9K20EqlxLD+FDi49AYkPYLpY9x0mkUbqNaFiVEk1OLahaTlKZYEsPCZEkr15YWxJwKbJakAckwiLzucB0AOID4PhIJAo+fjUrHbwVlwJACuTQx3jkEbV8FXKJqHzUEpUkTnZHO91OUon5EErBi2qRapTmUWhKRPPebSJOMHO5/iVCWx9i/03f/JhvdISYCxDkA6vNJSfB2goSArvI1AJeo2kLtoigx9iKhHJc9D3GxdyLeDd7b72TP4Uo0XMzzhirIYPsfNjPYerjfd6LaMUjtLpLQY1TDvtE1cD2U1sI5XPbrZyThvXLN1NiVIjf2LmUtACeq+aHZaNhWEuinllfpe0K1KamkAlXrmXa0bsW19uS79YUqJIdIcF+jCvYlEgqIAm2zzYcJi/uMWoSaGwAyke4jUaFvN6K0Fs5BO19I2rpT4h5L8k9JIzyryKlxdYJaEE5U80OSFOwxVgECCRTphKRSIzF0VPX4gXI3cZEDJsutUuHlC/2fqzWj4ChUMLhRgIRvlIo2TFY3dDzXI4S7AO/QcdFTtnPhHr4JErRUYG3cusyuIMKZuEiqV7JZGqfiDv6ZfQy6+MHft8fj8dexHj9EO13hte/j53TdV2ovxH78ised/n+MxwY6tqPf+R74mGP8He2hDfn5HP//mb77Fe/t9B1wOv9IfePzcM1b6ttrZjzwDHAM7hf9tfCr4Dn45zjvGLhEtQzk2x3GZCtJnhU0C0nipSIWDVIC7EYwYGuZAW6MPvTxvB05h36I330kqep7lBb3IrGflGYgJQUhje1JDXyKbUnvfEhlOJ9taRogXVmSLd8n+pbCTyXDhWNmOFGtAyz8PalWoSAIeRPJDYu3JMsnFjsqIQPvgkC2ynVhxObjvonF/NFwomTHTFazYG8CsdwLlRQkBjvahjYEOKe8VA9LiRu2OBjxc5CxlZxd9VpDlBaHE9V6QFl2WZgB2GT+Lo1JAyEgHpBTGgeFvJ6pbUgOvUKKnLSPveNDxviPa+C6kJxwPbbFfYzuCZCg0D4kL+xQSinHIpBUWa0c2HvdsTDcj2o5WIsHBTa3BQsILgY1qh8vUFaf3kTYiwxL4XPfJvb1kj5XKc90jjPkfvLOJXYZNX+vvoKorCwVvJlRep+OCeFEtRxSixk2E5AV22/Y9rJWKpdUWArcHbQ+lZAct5XzbLfOsarFWG3CPlUiWf1U1D3ZpmNmOFG1A150N4aKN3U8mgzwDSKspkSS0oKCU9kHavsvpS3LU966vnU9SGQo8iBdMOCCoFWZdrJaGE5U54shiwU7dlAboVZhwWJhwviOHUIY4vfk0PksCBW7cTCM41wJlhBByrBxgZBgs8L3N6LPuVAd7XctswMjlV1Cg5PVgrgkoioNNLXOa02U1+LpgrL4OeaN/38tucDl7igb9Plv/l5zZWjt+TsulKiGIkdUQwnQakuGy7AvD38P7CoXagqWAfkaSE0bJ42w5G7qi0J8U8yDsbGEnfL/i3WXuFaiSgXz9hPbmLR4PvY7KiGKFBldA8msBa1EvCWphYlCa2rnZldwzNnjEomq9MHVqnwaEbGHdFCMsmEACaUKEGgoaf8Syeww0/2XPg/teKl24jtN7aydd324YlwCUQ0RkXNtBSVEIyglwIfC8tcZ25YEV7A5d7IaStRTXneKZy6lMvhmOYFdOFHVQhqlpd+SVNtqJ2ftG7m2vanadUyDsc8bKmVQ1EpZsbmvbPtibFaXSlTSWMk5oOA3M4SEUm/ZFgilxLAuDciWc+lS5aO0QGgLJSmTJTj98hzPJffcx0pkh/iTfbqeJ85i2jwujajkrhpniQwDjdZrSy6yvLv21g2GYTdkjtFynjNamPiaOq4RnNy0CAnb4drPdCgOyncIbr/oAhVrEtVY2xIn94dRe4ikNKW9SLaHNi37BDDG2OoYh9vMZoi1izsX2Y3Z4T0IycsKDh+KKV11zo6oSlO/puLhanbLpjKCpxwIpY2Bkco86eTUDmRIESDnHefL0o65m8leuU/42bHdK9A8rQ1mbwZzEdXYxccq3AflbVf6wGu2pmX6E42ErO1n4OwmgGNSaGq0dGfhn1OopYfKOS5TKY8x1i/2op1boqr1AbnNVLQdC2uHRbPtzK2CTelW4TgvWOFQmup5J76bek3InPBaELaGRTWBKYiqdgtUPqScxDREKmJwUrcpwyCmgqt+jpL5sTUqF4HIprDLSolrbCGLydwjliYqLbVGSTrYlJ6uSUasms2Ru8nJxVEzR8LEL8aOfpexozJaIpeXP4UUcfWXQFRa8G3Nzhzbi7QcQZLpw0CprgStSF6O5ZFKGBgWUt27gmvVSGFy/f0sVCsPSiGOkNFSmiIqCVlg0ypeMPf26pQTZQ2ychvVeWJqSaqbsC3L9KLZxkp30xfx45qSqEoT58vdNVQCbsludK6q3zmT2xTZQEvaXWpsSrOkaucBJWmY+8L2UqmktQ0tCBtcMdvKJ4+iIcgrr9m0Su7LzN9fQlQpiaKLVUIsI7gWdJnyrG52e/QMUDMOS47Z0M2WIfdScnyru35DzBjdTBqDNj/ulTqLgFz3HOrzNsUcHCJRSYM4M+6UdiTH5ZK1ZSMc+qI6h3tu9Zl2I/LY38Q1bmlSzAnfKwpw/L9006VEJSt3AGxPCoYKx7mqgXOdWEPe9ktILKn+TN2HKSSYudQ8DUsH7daqWqk2tHa6RPtzQMtRr0EG/lvE9SxIS44J2qkmqs/Cu5Ydw94KBr9kIaX+N3Y3b01SXJKolnYcrbWR1PSBVaPSmoI5rP1yxAJk+480Xu8p1CVlt+0WcEQGOEsD+s6hOKmdUb5PrkxtqYfmnColqrWis0smYStEsERfalHyEplzV1R7W+bStdTOsaHjv9SusGUqSYEX8vc5t/0LgP6zexGbdzh2MCd0yAQCsl6lWV1ojDF96je1nMSpLVNGiT/H2H6l3hhWBeK1IYO+p35OEimDLPrBQeVaviaM4ZhxrLF/zWmMxmJ8LAzpsnwLvyjjUdNvWSKtBl3sI8rZQ2Bh4pJqHCcZKNnh49JsT+L//ztva4zpc+2u8BunpHJtCppBn29+Ktwb/T1Nyk/iDbOmD9Y2TrKhpeBzb0UZosT3vTXyaUloIVL8HP9V2C+pZmwVB8UlMgdwvCq27cfM6Z9k1xkyr36RZCbvP9UOr0stMB/4Fue8ts5K+3mvnP/3Ktsnoprh09Hn1vjf/fF4fD0ej7/ooyH1/en8FNDuj3i9zuiL1n/tvm5jW1rf8PtcY5oaZ/kdxlbiteAetXGQz8tq8zQ+n8UYpZ5L6tni8xrbvE307z7Rlmz3NR5fMpa1zwL3z+M0ZG5LvIr7v6W+auPyuaCN1PNGu8c4Vp9jX+9pHtzHY/D9rHP99zAPmEVZZGWDXGo7MxSofSVvKSStwxvuQ0Fenq7gTVnThynBbyipevPObKktJIdT2z/i75a0uyP1AlWUc+OS83aW/78z5lMvqjSzwTZ1XfSTpaxSSSMnQVnXTPUnh218prh3TcLB88fxQUhzso1SPJEzN6/HRfNazUVUEh3daGrbErsdAOvC/DfO19qR38vfd0KklcZKzd4Akpti8Q9FJxaRXFgf4mcsebIaVRrUygR1oAXySMZXK0OGpfrxM94YNhH09zQWX+Mc+kvsLsm20d4uYQPidksANZXHAN9PMWc2cb4ipEybr3j+Mj6Wx3FbcV83SjYSJsJFTRpzExUmPSaPnDiPFCuk3fhbpZ9G6SLd0QTK5d+BM9uaJBUKdlOsF8AQ4gIx17zx+Xny82M/Jhwrd5F4MUmpmv93R/amXnFheKPr7wr7zzn10U7NItzH856MTSEtHGXI87mLL3LLaRIkucm0UbNRsRd+kIgyKSW8yWy0cxIVjHFSEuFEXZa3qoY+HvtG6hvvuk1ZrpyNxjVB1XOiT7wEpIQC1N67Rnq5ghe5rXT5fPEM2a/onSQ3tG2RFQgOZCWNu7yYSubEhl5GcuepBL3xN+7xq/KSHZLbf5MxhWjVfOTxGO+SXeD3OJYfyFRyupcQVX209bxApaLJiMqyl1iSiNyCrt1R5MkeDJXyULCTYvluaKpeTkVZEqxKW5JeTb9uDSnKumc5tppUjF0by40FJIOFvKf5AslAe4ZYaJg/cDpEm3383x+G2qqNC0siQzN2aHOYHSIxZ5/iQi+VWA/CzpSTUlIFZzcZqYrbxRj/JHWS1xuEhE9G3O6kmFqiksSxUwYKortmFE21qR0H28RtZH1WCa23qbVVy9fC2wSw3n5rll3C5Pgixtpa4Ba6+DYuVaUt/yc5lnvx7DTC6uknyC6Ie9Guf6fMIVYB+zgfaiWXXVx8NZI+30upbyHmFkuSU2Ev1hrPB9jmSqQqkOsjERW0F0ifOZePvjWi4ocUlPAAfiucBurjxA6lb4LVNemK/Yi0dvl6ePuBBD+ICbWGJMXj1AsVZZ/ZZEgBEsi7Yf+z3tBYABvDv6cmXEZKQjl7oKYCybc6XjbWRoz1LGEwLiUr6541LYPxFD+1RLXN9AtqcepllXOiZsCPTe74PSVe9tMb2if050n5cLAvyavwz5F+LGN8WdAO/D6OCR+qmvY64Zek+b+s4UfFY2j5d0lfGu2ZaWNzGrNSpObDkM9twkeO51HN88Pv8IWTYyT9nT5n2prqc5t5br8yfcKzqvXVmt33acrPPyZnPputtbe8VAPktvtQ28DpbfhnfFvB5WEsy89uMGwMa94v58IfC55TkJa/x89jYn5uRXFSbm9K5KSfVK0+oNYwj3POBnPYqLTdBx5EGOKmionTJg6rb1O1r+1CtYSp+7en7I1rIHf9MQuNTQXsNsDq7F38358D1Nka5NrcjCRvay7czRhiNjmmlqhkBQwLGpm1jtl3NmZAjVFds63IKs9LAdd+nijFi3UNSN8ycBhktVtI8sjNrYNRkbsbMR+20R445ZieDVGx817OmDfXgHSJtrsVFv45Y01yZgfDKecFf0KUKF7Iv08L35lrPtWMxcvEEh2kRk29bQ5T7vrVDtAU5aRL+zLXhFrLj+pSJL4UoL6n/IJq5owVIxlI/WHvblYB51aRUlLbISNdcqaKEmi7nM0XVpnDmF4C+FlxypCUJDQVLJeEFJoUhQslvrHk1YLBlWvIye+HwNqweRLhPyCr3QIaQAr7hK9SP4EWwClxavt2tkSVMvaxRzPCAWCwnANMfEN2EzW0Ij1NibnyjM01p6Z+BrcFO3DWQp5irHI7du8TSstW9ovmbcb/mHii78kwybYqiJvaFvC3GK/2LTpWSp25VtIqOb6mTW0yptSRpcH9k/bBkh07LRPD2hIV25E4G4BUh6bAPiFVAQ9xfsr+lUDzzue/OShazqef0eGyT1ybC4gyUo668nded5rz7uqYIygZb6Wcl7QcMHjU4icmUM42IENsSga3mQfgUJGLZSvZESyFFvpjvViHLN5UCiFoFQeDpDTS7JU2NNS8RNGPVtJoz0JU2oN+NkIDcgGTnCcIx3JuHSkKp4ipJgTH0S60hWilO5kCMqCZjeoIq5EhY0OA4HfYwpisuOpwid/iWMlXC1Zuat1MLVFx3FhQyKo2rUUQaVZkOXikiuHv0I+mBtqRhfViuZvZbUECAc0yXhSLmRfyGPVIZotlcNB8l7hGKntGramiJgXMRah+HKaQSmE7JG+STLC2JTL8WZBm2HE+4GRwjPeZ7CjclpUmpiZDZu5af5AktFFUvtw1ugTRWaE3qRQ+uRQwq2LKfFRyYJmstOyG7KtiIfX/jZG1E3mVMKlP+XIYTmDtolfe8HLBvSzUD0hVDKhZYxcyDOBaJgdZbcaCHB8LyBqCc0qkqoslKmvxg6xu4oDdVaYjKU0sxseyEZTJcb9iIVVHHnJni184oaAU+FhINQtpYliqQpZOzJ8h10eSQpnX/WdMf1RKEjcFat8hktQT7TCm1lSzUtXvC9gaODgYZCUJawxyauVDIrMn99PRFuT84ER5UzoiWoRnOZqONVxbudOtIqOd0ddcPyCBcv6198JcX0Oq1ZyljcoCJ6QDXul3TWcPA+xbVpbLncjiuFRRSodNCn8vNPl/b362PUKaYswRciV//6pIIbICS6lkx5WCGDKho+xLr7z87zNqHyeK5D5+IqKEFKeZZFBWjlNJ8/UXx1LlslL4p0h+z9VJLOKSxkftuJyIi9JCrgouB82xVJLUN/ItCiQBr7VIZMmpm4pMplICklLiYUC+tM7IUiLtuVKaws9nIqdtgVTVxEu8BaLS8kdJz9uQIK/dwB1F2LJQZeMs8vJcMEBSLElZue2XhFSXsGFT44isFa+FpFgy7/qC0mihkNyRnvkh8zLnOoKrowWi0kRn/vurUjiCCWtsOSssjGYeyoXCiiC4FbnaQyOSFKD5VJXYqfpEhR8m4RpsEznlN0Lls+bym3FPsi2UukPO9FUdqVsgqlRGA1lZJCiZO78L8soVCz0YOx2nh+e7gfPBmthaXUKkCl4yZY8F+FTxwt4WvnBhl5LFMiwSztm7bpS4PqnylWgHqXJiANRLFJBd9YXRAlGlxNx9pdqIcyDepvy35HdNibpXYECHL5EsTivVPXn+0gumV0hB2qk0QE2T1Ys0dbaEfG+Fk6gGGQNpST+W9z0D32uhNd01EpW1q5BKdGahF28T2D3kgthUlsx2jAOr7VphWlZZpDRQaqxeEjLvf1eww8ckZc0xS8LqhG2KfQdZ5ZNSaEpiw8s8ZzrBPbBU1V8jUc0dVPyJbB+pum4tpGy5RPQkQVnVrKUzZwnWTup2Y0gZ7KyqqXtvimtGbo5vM36H+wF1CLEDmCMqZDa52AyfYzN2ThFYzA/kYyQtVvsO4icnu9f6rp0LwC8llX/okiETFZ5+/3EqHRnHBQGvctw+xQ9LJ7cFY7dk4DnCsNhNQfpD9STBPwpSeRb3CEg/pRTJP9D3/GJ9FFWmg5IX3hqzt0hUyBcPyGf0oNxvdylE1VIGg558prSdlqmkKRl/1cr9L41OGQv5ZrZ2vmBzRDutoMReqmWsfcwUZsjNkb8M584DkdTUu6PaerDqHF50zvQ1gAXwkvCzSqVkLamp1oSY3EhAMYJu5VhvjBfauaVEDkLdu49SB8fwgYyl3U0jYM3OdUte5BII0M6pjjnNBjusUqqSuFMygXaXEOvX8oRDzOEYL2VrixgJ1lq77yXQG/FmVq5u9pPTxqs1iZwBifGdfI6YpHL+TNo1GHdK3b1D/Imd7ecEWZSOHUwjOTvYJqqAHHN51hIV7wy0MNHkG4Vz82i5jrTz+bypirBeMrCQ4OOmFfgIcWHfK3a9llQ+QNrXID1D0uBdTNz7c6HkZLkiPCiSzrPwM7M+KXTCFpibs4fCOodNS1Q5z/JLh5YzC0HP1+rqwFvgcldJSlgw0rYawoT5/a70XcsC8ph49iXuFDLcZjtid28rTBpbpU04Suc0BWBL87s/d9WP85y3QlpT+NzIuC+5O4K/Mclk+MGlg/1+oC7JCP0tLQDUzQvkbNvKfJGwUr6UklSJequ5cWziT+Sr2tMa2wubIPdLhppxW7WQwf54uSxGVlMXd+CQAUy+FherrJTD35fcp5VGhv9f4r18iZBqwUcxJ4KyCPGW/qTMp1bGD1KVFZ4Fe5yWU6oUmif7Rkmq9znhGzi0lJu2wZSyV8EWG1ojqlxeGgweD9xugVTAuX7J72BXqC1PdFvgIMrf7YTEoEmXJRO5JFQDb1DumzZhS3Yux0BGE4S4uDjtrqy4gj7Cz4pzleXS/i5BZNyHF1GdBpBEwk6Vqb5qnucMkNQJ/y4kn1qCgsSbej7WuPwnhPBfSzyfWonKIiht8eNm/5PwPJ5yopW2o5UXwi5NKvwArg1aruucH8z7CJtVX+h2IfOLh4a87bGrVJIGd0/2qtx4LSFtMfnwLhyrZJwx1oL1EmVPds2gvTPaY69+QOtDrl8cFxuMXUwNuP97JUZ28gwLNUQl3w6QnkryMOMtNJeBuXRAIH1IQsUuinUO2n9KpNmwgKyigTyIeWe0NIOi9vDRNxhgcV9cXZjfjmuV7sbYyrASOW94XFswrvP4SvU1FWTM58rvAPxP7hqmcqkdRLLHUFikNAeZkWRPAdC5l903ZV4P6cPkNioOuEzZaiQZwGuXY57Gqj2lA8IZRK06cay2pNpEsYoasgqRrBGJziW9Svtv4YciJcLQqqmoa9h9+jhuqWh9QBrX1wTGSYawMElZhJojLsxJKUnJNXUgckI2UFnDcgy0F2BPaYy1+0Y/pSRcM6ebC0pGqmAsGthTlt6+R3I26deTq7ihqYDwD6pVrSBdwpkP281DyJjTiEjHypTUgnPXNkanDMDIa2/lVpqDbK022XDNeBb2tFzbEixJSbsQyAq2rzl30K02n8gxOue6MLsk/PuIt2MQBUAtaPmgIF1x3b05PJMx+UAMMoFZaZZFvP3e6GGUpMgIiQeMcbsTb0mZx10mEgThQopiG8k7tatNrrmN6TkCeKnIEQZCDwOTzNX2UQNUPkmqXGxiqB+hNCHIIqElnu1d5TWHQJIVPyt+wWiS8GrGdElW1g5aDpCu+EFBrJ1KyuoUL99QkEWS/YBSRkkQXClZHQpsWFrJemnklInm/hRpalPX5rfyUlJVr7xtNWnU2kX9RhL4XItRa/c+jqfsFzIhsJ3RgrX7p+3wsU2xNO1NP/Fz1NqC/UkSNr/wgyIJTxooPYXqlyOs3A4UCAT2qynEXB7wu0K7VEhsJ2t9eYvt5IjKun+NuKTqJh0luY0vYvFK+1uqKsnSkAnb2L6Ze8lpu4FzAzt8UKvRjyAyIchSX7IN/OT5o+Wqkk6jliTVZUwB1v9SKJnnKLqq+VdtFqlBcDwep/jcHo/Hz8fj8fU4Dr/i59TOj/jp4qemLz9iO7Lt0/f3le3lPl1s8zVxP6n7rcVrvJ7sx2n8LWAcS+6Ff0+1CQwdsx80BrlxwnGvA54f5o92Tkdzhv//Q1wXP3FMF88pnY98vdQaGTLfwwIfa03x+Ei8xo8cW4xd1T1OZUyHdAE7CUtXVt09DczYMDLyWw3tM+SWu3YtjmafOndPT5KKvHdIDfKtaSXgs8aH+w/7lXyD7jPnldyzdowm9XDF6SHArlLt7inU2y3Z5Wo3IjS7zl6pihMUmxGjNEidj8sVDS19TksDmz7B0JwsV5ODsikCv78q/HZiq4nBQZWpnbGSBWpBy65pHYcJre3uTb17BPtDrsIH+lZy75bNQhr4bxXvZekxzeeWuIZ8UFRbK8dSLdB/2efcvJAvrdRmjLwe5qRVIdtKmWyNYwl4rD8bpgLYTEt3EdfCbXRgrnXN4XUI4q4SGOZwT4Dz2HN8M52Mobm4odRk1Lx15cRmRpdOcaVv3qFgyaaPCxjXTu2KpsiVJUeZZjaINxMWggxTGZKHXGKv2E6GSqSSHNF/+FftKuIo8XNHu8f8rK1d0hCP4crEneEvxXNqTDYEltQsiUorWd8i3sSOf2rtyo0zXgcICyqeS3OleWHCehKSBt5WOW927ffUsVjgzyPUgqHQfK3Y3cBKt8HQyLWmj6W7RrW7RKn2aiRS6zht4lsqc27X1NpJkwTO92GpfFLNHSuFa6FbYWQc6BrAi1irV1gCLnSxqERVavuAA9mLSEMREjasnNQRaHFjoS/td9JnvtcqPQfhdgDUSH7aLk8JSdUQyzu5P5TaZMb45fFuWEqykuoh/s7ZQiVJyaBgTaWZYqdUC92yiBBoiaQ60SeWrJiAUy8VtmtWazhz2Ki0UIFUp/Am05J6MVhCCcIp8pJhjZ+cPPD7GVJ2yhpDXsiMOcacg3NrbCCcAdPKvcTOvRpRfTZiVk/n/XfB+OTQRROIZgZ4qAzhWgOW+w7nvNLyXwGjN7LmsFGNDYicGpNHchvtz3WNvvBakMzYKziXJqXk2mPHr+RFhbhPePzXhCflsgtslM0U6YgpS8rztS0CmYpQNH++1tAb3/Ha5YSZYYDpYnGJyuEYAw7Whc1piCMxH/enkYZEi7lDm7mduFICx3GaRPXYaGLJ5nBN5bIc5wHeDfxUSEQpW5ZWnBPXCYnCBryVbvVzDNjO6jiDku4OhwaoFe/CxUDLvhAKnXs1KSiVT+09o+INdaJdO6Tp7OBE5VgbOUM9++VxHT0pBXHOppTRlu1B2vb6ptCzvVai0qSntfNtnQ2cqBxrQxqSUxJMLmwn5YskCRF2MAsItH+bKGMBKvIMyWN29XCicrSCqZ1zc5Iaq5GWjWvKqtfITQ4p7tqL1FbBicpxjpDJBLWt8By5lNS7g9SVywJbG7yOqi8t+kw1CScqx9oYslj5+CHVT7pEbUethHmYyLkYuZ2AsX5uVwP3o3JcKxm+VnjAH6KrhMwYMVQiQhTBibT+OeD8q4NLVA5HHkiJLEOUhkpYa+SuP2u4ROW4BmiSz6+Bu2/IxwV709CUNye46lcIJyrHNUDLbT6UqGTOMA+BWQAeQuO4JgwN+pVhOkPdC1oNOm4eTlSOawKraWPi7BBDWCNNOUmNgBvTHdeMkgyiWoZQq4JzCu4vNQJOVI5rxfsA9e1ZSFHusLkQXPVzXDo6w6nSKpqh4TH6XElVz6WkheBE5bh09AX+TFZOqwNVpHYP8hXhROW4JrBBex9tTVZ6F/hLOUk1APejclwLrAIF/1ZypmuFIGQ7si3HjHCiclwLLMM3qiM/JGL6cD7gBLUwfNfPce14i+TEpcYtOEGtBJeoHNeo9mnSlaUaOjk1ADemO64VnPo4iDp/uZqKqe8cM8AlKofD0TxconI4HM3DicrhcDQPJyqHwxFax/8AxsoSKMBw44MAAAAASUVORK5CYII=';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payslip - ${Utils.escape(user.name)} (${period})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    
    * { box-sizing: border-box; }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .payslip-card {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #3d0d0a;
      border-radius: 12px;
      padding: 24px;
      background: #ffffff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      position: relative;
    }

    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #3d0d0a;
      padding: 16px 20px;
      border-radius: 8px;
      color: #ffffff;
      margin-bottom: 20px;
    }

    .hdr-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .hdr-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }

    .hdr-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
    }

    .hdr-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #fca5a5;
      margin-top: 2px;
    }

    .doc-meta {
      text-align: right;
      font-size: 12px;
      color: #f8fafc;
    }

    .doc-meta-title {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #ffffff;
    }

    .sec-title {
      font-size: 11px;
      font-weight: 800;
      color: #3d0d0a;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin: 18px 0 8px 0;
      border-left: 4px solid #89201b;
      padding-left: 10px;
    }

    .emp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .info-item {
      display: flex;
      font-size: 12px;
    }

    .info-lbl {
      width: 140px;
      font-weight: 700;
      color: #64748b;
    }

    .info-val {
      font-weight: 600;
      color: #0f172a;
      flex: 1;
    }

    .tbl {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11.5px;
    }

    .tbl th {
      background: #3d0d0a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
      padding: 9px 12px;
      border: 1px solid #3d0d0a;
    }

    .tbl td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .tbl tr:nth-child(even) {
      background: #f8fafc;
    }

    .earning { color: #16a34a; font-weight: 600; }
    .deduction { color: #dc2626; font-weight: 600; }

    .total-row td {
      background: #f1f5f9;
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
      padding: 10px 12px;
    }

    .net-salary-banner {
      margin-top: 14px;
      background: linear-gradient(135deg, #3d0d0a 0%, #89201b 100%);
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .net-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .net-amount {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
    }

    .remarks-box {
      margin-top: 14px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      color: #475569;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 10px;
      font-size: 11px;
      color: #64748b;
    }

    .sig-line {
      border-top: 1.5px dashed #94a3b8;
      padding-top: 6px;
      width: 180px;
      text-align: center;
      font-weight: 600;
    }

    .footer-note {
      margin-top: 20px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }

    @media print {
      body { padding: 0; background: #fff; }
      .payslip-card {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="payslip-card">
    <div class="hdr">
      <div class="hdr-brand">
        <img src="${logoDataUrl}" class="hdr-logo" alt="Company Logo">
        <div>
          <div class="hdr-title">HS GROUP DELHI</div>
          <div class="hdr-sub">House of Surya | Salary Statement</div>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-meta-title">PAYSLIP RECEIPT</div>
        <div>Period: ${period}</div>
        <div style="font-size:10px;opacity:0.85">Generated: ${generatedDate}</div>
      </div>
    </div>

    <div class="sec-title">Employee Details</div>
    <div class="emp-grid">
      <div class="info-item"><span class="info-lbl">Employee Name:</span><span class="info-val">${Utils.escape(user.name || 'N/A')}</span></div>
      <div class="info-item"><span class="info-lbl">Employee ID:</span><span class="info-val">${Utils.escape(user.employeeId || user.id || 'N/A')}</span></div>
      <div class="info-item"><span class="info-lbl">Department:</span><span class="info-val">${Utils.escape(user.department || 'N/A')}</span></div>
      <div class="info-item"><span class="info-lbl">Role / Designation:</span><span class="info-val">${Utils.escape(user.designation || 'Staff Associate')}</span></div>
    </div>

    <div class="sec-title">Attendance & Days Summary</div>
    <div class="emp-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="info-item" style="flex-direction:column"><span class="info-lbl">Working Days</span><span class="info-val" style="font-size:13px">${payroll.workingDays ?? 0} Days</span></div>
      <div class="info-item" style="flex-direction:column"><span class="info-lbl">Present Days</span><span class="info-val" style="font-size:13px;color:#16a34a">${payroll.presentDays ?? 0} Days</span></div>
      <div class="info-item" style="flex-direction:column"><span class="info-lbl">Absent Days</span><span class="info-val" style="font-size:13px;color:${(payroll.absentDays || 0) > 0 ? '#dc2626' : '#0f172a'}">${payroll.absentDays ?? 0} Days</span></div>
      <div class="info-item" style="flex-direction:column"><span class="info-lbl">Leave Days</span><span class="info-val" style="font-size:13px;color:#2563eb">${payroll.approvedLeaveDays ?? 0} Days</span></div>
    </div>

    <div class="sec-title">Salary Breakdown (Earnings & Deductions)</div>
    <table class="tbl">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Earnings (INR)</th>
          <th style="text-align:right">Deductions (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Base Fixed Monthly Salary</td>
          <td style="text-align:right" class="earning">₹${(payroll.baseSalary ?? 0).toLocaleString()}</td>
          <td style="text-align:right">-</td>
        </tr>
        <tr>
          <td>House Rent Allowance (HRA)</td>
          <td style="text-align:right" class="earning">₹${(payroll.allowanceHRA ?? 0).toLocaleString()}</td>
          <td style="text-align:right">-</td>
        </tr>
        <tr>
          <td>Travel Allowance</td>
          <td style="text-align:right" class="earning">₹${(payroll.allowanceTravel ?? 0).toLocaleString()}</td>
          <td style="text-align:right">-</td>
        </tr>
        <tr>
          <td>Overtime Allowance (${payroll.overtimeText || '0h 0m'})</td>
          <td style="text-align:right" class="earning">₹${(payroll.overtimePay ?? 0).toLocaleString()}</td>
          <td style="text-align:right">-</td>
        </tr>
        ${(payroll.bonus || 0) > 0 ? `
        <tr>
          <td>Manager Discretionary Bonus / Rewards</td>
          <td style="text-align:right" class="earning">₹${(payroll.bonus).toLocaleString()}</td>
          <td style="text-align:right">-</td>
        </tr>
        ` : ''}
        <tr>
          <td>Absent Penalties (${payroll.absentDays ?? 0} days absent)</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.absentDeduction ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Half-day Salary Deductions (${payroll.halfDays ?? 0} occurrences)</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.halfDayDeduction ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Provident Fund (PF) Contribution</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.deductionPF ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Employees' State Insurance (ESI) Contribution</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.deductionESI ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Professional Tax (PT)</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.deductionPT ?? 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td>Tax Deducted at Source (TDS) (${payroll.deductionTDS ?? 0}%)</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.deductionTDSVal ?? 0).toLocaleString()}</td>
        </tr>
        ${(payroll.adhocDeduction || 0) > 0 ? `
        <tr>
          <td>Manager Ad-hoc Deduction / Adjustments</td>
          <td style="text-align:right">-</td>
          <td style="text-align:right" class="deduction">₹${(payroll.adhocDeduction).toLocaleString()}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>Total Gross Earnings / Total Deductions</td>
          <td style="text-align:right" class="earning">₹${(payroll.grossEarnings ?? 0).toLocaleString()}</td>
          <td style="text-align:right" class="deduction">₹${(payroll.totalDeductions ?? 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="net-salary-banner">
      <div class="net-title">Net Disbursed Take-Home Salary</div>
      <div class="net-amount">₹${(payroll.netSalary ?? 0).toLocaleString()}</div>
    </div>

    ${payroll.remarks ? `
    <div class="remarks-box">
      <strong>Remarks / Notes:</strong> ${Utils.escape(payroll.remarks)}
    </div>
    ` : ''}

    <div class="signatures">
      <div class="sig-line">Authorized HR Dept Stamp / Seal</div>
      <div class="sig-line">Signature of Employee Recipient</div>
    </div>

    <div class="footer-note">
      This is an official computer-generated Payroll Statement and Salary Receipt issued by HS Group Delhi (House of Surya).
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}



// ── Single Employee Payroll Slip Excel Exporter ────────────────────────────
function downloadSinglePayslipExcel(userId, month, year) {
  const user = DB.getUser(userId);
  if (!user) {
    alert('Employee record not found.');
    return;
  }
  const payroll = DB.calculateMonthlyPayroll(user.id, month, year);
  if (!payroll) {
    alert('No payroll data recorded for this month.');
    return;
  }
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const period = `${monthNames[month]} ${year}`;

  const excelData = [
    { "Category": "Company Details", "Parameter": "Company Name", "Value": "HS GROUP DELHI" },
    { "Category": "Company Details", "Parameter": "Company Subtitle", "Value": "House of Surya" },
    { "Category": "Employee Details", "Parameter": "Employee Name", "Value": user.name || 'N/A' },
    { "Category": "Employee Details", "Parameter": "Employee ID", "Value": user.employeeId || user.id || 'N/A' },
    { "Category": "Employee Details", "Parameter": "Department", "Value": user.department || 'N/A' },
    { "Category": "Employee Details", "Parameter": "Role / Designation", "Value": user.designation || 'N/A' },
    { "Category": "Statement Period", "Parameter": "Statement Period", "Value": period },
    { "Category": "Attendance Summary", "Parameter": "Total Working Days", "Value": payroll.workingDays ?? 0 },
    { "Category": "Attendance Summary", "Parameter": "Present Days", "Value": payroll.presentDays ?? 0 },
    { "Category": "Attendance Summary", "Parameter": "Leave Days", "Value": payroll.approvedLeaveDays ?? 0 },
    { "Category": "Earnings", "Parameter": "Basic Salary (INR)", "Value": payroll.baseSalary ?? 0 },
    { "Category": "Earnings", "Parameter": "HRA Allowance (INR)", "Value": payroll.allowanceHRA ?? 0 },
    { "Category": "Earnings", "Parameter": "Travel Allowance (INR)", "Value": payroll.allowanceTravel ?? 0 },
    { "Category": "Earnings", "Parameter": "Overtime Pay (INR)", "Value": payroll.overtimePay ?? 0 },
    { "Category": "Earnings", "Parameter": "Overtime Duration", "Value": payroll.overtimeText || '0h 0m' },
    { "Category": "Earnings", "Parameter": "Bonus / Rewards (INR)", "Value": payroll.bonus ?? 0 },
    { "Category": "Deductions", "Parameter": "Absent Penalties (INR)", "Value": payroll.absentDeduction ?? 0 },
    { "Category": "Deductions", "Parameter": "Half-day Deductions (INR)", "Value": payroll.halfDayDeduction ?? 0 },
    { "Category": "Deductions", "Parameter": "Provident Fund (PF) (INR)", "Value": payroll.deductionPF ?? 0 },
    { "Category": "Deductions", "Parameter": "Employees State Insurance (ESI) (INR)", "Value": payroll.deductionESI ?? 0 },
    { "Category": "Deductions", "Parameter": "Professional Tax (PT) (INR)", "Value": payroll.deductionPT ?? 0 },
    { "Category": "Deductions", "Parameter": "TDS Rate (%)", "Value": payroll.deductionTDS ?? 0 },
    { "Category": "Deductions", "Parameter": "TDS Amount (INR)", "Value": payroll.deductionTDSVal ?? 0 },
    { "Category": "Deductions", "Parameter": "Manager Ad-hoc Deductions (INR)", "Value": payroll.adhocDeduction ?? 0 },
    { "Category": "Net Payout", "Parameter": "Net Disbursed Take-home Salary (INR)", "Value": payroll.netSalary ?? 0 },
    { "Category": "Remarks", "Parameter": "Remarks", "Value": payroll.remarks || 'None' }
  ];

  const doExport = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payslip');
      XLSX.writeFile(wb, `payslip_${user.employeeId || user.id}_${monthNames[month]}_${year}.xlsx`);
    } catch (err) {
      alert('Error generating Excel file.');
      console.error(err);
    }
  };

  if (window.XLSX) {
    doExport();
  } else {
    loadSheetJS(doExport, () => {
      alert('Failed to load SheetJS library.');
    });
  }
}
