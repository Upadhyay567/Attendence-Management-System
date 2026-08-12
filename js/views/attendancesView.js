// js/views/attendancesView.js - Attendance Registers & Check-in/Out Logs
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal, openFullScreenImageModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderAdminAttendances() {
  const main = document.getElementById('main-view');
  const currentUser = Auth.getCurrentUser();
  if (!currentUser) return;

  main.innerHTML = html`
    <div id="admin-attendances-page-container" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: var(--text-primary);">
      <!-- Header Bar -->
      <div class="content-header" style="margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding: 0 0 16px 0; border-bottom: 1px solid var(--border);">
        <div>
          <h1 class="content-title" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.01em;">Attendances</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap;">
          <!-- Search Input -->
          <div style="position: relative; width: 220px; flex-shrink: 0;">
            <input type="text" id="admin-att-search" class="form-input" placeholder="Search" value="${Utils.escape(adminAttendancesSearchQuery)}" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; height: 34px; padding: 0 12px 0 34px; font-size: 14px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); width: 100%; box-sizing: border-box;">
            <svg style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; stroke: var(--text-muted); fill: none; pointer-events: none;" viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <!-- Actions Dropdown Button -->
          <div style="position: relative; flex-shrink: 0;">
            <button id="admin-att-actions-btn" class="btn btn-secondary" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: auto !important; height: 34px; padding: 0 15px; font-size: 14px; font-weight: 600; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); cursor: pointer; white-space: nowrap; transition: all 0.2s ease; box-sizing: border-box;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Actions
            </button>
            <div id="admin-att-actions-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 4px); background: #ffffff; border: 1px solid rgba(0,0,0,0.12); border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 1000; min-width: 140px; padding: 4px 0; overflow: hidden; animation: fadeIn 0.15s ease;">
              <button id="btn-admin-att-import" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: block; width: 100%; padding: 8px 18px; font-size: 14px; font-weight: 500; border: none; background: transparent; color: #1e293b; cursor: pointer; text-align: left; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">
                Import
              </button>
              <button id="btn-admin-att-export" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: block; width: 100%; padding: 8px 18px; font-size: 14px; font-weight: 500; border: none; background: transparent; color: #1e293b; cursor: pointer; text-align: left; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">
                Export
              </button>
              <button id="btn-admin-att-delete" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: block; width: 100%; padding: 8px 18px; font-size: 14px; font-weight: 600; border: none; background: transparent; color: #ef4444; cursor: pointer; text-align: left; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(239,68,68,0.08)'" onmouseout="this.style.background='transparent'">
                Delete
              </button>
            </div>
          </div>

          <!-- + Create Button -->
          <button id="admin-att-create-btn" class="btn" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: auto !important; height: 34px; padding: 0 16px; font-size: 14px; font-weight: 700; border-radius: 6px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; border: none; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3); cursor: pointer; white-space: nowrap; flex-shrink: 0; box-sizing: border-box; transition: all 0.2s ease;">
            <span style="font-size: 16px; line-height: 1; font-weight: 700;">+</span> Create
          </button>
        </div>
      </div>

      <!-- Hidden CSV file input for Import -->
      <input type="file" id="admin-att-csv-input" accept=".csv" style="display: none;">

      <!-- Subheader Controls Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 12px;">
        <!-- Left: Select Button -->
        <div>
          <button id="admin-att-select-toggle-btn" class="btn" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; width: auto !important; height: 32px; padding: 0 16px; border: 1.5px solid #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.04); font-size: 13.5px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; box-sizing: border-box;">
            <span id="admin-att-select-label">Select</span>
          </button>
        </div>

        <!-- Right: Single Clean Horizontal Box Pagination Panel « Previous 1 / 8 Next » -->
        <div class="admin-att-pagination-panel" style="display: inline-flex; align-items: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; height: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <button id="btn-att-first-page" style="border: none; background: transparent; height: 100%; padding: 0 10px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); cursor: pointer; border-right: 1px solid var(--border); transition: background 0.15s ease;" title="First Page">&laquo;</button>
          <button id="btn-att-prev-page" style="border: none; background: transparent; height: 100%; padding: 0 12px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); cursor: pointer; border-right: 1px solid var(--border); transition: background 0.15s ease;" title="Previous Page">Previous</button>
          
          <div style="display: flex; align-items: center; justify-content: center; padding: 0 10px; height: 100%; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--text-primary); border-right: 1px solid var(--border); background: rgba(0,0,0,0.015);">
            <input type="number" id="input-att-current-page" min="1" max="1" value="1" style="width: 32px; height: 22px; text-align: center; padding: 0; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 700; border: none; background: transparent; color: var(--text-primary); outline: none;">
            <span style="color: var(--text-muted); margin-left: 2px;">/ <span id="span-att-total-pages" style="color: var(--text-primary);">1</span></span>
          </div>

          <button id="btn-att-next-page" style="border: none; background: transparent; height: 100%; padding: 0 12px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); cursor: pointer; border-right: 1px solid var(--border); transition: background 0.15s ease;" title="Next Page">Next</button>
          <button id="btn-att-last-page" style="border: none; background: transparent; height: 100%; padding: 0 10px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: background 0.15s ease;" title="Last Page">&raquo;</button>
        </div>
      </div>

      <!-- Main Table Card -->
      <div class="card-panel" style="padding: 0; overflow: hidden; border-radius: 10px; border: 1px solid var(--border); background: #ffffff;">
        <div class="table-container" style="overflow-x: auto; margin: 0;">
          <table class="custom-table" id="admin-attendances-table" style="width: 100%; border-collapse: collapse; margin: 0; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); background: rgba(243, 237, 230, 0.5);">
                <th style="width: 44px; text-align: center; padding: 12px 10px;">
                  <input type="checkbox" id="admin-att-select-all" style="cursor: pointer; width: 16px; height: 16px; accent-color: #ef4444;">
                </th>
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-employee">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> Employee
                  </span>
                </th>
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-date">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> Date
                  </span>
                </th>
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-checkin">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> Check-In
                  </span>
                </th>
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-checkout">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> Check-Out
                  </span>
                </th>
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-shift">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> Shift
                  </span>
                </th>
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-atwork">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> At Work
                  </span>
                </th>
                <th style="text-align: right; padding: 12px 16px; width: 100px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);">
                  <span style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;">
                    Actions
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"></line>
                      <line x1="4" y1="10" x2="4" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12" y2="3"></line>
                      <line x1="20" y1="21" x2="20" y2="16"></line>
                      <line x1="20" y1="12" x2="20" y2="3"></line>
                      <line x1="1" y1="14" x2="7" y2="14"></line>
                      <line x1="9" y1="8" x2="15" y2="8"></line>
                      <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody id="admin-attendances-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Actions Dropdown Toggle
  const actionsBtn = document.getElementById('admin-att-actions-btn');
  const actionsMenu = document.getElementById('admin-att-actions-menu');
  if (actionsBtn && actionsMenu) {
    actionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionsMenu.style.display = actionsMenu.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
      actionsMenu.style.display = 'none';
    });
  }

  // + Create Attendance Button
  const createBtn = document.getElementById('admin-att-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      showCreateAttendanceModal();
    });
  }

  // Search input event
  const searchInput = document.getElementById('admin-att-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      adminAttendancesSearchQuery = e.target.value.trim();
      adminAttendancesCurrentPage = 1;
      updateTable();
    });
  }

  // Bulk Selection Header Checkbox
  const selectAllCb = document.getElementById('admin-att-select-all');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const visibleCbs = document.querySelectorAll('.admin-att-row-cb');
      visibleCbs.forEach(cb => {
        cb.checked = isChecked;
        const logId = cb.getAttribute('data-id');
        if (isChecked) {
          adminAttendancesSelectedIds.add(logId);
        } else {
          adminAttendancesSelectedIds.delete(logId);
        }
      });
      updateSelectedCountDisplay();
    });
  }

  // Select Button Click -> Toggle Select All Visible
  const selectToggleBtn = document.getElementById('admin-att-select-toggle-btn');
  if (selectToggleBtn) {
    selectToggleBtn.addEventListener('click', () => {
      const visibleCbs = document.querySelectorAll('.admin-att-row-cb');
      if (visibleCbs.length === 0) return;
      const allSelected = Array.from(visibleCbs).every(cb => cb.checked);
      visibleCbs.forEach(cb => {
        cb.checked = !allSelected;
        const logId = cb.getAttribute('data-id');
        if (!allSelected) {
          adminAttendancesSelectedIds.add(logId);
        } else {
          adminAttendancesSelectedIds.delete(logId);
        }
      });
      if (selectAllCb) selectAllCb.checked = !allSelected;
      updateSelectedCountDisplay();
    });
  }

  // Actions Dropdown: Import
  const btnImport = document.getElementById('btn-admin-att-import');
  const csvInput = document.getElementById('admin-att-csv-input');
  if (btnImport && csvInput) {
    btnImport.addEventListener('click', () => {
      csvInput.click();
    });

    csvInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length <= 1) {
            CustomDialog.alert("The CSV file is empty or missing data rows.", "Import Failed");
            return;
          }

          const employees = DB.getUsers().filter(u => u.role === 'employee' || DB.getUserBaseRole(u.role) === 'employee');
          const empMap = new Map();
          employees.forEach(u => {
            empMap.set(u.id.toLowerCase(), u);
            if (u.employeeId) empMap.set(u.employeeId.toLowerCase(), u);
            empMap.set(u.name.toLowerCase(), u);
          });

          let importedCount = 0;
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            if (cols.length < 3) continue;

            const empIdentifier = cols[0].toLowerCase();
            const matchedEmp = empMap.get(empIdentifier) || empMap.get((cols[1] || '').toLowerCase()) || employees[0];
            if (!matchedEmp) continue;

            const date = cols[2] || new Date().toISOString().split('T')[0];
            const checkIn = cols[3] || '09:00';
            const checkOut = cols[4] || '18:00';
            const status = cols[7] || 'On Time';

            DB.createManualAttendanceLog({
              userId: matchedEmp.id,
              date,
              checkIn,
              checkOut: checkOut === '--' ? null : checkOut,
              status
            });
            importedCount++;
          }

          requestsPushDBState();
          showToastNotification(`Successfully imported ${importedCount} attendance records.`, 'success');
          updateTable();
        } catch (err) {
          console.error("CSV Import error:", err);
          CustomDialog.alert("Failed to parse CSV file. Please verify the format.", "Import Error");
        }
      };
      reader.readAsText(file);
      csvInput.value = '';
    });
  }

  // Actions Dropdown: Export
  const btnExport = document.getElementById('btn-admin-att-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      if (adminAttendancesSelectedIds.size > 0) {
        exportEmployeeAttendancesCSV(Array.from(adminAttendancesSelectedIds));
      } else {
        exportEmployeeAttendancesCSV(null);
      }
    });
  }

  // Actions Dropdown: Delete
  const btnDelete = document.getElementById('btn-admin-att-delete');
  if (btnDelete) {
    btnDelete.addEventListener('click', async () => {
      if (adminAttendancesSelectedIds.size === 0) {
        await CustomDialog.alert("Please select one or more attendance records to delete.", "No Records Selected");
        return;
      }
      const count = adminAttendancesSelectedIds.size;
      const confirmed = await CustomDialog.confirm(`Are you sure you want to delete ${count} selected attendance record${count > 1 ? 's' : ''}?`, "Confirm Deletion");
      if (!confirmed) return;

      adminAttendancesSelectedIds.forEach(logId => {
        DB.deleteAttendanceLog(logId);
      });
      adminAttendancesSelectedIds.clear();
      requestsPushDBState();
      showToastNotification(`Successfully deleted ${count} attendance records.`, 'success');
      updateTable();
    });
  }

  // Sort Headers Click Listeners
  const sortMap = {
    'th-att-employee': 'employeeName',
    'th-att-date': 'date',
    'th-att-checkin': 'checkIn',
    'th-att-checkout': 'checkOut',
    'th-att-shift': 'shiftName',
    'th-att-atwork': 'atWorkMins'
  };

  Object.entries(sortMap).forEach(([thId, field]) => {
    const el = document.getElementById(thId);
    if (el) {
      el.addEventListener('click', () => {
        if (adminAttendancesSortField === field) {
          adminAttendancesSortOrder = adminAttendancesSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          adminAttendancesSortField = field;
          adminAttendancesSortOrder = 'asc';
        }
        updateTable();
      });
    }
  });

  function updateSelectedCountDisplay() {
    const labelEl = document.getElementById('admin-att-select-label');
    if (labelEl) {
      if (adminAttendancesSelectedIds.size === 0) {
        labelEl.textContent = 'Select';
      } else {
        labelEl.textContent = `Select (${adminAttendancesSelectedIds.size})`;
      }
    }
  }

  // Core Table Update Function
  function updateTable() {
    // 1. Fetch employee records ONLY (Excludes HR and Manager)
    const allUsers = DB.getUsers();
    const employeeUsers = allUsers.filter(u => u.role === 'employee' || DB.getUserBaseRole(u.role) === 'employee');
    const employeeMap = new Map(employeeUsers.map(u => [u.id, u]));

    const rawLogs = DB.getLogs().filter(log => employeeMap.has(log.userId));

    // Map logs with rich display values
    const mappedLogs = rawLogs.map(log => {
      const emp = employeeMap.get(log.userId);
      const empName = emp ? emp.name : 'Unknown Employee';
      const empId = emp ? (emp.employeeId || emp.id) : '';
      const shift = DB.getSchedule(log.shiftId);
      const shiftName = shift ? shift.name : 'Regular Shift';
      
      let atWorkStr = '--:--';
      let atWorkMins = 0;
      if (log.checkIn && log.checkOut) {
        const [inH, inM] = log.checkIn.split(':').map(Number);
        const [outH, outM] = log.checkOut.split(':').map(Number);
        atWorkMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (atWorkMins < 0) atWorkMins += 24 * 60;
        const hh = String(Math.floor(atWorkMins / 60)).padStart(2, '0');
        const mm = String(atWorkMins % 60).padStart(2, '0');
        atWorkStr = `${hh}:${mm}`;
      } else if (log.checkIn && !log.checkOut) {
        atWorkStr = 'In Session';
        atWorkMins = 9999;
      }

      return {
        ...log,
        emp,
        employeeName: empName,
        employeeId: empId,
        shiftName,
        atWorkStr,
        atWorkMins
      };
    });

    // 2. Filter by search query
    let filtered = mappedLogs;
    if (adminAttendancesSearchQuery) {
      const q = adminAttendancesSearchQuery.toLowerCase();
      filtered = mappedLogs.filter(l => {
        return l.employeeName.toLowerCase().includes(q) ||
               l.employeeId.toLowerCase().includes(q) ||
               l.date.toLowerCase().includes(q) ||
               l.shiftName.toLowerCase().includes(q) ||
               (l.checkIn && l.checkIn.includes(q)) ||
               (l.checkOut && l.checkOut.includes(q)) ||
               (l.status && l.status.toLowerCase().includes(q));
      });
    }

    // 3. Sort
    filtered.sort((a, b) => {
      let valA = a[adminAttendancesSortField] || '';
      let valB = b[adminAttendancesSortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return adminAttendancesSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return adminAttendancesSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 4. Pagination
    const totalEntries = filtered.length;
    const totalPages = Math.ceil(totalEntries / adminAttendancesRowsPerPage) || 1;
    if (adminAttendancesCurrentPage > totalPages) adminAttendancesCurrentPage = totalPages;
    if (adminAttendancesCurrentPage < 1) adminAttendancesCurrentPage = 1;

    const startIndex = (adminAttendancesCurrentPage - 1) * adminAttendancesRowsPerPage;
    const endIndex = Math.min(startIndex + adminAttendancesRowsPerPage, totalEntries);
    const paginated = filtered.slice(startIndex, endIndex);

    // Update Pagination Inputs
    const pageInput = document.getElementById('input-att-current-page');
    const totalPagesSpan = document.getElementById('span-att-total-pages');
    if (pageInput) {
      pageInput.value = adminAttendancesCurrentPage;
      pageInput.max = totalPages;
    }
    if (totalPagesSpan) {
      totalPagesSpan.textContent = totalPages;
    }

    const tbody = document.getElementById('admin-attendances-tbody');
    if (!tbody) return;

    if (paginated.length === 0) {
      tbody.innerHTML = html`
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px 20px; color: var(--text-muted); font-size: 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
            No employee attendance records found.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = paginated.map(log => {
        const isChecked = adminAttendancesSelectedIds.has(log.id);
        const initials = log.employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const avatarBg = getInitialsColor(log.userId || log.employeeName);
        
        // Format checkIn & checkOut to show full seconds if available or hh:mm:ss
        let checkInDisplay = log.checkIn || '--:--';
        if (checkInDisplay !== '--:--' && checkInDisplay.length === 5) checkInDisplay += ':00';
        
        let checkOutDisplay = log.checkOut || '--:--';
        if (checkOutDisplay !== '--:--' && checkOutDisplay.length === 5) checkOutDisplay += ':00';

        return `
          <tr style="border-bottom: 1px solid var(--border); transition: background 0.15s ease; font-family: Calibri, 'Segoe UI', Arial, sans-serif;" onmouseover="this.style.background='rgba(0,0,0,0.015)'" onmouseout="this.style.background='transparent'">
            <td style="width: 44px; text-align: center; padding: 12px 10px;">
              <input type="checkbox" class="admin-att-row-cb" data-id="${log.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: #ef4444;">
            </td>
            <td style="padding: 12px 14px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: ${avatarBg}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.15);">
                  ${initials}
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap;">
                  ${Utils.escape(log.employeeName)} <span style="font-size: 13px; font-weight: 500; color: #ef4444; opacity: 0.9;">(${Utils.escape(log.employeeId)})</span>
                </div>
              </div>
            </td>
            <td style="padding: 12px 14px; font-size: 14px; color: #334155; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">${log.date}</td>
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 500; color: #1e293b; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">${checkInDisplay}</td>
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 500; color: #1e293b; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">${checkOutDisplay}</td>
            <td style="padding: 12px 14px; font-size: 14px; color: #334155; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">${Utils.escape(log.shiftName)}</td>
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 700; color: #1e293b; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">${log.atWorkStr}</td>
            <td style="padding: 12px 16px; text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                <button class="btn-att-edit" data-id="${log.id}" title="Edit" style="background: transparent; border: 1px solid var(--border); border-radius: 6px; width: 28px; height: 28px; padding: 0; color: var(--text-secondary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s ease;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn-att-delete" data-id="${log.id}" title="Delete" style="background: #ef4444; border: none; border-radius: 6px; width: 28px; height: 28px; padding: 0; color: #ffffff; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3); transition: all 0.15s ease;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Row Checkbox Listeners
    tbody.querySelectorAll('.admin-att-row-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          adminAttendancesSelectedIds.add(id);
        } else {
          adminAttendancesSelectedIds.delete(id);
        }
        updateSelectedCountDisplay();
        const allVisibleChecked = Array.from(tbody.querySelectorAll('.admin-att-row-cb')).every(c => c.checked);
        if (selectAllCb) selectAllCb.checked = allVisibleChecked;
      });
    });

    // Row Edit Button Listeners
    tbody.querySelectorAll('.btn-att-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const logId = btn.getAttribute('data-id');
        showEditAttendanceModal(logId);
      });
    });

    // Row Delete Button Listeners
    tbody.querySelectorAll('.btn-att-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const logId = btn.getAttribute('data-id');
        const confirmed = await CustomDialog.confirm("Are you sure you want to delete this attendance record?", "Delete Attendance Record");
        if (confirmed) {
          DB.deleteAttendanceLog(logId);
          adminAttendancesSelectedIds.delete(logId);
          requestsPushDBState();
          showToastNotification("Attendance record deleted successfully.", 'success');
          updateTable();
        }
      });
    });

    updateSelectedCountDisplay();
  }

  // Pagination navigation listeners
  const btnFirst = document.getElementById('btn-att-first-page');
  if (btnFirst) {
    btnFirst.addEventListener('click', () => {
      if (adminAttendancesCurrentPage !== 1) {
        adminAttendancesCurrentPage = 1;
        updateTable();
      }
    });
  }

  const btnPrev = document.getElementById('btn-att-prev-page');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (adminAttendancesCurrentPage > 1) {
        adminAttendancesCurrentPage--;
        updateTable();
      }
    });
  }

  const btnNext = document.getElementById('btn-att-next-page');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const allUsers = DB.getUsers();
      const employeeUsers = allUsers.filter(u => u.role === 'employee' || DB.getUserBaseRole(u.role) === 'employee');
      const employeeMap = new Map(employeeUsers.map(u => [u.id, u]));
      const rawLogs = DB.getLogs().filter(log => employeeMap.has(log.userId));
      const totalPages = Math.ceil(rawLogs.length / adminAttendancesRowsPerPage) || 1;

      if (adminAttendancesCurrentPage < totalPages) {
        adminAttendancesCurrentPage++;
        updateTable();
      }
    });
  }

  const btnLast = document.getElementById('btn-att-last-page');
  if (btnLast) {
    btnLast.addEventListener('click', () => {
      const allUsers = DB.getUsers();
      const employeeUsers = allUsers.filter(u => u.role === 'employee' || DB.getUserBaseRole(u.role) === 'employee');
      const employeeMap = new Map(employeeUsers.map(u => [u.id, u]));
      const rawLogs = DB.getLogs().filter(log => employeeMap.has(log.userId));
      const totalPages = Math.ceil(rawLogs.length / adminAttendancesRowsPerPage) || 1;

      if (adminAttendancesCurrentPage !== totalPages) {
        adminAttendancesCurrentPage = totalPages;
        updateTable();
      }
    });
  }

  const inputCurrentPage = document.getElementById('input-att-current-page');
  if (inputCurrentPage) {
    inputCurrentPage.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (!isNaN(val) && val >= 1) {
        adminAttendancesCurrentPage = val;
        updateTable();
      }
    });
  }

  updateTable();
}

// Modal for Creating New Attendance Record
function showCreateAttendanceModal() {
  const employees = DB.getUsers().filter(u => u.role === 'employee' || DB.getUserBaseRole(u.role) === 'employee');
  const schedules = DB.getSchedules();
  const todayStr = new Date().toISOString().split('T')[0];

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = '9999';

  modalOverlay.innerHTML = html`
    <div class="modal-content" style="max-width: 480px; animation: fadeIn 0.2s ease;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 18px;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text-primary);">Create Attendance Record</h3>
        <button class="modal-close" id="btn-close-create-att-modal" style="background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer;">✕</button>
      </div>
      <form id="form-create-attendance">
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Select Employee *</label>
          <select id="modal-create-att-user" class="form-input" required style="width: 100%; font-size: 13px;">
            ${employees.map(e => `
              <option value="${e.id}">${Utils.escape(e.name)} (${Utils.escape(e.employeeId || e.id)})</option>
            `).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Date *</label>
            <input type="date" id="modal-create-att-date" class="form-input" value="${todayStr}" required style="width: 100%; font-size: 13px;">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Shift *</label>
            <select id="modal-create-att-shift" class="form-input" style="width: 100%; font-size: 13px;">
              ${schedules.map(s => `
                <option value="${s.id}">${Utils.escape(s.name)} (${s.startTime}-${s.endTime})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Check-In Time *</label>
            <input type="time" id="modal-create-att-checkin" class="form-input" value="09:00" required style="width: 100%; font-size: 13px;">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Check-Out Time</label>
            <input type="time" id="modal-create-att-checkout" class="form-input" value="18:00" style="width: 100%; font-size: 13px;">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Attendance Status</label>
          <select id="modal-create-att-status" class="form-input" style="width: 100%; font-size: 13px;">
            <option value="On Time">On Time</option>
            <option value="Late">Late</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border); padding-top: 14px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-create-att" style="padding: 8px 16px; font-size: 13px;">Cancel</button>
          <button type="submit" class="btn" style="padding: 8px 20px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">Save Record</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => {
    modalOverlay.remove();
  };

  modalOverlay.querySelector('#btn-close-create-att-modal').addEventListener('click', closeModal);
  modalOverlay.querySelector('#btn-cancel-create-att').addEventListener('click', closeModal);

  modalOverlay.querySelector('#form-create-attendance').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('modal-create-att-user').value;
    const date = document.getElementById('modal-create-att-date').value;
    const shiftId = document.getElementById('modal-create-att-shift').value;
    const checkIn = document.getElementById('modal-create-att-checkin').value;
    const checkOut = document.getElementById('modal-create-att-checkout').value || null;
    const status = document.getElementById('modal-create-att-status').value;

    DB.createManualAttendanceLog({
      userId,
      date,
      shiftId,
      checkIn,
      checkOut,
      status
    });

    requestsPushDBState();
    closeModal();
    showToastNotification("Attendance record created successfully.", 'success');
    renderAdminAttendances();
  });
}

// Modal for Editing Existing Attendance Record
function showEditAttendanceModal(logId) {
  const log = DB.data.attendanceLogs.find(l => l.id === logId);
  if (!log) return;

  const emp = DB.getUser(log.userId);
  const schedules = DB.getSchedules();

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.zIndex = '9999';

  modalOverlay.innerHTML = html`
    <div class="modal-content" style="max-width: 480px; animation: fadeIn 0.2s ease;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 18px;">
        <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: var(--text-primary);">Edit Attendance Record</h3>
        <button class="modal-close" id="btn-close-edit-att-modal" style="background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer;">✕</button>
      </div>
      <form id="form-edit-attendance">
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Employee</label>
          <input type="text" class="form-input" value="${emp ? Utils.escape(emp.name) + ' (' + Utils.escape(emp.employeeId || emp.id) + ')' : 'Employee'}" disabled style="width: 100%; font-size: 13px; background: rgba(255,255,255,0.03); opacity: 0.8;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Date *</label>
            <input type="date" id="modal-edit-att-date" class="form-input" value="${log.date}" required style="width: 100%; font-size: 13px;">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Shift *</label>
            <select id="modal-edit-att-shift" class="form-input" style="width: 100%; font-size: 13px;">
              ${schedules.map(s => `
                <option value="${s.id}" ${s.id === log.shiftId ? 'selected' : ''}>${Utils.escape(s.name)} (${s.startTime}-${s.endTime})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Check-In Time</label>
            <input type="time" id="modal-edit-att-checkin" class="form-input" value="${log.checkIn || ''}" style="width: 100%; font-size: 13px;">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Check-Out Time</label>
            <input type="time" id="modal-edit-att-checkout" class="form-input" value="${log.checkOut || ''}" style="width: 100%; font-size: 13px;">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Attendance Status</label>
          <select id="modal-edit-att-status" class="form-input" style="width: 100%; font-size: 13px;">
            <option value="On Time" ${log.status === 'On Time' ? 'selected' : ''}>On Time</option>
            <option value="Late" ${log.status === 'Late' ? 'selected' : ''}>Late</option>
            <option value="Half Day" ${log.status === 'Half Day' ? 'selected' : ''}>Half Day</option>
            <option value="Absent" ${log.status === 'Absent' ? 'selected' : ''}>Absent</option>
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border); padding-top: 14px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-edit-att" style="padding: 8px 16px; font-size: 13px;">Cancel</button>
          <button type="submit" class="btn" style="padding: 8px 20px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(239,68,68,0.3);">Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => {
    modalOverlay.remove();
  };

  modalOverlay.querySelector('#btn-close-edit-att-modal').addEventListener('click', closeModal);
  modalOverlay.querySelector('#btn-cancel-edit-att').addEventListener('click', closeModal);

  modalOverlay.querySelector('#form-edit-attendance').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('modal-edit-att-date').value;
    const shiftId = document.getElementById('modal-edit-att-shift').value;
    const checkIn = document.getElementById('modal-edit-att-checkin').value || null;
    const checkOut = document.getElementById('modal-edit-att-checkout').value || null;
    const status = document.getElementById('modal-edit-att-status').value;

    DB.updateAttendanceLog(logId, {
      date,
      shiftId,
      checkIn,
      checkOut,
      status
    });

    requestsPushDBState();
    closeModal();
    showToastNotification("Attendance record updated successfully.", 'success');
    renderAdminAttendances();
  });
}

// Helper to export Employee Attendance records to CSV
function exportEmployeeAttendancesCSV(specificLogIds = null) {
  const allUsers = DB.getUsers();
  const employeeUsers = allUsers.filter(u => u.role === 'employee' || DB.getUserBaseRole(u.role) === 'employee');
  const employeeMap = new Map(employeeUsers.map(u => [u.id, u]));

  let logs = DB.getLogs().filter(log => employeeMap.has(log.userId));
  if (specificLogIds && specificLogIds.length > 0) {
    const idSet = new Set(specificLogIds);
    logs = logs.filter(l => idSet.has(l.id));
  }

  const filename = `Employee_Attendances_${new Date().toISOString().split('T')[0]}.csv`;
  const headers = ['Employee Name', 'Employee ID', 'Date', 'Check-In', 'Check-Out', 'Shift', 'At Work', 'Status', 'Location'];
  const rows = logs.map(l => {
    const emp = employeeMap.get(l.userId);
    const shift = DB.getSchedule(l.shiftId);
    const atWork = Utils.calculateDuration(l.checkIn, l.checkOut);
    return [
      emp ? emp.name : 'Unknown',
      emp ? (emp.employeeId || emp.id) : '',
      l.date,
      l.checkIn || '--',
      l.checkOut || '--',
      shift ? shift.name : 'Regular Shift',
      atWork === '-' ? '--' : atWork,
      l.status || 'On Time',
      l.location || 'N/A'
    ];
  });

  Utils.exportToCSV(filename, headers, rows);
}

// ==========================================
// DAILY WORK STATUS (HR / MANAGER VIEW)
// ==========================================
const nowDWS = new Date();
let dailyWorkStatusSelectedYear = nowDWS.getFullYear();
let dailyWorkStatusSelectedMonth = nowDWS.getMonth(); // 0-indexed (e.g. 7 = August)
let dailyWorkStatusCurrentPage = 1;
let dailyWorkStatusRowsPerPage = 18;
let dailyWorkStatusSearchQuery = '';
let dailyWorkStatusDepartmentFilter = 'all';
let dailyWorkStatusStatusFilter = 'all';
