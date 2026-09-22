// js/views/schedulesView.js - Shift Allocation & Planning
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

let currentScheduleViewTab = 'shifts';

export function renderAdminSchedules(tab) {
  if (tab) currentScheduleViewTab = tab;
  const main = document.getElementById('main-view');
  if (!main) return;

  const schedules = DB.getSchedules();
  const allUsers = (typeof DB.getUsers === 'function' ? DB.getUsers() : (DB.data ? DB.data.users : [])) || [];
  const officeCoords = (typeof DB.getOfficeCoordinates === 'function' ? DB.getOfficeCoordinates() : window.OFFICE_COORDINATES) || {};
  const allLocationNames = Object.keys(officeCoords);

  const getInitials = (name) => (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  if (currentScheduleViewTab === 'locations') {
    main.innerHTML = html`
      <div class="content-header">
        <div>
          <h1 class="content-title">📍 Employee Shift & Worksite Assignment</h1>
          <div class="content-subtitle">Manually assign, update, and manage both work shifts and physical worksite locations for each employee.</div>
        </div>
        <div style="display:flex; gap:10px; align-items:center; justify-content:flex-end; margin-left:auto; flex-wrap:wrap">
          <button class="btn btn-secondary" id="btn-toggle-sched-view" style="border-radius:10px; height:42px; padding:0 20px; font-size:13px; font-weight:700; white-space:nowrap; width:auto; border:1px solid rgba(251,191,36,0.3); background:rgba(251,191,36,0.08); color:var(--primary); cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 2px 8px rgba(251,191,36,0.15); transition:all 0.2s ease">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
            ⏰ View Shift Patterns
          </button>
          <button class="btn btn-cyan" id="btn-express-upload-modal" style="border-radius:10px; height:42px; padding:0 22px; font-size:13px; font-weight:700; white-space:nowrap; width:auto; background:linear-gradient(135deg, var(--cyan) 0%, #0891b2 100%); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(6, 182, 212, 0.35); transition:all 0.2s ease">Express Upload</button>
          <button class="btn" id="btn-add-schedule-modal" style="border-radius:10px; height:42px; padding:0 22px; font-size:13px; font-weight:700; white-space:nowrap; width:auto; background:linear-gradient(135deg, var(--error) 0%, #be123c 100%); color:#fff; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(225, 29, 72, 0.35); transition:all 0.2s ease">+ Add Shift Pattern</button>
        </div>
      </div>

      <div class="content-body" style="display:flex; flex-direction:column; gap:16px">
        <!-- Search, Filters, and Bulk Action Toolbar -->
        <div class="card-panel" style="padding:16px 20px">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; flex:1">
              <input type="text" id="loc-assign-search" class="form-input" placeholder="🔍 Search employee name, ID or department..." style="min-width:260px; max-width:360px; padding:8px 12px; font-size:12.5px; border-radius:8px">
              <select id="loc-assign-dept-filter" class="form-input" style="width:auto; padding:8px 12px; font-size:12.5px; border-radius:8px">
                <option value="">All Departments</option>
                ${[...new Set(allUsers.map(u => u.department).filter(Boolean))].map(d => `<option value="${Utils.escape(d)}">${Utils.escape(d)}</option>`).join('')}
              </select>
              <select id="loc-assign-loc-filter" class="form-input" style="width:auto; padding:8px 12px; font-size:12.5px; border-radius:8px">
                <option value="">All Worksite Locations</option>
                <option value="__NONE__">-- No Worksite Location --</option>
                ${allLocationNames.map(l => `<option value="${Utils.escape(l)}">${Utils.escape(l)}</option>`).join('')}
              </select>
            </div>
            <div id="loc-assign-count-info" style="font-size:12px; color:var(--text-muted); font-weight:600">
              Showing ${allUsers.length} employee(s)
            </div>
          </div>

          <!-- Bulk Assignment Strip -->
          <div style="display:flex; align-items:center; gap:10px; margin-top:14px; padding:12px 14px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:8px; flex-wrap:wrap">
            <span style="font-size:12.5px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:6px">
              ⚡ Bulk Assignment:
            </span>
            <!-- Bulk Shift Multi-Select Trigger -->
            <div class="emp-multi-select-wrap" style="width:auto; min-width:200px; max-width:260px;">
              <button type="button" class="emp-multi-select-btn" id="bulk-shift-trigger" style="min-height:36px; padding:4px 10px; font-size:12px;">
                <span class="emp-multi-select-placeholder" id="bulk-shift-label">-- Select Shift(s) --</span>
                <span class="emp-multi-select-arrow">▼</span>
              </button>
              <div class="emp-multi-select-popover" id="bulk-shift-popover">
                <div class="emp-multi-select-header">
                  <span class="emp-multi-select-title">Bulk Shifts</span>
                  <div class="emp-multi-select-actions">
                    <button type="button" class="emp-multi-select-action-btn" id="btn-bulk-select-all-shifts">All</button>
                    <span style="color:var(--border)">|</span>
                    <button type="button" class="emp-multi-select-action-btn btn-clear" id="btn-bulk-clear-shifts">Clear</button>
                  </div>
                </div>
                <div class="emp-multi-select-list">
                  <label class="emp-multi-select-option emp-multi-select-none-option" data-txt="-- no shift assigned --">
                    <input type="checkbox" class="emp-multi-select-chk bulk-shift-none-chk" value="__NONE__">
                    <div class="emp-multi-select-label">
                      <span class="emp-multi-select-main-txt" style="color:var(--text-muted); font-style:italic">-- No Shift Assigned --</span>
                    </div>
                  </label>
                  ${schedules.map(s => `
                    <label class="emp-multi-select-option" data-txt="${Utils.escape(s.name).toLowerCase()}">
                      <input type="checkbox" class="emp-multi-select-chk bulk-shift-chk" value="${s.id}">
                      <div class="emp-multi-select-label">
                        <span class="emp-multi-select-main-txt">⏰ ${Utils.escape(s.name)}</span>
                        <span class="emp-multi-select-sub-txt">${formatTime12h(s.startTime)} - ${formatTime12h(s.endTime)}</span>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Bulk Location Multi-Select Trigger -->
            <div class="emp-multi-select-wrap" style="width:auto; min-width:220px; max-width:280px;">
              <button type="button" class="emp-multi-select-btn" id="bulk-loc-trigger" style="min-height:36px; padding:4px 10px; font-size:12px;">
                <span class="emp-multi-select-placeholder" id="bulk-loc-label">-- Select Location(s) --</span>
                <span class="emp-multi-select-arrow">▼</span>
              </button>
              <div class="emp-multi-select-popover" id="bulk-loc-popover">
                <div class="emp-multi-select-header">
                  <span class="emp-multi-select-title">Bulk Locations</span>
                  <div class="emp-multi-select-actions">
                    <button type="button" class="emp-multi-select-action-btn" id="btn-bulk-select-all-locs">All</button>
                    <span style="color:var(--border)">|</span>
                    <button type="button" class="emp-multi-select-action-btn btn-clear" id="btn-bulk-clear-locs">Clear</button>
                  </div>
                </div>
                <div class="emp-multi-select-list">
                  <label class="emp-multi-select-option emp-multi-select-none-option" data-txt="-- no worksite location --">
                    <input type="checkbox" class="emp-multi-select-chk bulk-loc-none-chk" value="__NONE__">
                    <div class="emp-multi-select-label">
                      <span class="emp-multi-select-main-txt" style="color:var(--text-muted); font-style:italic">-- No Worksite Location --</span>
                    </div>
                  </label>
                  ${allLocationNames.map(loc => `
                    <label class="emp-multi-select-option" data-txt="${Utils.escape(loc).toLowerCase()}">
                      <input type="checkbox" class="emp-multi-select-chk bulk-loc-chk" value="${Utils.escape(loc)}">
                      <div class="emp-multi-select-label">
                        <span class="emp-multi-select-main-txt">📍 ${Utils.escape(loc)}</span>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>

            <button id="btn-apply-bulk-location" class="btn btn-primary" style="padding:7px 16px; font-size:12px; font-weight:700; width:auto; border-radius:6px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; border:none; cursor:pointer">
              Apply to Selected (<span id="bulk-selected-count">0</span>)
            </button>
            <span style="font-size:11.5px; color:var(--text-muted); margin-left:auto">Select employee checkboxes below and click Apply to assign shift/locations</span>
          </div>
        </div>

        <!-- Full Employee Location & Shift Table -->
        <div class="card-panel">
          <div class="table-container">
            <table class="custom-table" id="emp-locations-table">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center">
                    <input type="checkbox" id="chk-select-all-emps" title="Select All" style="cursor:pointer; width:16px; height:16px; accent-color:var(--primary)">
                  </th>
                  <th>Employee</th>
                  <th>Department & Role</th>
                  <th>Assigned Shift(s) ✏️</th>
                  <th>Assigned Worksite Location(s) ✏️</th>
                  <th style="text-align:center; width:120px">Status</th>
                </tr>
              </thead>
              <tbody id="emp-locations-tbody">
                ${allUsers.map(u => {
                  const assignedShiftIds = (Array.isArray(u.scheduleIds))
                    ? u.scheduleIds.filter(Boolean)
                    : (u.scheduleId ? [u.scheduleId] : []);
                  const assignedSchedules = assignedShiftIds.map(id => DB.getSchedule(id)).filter(Boolean);

                  let assignedLocations = [];
                  if (Array.isArray(u.preferredLocations)) {
                    assignedLocations = [...new Set(u.preferredLocations.filter(Boolean))];
                  } else if (u.preferredLocation && u.preferredLocation !== 'No Worksite Location' && u.preferredLocation !== 'None' && u.preferredLocation.trim() !== '') {
                    assignedLocations = [u.preferredLocation.trim()];
                  } else if (u.shiftLocations && typeof u.shiftLocations === 'object') {
                    assignedLocations = [...new Set(Object.values(u.shiftLocations))].filter(l => l && l !== 'No Worksite Location' && l !== 'None' && String(l).trim() !== '');
                  }

                  const shiftChipsHtml = assignedSchedules.length > 0
                    ? `<div class="emp-multi-select-chips">
                         ${assignedSchedules.map(s => `
                           <span class="emp-multi-chip shift-chip" title="${Utils.escape(s.name)} (${formatTime12h(s.startTime)} - ${formatTime12h(s.endTime)})">
                             ⏰ ${Utils.escape(s.name)}
                           </span>
                         `).join('')}
                       </div>`
                    : `<span class="emp-multi-select-placeholder">-- No Shift Assigned --</span>`;

                  const locChipsHtml = assignedLocations.length > 0
                    ? `<div class="emp-multi-select-chips">
                         ${assignedLocations.map(loc => `
                           <span class="emp-multi-chip loc-chip" title="${Utils.escape(loc)}">
                             📍 ${Utils.escape(loc)}
                           </span>
                         `).join('')}
                       </div>`
                    : `<span class="emp-multi-select-placeholder">-- No Worksite Location --</span>`;

                  return `
                    <tr class="emp-loc-row" data-id="${u.id}" data-name="${Utils.escape(u.name).toLowerCase()}" data-empid="${(u.employeeId || u.username || '').toLowerCase()}" data-dept="${Utils.escape(u.department || '').toLowerCase()}" data-loc="${Utils.escape(assignedLocations.join(' , ')).toLowerCase()}">
                      <td style="text-align:center">
                        <input type="checkbox" class="chk-emp-loc" data-id="${u.id}" style="cursor:pointer; width:15px; height:15px; accent-color:var(--primary)">
                      </td>
                      <td>
                        <div style="display:flex; align-items:center; gap:12px">
                          <div class="clickable-list-avatar" data-photo="${u.photo || ''}" style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #89201B 0%, #3d0d0a 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; border:1px solid rgba(251,191,36,0.3); overflow:hidden; flex-shrink:0; cursor:${u.photo ? 'pointer' : 'default'}">
                            ${u.photo ? `<img src="${u.photo}" style="width:100%; height:100%; object-fit:cover;">` : getInitials(u.name)}
                          </div>
                          <div>
                            <div style="font-weight:700; color:var(--text-primary); font-size:13px">${Utils.escape(u.name)}</div>
                            <div style="font-size:11px; color:var(--text-muted); font-family:monospace; margin-top:2px">ID: ${Utils.escape(u.employeeId || u.username || u.id)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style="font-weight:600; font-size:12.5px; color:var(--text-primary)">${Utils.escape(u.department || 'General')}</div>
                        <div style="font-size:11px; color:var(--text-muted); text-transform:capitalize; margin-top:2px">${Utils.escape(u.role || 'employee')}</div>
                      </td>
                      <!-- Shift Multi-Select Cell -->
                      <td>
                        <div class="emp-multi-select-wrap">
                          <button type="button" class="emp-multi-select-btn emp-trigger-shift" data-empid="${u.id}" id="shift-trigger-${u.id}">
                            ${shiftChipsHtml}
                            <span class="emp-multi-select-arrow">▼</span>
                          </button>
                          <div class="emp-multi-select-popover" id="shift-popover-${u.id}">
                            <div class="emp-multi-select-header">
                              <span class="emp-multi-select-title">Select Shift(s)</span>
                              <div class="emp-multi-select-actions">
                                <button type="button" class="emp-multi-select-action-btn emp-btn-select-all-shifts" data-empid="${u.id}">Select All</button>
                                <span style="color:var(--border)">|</span>
                                <button type="button" class="emp-multi-select-action-btn btn-clear emp-btn-clear-shifts" data-empid="${u.id}">Clear All</button>
                              </div>
                            </div>
                            <div class="emp-multi-select-search">
                              <input type="text" class="emp-search-shifts" placeholder="Filter shifts..." data-empid="${u.id}">
                            </div>
                            <div class="emp-multi-select-list">
                              <label class="emp-multi-select-option emp-multi-select-none-option ${assignedShiftIds.length === 0 ? 'selected' : ''}" data-txt="-- no shift assigned --">
                                <input type="checkbox" class="emp-multi-select-chk emp-shift-none-chk" data-empid="${u.id}" value="__NONE__" ${assignedShiftIds.length === 0 ? 'checked' : ''}>
                                <div class="emp-multi-select-label">
                                  <span class="emp-multi-select-main-txt" style="color:var(--text-muted); font-style:italic">-- No Shift Assigned --</span>
                                </div>
                              </label>
                              ${schedules.map(s => {
                                const isChecked = assignedShiftIds.includes(s.id);
                                return `
                                  <label class="emp-multi-select-option ${isChecked ? 'selected' : ''}" data-txt="${Utils.escape(s.name).toLowerCase()}">
                                    <input type="checkbox" class="emp-multi-select-chk emp-shift-chk" data-empid="${u.id}" value="${s.id}" ${isChecked ? 'checked' : ''}>
                                    <div class="emp-multi-select-label">
                                      <span class="emp-multi-select-main-txt">⏰ ${Utils.escape(s.name)}</span>
                                      <span class="emp-multi-select-sub-txt">${formatTime12h(s.startTime)} - ${formatTime12h(s.endTime)}</span>
                                    </div>
                                  </label>
                                `;
                              }).join('')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <!-- Worksite Location Multi-Select Cell -->
                      <td>
                        <div class="emp-multi-select-wrap">
                          <button type="button" class="emp-multi-select-btn emp-trigger-loc" data-empid="${u.id}" id="loc-trigger-${u.id}">
                            ${locChipsHtml}
                            <span class="emp-multi-select-arrow">▼</span>
                          </button>
                          <div class="emp-multi-select-popover" id="loc-popover-${u.id}">
                            <div class="emp-multi-select-header">
                              <span class="emp-multi-select-title">Select Location(s)</span>
                              <div class="emp-multi-select-actions">
                                <button type="button" class="emp-multi-select-action-btn emp-btn-select-all-locs" data-empid="${u.id}">Select All</button>
                                <span style="color:var(--border)">|</span>
                                <button type="button" class="emp-multi-select-action-btn btn-clear emp-btn-clear-locs" data-empid="${u.id}">Clear All</button>
                              </div>
                            </div>
                            <div class="emp-multi-select-search">
                              <input type="text" class="emp-search-locs" placeholder="Filter locations..." data-empid="${u.id}">
                            </div>
                            <div class="emp-multi-select-list">
                              <label class="emp-multi-select-option emp-multi-select-none-option ${assignedLocations.length === 0 ? 'selected' : ''}" data-txt="-- no worksite location --">
                                <input type="checkbox" class="emp-multi-select-chk emp-loc-none-chk" data-empid="${u.id}" value="__NONE__" ${assignedLocations.length === 0 ? 'checked' : ''}>
                                <div class="emp-multi-select-label">
                                  <span class="emp-multi-select-main-txt" style="color:var(--text-muted); font-style:italic">-- No Worksite Location --</span>
                                </div>
                              </label>
                              ${allLocationNames.map(loc => {
                                const isChecked = assignedLocations.includes(loc);
                                return `
                                  <label class="emp-multi-select-option ${isChecked ? 'selected' : ''}" data-txt="${Utils.escape(loc).toLowerCase()}">
                                    <input type="checkbox" class="emp-multi-select-chk emp-loc-chk" data-empid="${u.id}" value="${Utils.escape(loc)}" ${isChecked ? 'checked' : ''}>
                                    <div class="emp-multi-select-label">
                                      <span class="emp-multi-select-main-txt">📍 ${Utils.escape(loc)}</span>
                                    </div>
                                  </label>
                                `;
                              }).join('')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style="text-align:center">
                        <span class="badge badge-approved" id="loc-status-${u.id}" style="font-size:11px; padding:3px 8px; background:rgba(16,185,129,0.1); color:var(--success); border-radius:6px">
                          Saved ✓
                        </span>
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

    // Attach Event Listeners for Location & Shift Assignment View
    document.getElementById('btn-toggle-sched-view').addEventListener('click', () => {
      renderAdminSchedules('shifts');
    });

    const expressUploadBtn = document.getElementById('btn-express-upload-modal');
    if (expressUploadBtn) {
      expressUploadBtn.addEventListener('click', () => openExpressUploadModal());
    }
    const addSchedBtn = document.getElementById('btn-add-schedule-modal');
    if (addSchedBtn) {
      addSchedBtn.addEventListener('click', () => openScheduleModal());
    }

    // Helper functions to update trigger button displays
    const updateShiftTriggerUI = (empId, shiftIds) => {
      const trigger = document.getElementById(`shift-trigger-${empId}`);
      if (!trigger) return;
      const schedList = (shiftIds || []).map(id => DB.getSchedule(id)).filter(Boolean);

      let contentHtml = '';
      if (schedList.length === 0) {
        contentHtml = `<span class="emp-multi-select-placeholder">-- No Shift Assigned --</span>`;
      } else {
        contentHtml = `
          <div class="emp-multi-select-chips">
            ${schedList.map(s => `
              <span class="emp-multi-chip shift-chip" title="${Utils.escape(s.name)} (${formatTime12h(s.startTime)} - ${formatTime12h(s.endTime)})">
                ⏰ ${Utils.escape(s.name)}
              </span>
            `).join('')}
          </div>
        `;
      }
      trigger.innerHTML = contentHtml + `<span class="emp-multi-select-arrow">▼</span>`;
    };

    const updateLocTriggerUI = (empId, locations) => {
      const trigger = document.getElementById(`loc-trigger-${empId}`);
      if (!trigger) return;
      const locList = (locations || []).filter(Boolean);

      let contentHtml = '';
      if (locList.length === 0) {
        contentHtml = `<span class="emp-multi-select-placeholder">-- No Worksite Location --</span>`;
      } else {
        contentHtml = `
          <div class="emp-multi-select-chips">
            ${locList.map(loc => `
              <span class="emp-multi-chip loc-chip" title="${Utils.escape(loc)}">
                📍 ${Utils.escape(loc)}
              </span>
            `).join('')}
          </div>
        `;
      }
      trigger.innerHTML = contentHtml + `<span class="emp-multi-select-arrow">▼</span>`;
    };

    // Helper function to apply shifts to an employee immediately
    const applyUserShifts = (empId, shiftIds) => {
      const user = DB.getUser(empId);
      if (!user) return;
      const finalShiftIds = [...new Set((shiftIds || []).filter(Boolean))];

      const updates = {
        scheduleIds: finalShiftIds,
        scheduleId: finalShiftIds[0] || ''
      };

      // Keep shiftLocations in sync
      const currentShiftLocs = {};
      const userLocs = (Array.isArray(user.preferredLocations))
        ? user.preferredLocations
        : (user.preferredLocation ? [user.preferredLocation] : []);
      if (userLocs.length > 0) {
        finalShiftIds.forEach(sid => {
          currentShiftLocs[sid] = userLocs[0];
        });
      }
      updates.shiftLocations = currentShiftLocs;

      DB.updateUser(empId, updates);

      // Update checkboxes in shift popover
      const popover = document.getElementById(`shift-popover-${empId}`);
      if (popover) {
        const noneChk = popover.querySelector('.emp-shift-none-chk');
        const isNone = (finalShiftIds.length === 0);
        if (noneChk) {
          noneChk.checked = isNone;
          const opt = noneChk.closest('.emp-multi-select-option');
          if (opt) {
            if (isNone) opt.classList.add('selected');
            else opt.classList.remove('selected');
          }
        }
        popover.querySelectorAll('.emp-shift-chk').forEach(cb => {
          cb.checked = finalShiftIds.includes(cb.value);
          const opt = cb.closest('.emp-multi-select-option');
          if (opt) {
            if (cb.checked) opt.classList.add('selected');
            else opt.classList.remove('selected');
          }
        });
      }

      // Update trigger UI immediately
      updateShiftTriggerUI(empId, finalShiftIds);

      const statusBadge = document.getElementById(`loc-status-${empId}`);
      if (statusBadge) {
        statusBadge.innerHTML = 'Saved ✓';
        statusBadge.style.color = 'var(--success)';
      }
    };

    // Helper function to apply locations to an employee immediately
    const applyUserLocations = (empId, locations) => {
      const user = DB.getUser(empId);
      if (!user) return;
      const finalLocs = [...new Set((locations || []).filter(Boolean))];

      const updates = {
        preferredLocations: finalLocs,
        preferredLocation: finalLocs[0] || ''
      };

      // Clear or set shiftLocations in sync
      const currentShiftLocs = {};
      const shiftList = (Array.isArray(user.scheduleIds)) ? user.scheduleIds : (user.scheduleId ? [user.scheduleId] : []);
      if (finalLocs.length > 0) {
        shiftList.forEach(sid => {
          currentShiftLocs[sid] = finalLocs[0];
        });
      }
      updates.shiftLocations = currentShiftLocs;

      DB.updateUser(empId, updates);

      // Update checkboxes in location popover
      const popover = document.getElementById(`loc-popover-${empId}`);
      if (popover) {
        const noneChk = popover.querySelector('.emp-loc-none-chk');
        const isNone = (finalLocs.length === 0);
        if (noneChk) {
          noneChk.checked = isNone;
          const opt = noneChk.closest('.emp-multi-select-option');
          if (opt) {
            if (isNone) opt.classList.add('selected');
            else opt.classList.remove('selected');
          }
        }
        popover.querySelectorAll('.emp-loc-chk').forEach(cb => {
          cb.checked = finalLocs.includes(cb.value);
          const opt = cb.closest('.emp-multi-select-option');
          if (opt) {
            if (cb.checked) opt.classList.add('selected');
            else opt.classList.remove('selected');
          }
        });
      }

      // Update trigger UI immediately
      updateLocTriggerUI(empId, finalLocs);

      // Update row data-loc for table filtering
      const row = document.querySelector(`.emp-loc-row[data-id="${empId}"]`);
      if (row) {
        row.dataset.loc = finalLocs.join(' , ').toLowerCase();
      }

      const statusBadge = document.getElementById(`loc-status-${empId}`);
      if (statusBadge) {
        statusBadge.innerHTML = 'Saved ✓';
        statusBadge.style.color = 'var(--success)';
      }
    };

    // Popover Floating Positioning & Visibility Management
    let currentOpenPopover = null;
    let currentOpenTrigger = null;

    const closeAllPopovers = () => {
      document.querySelectorAll('.emp-multi-select-popover').forEach(p => {
        p.style.display = 'none';
      });
      document.querySelectorAll('.emp-multi-select-btn').forEach(b => {
        b.classList.remove('active');
      });
      currentOpenPopover = null;
      currentOpenTrigger = null;
    };

    const positionAndOpenPopover = (popover, trigger) => {
      if (currentOpenPopover === popover) {
        closeAllPopovers();
        return;
      }
      closeAllPopovers();

      popover.style.display = 'flex';
      trigger.classList.add('active');
      currentOpenPopover = popover;
      currentOpenTrigger = trigger;

      const rect = trigger.getBoundingClientRect();
      const popoverHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        popover.style.top = Math.max(10, rect.top - popoverHeight - 4) + 'px';
      } else {
        popover.style.top = (rect.bottom + 4) + 'px';
      }

      const calculatedLeft = Math.max(10, Math.min(rect.left, window.innerWidth - 370));
      popover.style.left = calculatedLeft + 'px';
      popover.style.width = Math.max(rect.width, 290) + 'px';

      // Focus search input if present
      const searchInput = popover.querySelector('input[type="text"]');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 50);
      }
    };

    // Trigger button click listeners
    document.querySelectorAll('.emp-trigger-shift').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.dataset.empid;
        const popover = document.getElementById(`shift-popover-${empId}`);
        if (popover) positionAndOpenPopover(popover, btn);
      });
    });

    document.querySelectorAll('.emp-trigger-loc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.dataset.empid;
        const popover = document.getElementById(`loc-popover-${empId}`);
        if (popover) positionAndOpenPopover(popover, btn);
      });
    });

    // Bulk Trigger Listeners
    const bulkShiftTrigger = document.getElementById('bulk-shift-trigger');
    const bulkShiftPopover = document.getElementById('bulk-shift-popover');
    if (bulkShiftTrigger && bulkShiftPopover) {
      bulkShiftTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        positionAndOpenPopover(bulkShiftPopover, bulkShiftTrigger);
      });
    }

    const bulkLocTrigger = document.getElementById('bulk-loc-trigger');
    const bulkLocPopover = document.getElementById('bulk-loc-popover');
    if (bulkLocTrigger && bulkLocPopover) {
      bulkLocTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        positionAndOpenPopover(bulkLocPopover, bulkLocTrigger);
      });
    }

    // Close on click outside or on window scroll
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.emp-multi-select-wrap') && !e.target.closest('.emp-multi-select-popover')) {
        closeAllPopovers();
      }
    });

    window.addEventListener('resize', closeAllPopovers);

    // Filter search inside popovers
    document.querySelectorAll('.emp-search-shifts, .emp-search-locs').forEach(input => {
      input.addEventListener('input', (e) => {
        const query = (e.target.value || '').toLowerCase().trim();
        const popover = e.target.closest('.emp-multi-select-popover');
        if (!popover) return;
        popover.querySelectorAll('.emp-multi-select-option').forEach(opt => {
          const txt = (opt.dataset.txt || opt.textContent || '').toLowerCase();
          opt.style.display = (!query || txt.includes(query)) ? 'flex' : 'none';
        });
      });
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    // SHIFT CHECKBOX TOGGLE HANDLER
    document.querySelectorAll('.emp-shift-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const empId = e.target.dataset.empid;
        const checkedBoxes = document.querySelectorAll(`.emp-shift-chk[data-empid="${empId}"]:checked`);
        const checkedShiftIds = Array.from(checkedBoxes).map(c => c.value);
        applyUserShifts(empId, checkedShiftIds);
        if (typeof showToastNotification === 'function') {
          const user = DB.getUser(empId);
          const msg = checkedShiftIds.length > 0
            ? `✅ Assigned ${checkedShiftIds.length} shift(s) to ${user ? user.name : 'employee'}`
            : `ℹ️ All shifts removed for ${user ? user.name : 'employee'}`;
          showToastNotification(msg, 'success');
        }
      });
    });

    // NO SHIFT ASSIGNED HANDLER
    document.querySelectorAll('.emp-shift-none-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const empId = e.target.dataset.empid;
        if (e.target.checked) {
          applyUserShifts(empId, []);
          if (typeof showToastNotification === 'function') {
            const user = DB.getUser(empId);
            showToastNotification(`ℹ️ All shifts removed for ${user ? user.name : 'employee'}`, 'info');
          }
        } else {
          const checkedBoxes = document.querySelectorAll(`.emp-shift-chk[data-empid="${empId}"]:checked`);
          if (checkedBoxes.length === 0) e.target.checked = true;
        }
      });
    });

    // LOCATION CHECKBOX TOGGLE HANDLER
    document.querySelectorAll('.emp-loc-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const empId = e.target.dataset.empid;
        const checkedBoxes = document.querySelectorAll(`.emp-loc-chk[data-empid="${empId}"]:checked`);
        const checkedLocs = Array.from(checkedBoxes).map(c => c.value);
        applyUserLocations(empId, checkedLocs);
        if (typeof showToastNotification === 'function') {
          const user = DB.getUser(empId);
          const msg = checkedLocs.length > 0
            ? `✅ Assigned ${checkedLocs.length} location(s) to ${user ? user.name : 'employee'}`
            : `ℹ️ All worksite locations removed for ${user ? user.name : 'employee'}`;
          showToastNotification(msg, 'success');
        }
      });
    });

    // NO LOCATION ASSIGNED HANDLER
    document.querySelectorAll('.emp-loc-none-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const empId = e.target.dataset.empid;
        if (e.target.checked) {
          applyUserLocations(empId, []);
          if (typeof showToastNotification === 'function') {
            const user = DB.getUser(empId);
            showToastNotification(`ℹ️ All worksite locations removed for ${user ? user.name : 'employee'}`, 'info');
          }
        } else {
          const checkedBoxes = document.querySelectorAll(`.emp-loc-chk[data-empid="${empId}"]:checked`);
          if (checkedBoxes.length === 0) e.target.checked = true;
        }
      });
    });

    // Select All / Clear All Shift buttons in individual popovers
    document.querySelectorAll('.emp-btn-select-all-shifts').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.dataset.empid;
        applyUserShifts(empId, schedules.map(s => s.id));
        if (typeof showToastNotification === 'function') {
          const user = DB.getUser(empId);
          showToastNotification(`✅ All ${schedules.length} shifts assigned to ${user ? user.name : 'employee'}`, 'success');
        }
      });
    });

    document.querySelectorAll('.emp-btn-clear-shifts').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.dataset.empid;
        applyUserShifts(empId, []);
        if (typeof showToastNotification === 'function') {
          const user = DB.getUser(empId);
          showToastNotification(`ℹ️ All shifts cleared for ${user ? user.name : 'employee'}`, 'info');
        }
      });
    });

    // Select All / Clear All Location buttons in individual popovers
    document.querySelectorAll('.emp-btn-select-all-locs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.dataset.empid;
        applyUserLocations(empId, allLocationNames);
        if (typeof showToastNotification === 'function') {
          const user = DB.getUser(empId);
          showToastNotification(`✅ All ${allLocationNames.length} locations assigned to ${user ? user.name : 'employee'}`, 'success');
        }
      });
    });

    document.querySelectorAll('.emp-btn-clear-locs').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const empId = btn.dataset.empid;
        applyUserLocations(empId, []);
        if (typeof showToastNotification === 'function') {
          const user = DB.getUser(empId);
          showToastNotification(`ℹ️ All worksite locations cleared for ${user ? user.name : 'employee'}`, 'info');
        }
      });
    });

    // Bulk Multi-Select Shifts: None vs Specific & Select All / Clear
    const bulkShiftNoneChk = document.querySelector('.bulk-shift-none-chk');
    const updateBulkShiftTriggerLabel = () => {
      const isNone = document.querySelector('.bulk-shift-none-chk')?.checked;
      const label = document.getElementById('bulk-shift-label');
      if (label) {
        if (isNone) {
          label.textContent = '-- No Shift Assigned --';
          return;
        }
        const checked = document.querySelectorAll('.bulk-shift-chk:checked');
        if (checked.length === 0) label.textContent = '-- Select Shift(s) --';
        else if (checked.length === 1) {
          const s = DB.getSchedule(checked[0].value);
          label.textContent = `⏰ ${s ? s.name : '1 Shift Selected'}`;
        } else {
          label.textContent = `⏰ ${checked.length} Shifts Selected`;
        }
      }
    };

    if (bulkShiftNoneChk) {
      bulkShiftNoneChk.addEventListener('change', (e) => {
        if (e.target.checked) {
          document.querySelectorAll('.bulk-shift-chk').forEach(c => { c.checked = false; });
        }
        updateBulkShiftTriggerLabel();
      });
    }

    document.querySelectorAll('.bulk-shift-chk').forEach(c => {
      c.addEventListener('change', () => {
        if (c.checked && bulkShiftNoneChk) {
          bulkShiftNoneChk.checked = false;
        }
        updateBulkShiftTriggerLabel();
      });
    });

    const btnBulkSelectAllShifts = document.getElementById('btn-bulk-select-all-shifts');
    if (btnBulkSelectAllShifts) {
      btnBulkSelectAllShifts.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bulkShiftNoneChk) bulkShiftNoneChk.checked = false;
        document.querySelectorAll('.bulk-shift-chk').forEach(c => { c.checked = true; });
        updateBulkShiftTriggerLabel();
      });
    }
    const btnBulkClearShifts = document.getElementById('btn-bulk-clear-shifts');
    if (btnBulkClearShifts) {
      btnBulkClearShifts.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bulkShiftNoneChk) bulkShiftNoneChk.checked = false;
        document.querySelectorAll('.bulk-shift-chk').forEach(c => { c.checked = false; });
        updateBulkShiftTriggerLabel();
      });
    }

    // Bulk Multi-Select Locations: None vs Specific & Select All / Clear
    const bulkLocNoneChk = document.querySelector('.bulk-loc-none-chk');
    const updateBulkLocTriggerLabel = () => {
      const isNone = document.querySelector('.bulk-loc-none-chk')?.checked;
      const label = document.getElementById('bulk-loc-label');
      if (label) {
        if (isNone) {
          label.textContent = '-- No Worksite Location --';
          return;
        }
        const checked = document.querySelectorAll('.bulk-loc-chk:checked');
        if (checked.length === 0) label.textContent = '-- Select Location(s) --';
        else if (checked.length === 1) {
          label.textContent = `📍 ${checked[0].value}`;
        } else {
          label.textContent = `📍 ${checked.length} Locations Selected`;
        }
      }
    };

    if (bulkLocNoneChk) {
      bulkLocNoneChk.addEventListener('change', (e) => {
        if (e.target.checked) {
          document.querySelectorAll('.bulk-loc-chk').forEach(c => { c.checked = false; });
        }
        updateBulkLocTriggerLabel();
      });
    }

    document.querySelectorAll('.bulk-loc-chk').forEach(c => {
      c.addEventListener('change', () => {
        if (c.checked && bulkLocNoneChk) {
          bulkLocNoneChk.checked = false;
        }
        updateBulkLocTriggerLabel();
      });
    });

    const btnBulkSelectAllLocs = document.getElementById('btn-bulk-select-all-locs');
    if (btnBulkSelectAllLocs) {
      btnBulkSelectAllLocs.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bulkLocNoneChk) bulkLocNoneChk.checked = false;
        document.querySelectorAll('.bulk-loc-chk').forEach(c => { c.checked = true; });
        updateBulkLocTriggerLabel();
      });
    }
    const btnBulkClearLocs = document.getElementById('btn-bulk-clear-locs');
    if (btnBulkClearLocs) {
      btnBulkClearLocs.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bulkLocNoneChk) bulkLocNoneChk.checked = false;
        document.querySelectorAll('.bulk-loc-chk').forEach(c => { c.checked = false; });
        updateBulkLocTriggerLabel();
      });
    }

    // Select All Checkbox Handler for Employees
    const chkAll = document.getElementById('chk-select-all-emps');
    const updateSelectedCount = () => {
      const checkedBoxes = document.querySelectorAll('.chk-emp-loc:checked');
      const countEl = document.getElementById('bulk-selected-count');
      if (countEl) countEl.textContent = checkedBoxes.length;
    };

    if (chkAll) {
      chkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.emp-loc-row').forEach(row => {
          if (row.style.display !== 'none') {
            const chk = row.querySelector('.chk-emp-loc');
            if (chk) chk.checked = isChecked;
          }
        });
        updateSelectedCount();
      });
    }

    document.querySelectorAll('.chk-emp-loc').forEach(chk => {
      chk.addEventListener('change', updateSelectedCount);
    });

    // Bulk Apply Location & Shift Handler
    const btnApplyBulk = document.getElementById('btn-apply-bulk-location');
    if (btnApplyBulk) {
      btnApplyBulk.addEventListener('click', () => {
        const bulkShiftNone = document.querySelector('.bulk-shift-none-chk')?.checked ?? false;
        const bulkLocNone = document.querySelector('.bulk-loc-none-chk')?.checked ?? false;
        const selectedBulkShifts = Array.from(document.querySelectorAll('.bulk-shift-chk:checked')).map(c => c.value);
        const selectedBulkLocs = Array.from(document.querySelectorAll('.bulk-loc-chk:checked')).map(c => c.value);

        const hasShiftAction = bulkShiftNone || selectedBulkShifts.length > 0;
        const hasLocAction = bulkLocNone || selectedBulkLocs.length > 0;

        if (!hasShiftAction && !hasLocAction) {
          alert('Please select at least one shift and/or worksite location from the bulk dropdowns.');
          return;
        }

        const checkedBoxes = document.querySelectorAll('.chk-emp-loc:checked');
        if (!checkedBoxes.length) {
          alert('Please select at least one employee using the row checkboxes.');
          return;
        }

        checkedBoxes.forEach(chk => {
          const empId = chk.dataset.id;
          if (hasShiftAction) {
            const shiftTargets = bulkShiftNone ? [] : selectedBulkShifts;
            applyUserShifts(empId, shiftTargets);
          }
          if (hasLocAction) {
            const locTargets = bulkLocNone ? [] : selectedBulkLocs;
            applyUserLocations(empId, locTargets);
          }
        });

        const msgParts = [];
        if (bulkShiftNone) msgParts.push(`Removed Shift(s)`);
        else if (selectedBulkShifts.length > 0) msgParts.push(`${selectedBulkShifts.length} Shift(s)`);

        if (bulkLocNone) msgParts.push(`Removed Location(s)`);
        else if (selectedBulkLocs.length > 0) msgParts.push(`${selectedBulkLocs.length} Location(s)`);

        if (typeof showToastNotification === 'function') {
          showToastNotification(`✅ Successfully assigned ${msgParts.join(' & ')} to ${checkedBoxes.length} employee(s).`, 'success');
        }
      });
    }

    // Search and Filter Filtering Logic (Supports multiple assigned locations)
    const searchInput = document.getElementById('loc-assign-search');
    const deptFilter = document.getElementById('loc-assign-dept-filter');
    const locFilter = document.getElementById('loc-assign-loc-filter');
    const countInfo = document.getElementById('loc-assign-count-info');

    const filterRows = () => {
      const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const d = (deptFilter ? deptFilter.value : '').toLowerCase().trim();
      const l = (locFilter ? locFilter.value : '').toLowerCase().trim();

      let visible = 0;
      document.querySelectorAll('.emp-loc-row').forEach(row => {
        const name = row.dataset.name || '';
        const empId = row.dataset.empid || '';
        const dept = row.dataset.dept || '';
        const loc = row.dataset.loc || '';

        const matchQ = !q || name.includes(q) || empId.includes(q) || dept.includes(q);
        const matchD = !d || dept === d;
        const matchL = !l || (l === '__none__' ? (!loc || loc === 'no worksite location' || loc === 'none' || loc === '') : loc.includes(l));

        if (matchQ && matchD && matchL) {
          row.style.display = '';
          visible++;
        } else {
          row.style.display = 'none';
        }
      });

      if (countInfo) {
        countInfo.textContent = `Showing ${visible} of ${allUsers.length} employee(s)`;
      }
    };

    if (searchInput) searchInput.addEventListener('input', filterRows);
    if (deptFilter) deptFilter.addEventListener('change', filterRows);
    if (locFilter) locFilter.addEventListener('change', filterRows);

    return;
  }

  // STANDARD SHIFT PATTERNS VIEW
  main.innerHTML = html`
    <div class="content-header">
      <div>
        <h1 class="content-title">Shift Calendars & Shifts</h1>
        <div class="content-subtitle">Design active work hour calendars and assign shift profiles.</div>
      </div>
      <div style="display:flex; gap:10px; align-items:center; justify-content:flex-end; margin-left:auto; flex-wrap:wrap">
        <button class="btn btn-secondary" id="btn-toggle-sched-view" style="border-radius:10px; height:42px; padding:0 20px; font-size:13px; font-weight:700; white-space:nowrap; width:auto; border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.08); color:var(--success); cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 2px 8px rgba(16,185,129,0.15); transition:all 0.2s ease">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          📍 Assign Employee Locations
        </button>
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
                ${Object.keys(window.OFFICE_COORDINATES || {}).map(loc => `
                  <option value="${loc}" ${s.location === loc || (!s.location && loc === 'Kohat Enclave, Pitampura, Delhi') ? 'selected' : ''}>${loc}</option>
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

  document.getElementById('btn-toggle-sched-view').addEventListener('click', () => {
    renderAdminSchedules('locations');
  });

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
}
// Helper to load SheetJS dynamically from CDN
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

  overlay.innerHTML = html`
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

            statsRow.innerHTML = html`
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

  overlay.innerHTML = html`
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
