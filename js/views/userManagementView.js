// js/views/userManagementView.js - Staff Directory & Account Management
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal, openFullScreenImageModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';
import { openProfileDownloadModal, loadSheetJS } from '../downloads.js';

const getInitials = (name) => (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

export function renderAdminUsers() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  const rawUsers = DB.getUsers();
  const seenUserIds = new Set();
  const users = rawUsers.filter(u => {
    if (!u) return false;
    const uid = u.id || (u.employeeId ? String(u.employeeId).toUpperCase() : null);
    if (uid && seenUserIds.has(uid)) return false;
    if (uid) seenUserIds.add(uid);

    const baseRole = DB.getUserBaseRole ? DB.getUserBaseRole(user?.role) : (user?.role || '');
    if (user && (baseRole === 'manager' || baseRole === 'hr' || baseRole === 'admin' || baseRole === 'superadmin' || user.role === 'manager' || user.role === 'hr' || user.role === 'admin' || user.role === 'superadmin')) {
      return true; // show all employee, hr, and manager profiles, including their own!
    } else if (user && (baseRole === 'finance_manager' || user.role === 'finance_manager')) {
      return false; // Not showing employee list to Finance Manager
    } else {
      return user && u.id === user.id;
    }
  });

  const normalizeLocationName = (loc) => {
    if (!loc || typeof loc !== 'string') return '';
    const l = loc.trim();
    const lower = l.toLowerCase();
    if (lower === 'chattarpur') return 'Chattarpur Office';
    if (lower === 'omaxe office' || lower === 'surya omaxe') return 'Surya Omaxe';
    if (lower === 'gt karnal site' || lower === 'gt karnal') return 'GT Karnal Site';
    if (lower.includes('pitampura') || lower === 'hs group hq, pitampura, delhi') return 'PITAM PURA';
    return l;
  };

  const getUserPrimaryLocation = (u) => {
    if (!u) return '';
    let loc = (u.preferredLocation && u.preferredLocation.trim()) ||
              (Array.isArray(u.preferredLocations) && u.preferredLocations.find(l => l && l.trim())) ||
              (Array.isArray(u.assignedLocations) && u.assignedLocations.find(l => l && l.trim())) ||
              (u.workLocation && u.workLocation.trim()) ||
              '';
    return normalizeLocationName(loc);
  };

  const userMatchesLocation = (u, targetLoc) => {
    if (!targetLoc || targetLoc === 'all') return true;
    const target = normalizeLocationName(targetLoc).toLowerCase().trim();
    const uLoc = getUserPrimaryLocation(u).toLowerCase().trim();
    return uLoc === target;
  };

  // Derive distinct canonical worksite locations from users
  const distinctLocs = Array.from(new Set(users.map(getUserPrimaryLocation).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const userCountsByLoc = {};
  distinctLocs.forEach(loc => {
    userCountsByLoc[loc] = users.filter(u => userMatchesLocation(u, loc)).length;
  });

  const addBtnHTML = (user.role === 'hr' || user.role === 'manager' || user.role === 'admin') ? `
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <button class="btn-outline-equify" id="btn-download-profile-users" title="Download Staff Profiles">&#8681; Download Profile</button>
      <button class="btn-outline-equify" id="btn-bulk-upload-users" style="display:inline-flex; align-items:center; gap:6px; padding:8px 14px; font-size:13px; font-weight:700;" title="Bulk Upload Employee Data via Excel / CSV">
        <span>📤</span> Bulk Upload Data
      </button>
      <button class="btn-primary-equify" id="btn-add-employee-action" style="display:inline-flex; align-items:center; gap:6px; padding:8px 16px; font-size:13px; font-weight:700;" title="Register New Employee">
        <span>👤</span> Add Employee
      </button>
      <!-- Hidden compat button for tests and legacy callers -->
      <button id="btn-add-user-modal" style="display:none;"></button>
    </div>
  ` : '';

  const renderEmployeeRow = (u) => {
    const assignedSchedules = (u.scheduleIds && Array.isArray(u.scheduleIds) && u.scheduleIds.length > 0)
      ? u.scheduleIds.map(id => DB.getSchedule(id)).filter(Boolean)
      : (u.scheduleId ? [DB.getSchedule(u.scheduleId)].filter(Boolean) : []);

    const shiftNames = assignedSchedules.length > 0 
      ? assignedSchedules.map(s => Utils.escape(s.name)).join(', ') 
      : '<span style="color:var(--text-muted); font-style:italic">Not Assigned</span>';

    const workLocation = getUserPrimaryLocation(u) || '<span style="color:var(--text-muted); font-style:italic">Not Assigned</span>';
    
    const profileStatus = u.profileVerificationStatus || 'Approved';
    let profileBadgeHTML = '';
    if (profileStatus === 'Pending Approval') {
      profileBadgeHTML = `<br><span class="badge badge-pending" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block">⏳ Profile Pending</span>`;
    } else if (profileStatus === 'Rejected') {
      profileBadgeHTML = `<br><span class="badge badge-rejected" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block">❌ Profile Issue</span>`;
    } else {
      profileBadgeHTML = `<br><span class="badge badge-approved" style="font-size:10px; padding:1px 6px; margin-top:4px; display:inline-block; background:rgba(16,185,129,0.1); color:var(--success)">✅ Profile Approved</span>`;
    }

    const actionsHTML = (user.role === 'hr' || user.role === 'manager' || user.role === 'admin')
      ? `
        <div style="display:flex;gap:6px;flex-wrap:nowrap">
          ${u.profileVerificationStatus === 'Pending Approval' ? `
            <button class="btn btn-success btn-approve-profile-direct" data-id="${u.id}" style="padding:5px 8px;width:auto;font-size:11px;background:var(--success)">Approve</button>
            <button class="btn btn-danger btn-reject-profile-direct" data-id="${u.id}" style="padding:5px 8px;width:auto;font-size:11px;background:var(--error)">Reject</button>
          ` : ''}
          <button class="btn btn-secondary btn-edit-user" data-id="${u.id}" style="padding:5px 10px;width:auto;font-size:11.5px;font-weight:600" title="Edit Profile">✏️ Edit Profile</button>
          <button class="btn-delete-user" data-id="${u.id}" title="Delete Employee Profile">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Delete</span>
          </button>
        </div>
      `
      : `
        <div style="font-size:11px;color:var(--text-muted)">HR Control Only</div>
      `;

    const deptDisplay = (u.department && u.department !== 'Department' && u.department !== 'Staff' && u.department !== 'General')
      ? Utils.escape(u.department)
      : '<span style="color:var(--text-muted); font-style:italic">Not Assigned</span>';

    const desgDisplay = (u.designation && u.designation !== 'Designation' && u.designation !== 'Associate' && u.designation !== 'Junior Developer')
      ? Utils.escape(u.designation)
      : '<span style="color:var(--text-muted); font-style:italic">Not Assigned</span>';

    const dojDisplay = (u.dateOfJoining && u.dateOfJoining !== '2024-05-10')
      ? Utils.escape(u.dateOfJoining)
      : '<span style="color:var(--text-muted); font-style:italic">Not Assigned</span>';

    return `
      <tr>
        <td style="font-weight:600; display:flex; align-items:center; gap:12px; min-width:180px">
          <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; border:1px solid rgba(251,191,36,0.3); overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
            ${u.photo ? `<img src="${Utils.resolvePhotoUrl(u.photo)}" style="width:100%; height:100%; object-fit:cover;">` : getInitials(u.name)}
          </div>
          <div>
            ${Utils.escape(u.name)}
            ${profileBadgeHTML}
          </div>
        </td>
        <td style="white-space:nowrap">
          ${Utils.escape(u.employeeId)}
          ${u.biometricUserId || u.biometricId ? `<br><span style="font-size:10.5px;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:1px 6px;border-radius:4px;display:inline-block;margin-top:2px;" title="Biometric Machine ID">🪪 ${Utils.escape(u.biometricUserId || u.biometricId)}</span>` : ''}
        </td>
        <td style="font-size:12px; white-space:nowrap">${Utils.escape(u.branch || '—')}</td>
        <td style="font-size:12px; white-space:nowrap">${Utils.escape(u.pincode || '—')}</td>
        <td style="white-space:nowrap">${u.bloodGroup ? `<span class="badge" style="font-size:11px; padding:2px 8px; border-radius:12px; background:rgba(239,68,68,0.1); color:#dc2626; font-weight:700; border:1px solid rgba(239,68,68,0.2);">${Utils.escape(u.bloodGroup)}</span>` : '—'}</td>
        <td style="font-size:12px; white-space:nowrap">${deptDisplay}</td>
        <td style="font-size:12px; white-space:nowrap">${desgDisplay}</td>
        <td style="white-space:nowrap">${shiftNames}</td>
        <td style="font-size:12px;color:var(--text-secondary); white-space:nowrap">${workLocation}</td>
        <td style="white-space:nowrap">${Utils.escape(u.phone || '—')}</td>
        <td style="white-space:nowrap">${dojDisplay}</td>
        <td style="white-space:nowrap">
          ${actionsHTML}
        </td>
      </tr>
    `;
  };

  main.innerHTML = html`
    <div class="equify-page-header">
      <div>
        <h1 class="equify-page-title">Employee Directory</h1>
        <div style="font-size:13px; color:#64748b; margin-top:2px">Manage company staff files, departments, shifts, and personal records.</div>
      </div>
      ${addBtnHTML}
    </div>
    <div class="content-body">
      <!-- Search bar placed above the "All Department" button/filter -->
      <div class="employee-search-bar-container" style="margin-bottom: 14px; display: flex; align-items: center; justify-content: flex-start;">
        <div style="position: relative; width: 100%; max-width: 380px;">
          <input type="text" id="employee-search-input" class="form-input" placeholder="Search by Employee Name or ID..." style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; width: 100%; height: 36px; padding: 0 12px 0 36px; font-size: 13.5px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card, #ffffff); color: var(--text-primary); box-sizing: border-box; transition: all 0.2s ease;">
          <svg style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; stroke: var(--text-muted); fill: none; pointer-events: none;" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>
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
          <select class="equify-filter-select" id="filter-location-select" title="Filter by Worksite Location">
            <option value="all">Location: All Locations (${users.length})</option>
            ${distinctLocs.map(loc => `<option value="${Utils.escape(loc)}">Location: ${Utils.escape(loc)} (${userCountsByLoc[loc] || 0})</option>`).join('')}
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
                <th style="white-space:nowrap">Employee Name</th>
                <th style="white-space:nowrap">User ID</th>
                <th style="white-space:nowrap">Branch</th>
                <th style="white-space:nowrap">Pincode</th>
                <th style="white-space:nowrap">Blood Group</th>
                <th style="white-space:nowrap">Department</th>
                <th style="white-space:nowrap">Designation</th>
                <th style="white-space:nowrap">Assigned Shift(s)</th>
                <th style="white-space:nowrap">Work Location</th>
                <th style="white-space:nowrap">Mobile Number</th>
                <th style="white-space:nowrap">Date of Joining</th>
                <th style="white-space:nowrap">Profile Controls</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <!-- Employee Registers Pagination Bar -->
        <div class="employee-pagination-bar" id="employee-pagination-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:16px; padding:12px 16px; background:var(--bg-card, #ffffff); border:1px solid var(--border); border-radius:8px">
          <div style="display:flex; align-items:center; gap:12px; font-size:12.5px; color:var(--text-secondary); flex-wrap:wrap">
            <span id="employee-pagination-range" style="font-weight:600">Showing 1 to 25 of ${users.length.toLocaleString()} employee(s)</span>
            <span style="color:var(--border)">|</span>
            <label style="display:flex; align-items:center; gap:6px; font-size:12px">
              Rows per page:
              <select id="employee-page-size-select" class="form-input" style="padding:4px 8px; font-size:12px; width:auto; border-radius:6px">
                <option value="15">15</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
          <div style="display:flex; align-items:center; gap:6px">
            <button class="btn btn-secondary btn-sm" id="btn-employee-page-first" style="padding:5px 10px; font-size:12px; width:auto" title="First Page">⏮ First</button>
            <button class="btn btn-secondary btn-sm" id="btn-employee-page-prev" style="padding:5px 12px; font-size:12px; width:auto" title="Previous Page">◀ Prev</button>
            <div style="display:flex; align-items:center; gap:4px">
              <input type="number" id="input-employee-current-page" min="1" max="1" value="1" style="width:48px; height:28px; text-align:center; padding:2px; font-size:12.5px; font-weight:700; border:1px solid var(--border); border-radius:6px; background:var(--bg-card, #ffffff); color:var(--text-primary)">
              <span id="employee-page-total" style="font-size:12.5px; color:var(--text-secondary)">/ 1</span>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-employee-page-next" style="padding:5px 12px; font-size:12px; width:auto" title="Next Page">Next ▶</button>
            <button class="btn btn-secondary btn-sm" id="btn-employee-page-last" style="padding:5px 10px; font-size:12px; width:auto" title="Last Page">Last ⏭</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Action listeners for Employee registration button
  const addEmpAction = document.getElementById('btn-add-employee-action');
  if (addEmpAction) addEmpAction.addEventListener('click', () => {
    window.location.hash = '#admin-register-employee';
  });

  const legacyAddBtn = document.getElementById('btn-add-user-modal');
  if (legacyAddBtn) legacyAddBtn.addEventListener('click', () => openUserModal(null, 'employee'));

  const dlProfileBtn = document.getElementById('btn-download-profile-users');
  if (dlProfileBtn) dlProfileBtn.addEventListener('click', () => {
    const filterLoc = document.getElementById('filter-location-select');
    const activeLoc = (filterLoc && filterLoc.value !== 'all') ? filterLoc.value : null;
    if (typeof openProfileDownloadModal === 'function') openProfileDownloadModal(null, activeLoc);
    else if (typeof window.openProfileDownloadModal === 'function') window.openProfileDownloadModal(null, activeLoc);
  });

  const bulkUploadBtn = document.getElementById('btn-bulk-upload-users');
  if (bulkUploadBtn) {
    bulkUploadBtn.addEventListener('click', () => {
      openBulkUploadModal();
    });
  }

  const triggerPushSync = async () => {
    try {
      let sessionToken = '';
      try {
        const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
        if (sess) sessionToken = JSON.parse(sess).token || '';
      } catch (e) {}
      await fetch((window.apiBaseUrl || '') + '/api/mutate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ action: 'sync', data: DB.data })
      });
    } catch (err) {
      console.warn('Network error synchronizing mutation with backend database:', err);
    }
  };

  const handleApproveProfile = async (id) => {
    const u = DB.getUser(id);
    const currentUser = Auth.getCurrentUser();
    if (u) {
      Object.assign(u, u.pendingProfileEdits || {});
      u.pendingProfileEdits = null;
      u.profileVerificationStatus = 'Approved';
      u.profileVerificationComment = '';
      DB.notifyEmployeeProfileChange(id, 'approved', `Your profile edit request has been reviewed and approved by ${currentUser ? currentUser.name : 'HR'}.`, currentUser);
      DB.save();
      await triggerPushSync();
      if (typeof showToastNotification === 'function') {
        showToastNotification(`✅ Profile edits approved for ${u.name}. Alert notification sent.`, 'success');
      }
      renderAdminUsers();
    }
  };

  const handleRejectProfile = async (id) => {
    const u = DB.getUser(id);
    const currentUser = Auth.getCurrentUser();
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
      DB.notifyEmployeeProfileChange(id, 'rejected', `Your profile edit request was rejected by ${currentUser ? currentUser.name : 'HR'}. Reason: ${comment.trim()}`, currentUser);
      DB.save();
      await triggerPushSync();
      if (typeof showToastNotification === 'function') {
        showToastNotification(`❌ Profile edits rejected for ${u.name}. Alert notification sent.`, 'warning');
      }
      renderAdminUsers();
    }
  };

  const handleDeleteUser = async (id) => {
    const u = DB.getUser(id);
    if (u && await CustomDialog.confirm(`Remove employee ${u.name}? All log items will be permanently cleared.`)) {
      const empName = u.name;
      DB.deleteUser(id);
      await triggerPushSync();
      if (typeof showToastNotification === 'function') {
        showToastNotification(`🗑️ Employee profile for ${empName} deleted successfully.`, 'info');
      }
      renderAdminUsers();
    }
  };

  const bindUserRowEvents = (container = document) => {
    container.querySelectorAll('.btn-edit-user').forEach(btn => btn.addEventListener('click', (e) => openUserModal(e.target.closest('.btn-edit-user').dataset.id, 'employee')));
    container.querySelectorAll('.btn-edit-payroll').forEach(btn => btn.addEventListener('click', (e) => openUserModal(e.target.closest('.btn-edit-payroll').dataset.id, 'payroll')));
    container.querySelectorAll('.btn-delete-user').forEach(btn => btn.addEventListener('click', (e) => handleDeleteUser(e.target.closest('.btn-delete-user').dataset.id)));
    container.querySelectorAll('.btn-approve-profile-direct').forEach(btn => btn.addEventListener('click', (e) => handleApproveProfile(e.target.closest('.btn-approve-profile-direct').dataset.id)));
    container.querySelectorAll('.btn-reject-profile-direct').forEach(btn => btn.addEventListener('click', (e) => handleRejectProfile(e.target.closest('.btn-reject-profile-direct').dataset.id)));
    container.querySelectorAll('.clickable-list-avatar').forEach(av => {
      av.addEventListener('click', (e) => {
        const photo = av.dataset.photo;
        if (photo && typeof openFullScreenImageModal === 'function') {
          e.stopPropagation();
          openFullScreenImageModal(photo);
        }
      });
    });
  };

  bindUserRowEvents();

  // Setup real-time dynamic filter listeners on dropdowns and search bar
  const setupFilterListeners = () => {
    const sInput = document.getElementById('employee-search-input');
    const dSel = document.getElementById('filter-dept-select');
    const locSel = document.getElementById('filter-location-select');
    const rSel = document.getElementById('filter-role-select');
    const sSel = document.getElementById('filter-status-select');
    const tSel = document.getElementById('filter-time-select');
    const tbody = document.querySelector('.card-panel .custom-table tbody');
    const pInfo = document.querySelector('.equify-pagination-info');

    if (!tbody) return;

    let currentFilteredUsers = users;
    let employeeCurrentPage = 1;
    let employeePageSize = 25;

    const renderEmployeePage = () => {
      const totalCount = currentFilteredUsers.length;
      const effectivePageSize = (employeePageSize === 'all' || employeePageSize >= totalCount) ? totalCount : employeePageSize;
      const totalPages = effectivePageSize > 0 ? Math.ceil(totalCount / effectivePageSize) : 1;

      if (employeeCurrentPage > totalPages) employeeCurrentPage = Math.max(1, totalPages);
      if (employeeCurrentPage < 1) employeeCurrentPage = 1;

      const startIndex = effectivePageSize > 0 ? (employeeCurrentPage - 1) * effectivePageSize : 0;
      const endIndex = effectivePageSize > 0 ? Math.min(startIndex + effectivePageSize, totalCount) : totalCount;
      const pageUsers = currentFilteredUsers.slice(startIndex, endIndex);

      if (pageUsers.length === 0) {
        tbody.innerHTML = html`<tr><td colspan="12" style="text-align:center; padding:28px; color:var(--text-muted); font-size:13px">No matching employee records found.</td></tr>`;
      } else {
        tbody.innerHTML = pageUsers.map(renderEmployeeRow).join('');
        bindUserRowEvents(tbody);
      }

      if (pInfo) {
        pInfo.textContent = `Total: ${totalCount.toLocaleString()} showing ${totalCount === users.length ? 'all employees' : 'matching employees'} (Page ${employeeCurrentPage} of ${totalPages})`;
      }

      const rangeEl = document.getElementById('employee-pagination-range');
      if (rangeEl) {
        rangeEl.textContent = totalCount > 0
          ? `Showing ${startIndex + 1} to ${endIndex} of ${totalCount.toLocaleString()} employee(s)`
          : `Showing 0 employees`;
      }

      const pageInput = document.getElementById('input-employee-current-page');
      const totalSpan = document.getElementById('employee-page-total');
      if (pageInput) {
        pageInput.value = employeeCurrentPage;
        pageInput.max = totalPages;
      }
      if (totalSpan) {
        totalSpan.textContent = `/ ${totalPages}`;
      }

      const btnFirst = document.getElementById('btn-employee-page-first');
      const btnPrev = document.getElementById('btn-employee-page-prev');
      const btnNext = document.getElementById('btn-employee-page-next');
      const btnLast = document.getElementById('btn-employee-page-last');

      if (btnFirst) btnFirst.disabled = (employeeCurrentPage <= 1);
      if (btnPrev) btnPrev.disabled = (employeeCurrentPage <= 1);
      if (btnNext) btnNext.disabled = (employeeCurrentPage >= totalPages);
      if (btnLast) btnLast.disabled = (employeeCurrentPage >= totalPages);
    };

    const btnFirst = document.getElementById('btn-employee-page-first');
    const btnPrev = document.getElementById('btn-employee-page-prev');
    const btnNext = document.getElementById('btn-employee-page-next');
    const btnLast = document.getElementById('btn-employee-page-last');
    const pageSizeSel = document.getElementById('employee-page-size-select');
    const pageInput = document.getElementById('input-employee-current-page');

    if (btnFirst) btnFirst.onclick = () => { employeeCurrentPage = 1; renderEmployeePage(); };
    if (btnPrev) btnPrev.onclick = () => { if (employeeCurrentPage > 1) { employeeCurrentPage--; renderEmployeePage(); } };
    if (btnNext) btnNext.onclick = () => {
      const effectivePageSize = (employeePageSize === 'all' || employeePageSize >= currentFilteredUsers.length) ? currentFilteredUsers.length : employeePageSize;
      const totalPages = effectivePageSize > 0 ? Math.ceil(currentFilteredUsers.length / effectivePageSize) : 1;
      if (employeeCurrentPage < totalPages) { employeeCurrentPage++; renderEmployeePage(); }
    };
    if (btnLast) btnLast.onclick = () => {
      const effectivePageSize = (employeePageSize === 'all' || employeePageSize >= currentFilteredUsers.length) ? currentFilteredUsers.length : employeePageSize;
      employeeCurrentPage = effectivePageSize > 0 ? Math.ceil(currentFilteredUsers.length / effectivePageSize) : 1;
      renderEmployeePage();
    };
    if (pageSizeSel) {
      pageSizeSel.onchange = (e) => {
        const val = e.target.value;
        employeePageSize = val === 'all' ? 'all' : parseInt(val, 10);
        employeeCurrentPage = 1;
        renderEmployeePage();
      };
    }
    if (pageInput) {
      pageInput.onchange = (e) => {
        const effectivePageSize = (employeePageSize === 'all' || employeePageSize >= currentFilteredUsers.length) ? currentFilteredUsers.length : employeePageSize;
        const totalPages = effectivePageSize > 0 ? Math.ceil(currentFilteredUsers.length / effectivePageSize) : 1;
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
          employeeCurrentPage = val;
          renderEmployeePage();
        } else {
          e.target.value = employeeCurrentPage;
        }
      };
    }

    const applyFilters = () => {
      const q = sInput ? sInput.value.toLowerCase().trim() : '';
      const dVal = dSel ? dSel.value : 'all';
      const locVal = locSel ? locSel.value : 'all';
      const rVal = rSel ? rSel.value : 'all';
      const sVal = sSel ? sSel.value : 'all';

      currentFilteredUsers = users.filter(u => {
        if (q) {
          const name = (u.name || '').toLowerCase();
          const empId = (u.employeeId || '').toLowerCase();
          const uid = (u.id || '').toLowerCase();
          const bioId = (u.biometricUserId || u.biometricId || '').toLowerCase();
          if (!name.includes(q) && !empId.includes(q) && !uid.includes(q) && !bioId.includes(q)) return false;
        }
        if (dVal !== 'all') {
          const uDept = (u.department || '').toLowerCase();
          const targetDept = dVal.toLowerCase();
          if (!uDept.includes(targetDept) && !targetDept.includes(uDept)) return false;
        }
        if (locVal !== 'all') {
          if (!userMatchesLocation(u, locVal)) return false;
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

      employeeCurrentPage = 1;
      renderEmployeePage();
    };

    if (sInput) {
      sInput.addEventListener('input', applyFilters);
    }

    [dSel, locSel, rSel, sSel, tSel].forEach(sel => {
      if (sel) sel.addEventListener('change', applyFilters);
    });

    // Initial page render
    renderEmployeePage();
  };

  setupFilterListeners();
}

export function renderAdminPayroll() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  const rawUsers = DB.getUsers();
  const seenUserIds = new Set();
  const users = rawUsers.filter(u => {
    if (!u) return false;
    const uid = u.id || (u.employeeId ? String(u.employeeId).toUpperCase() : null);
    if (uid && seenUserIds.has(uid)) return false;
    if (uid) seenUserIds.add(uid);

    const baseRole = DB.getUserBaseRole ? DB.getUserBaseRole(user?.role) : (user?.role || '');
    if (user && (baseRole === 'manager' || baseRole === 'hr' || baseRole === 'admin' || baseRole === 'superadmin' || baseRole === 'finance_manager' || user.role === 'manager' || user.role === 'hr' || user.role === 'admin' || user.role === 'superadmin' || user.role === 'finance_manager')) {
      return true;
    } else {
      return user && u.id === user.id;
    }
  });

  const normalizeLocationName = (loc) => {
    if (!loc || typeof loc !== 'string') return '';
    const l = loc.trim();
    const lower = l.toLowerCase();
    if (lower === 'chattarpur') return 'Chattarpur Office';
    if (lower === 'omaxe office' || lower === 'surya omaxe') return 'Surya Omaxe';
    if (lower === 'gt karnal site' || lower === 'gt karnal') return 'GT Karnal Site';
    if (lower.includes('pitampura') || lower === 'hs group hq, pitampura, delhi') return 'PITAM PURA';
    return l;
  };

  const getUserPrimaryLocation = (u) => {
    if (!u) return '';
    let loc = (u.preferredLocation && u.preferredLocation.trim()) ||
              (Array.isArray(u.preferredLocations) && u.preferredLocations.find(l => l && l.trim())) ||
              (Array.isArray(u.assignedLocations) && u.assignedLocations.find(l => l && l.trim())) ||
              (u.workLocation && u.workLocation.trim()) ||
              '';
    return normalizeLocationName(loc);
  };

  const userMatchesLocation = (u, targetLoc) => {
    if (!targetLoc || targetLoc === 'all') return true;
    const target = normalizeLocationName(targetLoc).toLowerCase().trim();
    const uLoc = getUserPrimaryLocation(u).toLowerCase().trim();
    return uLoc === target;
  };

  const distinctLocs = Array.from(new Set(users.map(getUserPrimaryLocation).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const userCountsByLoc = {};
  distinctLocs.forEach(loc => {
    userCountsByLoc[loc] = users.filter(u => userMatchesLocation(u, loc)).length;
  });

  const addPayrollBtnHTML = (user && (user.role === 'hr' || user.role === 'manager' || user.role === 'admin' || user.role === 'finance_manager')) ? `
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <button class="btn-outline-equify" id="btn-download-payroll-users" title="Download Staff Profiles">&#8681; Download Profile</button>
      <button class="btn-primary-equify" id="btn-add-payroll-action" style="display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:#ffffff; padding:8px 16px; font-size:13px; font-weight:700;" title="Setup Payroll for New User">
        <span>💳</span> Payroll Setup
      </button>
    </div>
  ` : '';

  const renderPayrollRow = (u) => {
    const totalAllowVal = (u.totalAllowances !== null && u.totalAllowances !== undefined && u.totalAllowances !== '')
      ? Number(u.totalAllowances)
      : ((u.allowanceHRA || 0) + (u.allowanceTravel || 0) + (u.bonus || 0));

    const totalDeductVal = (u.totalDeductions !== null && u.totalDeductions !== undefined && u.totalDeductions !== '')
      ? Number(u.totalDeductions)
      : ((u.totalDeduction !== null && u.totalDeduction !== undefined && u.totalDeduction !== '')
        ? Number(u.totalDeduction)
        : ((u.deductionPF || 0) + (u.deductionPT || 0)));

    const isAuthorized = user && (user.role === 'hr' || user.role === 'manager' || user.role === 'admin' || user.role === 'finance_manager');
    const actionsHTML = isAuthorized
      ? `
        <div style="display:flex;gap:6px;flex-wrap:nowrap">
          <button class="btn btn-outline-equify btn-edit-payroll" data-id="${u.id}" style="padding:5px 10px;width:auto;font-size:11.5px;font-weight:600;background:rgba(79,70,229,0.1);color:#6366f1;border:1px solid rgba(79,70,229,0.3)" title="Edit Payroll & Banking">💳 Edit Payroll</button>
          <button class="btn btn-secondary btn-payslip-row" data-id="${u.id}" style="padding:5px 8px;width:auto;font-size:11px" title="Download Monthly Payslip">📄 Payslip</button>
        </div>
      `
      : `<div style="font-size:11px;color:var(--text-muted)">Read Only</div>`;

    return `
      <tr>
        <td style="font-weight:600; display:flex; align-items:center; gap:12px; min-width:180px">
          <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; border:1px solid rgba(255,255,255,0.2); overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}" title="${u.photo ? 'Click to view full screen' : ''}">
            ${u.photo ? `<img src="${Utils.resolvePhotoUrl(u.photo)}" style="width:100%; height:100%; object-fit:cover;">` : getInitials(u.name)}
          </div>
          <div>
            ${Utils.escape(u.name)}
            <br><span style="font-size:11px;color:var(--text-muted)">${Utils.escape(u.employeeId)}</span>
          </div>
        </td>
        <td style="white-space:nowrap">
          ${u.biometricUserId || u.biometricId ? `<span style="font-size:11px;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:2px 7px;border-radius:4px;display:inline-block;" title="Biometric Machine ID">🪪 ${Utils.escape(u.biometricUserId || u.biometricId)}</span>` : '—'}
        </td>
        <td style="font-size:12px; white-space:nowrap">${Utils.escape(u.branch || '—')}</td>
        <td style="font-weight:700;color:var(--primary); white-space:nowrap">${u.baseSalary ? `₹${Number(u.baseSalary).toLocaleString()}` : '—'}</td>
        <td style="font-weight:600;color:var(--success); white-space:nowrap">${totalAllowVal > 0 ? `₹${totalAllowVal.toLocaleString()}` : '—'}</td>
        <td style="font-weight:600;color:var(--error); white-space:nowrap">${totalDeductVal > 0 ? `₹${totalDeductVal.toLocaleString()}` : '—'}</td>
        <td style="font-weight:600;color:var(--accent, #d97706); white-space:nowrap">${(u.bonus !== undefined && u.bonus !== null && u.bonus !== '') ? `₹${Number(u.bonus).toLocaleString()}` : '—'}</td>
        <td style="white-space:nowrap"><code style="font-size:11px">${Utils.escape(u.uanNo || u.uanNumber || '—')}</code></td>
        <td style="white-space:nowrap"><code style="font-size:11px">${Utils.escape(u.pfNo || u.pfNumber || '—')}</code></td>
        <td style="font-size:12px; white-space:nowrap">${Utils.escape(u.bankName || '—')}</td>
        <td style="white-space:nowrap"><code style="font-size:11px">${Utils.escape(u.accountNumber || '—')}</code></td>
        <td style="white-space:nowrap"><code style="font-size:11px">${Utils.escape(u.ifscCode || '—')}</code></td>
        <td style="font-size:12px; white-space:nowrap">${Utils.escape(u.bankBranchName || '—')}</td>
        <td style="white-space:nowrap">
          ${actionsHTML}
        </td>
      </tr>
    `;
  };

  main.innerHTML = html`
    <div class="equify-page-header">
      <div>
        <h1 class="equify-page-title">Payroll & Compensation Register</h1>
        <div style="font-size:13px; color:#64748b; margin-top:2px">Manage employee base salaries, allowances, statutory deductions, bank accounts, and payslips.</div>
      </div>
      ${addPayrollBtnHTML}
    </div>
    <div class="content-body">
      <div class="employee-search-bar-container" style="margin-bottom: 14px; display: flex; align-items: center; justify-content: flex-start;">
        <div style="position: relative; width: 100%; max-width: 380px;">
          <input type="text" id="payroll-search-input" class="form-input" placeholder="Search by Employee Name or ID..." style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; width: 100%; height: 36px; padding: 0 12px 0 36px; font-size: 13.5px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card, #ffffff); color: var(--text-primary); box-sizing: border-box; transition: all 0.2s ease;">
          <svg style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; stroke: var(--text-muted); fill: none; pointer-events: none;" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      </div>
      <div class="equify-filter-bar">
        <div class="equify-filter-pills">
          <select class="equify-filter-select" id="payroll-filter-dept-select">
            <option value="all">Department: All Departments</option>
            <option value="Human Resources">Department: Human Resources</option>
            <option value="Engineering">Department: Engineering</option>
            <option value="Operations">Department: Operations</option>
            <option value="Sales">Department: Sales & Marketing</option>
            <option value="Finance">Department: Finance</option>
          </select>
          <select class="equify-filter-select" id="payroll-filter-location-select" title="Filter by Worksite Location">
            <option value="all">Location: All Locations (${users.length})</option>
            ${distinctLocs.map(loc => `<option value="${Utils.escape(loc)}">Location: ${Utils.escape(loc)} (${userCountsByLoc[loc] || 0})</option>`).join('')}
          </select>
          <select class="equify-filter-select" id="payroll-filter-status-select">
            <option value="all">Status: All Statuses</option>
            <option value="Active">Status: Active</option>
            <option value="Inactive">Status: Inactive</option>
          </select>
        </div>
        <div class="equify-pagination-info" id="payroll-pagination-info">Total: ${users.length} showing all payroll records</div>
      </div>
      <div class="card-panel">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="white-space:nowrap">Employee Name</th>
                <th style="white-space:nowrap">User ID</th>
                <th style="white-space:nowrap">Branch</th>
                <th style="white-space:nowrap">Base Salary</th>
                <th style="white-space:nowrap">Total Allowances</th>
                <th style="white-space:nowrap">Total Deduction</th>
                <th style="white-space:nowrap">Bonus</th>
                <th style="white-space:nowrap">UAN No.</th>
                <th style="white-space:nowrap">PF No.</th>
                <th style="white-space:nowrap">Bank Name</th>
                <th style="white-space:nowrap">Account Number</th>
                <th style="white-space:nowrap">IFSC Code</th>
                <th style="white-space:nowrap">Bank Branch Name</th>
                <th style="white-space:nowrap">Payroll Controls</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="employee-pagination-bar" id="payroll-pagination-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:16px; padding:12px 16px; background:var(--bg-card, #ffffff); border:1px solid var(--border); border-radius:8px">
          <div style="display:flex; align-items:center; gap:12px; font-size:12.5px; color:var(--text-secondary); flex-wrap:wrap">
            <span id="payroll-pagination-range" style="font-weight:600">Showing 1 to 25 of ${users.length.toLocaleString()} employee(s)</span>
            <span style="color:var(--border)">|</span>
            <label style="display:flex; align-items:center; gap:6px; font-size:12px">
              Rows per page:
              <select id="payroll-page-size-select" class="form-input" style="padding:4px 8px; font-size:12px; width:auto; border-radius:6px">
                <option value="15">15</option>
                <option value="25" selected>25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
          <div style="display:flex; align-items:center; gap:6px">
            <button class="btn btn-secondary btn-sm" id="btn-payroll-page-first" style="padding:5px 10px; font-size:12px; width:auto" title="First Page">⏮ First</button>
            <button class="btn btn-secondary btn-sm" id="btn-payroll-page-prev" style="padding:5px 12px; font-size:12px; width:auto" title="Previous Page">◀ Prev</button>
            <div style="display:flex; align-items:center; gap:4px">
              <input type="number" id="input-payroll-current-page" min="1" max="1" value="1" style="width:48px; height:28px; text-align:center; padding:2px; font-size:12.5px; font-weight:700; border:1px solid var(--border); border-radius:6px; background:var(--bg-card, #ffffff); color:var(--text-primary)">
              <span id="payroll-page-total" style="font-size:12.5px; color:var(--text-secondary)">/ 1</span>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-payroll-page-next" style="padding:5px 12px; font-size:12px; width:auto" title="Next Page">Next ▶</button>
            <button class="btn btn-secondary btn-sm" id="btn-payroll-page-last" style="padding:5px 10px; font-size:12px; width:auto" title="Last Page">Last ⏭</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const addPayAction = document.getElementById('btn-add-payroll-action');
  if (addPayAction) addPayAction.addEventListener('click', () => openUserModal(null, 'payroll'));

  const dlPayrollBtn = document.getElementById('btn-download-payroll-users');
  if (dlPayrollBtn) dlPayrollBtn.addEventListener('click', () => {
    const filterLoc = document.getElementById('payroll-filter-location-select');
    const activeLoc = (filterLoc && filterLoc.value !== 'all') ? filterLoc.value : null;
    if (typeof openProfileDownloadModal === 'function') openProfileDownloadModal(null, activeLoc);
    else if (typeof window.openProfileDownloadModal === 'function') window.openProfileDownloadModal(null, activeLoc);
  });

  const bindPayrollRowEvents = (container = document) => {
    container.querySelectorAll('.btn-edit-payroll').forEach(btn => {
      btn.addEventListener('click', (e) => openUserModal(e.target.closest('.btn-edit-payroll').dataset.id, 'payroll'));
    });
    container.querySelectorAll('.btn-payslip-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const uid = e.target.closest('.btn-payslip-row').dataset.id;
        const now = new Date();
        if (typeof window.downloadSinglePayslipExcel === 'function') {
          window.downloadSinglePayslipExcel(uid, now.getMonth(), now.getFullYear());
        } else if (typeof openReportDownloadModal === 'function') {
          openReportDownloadModal();
        } else if (typeof window.openReportDownloadModal === 'function') {
          window.openReportDownloadModal();
        }
      });
    });
    container.querySelectorAll('.clickable-list-avatar').forEach(av => {
      av.addEventListener('click', (e) => {
        const photo = av.dataset.photo;
        if (photo && typeof openFullScreenImageModal === 'function') {
          e.stopPropagation();
          openFullScreenImageModal(photo);
        }
      });
    });
  };

  bindPayrollRowEvents();

  const setupPayrollFilterListeners = () => {
    const sInput = document.getElementById('payroll-search-input');
    const dSel = document.getElementById('payroll-filter-dept-select');
    const locSel = document.getElementById('payroll-filter-location-select');
    const sSel = document.getElementById('payroll-filter-status-select');
    const tbody = document.querySelector('.card-panel .custom-table tbody');
    const pInfo = document.getElementById('payroll-pagination-info');

    if (!tbody) return;

    let currentFilteredUsers = users;
    let payrollCurrentPage = 1;
    let payrollPageSize = 25;

    const renderPayrollPage = () => {
      const totalCount = currentFilteredUsers.length;
      const effectivePageSize = (payrollPageSize === 'all' || payrollPageSize >= totalCount) ? totalCount : payrollPageSize;
      const totalPages = effectivePageSize > 0 ? Math.ceil(totalCount / effectivePageSize) : 1;

      if (payrollCurrentPage > totalPages) payrollCurrentPage = Math.max(1, totalPages);
      if (payrollCurrentPage < 1) payrollCurrentPage = 1;

      const startIndex = effectivePageSize > 0 ? (payrollCurrentPage - 1) * effectivePageSize : 0;
      const endIndex = effectivePageSize > 0 ? Math.min(startIndex + effectivePageSize, totalCount) : totalCount;
      const pageUsers = currentFilteredUsers.slice(startIndex, endIndex);

      if (pageUsers.length === 0) {
        tbody.innerHTML = html`<tr><td colspan="14" style="text-align:center; padding:28px; color:var(--text-muted); font-size:13px">No matching payroll records found.</td></tr>`;
      } else {
        tbody.innerHTML = pageUsers.map(renderPayrollRow).join('');
        bindPayrollRowEvents(tbody);
      }

      if (pInfo) {
        pInfo.textContent = `Total: ${totalCount.toLocaleString()} showing ${totalCount === users.length ? 'all payroll records' : 'matching payroll records'} (Page ${payrollCurrentPage} of ${totalPages})`;
      }

      const rangeEl = document.getElementById('payroll-pagination-range');
      if (rangeEl) {
        rangeEl.textContent = totalCount > 0
          ? `Showing ${startIndex + 1} to ${endIndex} of ${totalCount.toLocaleString()} employee(s)`
          : `Showing 0 employees`;
      }

      const pageInput = document.getElementById('input-payroll-current-page');
      const totalSpan = document.getElementById('payroll-page-total');
      if (pageInput) {
        pageInput.value = payrollCurrentPage;
        pageInput.max = totalPages;
      }
      if (totalSpan) {
        totalSpan.textContent = `/ ${totalPages}`;
      }

      const btnFirst = document.getElementById('btn-payroll-page-first');
      const btnPrev = document.getElementById('btn-payroll-page-prev');
      const btnNext = document.getElementById('btn-payroll-page-next');
      const btnLast = document.getElementById('btn-payroll-page-last');

      if (btnFirst) btnFirst.disabled = (payrollCurrentPage <= 1);
      if (btnPrev) btnPrev.disabled = (payrollCurrentPage <= 1);
      if (btnNext) btnNext.disabled = (payrollCurrentPage >= totalPages);
      if (btnLast) btnLast.disabled = (payrollCurrentPage >= totalPages);
    };

    const btnFirst = document.getElementById('btn-payroll-page-first');
    const btnPrev = document.getElementById('btn-payroll-page-prev');
    const btnNext = document.getElementById('btn-payroll-page-next');
    const btnLast = document.getElementById('btn-payroll-page-last');
    const pageSizeSel = document.getElementById('payroll-page-size-select');
    const pageInput = document.getElementById('input-payroll-current-page');

    if (btnFirst) btnFirst.onclick = () => { payrollCurrentPage = 1; renderPayrollPage(); };
    if (btnPrev) btnPrev.onclick = () => { if (payrollCurrentPage > 1) { payrollCurrentPage--; renderPayrollPage(); } };
    if (btnNext) btnNext.onclick = () => {
      const effectivePageSize = (payrollPageSize === 'all' || payrollPageSize >= currentFilteredUsers.length) ? currentFilteredUsers.length : payrollPageSize;
      const totalPages = effectivePageSize > 0 ? Math.ceil(currentFilteredUsers.length / effectivePageSize) : 1;
      if (payrollCurrentPage < totalPages) { payrollCurrentPage++; renderPayrollPage(); }
    };
    if (btnLast) btnLast.onclick = () => {
      const effectivePageSize = (payrollPageSize === 'all' || payrollPageSize >= currentFilteredUsers.length) ? currentFilteredUsers.length : payrollPageSize;
      payrollCurrentPage = effectivePageSize > 0 ? Math.ceil(currentFilteredUsers.length / effectivePageSize) : 1;
      renderPayrollPage();
    };
    if (pageSizeSel) {
      pageSizeSel.onchange = (e) => {
        const val = e.target.value;
        payrollPageSize = val === 'all' ? 'all' : parseInt(val, 10);
        payrollCurrentPage = 1;
        renderPayrollPage();
      };
    }
    if (pageInput) {
      pageInput.onchange = (e) => {
        const effectivePageSize = (payrollPageSize === 'all' || payrollPageSize >= currentFilteredUsers.length) ? currentFilteredUsers.length : payrollPageSize;
        const totalPages = effectivePageSize > 0 ? Math.ceil(currentFilteredUsers.length / effectivePageSize) : 1;
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
          payrollCurrentPage = val;
          renderPayrollPage();
        } else {
          e.target.value = payrollCurrentPage;
        }
      };
    }

    const applyPayrollFilters = () => {
      const q = sInput ? sInput.value.toLowerCase().trim() : '';
      const dVal = dSel ? dSel.value : 'all';
      const locVal = locSel ? locSel.value : 'all';
      const sVal = sSel ? sSel.value : 'all';

      currentFilteredUsers = users.filter(u => {
        if (q) {
          const name = (u.name || '').toLowerCase();
          const empId = (u.employeeId || '').toLowerCase();
          const uid = (u.id || '').toLowerCase();
          const bioId = (u.biometricUserId || u.biometricId || '').toLowerCase();
          if (!name.includes(q) && !empId.includes(q) && !uid.includes(q) && !bioId.includes(q)) return false;
        }
        if (dVal !== 'all') {
          const uDept = (u.department || '').toLowerCase();
          const targetDept = dVal.toLowerCase();
          if (!uDept.includes(targetDept) && !targetDept.includes(uDept)) return false;
        }
        if (locVal !== 'all') {
          if (!userMatchesLocation(u, locVal)) return false;
        }
        if (sVal !== 'all') {
          if (sVal === 'Active') {
            if (u.status === 'Inactive') return false;
          } else if (sVal === 'Inactive') {
            if (u.status !== 'Inactive') return false;
          }
        }
        return true;
      });

      payrollCurrentPage = 1;
      renderPayrollPage();
    };

    if (sInput) {
      sInput.addEventListener('input', applyPayrollFilters);
    }

    [dSel, locSel, sSel].forEach(sel => {
      if (sel) sel.addEventListener('change', applyPayrollFilters);
    });

    renderPayrollPage();
  };

  setupPayrollFilterListeners();
}

export function openUserModal(userId = null, initialTab = 'employee') {
  window.openUserModal = openUserModal;
  window.showAccountModal = openUserModal;
  const currentUser = Auth.getCurrentUser();
  const isEdit = userId !== null;
  const user = isEdit ? DB.getUser(userId) : null;
  const schedules = DB.getSchedules();
  const workLocations = (typeof DB !== 'undefined' && DB.getWorkLocations ? DB.getWorkLocations() : []) || [];
  const userWorkLoc = isEdit && user ? (user.preferredLocation || user.workLocation || (Array.isArray(user.preferredLocations) ? user.preferredLocations[0] : '') || user.branch || '') : '';
  let editorPhotoDataUrl = isEdit && user && user.photo ? user.photo : '';
  let photoRemovedExplicitly = false;

  const activeTab = (initialTab === 'payroll') ? 'payroll' : 'employee';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = html`
    <div class="modal-content" style="max-width: 760px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; padding: 0;">
      <!-- Modal Header -->
      <div class="modal-header" style="padding: 18px 24px 14px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card, #ffffff);">
        <div>
          <h3 class="modal-title" style="margin: 0; font-size: 18px; font-weight: 800; color: var(--text-primary);">
            ${isEdit ? (activeTab === 'payroll' ? 'Modify Employee Payroll & Banking' : 'Modify Employee Profile') : (activeTab === 'payroll' ? 'Setup New Employee Payroll' : 'Register New Employee')}
          </h3>
          <div class="modal-subtitle" style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
            ${isEdit ? (user ? `${Utils.escape(user.name)} (${Utils.escape(user.employeeId)})` : '') : (activeTab === 'payroll' ? 'Configure salary, allowances, deductions, PF/UAN, and bank details for new user' : 'Register employee identity, credentials, branch, shifts, and documents')}
          </div>
        </div>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>

      <!-- Tab Switcher Bar -->
      <div class="modal-tabs-header" style="display: flex; gap: 8px; padding: 0 24px; background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border);">
        <button type="button" class="modal-tab-nav-btn ${activeTab === 'employee' ? 'active' : ''}" id="tab-nav-employee" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-size: 13px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid ${activeTab === 'employee' ? 'var(--primary, #89201B)' : 'transparent'}; color: ${activeTab === 'employee' ? 'var(--primary, #89201B)' : 'var(--text-secondary)'}; transition: all 0.2s ease;">
          <span>👤</span> Employee Details
        </button>
        <button type="button" class="modal-tab-nav-btn ${activeTab === 'payroll' ? 'active' : ''}" id="tab-nav-payroll" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-size: 13px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid ${activeTab === 'payroll' ? 'var(--primary, #89201B)' : 'transparent'}; color: ${activeTab === 'payroll' ? 'var(--primary, #89201B)' : 'var(--text-secondary)'}; transition: all 0.2s ease;">
          <span>💳</span> Payroll & Financials
        </button>
      </div>

      <form id="user-editor-form" style="display: flex; flex-direction: column; flex: 1; overflow-y: auto; padding: 20px 24px; gap: 16px;">
        <!-- TAB 1: EMPLOYEE DETAILS -->
        <div id="tab-pane-employee" style="display: ${activeTab === 'employee' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
          <!-- Profile Photo Upload & Remove Section -->
          <div class="form-group" style="display:flex; align-items:center; gap:16px; margin-bottom:10px; background:rgba(255,255,255,0.02); padding:14px; border-radius:12px; border:1px solid var(--border)">
            <div id="editor-photo-preview" style="width:64px; height:64px; border-radius:10px; background:${isEdit && user && user.photo ? 'transparent' : 'linear-gradient(135deg,#89201B,#5c0f0a)'}; border:2px solid #fbbf24; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; ${isEdit && user && user.photo ? 'cursor:pointer;' : ''}" title="${isEdit && user && user.photo ? 'Click to view full screen' : ''}">
              ${isEdit && user && user.photo ? `<img src="${Utils.resolvePhotoUrl(user.photo)}" style="width:100%; height:100%; object-fit:contain;">` : `<svg viewBox="0 0 24 24" fill="currentColor" style="width:36px; height:36px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`}
            </div>
            <div style="display:flex; flex-direction:column; gap:6px">
              <input type="file" id="editor-photo-file-input" accept="image/*" style="display:none">
              <div style="display:flex; gap:8px; align-items:center;">
                <button id="btn-editor-upload-photo" class="btn btn-sm" type="button" style="width:auto; padding:6px 14px; font-size:12px; font-weight:700; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#fff; border-radius:8px; cursor:pointer;">Upload Photo</button>
                <button id="btn-editor-remove-photo" class="btn btn-sm" type="button" style="width:auto; padding:6px 14px; font-size:12px; font-weight:700; background:#fdf2f2; border:1px solid #fecaca; color:#dc2626; border-radius:8px; cursor:pointer; display:${isEdit && user.photo ? 'block' : 'none'};">Remove Photo</button>
              </div>
              <div style="font-size:10.5px; color:var(--text-muted)">Supports PNG, JPG. Max size 2MB.</div>
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
              <label class="form-label" for="editor-blood-group">Blood Group</label>
              <select class="form-input" id="editor-blood-group">
                <option value="">-- Select Blood Group --</option>
                <option value="A+" ${isEdit && (user.bloodGroup === 'A+') ? 'selected' : ''}>A+</option>
                <option value="A-" ${isEdit && (user.bloodGroup === 'A-') ? 'selected' : ''}>A-</option>
                <option value="B+" ${isEdit && (user.bloodGroup === 'B+') ? 'selected' : ''}>B+</option>
                <option value="B-" ${isEdit && (user.bloodGroup === 'B-') ? 'selected' : ''}>B-</option>
                <option value="O+" ${isEdit && (user.bloodGroup === 'O+') ? 'selected' : ''}>O+</option>
                <option value="O-" ${isEdit && (user.bloodGroup === 'O-') ? 'selected' : ''}>O-</option>
                <option value="AB+" ${isEdit && (user.bloodGroup === 'AB+') ? 'selected' : ''}>AB+</option>
                <option value="AB-" ${isEdit && (user.bloodGroup === 'AB-') ? 'selected' : ''}>AB-</option>
              </select>
            </div>
          </div>

          <!-- Work Location & Branch Fields -->
          <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
            <div>
              <label class="form-label" for="editor-work-location" style="font-weight:700;">Work Location <span style="color:var(--danger);font-size:11px">*</span></label>
              <select class="form-input" id="editor-work-location" required>
                <option value="">-- Select Work Location --</option>
                ${workLocations.map(loc => `
                  <option value="${loc}" ${(userWorkLoc === loc || (isEdit && user && (user.preferredLocation === loc || user.workLocation === loc || user.branch === loc))) ? 'selected' : ''}>${loc}</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" for="editor-branch">Branch</label>
              <input class="form-input" type="text" id="editor-branch" value="${isEdit ? Utils.escape(user.branch || '') : ''}" placeholder="e.g. Delhi Head Office">
            </div>
          </div>

          <!-- Pincode & Biometric User ID Fields -->
          <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
            <div>
              <label class="form-label" for="editor-pincode">Pincode</label>
              <input class="form-input" type="text" id="editor-pincode" value="${isEdit ? Utils.escape(user.pincode || '') : ''}" placeholder="e.g. 110001" maxlength="10">
            </div>
            <div>
              <label class="form-label" for="editor-biometric-id">Biometric User ID <span style="color:var(--text-muted);font-size:11px">(Machine ID)</span></label>
              <input class="form-input" type="text" id="editor-biometric-id" value="${isEdit ? Utils.escape(user.biometricUserId || user.biometricId || '') : ''}" placeholder="e.g. BIO-101">
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

          <div class="form-group">
            <label class="form-label" for="editor-pass">Security Password (Optional)</label>
            <input class="form-input" type="password" id="editor-pass" placeholder="Leave blank to keep unchanged">
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
              <input class="form-input" type="date" id="editor-doj" value="${isEdit ? (user.dateOfJoining && user.dateOfJoining !== '2024-05-10' ? user.dateOfJoining : '') : ''}">
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
                if (currentUser && (currentUser.role === "hr" || currentUser.role === "manager")) {
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
            if (currentUser && (currentUser.role === "hr" || currentUser.role === "manager")) {
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
            <label class="form-label" for="editor-assigned-by">Assigned By <span style="color:var(--text-muted);font-weight:normal;font-size:11px">(HR / Manager registering this employee)</span></label>
            <select class="form-input" id="editor-assigned-by">
              ${(() => {
                const currentUser = Auth.getCurrentUser();
                const admins = DB.getUsers().filter(u => u.role === 'hr' || u.role === 'manager');
                return admins.map(a => `
                  <option value="${a.id}" ${isEdit && user.assignedById === a.id ? 'selected' : (!isEdit && currentUser && a.id === currentUser.id ? 'selected' : '')}>
                    ${Utils.escape(a.name)} (${a.role === 'hr' ? 'HR' : 'Manager'})
                  </option>
                `).join('');
              })()}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-weight:700;">Assigned Shift Schedule(s) & Work Locations</label>
            <div id="editor-schedule-checkboxes" style="display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;max-height:240px;overflow-y:auto;">
              ${schedules.map(s => {
                const isChecked = isEdit
                  ? (Array.isArray(user.scheduleIds) ? user.scheduleIds.includes(s.id) : (user.scheduleId === s.id))
                  : false;
                const shiftLoc = (isEdit && user.shiftLocations && user.shiftLocations[s.id]) || (isEdit && user.preferredLocation) || s.location || '';
                return `
                  <div class="shift-assign-card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:var(--radius-sm);padding:8px 10px;display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;margin:0;user-select:none;">
                        <input type="checkbox" name="editor_shift_select" value="${s.id}" class="editor-shift-checkbox" data-shift-id="${s.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer;width:14px;height:14px;accent-color:var(--primary);">
                        <span><strong>${Utils.escape(s.name)}</strong> <span style="color:var(--text-secondary);font-size:11.5px;">(${formatTimeRange12h(s.startTime, s.endTime)})</span></span>
                      </label>
                      <span style="font-size:10px;color:var(--text-muted);background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.06);white-space:nowrap;">⏱️ ${s.gracePeriod || 15}m Grace</span>
                    </div>
                    <div class="shift-loc-picker-block" id="shift-loc-block-${s.id}" style="display:${isChecked ? 'flex' : 'none'};align-items:center;gap:8px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.08);margin-left:22px;flex-wrap:wrap;">
                      <span style="font-size:11px;font-weight:600;color:var(--text-secondary);white-space:nowrap;">📍 Work Location:</span>
                      <select class="editor-shift-location-select" data-shift-id="${s.id}" id="editor-shift-loc-${s.id}" style="flex:1;min-width:160px;max-width:240px;height:28px;padding:2px 8px;font-size:11.5px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-surface, #1e1e24);color:var(--text-primary);cursor:pointer;">
                        ${workLocations.map(loc => `
                          <option value="${loc}" ${shiftLoc === loc ? 'selected' : ''}>${loc}</option>
                        `).join('')}
                      </select>
                      <button type="button" class="btn-shift-custom-loc" data-shift-id="${s.id}" style="width:auto;height:28px;padding:0 9px;font-size:11px;font-weight:600;border-radius:var(--radius-sm);background:rgba(6,182,212,0.1);color:var(--cyan);border:1px solid rgba(6,182,212,0.3);cursor:pointer;white-space:nowrap;">✏️ Custom</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 15px;">
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
        </div>

        <!-- TAB 2: PAYROLL & FINANCIALS -->
        <div id="tab-pane-payroll" style="display: ${activeTab === 'payroll' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
          <!-- Section 1: Salary & Bonus -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span>💰</span> Compensation & Salary
            </div>
            <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px; margin-bottom: 0;">
              <div>
                <label class="form-label" for="editor-salary">Base Salary (INR/Month)</label>
                <input class="form-input" type="number" id="editor-salary" value="${isEdit ? (user.baseSalary !== undefined && user.baseSalary !== null ? user.baseSalary : '') : ''}" placeholder="e.g. 50000">
              </div>
              <div>
                <label class="form-label" for="editor-bonus">Bonus (INR)</label>
                <input class="form-input" type="number" id="editor-bonus" value="${isEdit ? (user.bonus !== undefined && user.bonus !== null ? user.bonus : '') : ''}" placeholder="e.g. 5000">
              </div>
            </div>
          </div>

          <!-- Section 2: Total Allowances & Breakdown -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>➕</span> Allowances
              </div>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Auto-calculates from HRA + Travel + Bonus</span>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" for="editor-total-allowances" style="font-weight: 700; color: var(--success);">Total Allowances (INR/Month)</label>
              <input class="form-input" type="number" id="editor-total-allowances" value="${isEdit ? (user.totalAllowances !== undefined && user.totalAllowances !== null ? user.totalAllowances : '') : ''}" placeholder="e.g. 15000" style="font-weight: 700; border-color: rgba(16,185,129,0.3);">
            </div>
            <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px; margin-bottom: 0;">
              <div>
                <label class="form-label" for="editor-hra" style="font-size:11px">HRA (INR/Month)</label>
                <input class="form-input" type="number" id="editor-hra" value="${isEdit ? (user.allowanceHRA !== undefined && user.allowanceHRA !== null ? user.allowanceHRA : '') : ''}" placeholder="e.g. 10000">
              </div>
              <div>
                <label class="form-label" for="editor-travel" style="font-size:11px">Travel Allowance (INR/Month)</label>
                <input class="form-input" type="number" id="editor-travel" value="${isEdit ? (user.allowanceTravel !== undefined && user.allowanceTravel !== null ? user.allowanceTravel : '') : ''}" placeholder="e.g. 3000">
              </div>
            </div>
          </div>

          <!-- Section 3: Total Deduction & Breakdown -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>➖</span> Deductions
              </div>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">Auto-calculates from PF + PT + TDS</span>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" for="editor-total-deductions" style="font-weight: 700; color: var(--error);">Total Deduction (INR/Month)</label>
              <input class="form-input" type="number" id="editor-total-deductions" value="${isEdit ? (user.totalDeductions !== undefined && user.totalDeductions !== null ? user.totalDeductions : (user.totalDeduction !== undefined && user.totalDeduction !== null ? user.totalDeduction : '')) : ''}" placeholder="e.g. 6200" style="font-weight: 700; border-color: rgba(239,68,68,0.3);">
            </div>
            <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr 1fr;gap:12px; margin-bottom: 0;">
              <div>
                <label class="form-label" for="editor-pf" style="font-size:11px">PF (INR/Month)</label>
                <input class="form-input" type="number" id="editor-pf" value="${isEdit ? (user.deductionPF !== undefined && user.deductionPF !== null ? user.deductionPF : '') : ''}" placeholder="e.g. 3000">
              </div>
              <div>
                <label class="form-label" for="editor-pt" style="font-size:11px">Professional Tax (PT)</label>
                <input class="form-input" type="number" id="editor-pt" value="${isEdit ? (user.deductionPT !== undefined && user.deductionPT !== null ? user.deductionPT : '') : ''}" placeholder="e.g. 200">
              </div>
              <div>
                <label class="form-label" for="editor-tds" style="font-size:11px">TDS Tax Rate (%)</label>
                <input class="form-input" type="number" id="editor-tds" value="${isEdit ? (user.deductionTDS !== undefined && user.deductionTDS !== null ? user.deductionTDS : '') : ''}" min="0" max="100" placeholder="e.g. 10">
              </div>
            </div>
          </div>

          <!-- Section 4: Statutory & Social Security (UAN & PF No) -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span>🏛️</span> Statutory & PF Numbers
            </div>
            <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px; margin-bottom: 0;">
              <div>
                <label class="form-label" for="editor-uan">UAN No. <span style="font-size:11px; color:var(--text-muted);">(Universal Account No)</span></label>
                <input class="form-input" type="text" id="editor-uan" value="${isEdit ? Utils.escape(user.uanNo || user.uanNumber || '') : ''}" placeholder="e.g. 101234567890">
              </div>
              <div>
                <label class="form-label" for="editor-pf-no">PF No. <span style="font-size:11px; color:var(--text-muted);">(Provident Fund No)</span></label>
                <input class="form-input" type="text" id="editor-pf-no" value="${isEdit ? Utils.escape(user.pfNo || user.pfNumber || '') : ''}" placeholder="e.g. MH/BAN/0012345/000/0000123">
              </div>
            </div>
          </div>

          <!-- Section 5: Banking Details -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span>🏦</span> Bank Account Information
            </div>
            <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px; margin-bottom: 12px;">
              <div>
                <label class="form-label" for="editor-bank-name">Bank Name</label>
                <input class="form-input" type="text" id="editor-bank-name" value="${isEdit ? Utils.escape(user.bankName || '') : ''}" placeholder="e.g. State Bank of India">
              </div>
              <div>
                <label class="form-label" for="editor-account-number">Account Number</label>
                <input class="form-input" type="text" id="editor-account-number" value="${isEdit ? Utils.escape(user.accountNumber || '') : ''}" placeholder="e.g. 987654321012">
              </div>
            </div>
            <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px; margin-bottom: 0;">
              <div>
                <label class="form-label" for="editor-ifsc">IFSC Code</label>
                <input class="form-input" type="text" id="editor-ifsc" value="${isEdit ? Utils.escape(user.ifscCode || '') : ''}" placeholder="e.g. SBIN0001234" style="text-transform:uppercase;">
              </div>
              <div>
                <label class="form-label" for="editor-bank-branch">Bank Branch Name</label>
                <input class="form-input" type="text" id="editor-bank-branch" value="${isEdit ? Utils.escape(user.bankBranchName || '') : ''}" placeholder="e.g. Connaught Place Branch">
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="modal-actions" style="margin-top:auto; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <button class="btn btn-secondary" type="button" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline-equify" type="button" id="btn-modal-tab-toggle" style="font-size:12px;">
              ${activeTab === 'employee' ? 'Payroll Setup ➜' : '⬅ Employee Details'}
            </button>
            <button class="btn btn-primary-equify" type="submit">${isEdit ? 'Save Changes' : 'Save Employee & Payroll'}</button>
          </div>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  // Tab switching logic
  const tabNavEmp = overlay.querySelector('#tab-nav-employee');
  const tabNavPay = overlay.querySelector('#tab-nav-payroll');
  const tabPaneEmp = overlay.querySelector('#tab-pane-employee');
  const tabPanePay = overlay.querySelector('#tab-pane-payroll');
  const tabToggleBtn = overlay.querySelector('#btn-modal-tab-toggle');

  let currentModalTab = activeTab;

  function setModalTab(tab) {
    currentModalTab = tab;
    const titleEl = overlay.querySelector('.modal-title');
    const subtitleEl = overlay.querySelector('.modal-subtitle');

    if (tab === 'employee') {
      tabPaneEmp.style.display = 'flex';
      tabPanePay.style.display = 'none';
      tabNavEmp.style.borderBottom = '2px solid var(--primary, #89201B)';
      tabNavEmp.style.color = 'var(--primary, #89201B)';
      tabNavPay.style.borderBottom = '2px solid transparent';
      tabNavPay.style.color = 'var(--text-secondary)';
      if (tabToggleBtn) tabToggleBtn.innerHTML = 'Payroll Setup ➜';
      if (titleEl) titleEl.textContent = isEdit ? 'Modify Employee Profile' : 'Register New Employee';
      if (subtitleEl && !isEdit) subtitleEl.textContent = 'Register employee identity, credentials, branch, shifts, and documents';
    } else {
      tabPaneEmp.style.display = 'none';
      tabPanePay.style.display = 'flex';
      tabNavPay.style.borderBottom = '2px solid var(--primary, #89201B)';
      tabNavPay.style.color = 'var(--primary, #89201B)';
      tabNavEmp.style.borderBottom = '2px solid transparent';
      tabNavEmp.style.color = 'var(--text-secondary)';
      if (tabToggleBtn) tabToggleBtn.innerHTML = '⬅ Employee Details';
      if (titleEl) titleEl.textContent = isEdit ? 'Modify Employee Payroll & Banking' : 'Setup New Employee Payroll';
      if (subtitleEl && !isEdit) subtitleEl.textContent = 'Configure salary, allowances, deductions, PF/UAN, and bank details for new user';
    }
  }

  if (tabNavEmp) tabNavEmp.addEventListener('click', () => setModalTab('employee'));
  if (tabNavPay) tabNavPay.addEventListener('click', () => setModalTab('payroll'));
  if (tabToggleBtn) {
    tabToggleBtn.addEventListener('click', () => {
      setModalTab(currentModalTab === 'employee' ? 'payroll' : 'employee');
    });
  }

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

  // Live Auto-Calculation for Allowances and Deductions
  const hraInput = overlay.querySelector('#editor-hra');
  const travelInput = overlay.querySelector('#editor-travel');
  const bonusInput = overlay.querySelector('#editor-bonus');
  const totalAllowancesInput = overlay.querySelector('#editor-total-allowances');

  const pfInput = overlay.querySelector('#editor-pf');
  const ptInput = overlay.querySelector('#editor-pt');
  const tdsInput = overlay.querySelector('#editor-tds');
  const salaryInput = overlay.querySelector('#editor-salary');
  const totalDeductionsInput = overlay.querySelector('#editor-total-deductions');

  let userManuallySetAllowances = (isEdit && user && user.totalAllowances !== undefined && user.totalAllowances !== null);
  let userManuallySetDeductions = (isEdit && user && ((user.totalDeductions !== undefined && user.totalDeductions !== null) || (user.totalDeduction !== undefined && user.totalDeduction !== null)));

  function recalcAllowances() {
    if (userManuallySetAllowances) return;
    const hra = parseFloat(hraInput?.value || 0) || 0;
    const travel = parseFloat(travelInput?.value || 0) || 0;
    const bonus = parseFloat(bonusInput?.value || 0) || 0;
    const sum = hra + travel + bonus;
    if (totalAllowancesInput) {
      totalAllowancesInput.value = sum > 0 ? sum : '';
    }
  }

  function recalcDeductions() {
    if (userManuallySetDeductions) return;
    const pf = parseFloat(pfInput?.value || 0) || 0;
    const pt = parseFloat(ptInput?.value || 0) || 0;
    const tdsPct = parseFloat(tdsInput?.value || 0) || 0;
    const salary = parseFloat(salaryInput?.value || 0) || 0;
    const tdsAmt = (salary * tdsPct) / 100;
    const sum = pf + pt + tdsAmt;
    if (totalDeductionsInput) {
      totalDeductionsInput.value = sum > 0 ? Math.round(sum) : '';
    }
  }

  if (totalAllowancesInput) {
    totalAllowancesInput.addEventListener('input', () => {
      userManuallySetAllowances = true;
    });
  }
  if (totalDeductionsInput) {
    totalDeductionsInput.addEventListener('input', () => {
      userManuallySetDeductions = true;
    });
  }

  [hraInput, travelInput, bonusInput].forEach(inp => {
    if (inp) inp.addEventListener('input', recalcAllowances);
  });

  [pfInput, ptInput, tdsInput, salaryInput].forEach(inp => {
    if (inp) inp.addEventListener('input', recalcDeductions);
  });

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
          photoRemovedExplicitly = false;
          editorPhotoDataUrl = event.target.result;
          if (editorPhotoPreview) {
            editorPhotoPreview.innerHTML = html`<img src="${editorPhotoDataUrl}" style="width:100%; height:100%; object-fit:contain;">`;
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
      photoRemovedExplicitly = true;
      editorPhotoDataUrl = null;
      if (editorPhotoPreview) {
        editorPhotoPreview.innerHTML = html`<svg viewBox="0 0 24 24" fill="currentColor" style="width:36px; height:36px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`;
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
        (window.enterCustomLocation || enterCustomLocation)(locSelect);
      }
    });
  });

  const editorWorkLocSelect = overlay.querySelector('#editor-work-location');
  const editorBranchInput = overlay.querySelector('#editor-branch');
  if (editorWorkLocSelect && editorBranchInput) {
    editorWorkLocSelect.addEventListener('change', () => {
      if (!editorBranchInput.value || editorWorkLocSelect.value) {
        editorBranchInput.value = editorWorkLocSelect.value;
      }
    });
  }

  document.getElementById('user-editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('editor-name') ? document.getElementById('editor-name').value.trim() : (isEdit ? user.name : '');
    const employeeId = document.getElementById('editor-empid') ? document.getElementById('editor-empid').value.trim() : (isEdit ? user.employeeId : '');
    const email = document.getElementById('editor-email') ? document.getElementById('editor-email').value.trim() : (isEdit ? user.email : '');
    const phone = document.getElementById('editor-phone') ? document.getElementById('editor-phone').value.trim() : (isEdit ? user.phone : '');
    const dob = document.getElementById('editor-dob') ? document.getElementById('editor-dob').value : (isEdit ? user.dob : '');
    const username = document.getElementById('editor-username') ? document.getElementById('editor-username').value.trim() : '';
    const password = document.getElementById('editor-pass') ? document.getElementById('editor-pass').value.trim() : '';
    const city = document.getElementById('editor-city') ? document.getElementById('editor-city').value.trim() : (isEdit ? user.city || '' : '');
    const state = document.getElementById('editor-state') ? document.getElementById('editor-state').value.trim() : (isEdit ? user.state || '' : '');
    const baseSalaryVal = document.getElementById('editor-salary') ? document.getElementById('editor-salary').value.trim() : '';
    const baseSalary = baseSalaryVal === '' ? null : Number(baseSalaryVal);

    // New Fields
    const workLocation = document.getElementById('editor-work-location') ? document.getElementById('editor-work-location').value.trim() : '';
    const branch = (document.getElementById('editor-branch') ? document.getElementById('editor-branch').value.trim() : (isEdit ? user.branch || '' : '')) || workLocation;
    const pincode = document.getElementById('editor-pincode') ? document.getElementById('editor-pincode').value.trim() : (isEdit ? user.pincode || '' : '');
    const bloodGroup = document.getElementById('editor-blood-group') ? document.getElementById('editor-blood-group').value.trim() : (isEdit ? user.bloodGroup || '' : '');

    const bonusVal = document.getElementById('editor-bonus') ? document.getElementById('editor-bonus').value.trim() : '';
    const bonus = bonusVal === '' ? null : Number(bonusVal);

    const totalAllowancesVal = document.getElementById('editor-total-allowances') ? document.getElementById('editor-total-allowances').value.trim() : '';
    const totalAllowances = totalAllowancesVal === '' ? null : Number(totalAllowancesVal);

    const totalDeductionsVal = document.getElementById('editor-total-deductions') ? document.getElementById('editor-total-deductions').value.trim() : '';
    const totalDeductions = totalDeductionsVal === '' ? null : Number(totalDeductionsVal);

    const uanNo = document.getElementById('editor-uan') ? document.getElementById('editor-uan').value.trim() : (isEdit ? (user.uanNo || user.uanNumber || '') : '');
    const pfNo = document.getElementById('editor-pf-no') ? document.getElementById('editor-pf-no').value.trim() : (isEdit ? (user.pfNo || user.pfNumber || '') : '');

    const bankName = document.getElementById('editor-bank-name') ? document.getElementById('editor-bank-name').value.trim() : (isEdit ? user.bankName || '' : '');
    const accountNumber = document.getElementById('editor-account-number') ? document.getElementById('editor-account-number').value.trim() : (isEdit ? user.accountNumber || '' : '');
    const ifscCode = document.getElementById('editor-ifsc') ? document.getElementById('editor-ifsc').value.trim().toUpperCase() : (isEdit ? user.ifscCode || '' : '');
    const bankBranchName = document.getElementById('editor-bank-branch') ? document.getElementById('editor-bank-branch').value.trim() : (isEdit ? user.bankBranchName || '' : '');
    
    // Multiple shift schedules & their separate locations
    const selectedShiftCheckboxes = Array.from(overlay.querySelectorAll('input[name="editor_shift_select"]:checked'));
    const scheduleIds = selectedShiftCheckboxes.map(cb => cb.value);
    const scheduleId = scheduleIds.length > 0 ? scheduleIds[0] : null;
    
    const shiftLocations = {};
    selectedShiftCheckboxes.forEach(cb => {
      const sid = cb.value;
      const locSelect = overlay.querySelector(`.editor-shift-location-select[data-shift-id="${sid}"]`);
      if (locSelect) {
        shiftLocations[sid] = locSelect.value.trim() || '';
      } else {
        shiftLocations[sid] = '';
      }
    });

    const preferredLocation = workLocation || ((scheduleId && shiftLocations[scheduleId]) ? shiftLocations[scheduleId] : (Object.values(shiftLocations).find(Boolean) || (isEdit && user ? user.preferredLocation : null) || ''));
    const preferredLocations = preferredLocation ? [preferredLocation] : (user && user.preferredLocations ? user.preferredLocations : []);

    const roleEl = document.getElementById('editor-role');
    const role = roleEl ? roleEl.value : (isEdit ? user.role : 'employee');
    const genderEl = document.getElementById('editor-gender');
    const gender = genderEl ? genderEl.value : (isEdit ? user.gender : 'Male');
    const biometricEl = document.getElementById('editor-biometric-id');
    const biometricUserId = biometricEl ? biometricEl.value.trim() : (isEdit ? (user.biometricUserId || user.biometricId || '') : '');
    const deptEl = document.getElementById('editor-dept');
    const department = deptEl ? deptEl.value.trim() : (isEdit ? user.department || '' : '');
    const desgEl = document.getElementById('editor-desg');
    const designation = desgEl ? desgEl.value.trim() : (isEdit ? user.designation || '' : '');
    const dojEl = document.getElementById('editor-doj');
    const dateOfJoining = dojEl ? dojEl.value : (isEdit ? (user.dateOfJoining && user.dateOfJoining !== '2024-05-10' ? user.dateOfJoining : '') : '');
    const emergencyEl = document.getElementById('editor-emergency');
    const emergencyContact = emergencyEl ? emergencyEl.value.trim() : (isEdit ? user.emergencyContact || '' : '');

    const hraVal = document.getElementById('editor-hra') ? document.getElementById('editor-hra').value.trim() : '';
    const allowanceHRA = hraVal === '' ? null : Number(hraVal);
    const travelVal = document.getElementById('editor-travel') ? document.getElementById('editor-travel').value.trim() : '';
    const allowanceTravel = travelVal === '' ? null : Number(travelVal);
    const pfVal = document.getElementById('editor-pf') ? document.getElementById('editor-pf').value.trim() : '';
    const deductionPF = pfVal === '' ? null : Number(pfVal);
    const ptVal = document.getElementById('editor-pt') ? document.getElementById('editor-pt').value.trim() : '';
    const deductionPT = ptVal === '' ? null : Number(ptVal);
    const tdsVal = document.getElementById('editor-tds') ? document.getElementById('editor-tds').value.trim() : '';
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
      setModalTab('employee');
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
    const managerId = managerSelect ? managerSelect.value : (currentUser && currentUser.role === "manager" ? currentUser.id : (isEdit ? user.managerId : ''));
    const assignedBySelect = document.getElementById('editor-assigned-by');
    const assignedById = assignedBySelect ? assignedBySelect.value : (currentUser ? currentUser.id : "");

    if (isEdit) {
      // Only include the password field in the update if the admin entered a new one.
      // If left blank, omit it so the existing hashed password on the server is preserved.
      const updates = {
        name, employeeId, biometricUserId, biometricId: biometricUserId, email, phone, dob, baseSalary, scheduleId, scheduleIds, shiftLocations, role,
        workLocation, preferredLocation, preferredLocations,
        gender, department, designation, dateOfJoining, emergencyContact,
        resume: resumeObj, aadhar: aadharObj, allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS,
        managerId, assignedById,
        profileVerificationStatus: 'Approved',
        photo: photoRemovedExplicitly ? null : (editorPhotoDataUrl || (isEdit && user && user.photo ? user.photo : null)),
        city, state,
        branch, pincode, bloodGroup, bonus,
        totalAllowances, totalDeduction: totalDeductions, totalDeductions,
        uanNo, uanNumber: uanNo, pfNo, pfNumber: pfNo,
        bankName, accountNumber, ifscCode, bankBranchName,
        profileVerificationComment: '',
        pendingProfileEdits: null
      };
      // Hash and include the new password only if the admin explicitly entered one
      if (password) {
        updates.password = Utils.hashPassword(password);
      }
      const existingUserCloned = user ? JSON.parse(JSON.stringify(user)) : null;
      DB.updateUser(userId, updates);
      const diffText = DB.generateProfileChangeDiff ? DB.generateProfileChangeDiff(existingUserCloned, updates, currentUser ? currentUser.name : 'HR/Manager') : `Your profile details (designation, salary, work shifts, or locations) have been updated by ${currentUser ? currentUser.name : 'HR/Manager'}.`;
      DB.notifyEmployeeProfileChange(userId, 'updated', diffText, currentUser);

      try {
        let sessionToken = '';
        try {
          const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
          if (sess) sessionToken = JSON.parse(sess).token || '';
        } catch (e) {}
        await fetch((window.apiBaseUrl || '') + '/api/mutate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ action: 'sync', data: DB.data })
        });
      } catch (err) {
        console.warn('Network error synchronizing mutation with backend database:', err);
      }

      closeModal(overlay);
      if (window.location.hash === '#admin-dashboard' && typeof renderAdminDashboard === 'function') {
        await renderAdminDashboard();
      } else if ((window.location.hash === '#admin-payroll' || window.location.hash === '#payroll') && typeof renderAdminPayroll === 'function') {
        renderAdminPayroll();
      } else if (typeof renderAdminUsers === 'function') {
        renderAdminUsers();
      }
      if (typeof showToastNotification === 'function') {
        showToastNotification('✅ Employee details updated successfully.', 'success');
      } else {
        alert('Employee details updated successfully.');
      }
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
      const rawPassword = password || 'Surya@123';
      const finalPassword = Utils.hashPassword(rawPassword);

      const enteredId = employeeId.trim();
      const allUsersList = DB.getUsers();
      const existingUserById = enteredId ? allUsersList.find(u => u && u.employeeId && String(u.employeeId).trim().toUpperCase() === enteredId.toUpperCase()) : null;
      const existingUserByUsername = finalUsername ? allUsersList.find(u => u && u.username && String(u.username).trim().toLowerCase() === finalUsername.toLowerCase()) : null;
      if ((existingUserById && (!isEdit || existingUserById.id !== (user ? user.id : null))) ||
          (existingUserByUsername && (!isEdit || existingUserByUsername.id !== (user ? user.id : null)))) {
        await CustomDialog.alert('Employee ID / HR ID or Username is already taken.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = isEdit ? 'Save Changes' : 'Create User';
        }
        return;
      }
      const createdUser = DB.addUser({
        name, employeeId: employeeId || nextEmpId, biometricUserId, biometricId: biometricUserId,
        email, phone, dob, username: finalUsername, password: finalPassword, role,
        baseSalary, scheduleId, scheduleIds, shiftLocations,
        workLocation, preferredLocation, preferredLocations,
        gender, department, designation, dateOfJoining, emergencyContact,
        resume: resumeObj, aadhar: aadharObj,
        allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS,
        managerId, assignedById, photo: editorPhotoDataUrl || null,
        city, state,
        branch, pincode, bloodGroup, bonus,
        totalAllowances, totalDeduction: totalDeductions, totalDeductions,
        uanNo, uanNumber: uanNo, pfNo, pfNumber: pfNo,
        bankName, accountNumber, ifscCode, bankBranchName
      });
      if (createdUser) {
        DB.notifyEmployeeProfileChange(createdUser.id, 'created', `Welcome ${name}! Your employee portal profile was registered by ${currentUser ? currentUser.name : 'HR/Manager'}.`, currentUser);
      }

      try {
        let sessionToken = '';
        try {
          const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
          if (sess) sessionToken = JSON.parse(sess).token || '';
        } catch (e) {}
        await fetch((window.apiBaseUrl || '') + '/api/mutate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({ action: 'sync', data: DB.data })
        });
      } catch (err) {
        console.warn('Network error synchronizing mutation with backend database:', err);
      }

      closeModal(overlay);
      if (window.showAccountCreationSuccessModal && createdUser) {
        window.showAccountCreationSuccessModal(createdUser, rawPassword);
      } else {
        if (typeof showToastNotification === 'function') {
          showToastNotification('✅ Employee registered successfully.', 'success');
        } else {
          alert('Employee registered successfully.');
        }
      }
    }

    if (window.location.hash === '#admin-dashboard') {
      await renderAdminDashboard();
    } else if (window.location.hash === '#admin-payroll' || window.location.hash === '#payroll') {
      renderAdminPayroll();
    } else {
      renderAdminUsers();
    }
  });
}

// ============================================================================
// BULK EMPLOYEE DATA IMPORT ENGINE (EXCEL & CSV UPSERT)
// ============================================================================

export function parseUploadDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }
  // Check if Excel numeric serial date (e.g. 45427)
  if (typeof val === 'number' || (!isNaN(val) && !isNaN(parseFloat(val)) && isFinite(val) && Number(val) > 20000 && Number(val) < 80000)) {
    const d = new Date(Math.round((Number(val) - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str.replace(/\//g, '-');
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
}

export function parseUploadNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[₹$,\s]/g, '').trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

export function normalizeBulkRow(raw) {
  const norm = {
    name: '',
    employeeId: '',
    department: '',
    designation: '',
    branch: '',
    pincode: '',
    bloodGroup: '',
    phone: '',
    email: '',
    dob: '',
    gender: '',
    dateOfJoining: '',
    preferredLocation: '',
    shift: '',
    biometricUserId: '',
    city: '',
    state: '',
    address: '',
    emergencyContact: '',
    role: '',
    status: '',
    baseSalary: null,
    allowanceHRA: null,
    allowanceTravel: null,
    bonus: null,
    totalAllowances: null,
    deductionPF: null,
    deductionPT: null,
    deductionTDS: null,
    totalDeductions: null,
    uanNo: '',
    pfNo: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    bankBranchName: ''
  };

  for (const [k, v] of Object.entries(raw || {})) {
    if (v === undefined || v === null || String(v).trim() === '') continue;
    const cleanKey = k.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanVal = typeof v === 'string' ? v.trim() : v;

    if (/^(name|fullname|employeename|empname|staffname)$/.test(cleanKey)) {
      norm.name = String(cleanVal).trim();
    } else if (/^(employeeid|empid|id|userid|employeecode|empcode)$/.test(cleanKey)) {
      norm.employeeId = String(cleanVal).trim();
    } else if (/^(department|dept|departmentname)$/.test(cleanKey)) {
      norm.department = String(cleanVal).trim();
    } else if (/^(designation|jobtitle|post|title)$/.test(cleanKey)) {
      norm.designation = String(cleanVal).trim();
    } else if (/^(branch|branchname)$/.test(cleanKey)) {
      norm.branch = String(cleanVal).trim();
    } else if (/^(pincode|pincodeno|postalcode|zip|zipcode)$/.test(cleanKey)) {
      norm.pincode = String(cleanVal).trim();
    } else if (/^(bloodgroup|bloodgrp|bg)$/.test(cleanKey)) {
      norm.bloodGroup = String(cleanVal).trim();
    } else if (/^(phone|phonenumber|mobile|mobilenumber|contact|contactnumber)$/.test(cleanKey)) {
      norm.phone = String(cleanVal).trim();
    } else if (/^(email|emailaddress|emailid)$/.test(cleanKey)) {
      norm.email = String(cleanVal).trim();
    } else if (/^(dateofjoining|doj|joiningdate|joindate)$/.test(cleanKey)) {
      norm.dateOfJoining = parseUploadDate(cleanVal);
    } else if (/^(dateofbirth|dob|birthdate)$/.test(cleanKey)) {
      norm.dob = parseUploadDate(cleanVal);
    } else if (/^(gender|sex)$/.test(cleanKey)) {
      norm.gender = String(cleanVal).trim();
    } else if (/^(preferredlocation|worklocation|worksite|worklocationname|location)$/.test(cleanKey)) {
      norm.preferredLocation = String(cleanVal).trim();
    } else if (/^(assignedshift|shift|shifts|schedule|shiftname)$/.test(cleanKey)) {
      norm.shift = String(cleanVal).trim();
    } else if (/^(biometricuserid|biometricid|machineid|deviceid|deviceuserid)$/.test(cleanKey)) {
      norm.biometricUserId = String(cleanVal).trim();
    } else if (/^city$/.test(cleanKey)) {
      norm.city = String(cleanVal).trim();
    } else if (/^state$/.test(cleanKey)) {
      norm.state = String(cleanVal).trim();
    } else if (/^(address|residentialaddress)$/.test(cleanKey)) {
      norm.address = String(cleanVal).trim();
    } else if (/^(emergencycontact|emergencyphone|emergencyno)$/.test(cleanKey)) {
      norm.emergencyContact = String(cleanVal).trim();
    } else if (/^(role|systemrole|userrole)$/.test(cleanKey)) {
      norm.role = String(cleanVal).trim().toLowerCase();
    } else if (/^(status|userstatus|activestatus)$/.test(cleanKey)) {
      norm.status = String(cleanVal).trim();
    } else if (/^(basesalary|basicsalary|salary|grosssalary)$/.test(cleanKey)) {
      norm.baseSalary = parseUploadNumber(cleanVal);
    } else if (/^(allowancehra|hra)$/.test(cleanKey)) {
      norm.allowanceHRA = parseUploadNumber(cleanVal);
    } else if (/^(allowancetravel|travel|travelallowance)$/.test(cleanKey)) {
      norm.allowanceTravel = parseUploadNumber(cleanVal);
    } else if (/^bonus$/.test(cleanKey)) {
      norm.bonus = parseUploadNumber(cleanVal);
    } else if (/^(totalallowances|allowances)$/.test(cleanKey)) {
      norm.totalAllowances = parseUploadNumber(cleanVal);
    } else if (/^(deductionpf|pf)$/.test(cleanKey)) {
      norm.deductionPF = parseUploadNumber(cleanVal);
    } else if (/^(deductionpt|pt)$/.test(cleanKey)) {
      norm.deductionPT = parseUploadNumber(cleanVal);
    } else if (/^(deductiontds|tds)$/.test(cleanKey)) {
      norm.deductionTDS = parseUploadNumber(cleanVal);
    } else if (/^(totaldeductions|deductions)$/.test(cleanKey)) {
      norm.totalDeductions = parseUploadNumber(cleanVal);
    } else if (/^(uanno|uan|uannumber)$/.test(cleanKey)) {
      norm.uanNo = String(cleanVal).trim();
    } else if (/^(pfno|pfnumber)$/.test(cleanKey)) {
      norm.pfNo = String(cleanVal).trim();
    } else if (/^bankname$/.test(cleanKey)) {
      norm.bankName = String(cleanVal).trim();
    } else if (/^(accountnumber|bankaccountnumber|accno)$/.test(cleanKey)) {
      norm.accountNumber = String(cleanVal).trim();
    } else if (/^(ifsccode|ifsc)$/.test(cleanKey)) {
      norm.ifscCode = String(cleanVal).trim();
    } else if (/^(bankbranchname|bankbranch)$/.test(cleanKey)) {
      norm.bankBranchName = String(cleanVal).trim();
    }
  }

  return norm;
}

export async function downloadBulkUploadTemplate(format = 'xlsx') {
  const sampleData = [
    {
      "Employee ID": "EMP101",
      "Employee Name": "Rahul Sharma",
      "Department": "Engineering",
      "Designation": "Software Developer",
      "Branch": "Delhi Head Office",
      "Work Location": "Delhi Head Office",
      "Mobile Number": "+91 9876543210",
      "Email": "rahul.sharma@example.com",
      "Date of Joining": "2024-05-15",
      "Date of Birth": "1995-08-20",
      "Gender": "Male",
      "Blood Group": "B+",
      "Pincode": "110001",
      "City": "New Delhi",
      "State": "Delhi",
      "Biometric User ID": "101",
      "Assigned Shift": "General Shift",
      "Base Salary": 45000,
      "HRA": 6750,
      "Travel Allowance": 2000,
      "PF": 1800,
      "PT": 200,
      "Bank Name": "State Bank of India",
      "Account Number": "987654321012",
      "IFSC Code": "SBIN0001234",
      "UAN Number": "100987654321"
    },
    {
      "Employee ID": "EMP102",
      "Employee Name": "Priya Verma",
      "Department": "Human Resources",
      "Designation": "HR Executive",
      "Branch": "Noida Branch",
      "Work Location": "Noida sector 61",
      "Mobile Number": "+91 9812345678",
      "Email": "priya.verma@example.com",
      "Date of Joining": "2024-06-01",
      "Date of Birth": "1998-03-12",
      "Gender": "Female",
      "Blood Group": "O+",
      "Pincode": "201301",
      "City": "Noida",
      "State": "Uttar Pradesh",
      "Biometric User ID": "102",
      "Assigned Shift": "General Shift",
      "Base Salary": 38000,
      "HRA": 5700,
      "Travel Allowance": 1500,
      "PF": 1800,
      "PT": 200,
      "Bank Name": "HDFC Bank",
      "Account Number": "50100234567891",
      "IFSC Code": "HDFC0000123",
      "UAN Number": "100987654322"
    }
  ];

  if (format === 'csv') {
    const headers = Object.keys(sampleData[0]);
    const csvRows = [
      headers.join(','),
      ...sampleData.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Employee_Bulk_Upload_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // 1. Fetch available work locations from database records
  const getDatabaseWorkLocations = () => {
    const locSet = new Set();
    const officeCoords = (typeof DB !== 'undefined' && DB.getOfficeCoordinates ? DB.getOfficeCoordinates() : (window.OFFICE_COORDINATES || {})) || {};
    Object.keys(officeCoords).forEach(loc => {
      if (!loc || typeof loc !== 'string') return;
      const clean = loc.trim();
      const lower = clean.toLowerCase();
      if (!lower.includes('close') && !lower.includes('(') && !lower.includes('mock') && lower !== 'none' && lower !== '--') {
        locSet.add(clean);
      }
    });
    const schedules = (typeof DB !== 'undefined' && DB.getSchedules ? DB.getSchedules() : []) || [];
    schedules.forEach(s => {
      if (s && s.location && typeof s.location === 'string') {
        const clean = s.location.trim();
        if (clean && !clean.toLowerCase().includes('close') && !clean.includes('(')) {
          locSet.add(clean);
        }
      }
    });
    locSet.add('Delhi Head Office');
    locSet.add('Noida sector 61');
    return Array.from(locSet).sort((a, b) => a.localeCompare(b));
  };

  // 2. Fetch available shifts from database records
  const getDatabaseShifts = () => {
    const shiftSet = new Set();
    const schedules = (typeof DB !== 'undefined' && DB.getSchedules ? DB.getSchedules() : []) || [];
    schedules.forEach(s => {
      if (s && s.name && typeof s.name === 'string') {
        const clean = s.name.trim();
        if (clean) shiftSet.add(clean);
      }
    });
    shiftSet.add('General Shift');
    shiftSet.add('Morning Shift 900');
    shiftSet.add('Afternoon shift');
    return Array.from(shiftSet);
  };

  // 3. Predefined Blood Group options
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // 4. Predefined Gender options
  const genders = ['Male', 'Female', 'Other'];

  const workLocations = getDatabaseWorkLocations();
  const assignedShifts = getDatabaseShifts();

  // Try generating via ExcelJS for instant in-browser generation with data validation dropdowns
  const ExcelJSClass = window.ExcelJS || (typeof ExcelJS !== 'undefined' ? ExcelJS : null);
  if (ExcelJSClass) {
    try {
      const wb = new ExcelJSClass.Workbook();
      wb.creator = 'HS Group Delhi';
      wb.created = new Date();

      const ws = wb.addWorksheet('Employees Template');
      const refWs = wb.addWorksheet('ReferenceLists');
      refWs.state = 'hidden';

      // Populate reference lists sheet
      workLocations.forEach((loc, i) => { refWs.getCell(i + 1, 1).value = loc; });
      assignedShifts.forEach((s, i) => { refWs.getCell(i + 1, 2).value = s; });
      genders.forEach((g, i) => { refWs.getCell(i + 1, 3).value = g; });
      bloodGroups.forEach((b, i) => { refWs.getCell(i + 1, 4).value = b; });

      const locRange = `ReferenceLists!$A$1:$A$${workLocations.length}`;
      const shiftRange = `ReferenceLists!$B$1:$B$${assignedShifts.length}`;
      const genderRange = `ReferenceLists!$C$1:$C$${genders.length}`;
      const bgRange = `ReferenceLists!$D$1:$D$${bloodGroups.length}`;

      // Exactly 26 standard columns in exact order
      ws.columns = [
        { header: 'Employee ID', key: 'empId', width: 16 },
        { header: 'Employee Name', key: 'name', width: 22 },
        { header: 'Department', key: 'dept', width: 20 },
        { header: 'Designation', key: 'desig', width: 22 },
        { header: 'Branch', key: 'branch', width: 20 },
        { header: 'Work Location', key: 'location', width: 24 }, // Column F (Dropdown 1)
        { header: 'Mobile Number', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Date of Joining', key: 'doj', width: 16 },
        { header: 'Date of Birth', key: 'dob', width: 16 },
        { header: 'Gender', key: 'gender', width: 14 }, // Column K (Dropdown 4)
        { header: 'Blood Group', key: 'bloodGroup', width: 14 }, // Column L (Dropdown 3)
        { header: 'Pincode', key: 'pincode', width: 14 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'State', key: 'state', width: 18 },
        { header: 'Biometric User ID', key: 'bioId', width: 18 },
        { header: 'Assigned Shift', key: 'shift', width: 22 }, // Column Q (Dropdown 2)
        { header: 'Base Salary', key: 'base', width: 14 },
        { header: 'HRA', key: 'hra', width: 12 },
        { header: 'Travel Allowance', key: 'ta', width: 18 },
        { header: 'PF', key: 'pf', width: 12 },
        { header: 'PT', key: 'pt', width: 12 },
        { header: 'Bank Name', key: 'bank', width: 22 },
        { header: 'Account Number', key: 'account', width: 20 },
        { header: 'IFSC Code', key: 'ifsc', width: 16 },
        { header: 'UAN Number', key: 'uan', width: 18 }
      ];

      // Style Header Row
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF89201B' }
      };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).height = 26;

      // Add sample rows
      sampleData.forEach(row => {
        ws.addRow({
          empId: row["Employee ID"],
          name: row["Employee Name"],
          dept: row["Department"],
          desig: row["Designation"],
          branch: row["Branch"],
          location: row["Work Location"],
          phone: row["Mobile Number"],
          email: row["Email"],
          doj: row["Date of Joining"],
          dob: row["Date of Birth"],
          gender: row["Gender"],
          bloodGroup: row["Blood Group"],
          pincode: row["Pincode"],
          city: row["City"],
          state: row["State"],
          bioId: row["Biometric User ID"],
          shift: row["Assigned Shift"],
          base: row["Base Salary"],
          hra: row["HRA"],
          ta: row["Travel Allowance"],
          pf: row["PF"],
          pt: row["PT"],
          bank: row["Bank Name"],
          account: row["Account Number"],
          ifsc: row["IFSC Code"],
          uan: row["UAN Number"]
        });
      });

      // Apply dropdown validations ONLY to the 4 specified fields across rows 2 to 500
      for (let r = 2; r <= 500; r++) {
        // 1. Work Location (Column F)
        ws.getCell(`F${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [locRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Location',
          error: 'Please select an available work location from the dropdown list.'
        };

        // 4. Gender (Column K)
        ws.getCell(`K${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [genderRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Gender',
          error: 'Please select a valid gender option from the dropdown list.'
        };

        // 3. Blood Group (Column L)
        ws.getCell(`L${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [bgRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Blood Group',
          error: 'Please select a valid blood group option from the dropdown list.'
        };

        // 2. Assigned Shift (Column Q)
        ws.getCell(`Q${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [shiftRange],
          showErrorMessage: true,
          errorTitle: 'Invalid Shift',
          error: 'Please select an available shift from the dropdown list.'
        };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Employee_Bulk_Upload_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    } catch (e) {
      console.warn('Client-side ExcelJS template generation warning, attempting backend endpoint...', e);
    }
  }

  // Fallback 1: Fetch from backend endpoint /api/reports/bulk-upload-template
  try {
    const res = await fetch((window.apiBaseUrl || '') + '/api/reports/bulk-upload-template');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Employee_Bulk_Upload_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Backend template fetch failed:', err);
  }

  // Fallback 2: Basic SheetJS fallback if ExcelJS is unavailable
  if (window.XLSX) {
    const ws = window.XLSX.utils.json_to_sheet(sampleData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Employees Template');
    window.XLSX.writeFile(wb, 'Employee_Bulk_Upload_Template.xlsx');
  } else {
    downloadBulkUploadTemplate('csv');
  }
}

/**
 * Process parsed rows from uploaded file.
 * Core Upsert Logic:
 * If Name and Emp ID both match an existing employee, updates that employee's profile.
 * Otherwise, creates and adds a new employee to the Employee Directory.
 */
export async function processBulkEmployeeData(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return {
      success: false,
      message: 'No data records found in the uploaded file.',
      total: 0,
      updated: 0,
      added: 0,
      skipped: 0,
      details: []
    };
  }

  const allUsers = DB.getUsers();
  const allSchedules = (DB.getSchedules ? DB.getSchedules() : []) || [];
  const updatedRecords = [];
  const addedRecords = [];
  let skippedCount = 0;

  for (const raw of rawRows) {
    if (!raw || typeof raw !== 'object') {
      skippedCount++;
      continue;
    }

    const norm = normalizeBulkRow(raw);
    const rowName = (norm.name || '').toString().trim();
    const rowEmpId = (norm.employeeId || '').toString().trim();

    // Skip blank rows where both name and employee ID are absent
    if (!rowName && !rowEmpId) {
      skippedCount++;
      continue;
    }

    // STRICT MATCHING RULE: Check if BOTH Name AND Employee ID match an existing user
    const matchedUser = allUsers.find(u => {
      if (!u) return false;
      const uName = (u.name || '').toString().trim().toLowerCase();
      const uEmpId = (u.employeeId || u.id || '').toString().trim().toUpperCase();
      const matchName = rowName && uName === rowName.toLowerCase();
      const matchEmpId = rowEmpId && (uEmpId === rowEmpId.toUpperCase() || String(u.id || '').trim().toUpperCase() === rowEmpId.toUpperCase());
      return matchName && matchEmpId;
    });

    if (matchedUser) {
      // 1. UPDATE EXISTING EMPLOYEE BASED ON FILE UPLOAD
      if (norm.department) matchedUser.department = norm.department;
      if (norm.designation) matchedUser.designation = norm.designation;
      if (norm.branch) matchedUser.branch = norm.branch;
      if (norm.pincode) matchedUser.pincode = norm.pincode;
      if (norm.bloodGroup) matchedUser.bloodGroup = norm.bloodGroup;
      if (norm.phone) matchedUser.phone = norm.phone;
      if (norm.email) matchedUser.email = norm.email;
      if (norm.dob) matchedUser.dob = norm.dob;
      if (norm.gender) matchedUser.gender = norm.gender;
      if (norm.dateOfJoining) matchedUser.dateOfJoining = norm.dateOfJoining;
      if (norm.preferredLocation) {
        matchedUser.preferredLocation = norm.preferredLocation;
        if (!Array.isArray(matchedUser.preferredLocations)) matchedUser.preferredLocations = [];
        if (!matchedUser.preferredLocations.includes(norm.preferredLocation)) {
          matchedUser.preferredLocations.push(norm.preferredLocation);
        }
      }
      if (norm.biometricUserId) {
        matchedUser.biometricUserId = norm.biometricUserId;
        matchedUser.biometricId = norm.biometricUserId;
      }
      if (norm.shift) {
        const matchedShift = allSchedules.find(s =>
          (s.name && s.name.toLowerCase() === norm.shift.toLowerCase()) ||
          s.id === norm.shift
        );
        if (matchedShift) {
          matchedUser.scheduleId = matchedShift.id;
          if (!Array.isArray(matchedUser.scheduleIds)) matchedUser.scheduleIds = [];
          if (!matchedUser.scheduleIds.includes(matchedShift.id)) {
            matchedUser.scheduleIds.push(matchedShift.id);
          }
          if (norm.preferredLocation) {
            if (!matchedUser.shiftLocations) matchedUser.shiftLocations = {};
            matchedUser.shiftLocations[matchedShift.id] = norm.preferredLocation;
          }
        }
      }
      if (norm.city) matchedUser.city = norm.city;
      if (norm.state) matchedUser.state = norm.state;
      if (norm.address) matchedUser.address = norm.address;
      if (norm.emergencyContact) matchedUser.emergencyContact = norm.emergencyContact;
      if (norm.baseSalary !== null && !isNaN(norm.baseSalary)) matchedUser.baseSalary = Number(norm.baseSalary);
      if (norm.allowanceHRA !== null && !isNaN(norm.allowanceHRA)) matchedUser.allowanceHRA = Number(norm.allowanceHRA);
      if (norm.allowanceTravel !== null && !isNaN(norm.allowanceTravel)) matchedUser.allowanceTravel = Number(norm.allowanceTravel);
      if (norm.bonus !== null && !isNaN(norm.bonus)) matchedUser.bonus = Number(norm.bonus);
      if (norm.totalAllowances !== null && !isNaN(norm.totalAllowances)) matchedUser.totalAllowances = Number(norm.totalAllowances);
      if (norm.deductionPF !== null && !isNaN(norm.deductionPF)) matchedUser.deductionPF = Number(norm.deductionPF);
      if (norm.deductionPT !== null && !isNaN(norm.deductionPT)) matchedUser.deductionPT = Number(norm.deductionPT);
      if (norm.deductionTDS !== null && !isNaN(norm.deductionTDS)) matchedUser.deductionTDS = Number(norm.deductionTDS);
      if (norm.totalDeductions !== null && !isNaN(norm.totalDeductions)) {
        matchedUser.totalDeductions = Number(norm.totalDeductions);
        matchedUser.totalDeduction = Number(norm.totalDeductions);
      }
      if (norm.uanNo) { matchedUser.uanNo = norm.uanNo; matchedUser.uanNumber = norm.uanNo; }
      if (norm.pfNo) { matchedUser.pfNo = norm.pfNo; matchedUser.pfNumber = norm.pfNo; }
      if (norm.bankName) matchedUser.bankName = norm.bankName;
      if (norm.accountNumber) matchedUser.accountNumber = norm.accountNumber;
      if (norm.ifscCode) matchedUser.ifscCode = norm.ifscCode.toUpperCase();
      if (norm.bankBranchName) matchedUser.bankBranchName = norm.bankBranchName;
      if (norm.status) matchedUser.status = norm.status;
      if (norm.role) matchedUser.role = norm.role;

      DB.updateUser(matchedUser.id, matchedUser);
      updatedRecords.push({
        id: matchedUser.id,
        name: matchedUser.name,
        employeeId: matchedUser.employeeId,
        department: matchedUser.department || '—',
        designation: matchedUser.designation || '—',
        action: 'Updated'
      });
    } else {
      // 2. ADD NEW EMPLOYEE TO DIRECTORY
      let empIdToUse = rowEmpId;
      // If empId is not provided OR it is already assigned to another employee, assign a unique employeeId
      const isTakenByOther = empIdToUse && allUsers.some(u => u && u.employeeId && String(u.employeeId).trim().toUpperCase() === empIdToUse.toUpperCase());
      if (!empIdToUse || isTakenByOther) {
        let maxId = 99;
        allUsers.forEach(u => {
          if (u && u.employeeId) {
            const numMatch = String(u.employeeId).match(/\d+/);
            if (numMatch) {
              const num = parseInt(numMatch[0], 10);
              if (!isNaN(num) && num > maxId) maxId = num;
            }
          }
        });
        empIdToUse = 'EMP' + (maxId + 1);
      }

      const newId = 'usr_' + Math.random().toString(36).substring(2, 9);
      let baseUsername = rowName ? rowName.toLowerCase().replace(/[^a-z0-9]/g, '') : empIdToUse.toLowerCase();
      if (!baseUsername) baseUsername = 'emp' + Math.floor(Math.random() * 10000);
      let finalUsername = baseUsername;
      let counter = 1;
      while (allUsers.some(u => u && u.username && u.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${baseUsername}${counter++}`;
      }

      let scheduleId = null;
      let scheduleIds = [];
      let shiftLocations = {};
      if (norm.shift) {
        const matchedShift = allSchedules.find(s =>
          (s.name && s.name.toLowerCase() === norm.shift.toLowerCase()) ||
          s.id === norm.shift
        );
        if (matchedShift) {
          scheduleId = matchedShift.id;
          scheduleIds = [matchedShift.id];
          if (norm.preferredLocation) {
            shiftLocations[matchedShift.id] = norm.preferredLocation;
          }
        }
      }

      const defaultPass = 'Surya@123';
      const finalPassword = (Utils && typeof Utils.hashPassword === 'function') ? Utils.hashPassword(defaultPass) : defaultPass;

      const newUser = {
        id: newId,
        name: rowName || `Employee ${empIdToUse}`,
        employeeId: empIdToUse,
        username: finalUsername,
        password: finalPassword,
        role: norm.role || 'employee',
        status: norm.status || 'Active',
        department: norm.department || 'Operations',
        designation: norm.designation || 'Staff',
        branch: norm.branch || '',
        pincode: norm.pincode || '',
        bloodGroup: norm.bloodGroup || '',
        phone: norm.phone || '',
        email: norm.email || '',
        dob: norm.dob || '',
        gender: norm.gender || 'Male',
        dateOfJoining: norm.dateOfJoining || new Date().toISOString().split('T')[0],
        preferredLocation: norm.preferredLocation || '',
        preferredLocations: norm.preferredLocation ? [norm.preferredLocation] : [],
        scheduleId,
        scheduleIds,
        shiftLocations,
        biometricUserId: norm.biometricUserId || '',
        biometricId: norm.biometricUserId || '',
        city: norm.city || '',
        state: norm.state || '',
        address: norm.address || '',
        emergencyContact: norm.emergencyContact || '',
        baseSalary: norm.baseSalary !== null && !isNaN(norm.baseSalary) ? Number(norm.baseSalary) : null,
        allowanceHRA: norm.allowanceHRA !== null && !isNaN(norm.allowanceHRA) ? Number(norm.allowanceHRA) : null,
        allowanceTravel: norm.allowanceTravel !== null && !isNaN(norm.allowanceTravel) ? Number(norm.allowanceTravel) : null,
        bonus: norm.bonus !== null && !isNaN(norm.bonus) ? Number(norm.bonus) : null,
        totalAllowances: norm.totalAllowances !== null && !isNaN(norm.totalAllowances) ? Number(norm.totalAllowances) : null,
        deductionPF: norm.deductionPF !== null && !isNaN(norm.deductionPF) ? Number(norm.deductionPF) : null,
        deductionPT: norm.deductionPT !== null && !isNaN(norm.deductionPT) ? Number(norm.deductionPT) : null,
        deductionTDS: norm.deductionTDS !== null && !isNaN(norm.deductionTDS) ? Number(norm.deductionTDS) : null,
        totalDeductions: norm.totalDeductions !== null && !isNaN(norm.totalDeductions) ? Number(norm.totalDeductions) : null,
        totalDeduction: norm.totalDeductions !== null && !isNaN(norm.totalDeductions) ? Number(norm.totalDeductions) : null,
        uanNo: norm.uanNo || '',
        uanNumber: norm.uanNo || '',
        pfNo: norm.pfNo || '',
        pfNumber: norm.pfNo || '',
        bankName: norm.bankName || '',
        accountNumber: norm.accountNumber || '',
        ifscCode: (norm.ifscCode || '').toUpperCase(),
        bankBranchName: norm.bankBranchName || '',
        profileVerificationStatus: 'Approved',
        photo: null,
        documents: [],
        resume: null,
        aadhar: null,
        bankDetails: null
      };

      if (DB.data && Array.isArray(DB.data.users)) {
        DB.data.users.push(newUser);
      }
      if (allUsers !== (DB.data && DB.data.users) && !allUsers.includes(newUser)) {
        allUsers.push(newUser);
      }
      if (typeof DB.save === 'function') {
        DB.save({ type: 'push', key: 'users', payload: newUser });
      }
      addedRecords.push({
        id: newUser.id,
        name: newUser.name,
        employeeId: newUser.employeeId,
        department: newUser.department || '—',
        designation: newUser.designation || '—',
        action: 'Added New'
      });
    }
  }

  // Persist locally and sync to backend
  if (typeof DB.save === 'function') {
    await DB.save();
  }
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    try {
      let sessionToken = '';
      try {
        if (typeof sessionStorage !== 'undefined') {
          const sess = sessionStorage.getItem('attendance_current_session');
          if (sess) sessionToken = JSON.parse(sess).token || '';
        }
        if (!sessionToken && typeof localStorage !== 'undefined') {
          const sess = localStorage.getItem('attendance_current_session');
          if (sess) sessionToken = JSON.parse(sess).token || '';
        }
      } catch (e) {}
      const baseUrl = window.apiBaseUrl || '';
      await fetch(baseUrl + '/api/mutate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ action: 'sync', data: DB.data })
      });
    } catch (err) {
      console.warn('Network sync notice during bulk upload:', err);
    }
  }

  return {
    success: true,
    total: updatedRecords.length + addedRecords.length,
    updated: updatedRecords.length,
    added: addedRecords.length,
    skipped: skippedCount,
    details: [...updatedRecords, ...addedRecords]
  };
}

/**
 * Open the interactive modal for Bulk Uploading Employee Data
 */
export function openBulkUploadModal() {
  const existingOverlay = document.getElementById('bulk-upload-modal-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'bulk-upload-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '9999';

  overlay.innerHTML = html`
    <div class="modal-content" style="max-width: 720px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); background: var(--bg-card, #ffffff);">
      <!-- Header -->
      <div class="modal-header" style="padding: 18px 24px 14px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card, #ffffff);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(137, 32, 27, 0.1); color: var(--primary, #89201B); display: flex; align-items: center; justify-content: center; font-size: 20px;">
            📤
          </div>
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 17px; font-weight: 800; color: var(--text-primary);">Bulk Upload Employee Data</h3>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Import and synchronize employee directory files via Excel (.xlsx, .xls) or CSV (.csv)</div>
          </div>
        </div>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted); line-height: 1;">&times;</button>
      </div>

      <!-- Body -->
      <div class="modal-body" style="padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;">
        
        <!-- Matching Rule Banner -->
        <div style="background: rgba(137, 32, 27, 0.05); border: 1px solid rgba(137, 32, 27, 0.2); border-radius: 8px; padding: 12px 16px;">
          <div style="font-weight: 800; font-size: 12.5px; color: var(--primary, #89201B); display: flex; align-items: center; gap: 6px;">
            <span>ℹ️</span> Data Fetching & Matching Rule:
          </div>
          <ul style="margin: 6px 0 0 18px; padding: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
            <li><strong>Match Found (Same Name & Emp ID):</strong> If an employee's <strong>Full Name</strong> and <strong>Employee ID</strong> match an existing employee, their profile data will be updated on the basis of the file.</li>
            <li><strong>No Match:</strong> If either the name or employee ID is different (or record does not exist), a <strong>new employee profile</strong> is automatically added to the directory.</li>
            <li>Existing passwords, credentials, and unmentioned fields will remain preserved safely.</li>
          </ul>
        </div>

        <!-- Download Template Options -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.02); border: 1px solid var(--border); border-radius: 8px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 12px; color: var(--text-secondary);">
            <strong>Need the column format?</strong> Download the starter template:
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-download-sample-excel" style="font-size: 11.5px; font-weight: 600; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;">
              <span>📊</span> Excel Template (.xlsx)
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-download-sample-csv" style="font-size: 11.5px; font-weight: 600; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px;">
              <span>📄</span> CSV Template (.csv)
            </button>
          </div>
        </div>

        <!-- File Upload Zone -->
        <div id="bulk-upload-dropzone" style="border: 2px dashed var(--border); border-radius: 10px; padding: 26px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(0,0,0,0.01);">
          <input type="file" id="bulk-upload-file-input" accept=".xlsx, .xls, .csv" style="display: none;">
          <div style="font-size: 32px; margin-bottom: 8px;">📁</div>
          <div style="font-weight: 700; font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">
            Click to Browse or Drag & Drop File Here
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
          </div>
        </div>

        <!-- File Selected Card -->
        <div id="bulk-upload-selected-card" style="display: none; padding: 12px 16px; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <span style="font-size: 22px; flex-shrink: 0;">📄</span>
            <div style="min-width: 0;">
              <div id="bulk-upload-filename" style="font-weight: 700; font-size: 13px; color: var(--text-primary); word-break: break-all;">file.xlsx</div>
              <div id="bulk-upload-filesize" style="font-size: 11.5px; color: var(--text-muted);">0 KB • 0 records detected</div>
            </div>
          </div>
          <button type="button" id="btn-bulk-upload-remove-file" class="btn-bulk-remove-compact" title="Remove this file">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Remove</span>
          </button>
        </div>

        <!-- Processing Progress -->
        <div id="bulk-upload-spinner" style="display: none; flex-direction: column; align-items: center; gap: 10px; padding: 16px 0;">
          <div class="spinner" style="width: 28px; height: 28px; border: 3px solid rgba(137,32,27,0.2); border-top-color: var(--primary, #89201B); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <div id="bulk-upload-status-text" style="font-size: 12.5px; font-weight: 600; color: var(--text-secondary);">Reading and validating records...</div>
        </div>

        <!-- Results Section -->
        <div id="bulk-upload-results-section" style="display: none; flex-direction: column; gap: 12px;"></div>

      </div>

      <!-- Footer Actions -->
      <div class="modal-actions" style="margin-top: auto; padding: 14px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card, #ffffff);">
        <button class="btn btn-secondary" type="button" id="btn-bulk-upload-cancel" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
        <button class="btn btn-primary-equify" type="button" id="btn-process-bulk-upload" disabled style="width: auto; min-width: 110px; padding: 8px 22px; font-size: 13px; font-weight: 700; opacity: 0.6; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
          <span>📤</span> Upload
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Template download event bindings
  const dlExcelBtn = overlay.querySelector('#btn-download-sample-excel');
  if (dlExcelBtn) dlExcelBtn.addEventListener('click', () => downloadBulkUploadTemplate('xlsx'));

  const dlCsvBtn = overlay.querySelector('#btn-download-sample-csv');
  if (dlCsvBtn) dlCsvBtn.addEventListener('click', () => downloadBulkUploadTemplate('csv'));

  // File selection and drag-drop handling
  const dropzone = overlay.querySelector('#bulk-upload-dropzone');
  const fileInput = overlay.querySelector('#bulk-upload-file-input');
  const selectedCard = overlay.querySelector('#bulk-upload-selected-card');
  const filenameEl = overlay.querySelector('#bulk-upload-filename');
  const filesizeEl = overlay.querySelector('#bulk-upload-filesize');
  const removeFileBtn = overlay.querySelector('#btn-bulk-upload-remove-file');
  const processBtn = overlay.querySelector('#btn-process-bulk-upload');
  const spinner = overlay.querySelector('#bulk-upload-spinner');
  const statusText = overlay.querySelector('#bulk-upload-status-text');
  const resultsSection = overlay.querySelector('#bulk-upload-results-section');
  const cancelBtn = overlay.querySelector('#btn-bulk-upload-cancel');

  let selectedFile = null;
  let parsedRows = [];

  const handleSelectedFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      alert('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    selectedFile = file;
    dropzone.style.display = 'none';
    selectedCard.style.display = 'flex';
    filenameEl.textContent = file.name;
    filesizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB • Parsing records...`;

    const onLibraryReady = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          parsedRows = window.XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

          if (parsedRows.length === 0) {
            filesizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB • ⚠️ No data rows detected.`;
            processBtn.disabled = true;
            processBtn.style.opacity = '0.6';
            processBtn.style.cursor = 'not-allowed';
            return;
          }

          filesizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB • ${parsedRows.length} employee record(s) detected`;
          processBtn.disabled = false;
          processBtn.innerHTML = '<span>📤</span> Upload';
          processBtn.style.opacity = '1';
          processBtn.style.cursor = 'pointer';
        } catch (err) {
          filesizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB • ❌ Error reading file: ${err.message}`;
          processBtn.disabled = true;
          processBtn.style.opacity = '0.6';
          processBtn.style.cursor = 'not-allowed';
        }
      };
      reader.readAsArrayBuffer(file);
    };

    if (window.XLSX) {
      onLibraryReady();
    } else if (typeof loadSheetJS === 'function') {
      loadSheetJS(onLibraryReady, () => {
        alert('Could not initialize Excel processing engine. Please check your internet connection.');
      });
    } else {
      alert('SheetJS Excel library not available.');
    }
  };

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary, #89201B)';
    dropzone.style.background = 'rgba(137, 32, 27, 0.05)';
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'rgba(0,0,0,0.01)';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--border)';
    dropzone.style.background = 'rgba(0,0,0,0.01)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', () => {
    selectedFile = null;
    parsedRows = [];
    fileInput.value = '';
    selectedCard.style.display = 'none';
    dropzone.style.display = 'block';
    processBtn.disabled = true;
    processBtn.innerHTML = '<span>📤</span> Upload';
    processBtn.style.opacity = '0.6';
    processBtn.style.cursor = 'not-allowed';
    processBtn.style.display = 'inline-flex';
    resultsSection.style.display = 'none';
    resultsSection.innerHTML = '';
  });

  // Start processing action
  processBtn.addEventListener('click', async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    processBtn.disabled = true;
    processBtn.innerHTML = '<span>⏳</span> Uploading...';
    processBtn.style.opacity = '0.7';
    processBtn.style.cursor = 'wait';
    processBtn.style.display = 'none';
    cancelBtn.disabled = true;
    removeFileBtn.disabled = true;
    spinner.style.display = 'flex';
    statusText.textContent = `Analyzing and matching ${parsedRows.length} employee record(s)...`;

    setTimeout(async () => {
      try {
        const result = await processBulkEmployeeData(parsedRows);
        spinner.style.display = 'none';
        selectedCard.style.display = 'none';
        resultsSection.style.display = 'flex';

        resultsSection.innerHTML = `
          <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 14px 18px; text-align: center;">
            <div style="font-size: 16px; font-weight: 800; color: var(--success, #16a34a); margin-bottom: 4px;">
              🎉 Bulk Upload Completed Successfully!
            </div>
            <div style="font-size: 12.5px; color: var(--text-secondary);">
              All records have been synchronized with the live employee database.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 4px 0;">
            <div style="background: var(--bg-card, #ffffff); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Processed</div>
              <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${result.total}</div>
            </div>
            <div style="background: rgba(3,105,161,0.06); border: 1px solid rgba(3,105,161,0.25); border-radius: 8px; padding: 10px 14px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #0369a1; text-transform: uppercase;">Updated Existing</div>
              <div style="font-size: 18px; font-weight: 800; color: #0284c7; margin-top: 2px;">${result.updated}</div>
            </div>
            <div style="background: rgba(22,163,74,0.06); border: 1px solid rgba(22,163,74,0.25); border-radius: 8px; padding: 10px 14px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Added New</div>
              <div style="font-size: 18px; font-weight: 800; color: #16a34a; margin-top: 2px;">${result.added}</div>
            </div>
          </div>

          <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-card, #ffffff);">
            <table class="custom-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border);">
                  <th style="padding: 8px 12px; text-align: left;">#</th>
                  <th style="padding: 8px 12px; text-align: left;">Emp ID</th>
                  <th style="padding: 8px 12px; text-align: left;">Employee Name</th>
                  <th style="padding: 8px 12px; text-align: left;">Department</th>
                  <th style="padding: 8px 12px; text-align: left;">Designation</th>
                  <th style="padding: 8px 12px; text-align: center;">Action Taken</th>
                </tr>
              </thead>
              <tbody>
                ${result.details.map((d, idx) => `
                  <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 7px 12px; color: var(--text-muted);">${idx + 1}</td>
                    <td style="padding: 7px 12px; font-weight: 700;">${Utils.escape(d.employeeId)}</td>
                    <td style="padding: 7px 12px; font-weight: 600;">${Utils.escape(d.name)}</td>
                    <td style="padding: 7px 12px;">${Utils.escape(d.department)}</td>
                    <td style="padding: 7px 12px;">${Utils.escape(d.designation)}</td>
                    <td style="padding: 7px 12px; text-align: center;">
                      ${d.action === 'Updated'
                        ? `<span class="badge" style="background: rgba(3,105,161,0.12); color: #0284c7; font-weight: 700; padding: 2px 8px; border-radius: 12px; font-size: 11px;">🔄 Updated</span>`
                        : `<span class="badge" style="background: rgba(22,163,74,0.12); color: #16a34a; font-weight: 700; padding: 2px 8px; border-radius: 12px; font-size: 11px;">✨ Added New</span>`
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Done & View Directory';
        cancelBtn.className = 'btn btn-primary-equify';
        cancelBtn.style.padding = '8px 20px';

        // Re-render Employee Directory table in background
        if (typeof renderAdminUsers === 'function') {
          renderAdminUsers();
        }

        if (typeof showToastNotification === 'function') {
          showToastNotification(`✅ Bulk upload finished: ${result.updated} updated, ${result.added} added.`, 'success');
        }
      } catch (err) {
        spinner.style.display = 'none';
        processBtn.style.display = 'inline-flex';
        processBtn.disabled = false;
        processBtn.innerHTML = '<span>📤</span> Upload';
        processBtn.style.opacity = '1';
        processBtn.style.cursor = 'pointer';
        cancelBtn.disabled = false;
        removeFileBtn.disabled = false;
        alert(`An error occurred while processing bulk employee upload: ${err.message}`);
      }
    }, 400);
  });
}

if (typeof window !== 'undefined') {
  window.openBulkUploadModal = openBulkUploadModal;
  window.processBulkEmployeeData = processBulkEmployeeData;
  window.downloadBulkUploadTemplate = downloadBulkUploadTemplate;
}