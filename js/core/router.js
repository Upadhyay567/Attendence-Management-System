// js/core/router.js - Central SPA Router & Permission Guard
import { DB } from './db.js';
import { Auth } from './auth.js';

// Import Modular Views
import { renderLoginView } from '../views/loginView.js';
import { renderEmployeeDashboard } from '../views/employeeDashboard.js';
import { renderAdminDashboard } from '../views/adminDashboard.js';
import { renderDailyWorkStatus } from '../views/dailyWorkStatusView.js';
import { renderAdminAttendances } from '../views/attendancesView.js';
import { renderEmployeeLeaves } from '../views/leavesView.js';
import { renderAdminUsers } from '../views/userManagementView.js';
import { renderAdminSchedules } from '../views/schedulesView.js';
import { renderAdminFinance } from '../views/financeView.js';
import { renderAppShell } from '../components/appShell.js';

export async function handleRoute() {
  try {
    await DB.init();
    const root = document.getElementById('app-root');

    // Clear active GPS tracking & animations
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

    const hash = window.location.hash || '#login';
    let user = Auth.getCurrentUser();

    if (user) {
      const freshUser = DB.getUser(user.id);
      if (freshUser && freshUser.status === 'Inactive') {
        Auth.logout();
        user = null;
        alert('Your account is Inactive. Please contact HR.');
      }
    }

    if (hash === '#login') {
      if (user) {
        const baseRole = DB.getUserBaseRole(user.role);
        window.location.hash = (baseRole === 'hr' || baseRole === 'manager' || baseRole === 'finance_manager')
          ? '#admin-dashboard'
          : '#dashboard';
        return;
      }
      renderLoginView();
      return;
    }

    if (!user) {
      window.location.hash = '#login';
      return;
    }

    // Role Guard & Scoping
    const baseRole = DB.getUserBaseRole(user.role);
    const isManagementRole = baseRole === 'hr' || baseRole === 'manager' || baseRole === 'finance_manager';

    if (!isManagementRole) {
      const employeeAllowed = [
        '#dashboard', '#leaves', '#employee-reports', '#employee-profile',
        '#employee-verification', '#employee-swaps', '#support', '#settings',
        '#admin-settings', '#work-status', '#daily-work-status',
        '#employee-work-status', '#admin-work-status'
      ];
      if (!employeeAllowed.includes(hash)) {
        window.location.hash = '#dashboard';
        return;
      }
    }

    // Render Shell Frame if missing or user context changed
    const mainView = document.getElementById('main-view');
    const currentShellUser = root.getAttribute('data-shell-user-id');
    if (!mainView || currentShellUser !== user.id) {
      if (typeof renderAppShell === 'function') {
        renderAppShell();
      }
      root.setAttribute('data-shell-user-id', user.id);
    }

    // Render View Controller
    switch (hash) {
      case '#dashboard':
        renderEmployeeDashboard();
        break;
      case '#admin-dashboard':
        await renderAdminDashboard();
        break;
      case '#daily-work-status':
      case '#admin-work-status':
      case '#work-status':
      case '#employee-work-status':
        renderDailyWorkStatus();
        break;
      case '#admin-attendances':
      case '#admin-checkin-log':
      case '#admin-deviations':
        renderAdminAttendances();
        break;
      case '#leaves':
        renderEmployeeLeaves();
        break;
      case '#admin-users':
      case '#admin-approvals':
        renderAdminUsers();
        break;
      case '#admin-schedules':
      case '#admin-locations':
        renderAdminSchedules();
        break;
      case '#admin-finance':
        renderAdminFinance();
        break;
      default:
        if (isManagementRole) {
          await renderAdminDashboard();
        } else {
          renderEmployeeDashboard();
        }
    }
  } catch (routeErr) {
    console.error('Router error caught:', routeErr);
    renderLoginView();
  }
}

export function setupRouter() {
  window.appHandleRoute = handleRoute;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
