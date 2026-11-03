/**
 * @file adminDashboardMenu.test.js
 * Verification of Admin Dashboard Menu Configuration, Idempotency, and Extension Shielding
 */

const fs = require('fs');
const path = require('path');

describe('Admin Dashboard Menu and Extension Error Shield Verification', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
  const adminDashJs = fs.readFileSync(path.join(__dirname, '../js/views/adminDashboard.js'), 'utf8');
  const attendancesJs = fs.readFileSync(path.join(__dirname, '../js/views/attendancesView.js'), 'utf8');
  const schedulesJs = fs.readFileSync(path.join(__dirname, '../js/views/schedulesView.js'), 'utf8');

  test('index.html contains early shield against extension contextMenu errors', () => {
    // Shield script must be in head
    expect(indexHtml).toContain('cannot find menu item');
    expect(indexHtml).toContain('translate-page');
    expect(indexHtml).toContain('save-page');
    expect(indexHtml).toContain('window.onunhandledrejection = handleRejection');
    expect(indexHtml).toContain('window.onerror = function');
    expect(indexHtml).toContain('chrome.contextMenus');
  });

  test('index.html contains unique save-page and translate-page elements with no ID duplicates', () => {
    expect(indexHtml).toContain('id="save-page"');
    expect(indexHtml).toContain('id="translate-page"');

    // Count occurrences of id="translate-page"
    const translateMatches = indexHtml.match(/id=["']translate-page["']/g);
    expect(translateMatches).toHaveLength(1);

    // Count occurrences of id="save-page"
    const saveMatches = indexHtml.match(/id=["']save-page["']/g);
    expect(saveMatches).toHaveLength(1);
  });

  test('index.html references app.js with updated cache-busting v=129', () => {
    expect(indexHtml).toContain('src="js/app.js?v=129"');
  });

  test('js/app.js imports views with cache-busting v=129', () => {
    expect(appJs).toContain("from './views/loginView.js?v=129'");
    expect(appJs).toContain("from './views/adminDashboard.js?v=129'");
    expect(appJs).toContain("from './views/attendancesView.js?v=129'");
    expect(appJs).toContain("from './views/userManagementView.js?v=129'");
    expect(appJs).toContain("from './views/schedulesView.js?v=129'");
    expect(appJs).toContain("from './core/db.js?v=129'");
  });

  test('js/app.js router active link mapping includes all admin dashboard sub-routes', () => {
    expect(appJs).toContain("const adminDashboardRoutes = ['#admin-dashboard', '#admin-checkin-log', '#admin-deviations', '#admin-time-policies']");
    expect(appJs).toContain("const adminReportsRoutes = ['#admin-reports', '#admin-hours-balance']");
    expect(appJs).toContain("const adminSupportRoutes = ['#admin-support', '#admin-tickets']");
    expect(appJs).toContain("const adminApprovalsRoutes = ['#admin-approvals', '#admin-requests', '#admin-leaves']");
  });

  test('js/app.js prevents duplicate document click listeners for shell dropdowns', () => {
    expect(appJs).toContain('_shellDropdownsDocClickBound');
  });

  test('js/views/adminDashboard.js prevents duplicate document click listeners', () => {
    expect(adminDashJs).toContain('_adminDashboardLiveFeedBound');
    expect(adminDashJs).toContain('_adminDashboardSubMenuBound');
  });

  test('js/views/attendancesView.js prevents duplicate document click listeners', () => {
    expect(attendancesJs).toContain('_adminAttActionsMenuBound');
    expect(attendancesJs).toContain('_adminAttCalPopoverBound');
  });

  test('js/views/schedulesView.js prevents duplicate popover event listeners', () => {
    expect(schedulesJs).toContain('_schedulesPopoversBound');
  });

  test('js/core/db.js imports db.js with cache-busting v=129', () => {
    const coreDbJs = fs.readFileSync(path.join(__dirname, '../js/core/db.js'), 'utf8');
    expect(coreDbJs).toContain("from '../db.js?v=129'");
  });

  test('src/server/app.js serves index.html with no-cache headers', () => {
    const serverAppJs = fs.readFileSync(path.join(__dirname, '../src/server/app.js'), 'utf8');
    expect(serverAppJs).toContain("filename === 'index.html'");
    expect(serverAppJs).toContain("no-cache, no-store, must-revalidate");
  });
});
