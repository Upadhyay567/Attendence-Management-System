// js/views/userManagementView.js - Staff Directory & Account Management
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal, openFullScreenImageModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderAdminUsers() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  const users = DB.getUsers().filter(u => {
    if (user.role === 'manager') {
      return u.managerId === user.id && u.role === 'employee';
    } else if (user.role === 'hr') {
      return u.assignedById === user.id && u.role === 'employee';
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

  main.innerHTML = html`
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
        tbody.innerHTML = html`<tr><td colspan="7" style="text-align:center; padding:28px; color:var(--text-muted); font-size:13px">No matching employee records found for selected filter options.</td></tr>`;
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
  overlay.innerHTML = html`
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
              if (currentUser.role === 'hr' || currentUser.role === 'manager') {
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
          if (currentUser.role === 'hr' || currentUser.role === 'manager') {
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
      editorPhotoDataUrl = '';
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

