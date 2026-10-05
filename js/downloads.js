import { DB } from './core/db.js';
import { Auth } from './auth.js';
import { Utils } from './utils.js';
import { AppAPI } from './AppAPI.js';

export function getActiveDB() {
  if (typeof window !== 'undefined' && window.DB && window.DB.data && Array.isArray(window.DB.data.users) && window.DB.data.users.length > 0) {
    return window.DB;
  }
  return DB;
}

export function getActiveAuth() {
  if (typeof window !== 'undefined' && window.Auth && window.Auth.currentUser) {
    return window.Auth;
  }
  return Auth;
}

// Extend DB with custom query logic for Profile and Report downloads
export function registerCustomQueries(targetDb) {
  if (!targetDb) return;
  targetDb.queryEmployeeProfiles = function(userIds) {
    const list = (targetDb.getUsers ? targetDb.getUsers() : (targetDb.data ? targetDb.data.users : [])) || [];
    return list.filter(u => userIds.includes(u.id) || (u.employeeId && userIds.includes(u.employeeId)));
  };

  targetDb.queryAttendanceReport = function(userIds, month, year) {
    const list = (targetDb.getUsers ? targetDb.getUsers() : (targetDb.data ? targetDb.data.users : [])) || [];
    return userIds.map(userId => {
      const user = list.find(u => u.id === userId || u.employeeId === userId) || (targetDb.getUser ? targetDb.getUser(userId) : null);
      if (!user) return null;
      const schedule = (targetDb.getSchedule ? targetDb.getSchedule(user.scheduleId) : null) || {};
      const payroll = (targetDb.calculateMonthlyPayroll ? targetDb.calculateMonthlyPayroll(user.id, month, year) : null) || {};
      
      const logs = (targetDb.getLogs ? targetDb.getLogs(user.id) : []).filter(l => {
        if (!l || !l.date) return false;
        const [lY, lM] = l.date.split('-').map(Number);
        return lY === year && (lM - 1) === month;
      });

      let totalWorkingMinutes = 0;
      logs.forEach(l => {
        if (l.checkIn && l.checkOut) {
          const [inH, inM] = l.checkIn.split(':').map(Number);
          const [outH, outM] = l.checkOut.split(':').map(Number);
          const diff = (outH * 60 + outM) - (inH * 60 + inM);
          if (diff > 0) totalWorkingMinutes += diff;
        }
      });

      let overtimeMinutes = 0;
      logs.forEach(l => {
        if (l.checkIn && l.checkOut) {
          const [inH, inM] = l.checkIn.split(':').map(Number);
          const [outH, outM] = l.checkOut.split(':').map(Number);
          const diff = (outH * 60 + outM) - (inH * 60 + inM);
          if (diff > 480) overtimeMinutes += (diff - 480);
        }
      });

      return {
        user,
        schedule,
        payroll,
        logs,
        totalHours: (totalWorkingMinutes / 60).toFixed(1) + ' hrs',
        overtimeHours: (overtimeMinutes / 60).toFixed(1) + ' hrs'
      };
    }).filter(Boolean);
  };
}

registerCustomQueries(DB);
if (typeof window !== 'undefined' && window.DB) {
  registerCustomQueries(window.DB);
}

// Loader utility for SheetJS Excel export
export function loadSheetJS(callback, onError) {
  window.loadSheetJS = loadSheetJS;
  if (window.XLSX) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'js/libs/xlsx.full.min.js';
  script.onload = callback;
  script.onerror = () => {
    const cdnScript = document.createElement('script');
    cdnScript.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    cdnScript.onload = callback;
    cdnScript.onerror = () => {
      if (onError) onError();
      else alert('Failed to load Excel library. Please check your internet connection.');
    };
    document.head.appendChild(cdnScript);
  };
  document.head.appendChild(script);
}

// -------------------------------------------------------------------------
// COMPONENT 1: DOWNLOAD PROFILE MODAL
// -------------------------------------------------------------------------
export async function openProfileDownloadModal(preSelectedUserId, preSelectedLocation) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
  `;
  
  const activeDB = getActiveDB();
  const activeAuth = getActiveAuth();

  // If DB data is not yet populated, await DB.init()
  if (!activeDB.data || !Array.isArray(activeDB.data.users) || activeDB.data.users.length === 0) {
    if (typeof activeDB.init === 'function') {
      try {
        await activeDB.init();
      } catch (e) {
        console.warn('DB.init warning in openProfileDownloadModal:', e);
      }
    }
  }

  let rawUsers = (activeDB.getUsers ? activeDB.getUsers() : (activeDB.data ? activeDB.data.users : [])) || [];

  // Fallback direct fetch to /api/db-state if users array is still empty
  if (!rawUsers || rawUsers.length === 0) {
    try {
      const baseUrl = (typeof window !== 'undefined' && window.apiBaseUrl) ? window.apiBaseUrl : '';
      const res = await fetch(baseUrl + '/api/db-state?v=' + Date.now());
      if (res.ok) {
        const state = await res.json();
        if (state && Array.isArray(state.users) && state.users.length > 0) {
          activeDB.data = state;
          if (typeof window !== 'undefined' && window.DB) window.DB.data = state;
          rawUsers = state.users;
        }
      }
    } catch (err) {
      console.warn('Fallback direct fetch to /api/db-state failed:', err);
    }
  }

  // Ensure current user is resolved
  if (activeAuth && typeof activeAuth.init === 'function' && !activeAuth.currentUser) {
    activeAuth.init();
  }
  const loggedInUser = (activeAuth.getCurrentUser ? activeAuth.getCurrentUser() : activeAuth.currentUser) || {};
  const userRole = String(loggedInUser.role || '').toLowerCase();
  const isAdminOrHrOrManager = userRole === 'hr' || userRole === 'admin' || userRole === 'manager' || userRole.includes('admin') || userRole.includes('manager');

  let users = [];
  if (isAdminOrHrOrManager || !loggedInUser.id) {
    // HR, Admin, and Operations Managers (and default view) see all employees in company
    users = rawUsers.filter(u => u && u.status !== 'Inactive');
    if (users.length === 0) {
      users = rawUsers.filter(Boolean);
    }
  } else if (loggedInUser.id) {
    // Individual employees download their own profile
    users = rawUsers.filter(u => u && (u.id === loggedInUser.id || (u.employeeId && u.employeeId === loggedInUser.employeeId)));
    if (users.length === 0 && loggedInUser.name) {
      users = [loggedInUser];
    }
  } else {
    users = rawUsers.filter(u => u && u.status !== 'Inactive');
    if (users.length === 0) {
      users = rawUsers.filter(Boolean);
    }
  }

  // Pre-calculate user locations map from attendance punch logs
  const allLogs = (activeDB.getLogs ? activeDB.getLogs() : (activeDB.data ? activeDB.data.attendanceLogs : [])) || [];
  const devs = (activeDB.getBiometricDevices ? activeDB.getBiometricDevices() : (activeDB.data ? activeDB.data.biometricDevices : [])) || [];
  const offices = (activeDB.getOfficeCoordinates ? activeDB.getOfficeCoordinates() : (activeDB.data ? activeDB.data.officeCoordinates : {})) || {};

  const userLocationsMap = new Map();
  allLogs.forEach(l => {
    const loc = (l.location || l.biometricUsed || l.branch || '').toLowerCase().trim();
    if (!loc) return;
    if (l.userId) {
      if (!userLocationsMap.has(l.userId)) userLocationsMap.set(l.userId, new Set());
      userLocationsMap.get(l.userId).add(loc);
    }
    if (l.employeeId) {
      if (!userLocationsMap.has(l.employeeId)) userLocationsMap.set(l.employeeId, new Set());
      userLocationsMap.get(l.employeeId).add(loc);
    }
    if (l.biometricUserId) {
      const bk = 'bio_' + l.biometricUserId;
      if (!userLocationsMap.has(bk)) userLocationsMap.set(bk, new Set());
      userLocationsMap.get(bk).add(loc);
    }
  });

  const getUserLocations = (u) => {
    const set = new Set();
    const add = (v) => { if (typeof v === 'string' && v.trim()) set.add(v.toLowerCase().trim()); };
    add(u.workLocation);
    add(u.preferredLocation);
    if (Array.isArray(u.preferredLocations)) u.preferredLocations.forEach(add);
    if (Array.isArray(u.assignedLocations)) u.assignedLocations.forEach(add);
    if (u.shiftLocations && typeof u.shiftLocations === 'object') Object.values(u.shiftLocations).forEach(add);
    const fromLogs = userLocationsMap.get(u.id) || userLocationsMap.get(u.employeeId) || userLocationsMap.get('bio_' + u.biometricUserId);
    if (fromLogs) fromLogs.forEach(l => set.add(l));
    return set;
  };

  const getUserPrimaryLocation = (u) => {
    if (u.workLocation && u.workLocation.trim()) return u.workLocation.trim();
    if (u.preferredLocation && u.preferredLocation.trim()) return u.preferredLocation.trim();
    if (Array.isArray(u.preferredLocations) && u.preferredLocations[0] && u.preferredLocations[0].trim()) return u.preferredLocations[0].trim();
    const uLocs = getUserLocations(u);
    if (uLocs.size > 0) return Array.from(uLocs)[0];
    return 'Head Office';
  };

  const distinctLocs = Array.from(new Set([
    ...rawUsers.map(u => (u.workLocation || u.preferredLocation || '').trim()).filter(Boolean),
    ...allLogs.map(l => (l.location || l.biometricUsed || l.branch || '').trim()).filter(Boolean),
    ...devs.map(d => (d.location || d.branch || d.name || '').trim()).filter(Boolean),
    ...Object.keys(offices)
  ])).filter(loc => !loc.toLowerCase().includes('kohat')).sort((a, b) => a.localeCompare(b));

  const isChecked = (uId) => {
    if (preSelectedUserId) return uId === preSelectedUserId;
    return true;
  };

  overlay.innerHTML = `
    <div class="modal-content card-panel" style="max-width: 480px; padding: 24px; display:flex; flex-direction:column; gap:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:var(--shadow-lg)">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px">
        <h3 style="margin:0; font-size:16px; font-weight:800; color:var(--text-primary)">📥 Download Profile</h3>
        <button class="close-modal-btn" style="background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer">&times;</button>
      </div>

      <div style="font-size:12px; color:var(--text-muted)">
        Select one or more employees to download their profile records as Excel or PDF.
      </div>

      <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
        <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">Select Employees</label>
        
        <!-- Search Input & Location Filter Row -->
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
          <input type="text" id="profile-search-input" class="form-input" placeholder="🔍 Search employee name or ID..." style="flex:1; min-width:0; padding:8px 12px; font-size:12px; background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); border-radius:8px">
          <select id="profile-location-filter" class="form-input" style="width:145px; height:34px; padding:0 8px; font-size:11.5px; font-weight:600; background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); border-radius:8px; cursor:pointer;" title="Filter by Worksite Location">
            <option value="">📍 All Locations</option>
            ${distinctLocs.map(loc => `<option value="${Utils.escape(loc)}" ${(preSelectedLocation && preSelectedLocation.toLowerCase().trim() === loc.toLowerCase().trim()) ? 'selected' : ''}>${Utils.escape(loc)}</option>`).join('')}
          </select>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; padding: 2px 4px">
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-secondary)">
            <input type="checkbox" id="profile-select-all" style="cursor:pointer" ${!preSelectedUserId ? 'checked' : ''}> Select All
          </label>
          <span id="profile-selection-count" style="font-size:11.5px; font-weight:600; color:var(--cyan)">0 selected</span>
        </div>

        <div id="profile-checkbox-list" style="max-height: 190px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; display: flex; flex-direction: column; gap:6px; background: rgba(0,0,0,0.15)">
          ${users.map(u => {
            const uName = u.name || u.username || 'Employee';
            const uEmpId = u.employeeId || u.id || '';
            const checked = isChecked(u.id);
            const userLocs = getUserLocations(u);
            const primaryLoc = getUserPrimaryLocation(u);
            const initialMatchesLoc = !preSelectedLocation || userLocs.has(preSelectedLocation.toLowerCase().trim());
            return `
            <label class="profile-chk-item" data-name="${String(uName).toLowerCase()}" data-empid="${String(uEmpId).toLowerCase()}" data-id="${u.id}" data-locations="${Array.from(userLocs).join('|')}" style="display:${initialMatchesLoc ? 'flex' : 'none'}; align-items:center; gap:8px; font-size:12px; cursor:pointer; padding:4px 6px; border-radius:var(--radius-sm);">
              <input type="checkbox" class="profile-user-checkbox" value="${u.id}" style="cursor:pointer" ${checked && initialMatchesLoc ? 'checked' : ''}>
              <span style="font-weight:600; color:var(--text-primary)">${Utils.escape(uName)}</span>
              <span style="color:var(--text-muted); font-size:11px">(${Utils.escape(uEmpId)})</span>
              <span style="margin-left:auto; font-size:10px; color:var(--text-muted); background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:4px; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${Utils.escape(primaryLoc)}">📍 ${Utils.escape(primaryLoc)}</span>
            </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">File Format</label>
        <select id="profile-format-select" class="form-input" style="background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); padding:8px 12px; border-radius:8px; cursor:pointer; font-size:12.5px; font-weight:600;">
          <option value="xlsx">📊 Excel Spreadsheet (.xlsx)</option>
          <option value="pdf">📄 PDF Document (.pdf)</option>
        </select>
      </div>

      <div id="profile-warning-box" style="display:none; padding:10px 14px; border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-sm); background:rgba(239,68,68,0.05); color:var(--error); font-size:11.5px; font-weight:600; line-height:1.45;"></div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px; border-top:1px solid var(--border); padding-top:14px">
        <button class="btn btn-secondary cancel-modal-btn" style="width:auto; padding:8px 16px; font-size:12.5px; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; cursor:pointer">Cancel</button>
        <button class="btn btn-cyan" id="btn-profile-export-action" style="width:auto; padding:8px 20px; font-size:12.5px; font-weight:700; background:var(--primary); color:#ffffff; border:none; border-radius:8px; cursor:pointer">Download</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector('#profile-search-input');
  const locationFilterSelect = overlay.querySelector('#profile-location-filter');
  const selectAllChk = overlay.querySelector('#profile-select-all');
  const checkboxList = overlay.querySelector('#profile-checkbox-list');
  const selectionCount = overlay.querySelector('#profile-selection-count');
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

  const filterEmployeeItems = () => {
    const query = searchInput.value.toLowerCase().trim();
    const selectedLoc = locationFilterSelect ? locationFilterSelect.value.toLowerCase().trim() : '';
    const items = checkboxList.querySelectorAll('.profile-chk-item');

    items.forEach(item => {
      const name = item.dataset.name || '';
      const empid = item.dataset.empid || '';
      const locs = (item.dataset.locations || '').split('|');
      const matchesSearch = !query || name.includes(query) || empid.includes(query);
      const matchesLocation = !selectedLoc || locs.includes(selectedLoc);

      if (matchesSearch && matchesLocation) {
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
    checkValidation();
  };

  checkboxList.addEventListener('change', (e) => {
    if (e.target.classList.contains('profile-user-checkbox')) {
      const visibleCheckboxes = Array.from(checkboxList.querySelectorAll('.profile-chk-item'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.querySelector('.profile-user-checkbox'));
      const allVisibleChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
      selectAllChk.checked = allVisibleChecked;
      checkValidation();
    }
  });

  searchInput.addEventListener('input', filterEmployeeItems);
  if (locationFilterSelect) {
    locationFilterSelect.addEventListener('change', filterEmployeeItems);
  }

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

  const closeModalOverlay = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  overlay.querySelector('.close-modal-btn').onclick = closeModalOverlay;
  overlay.querySelector('.cancel-modal-btn').onclick = closeModalOverlay;

  checkValidation();

  downloadBtn.addEventListener('click', async () => {
    const checkedIds = getCheckedUserIds();
    if (checkedIds.length === 0) return;
    const formatSelect = overlay.querySelector('#profile-format-select');
    const format = formatSelect ? formatSelect.value : 'xlsx';

    downloadBtn.setAttribute('disabled', 'true');
    downloadBtn.textContent = 'Generating...';

    try {
      registerCustomQueries(activeDB);
      if (typeof window !== 'undefined' && window.DB) registerCustomQueries(window.DB);

      // Call API Route
      const profiles = await AppAPI.fetchProfileDownload(checkedIds);
      const targetProfiles = (profiles && profiles.length > 0)
        ? profiles
        : users.filter(u => checkedIds.includes(u.id) || (u.employeeId && checkedIds.includes(u.employeeId)));

      const timestamp = new Date().toISOString().split('T')[0];
      if (format === 'xlsx') {
        const filename = `Employee_Profiles_${timestamp}.xlsx`;
        downloadProfileExcel(targetProfiles, filename);
      } else {
        downloadProfilePDF(targetProfiles, activeDB);
      }
    } catch (err) {
      console.error('Error generating profile download:', err);
      alert('Error generating profile download. Please try again.');
    } finally {
      downloadBtn.removeAttribute('disabled');
      downloadBtn.textContent = 'Download';
      closeModalOverlay();
    }
  });
}

export function downloadProfileExcel(profiles, filename = 'Employee_Profiles.xlsx') {
  const excelData = [];
  const activeDB = getActiveDB();

  profiles.forEach(u => {
    const schedule = (activeDB && typeof activeDB.getSchedule === 'function' ? activeDB.getSchedule(u.scheduleId) : null) || {};
    const base = (u.baseSalary !== undefined && u.baseSalary !== null && !isNaN(u.baseSalary)) ? Number(u.baseSalary) : 50000;
    const hra = (u.allowanceHRA !== undefined && u.allowanceHRA !== null && !isNaN(u.allowanceHRA)) ? Number(u.allowanceHRA) : Math.round(base * 0.15);
    const travel = (u.allowanceTravel !== undefined && u.allowanceTravel !== null && !isNaN(u.allowanceTravel)) ? Number(u.allowanceTravel) : 3000;
    const pf = (u.deductionPF !== undefined && u.deductionPF !== null && !isNaN(u.deductionPF)) ? Number(u.deductionPF) : Math.round(base * 0.08);
    const pt = (u.deductionPT !== undefined && u.deductionPT !== null && !isNaN(u.deductionPT)) ? Number(u.deductionPT) : 200;
    const tds = (u.deductionTDS !== undefined && u.deductionTDS !== null && !isNaN(u.deductionTDS)) ? Number(u.deductionTDS) : (base > 60000 ? 10 : 5);
    const loc = u.workLocation || u.preferredLocation || (Array.isArray(u.preferredLocations) ? u.preferredLocations.join(', ') : '') || (schedule.location || 'Head Office');

    excelData.push({
      'Employee ID': u.employeeId || u.id || 'N/A',
      'Employee Name': u.name || u.username || 'N/A',
      'Username': u.username || 'N/A',
      'Biometric ID': u.biometricUserId || u.biometricId || 'N/A',
      'Role': u.role || 'employee',
      'Department': u.department || 'Operations',
      'Designation': u.designation || 'Staff',
      'Status': u.status || 'Active',
      'Worksite / Location': loc,
      'Shift / Schedule': schedule.name ? `${schedule.name} (${schedule.startTime || '--:--'} - ${schedule.endTime || '--:--'})` : 'Default Schedule',
      'Email': u.email || 'N/A',
      'Phone Number': u.phone || 'N/A',
      'Emergency Contact': u.emergencyContact || 'N/A',
      'Residential Address': u.address || 'N/A',
      'City': u.city || 'Delhi',
      'Date of Birth': u.dob || 'N/A',
      'Date of Joining': u.dateOfJoining || 'N/A',
      'Verification Status': u.profileVerificationStatus || 'Approved',
      'Base Salary (INR)': base,
      'HRA Allowance (INR)': hra,
      'Travel Allowance (INR)': travel,
      'PF Deduction (INR)': pf,
      'PT Deduction (INR)': pt,
      'TDS Tax Rate (%)': tds
    });
  });

  const doExcelExport = () => {
    try {
      const headers = [
        'Employee ID', 'Employee Name', 'Username', 'Biometric ID', 'Role',
        'Department', 'Designation', 'Status', 'Worksite / Location', 'Shift / Schedule',
        'Email', 'Phone Number', 'Emergency Contact', 'Residential Address', 'City',
        'Date of Birth', 'Date of Joining', 'Verification Status',
        'Base Salary (INR)', 'HRA Allowance (INR)', 'Travel Allowance (INR)',
        'PF Deduction (INR)', 'PT Deduction (INR)', 'TDS Tax Rate (%)'
      ];
      const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Profiles');
      XLSX.writeFile(workbook, filename);
    } catch (e) {
      console.warn('Excel export failed, falling back to CSV:', e);
      downloadReportCSV(excelData, filename.replace('.xlsx', '.csv'));
    }
  };

  if (typeof XLSX !== 'undefined') {
    doExcelExport();
  } else {
    loadSheetJS(doExcelExport, () => {
      downloadReportCSV(excelData, filename.replace('.xlsx', '.csv'));
    });
  }
}

export function downloadProfilePDF(profiles, dbInstance) {
  const activeDB = dbInstance || getActiveDB();
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocker blocked the download window. Please allow popups for this site or select Excel (.xlsx) format.');
    return;
  }

  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
      body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #ffffff;
        color: #1e1b18;
        margin: 0;
        padding: 30px;
      }
      .profile-card {
        border: 2px solid #1e1b18;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 40px;
        page-break-inside: avoid;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        position: relative;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #f3f4f6;
        padding-bottom: 16px;
        margin-bottom: 20px;
      }
      .logo-area {
        display: flex;
        flex-direction: column;
      }
      .logo-title {
        font-size: 22px;
        font-weight: 800;
        color: #89201B;
      }
      .logo-sub {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #b45309;
      }
      .doc-title {
        text-align: right;
        font-size: 14px;
        color: #6b7280;
        font-weight: 600;
      }
      .profile-info-row {
        display: flex;
        gap: 24px;
        align-items: center;
        margin-bottom: 20px;
      }
      .profile-photo {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #89201B;
        flex-shrink: 0;
      }
      .profile-photo-placeholder {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #89201B;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 800;
        border: 3px solid #89201B;
        flex-shrink: 0;
      }
      .profile-title {
        font-size: 22px;
        font-weight: 700;
        margin: 0;
        color: #111827;
      }
      .profile-subtitle {
        font-size: 13px;
        color: #6b7280;
        margin-top: 4px;
        font-weight: 500;
      }
      .section-title {
        font-size: 11px;
        font-weight: 800;
        color: #b45309;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 20px 0 10px 0;
        border-left: 3px solid #89201B;
        padding-left: 8px;
      }
      .grid-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .info-block {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid #f3f4f6;
        padding-bottom: 8px;
      }
      .label {
        font-size: 9px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .value {
        font-size: 13px;
        font-weight: 600;
        color: #1f2937;
      }
      .footer-note {
        margin-top: 24px;
        font-size: 11px;
        color: #9ca3af;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        padding-top: 12px;
      }
      @media print {
        body { padding: 0; }
        .profile-card { border: 1px solid #e5e7eb; box-shadow: none; margin-bottom: 0; page-break-after: always; }
        .profile-card:last-child { page-break-after: avoid; }
      }
    </style>
  `;

  const cardsHTML = profiles.map(u => {
    const displayName = u.name || u.username || 'Staff';
    const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM';
    const schedule = (activeDB && typeof activeDB.getSchedule === 'function' ? activeDB.getSchedule(u.scheduleId) : null) || {};
    const base = (u.baseSalary !== undefined && u.baseSalary !== null && !isNaN(u.baseSalary)) ? Number(u.baseSalary) : 50000;
    const hra = (u.allowanceHRA !== undefined && u.allowanceHRA !== null && !isNaN(u.allowanceHRA)) ? Number(u.allowanceHRA) : Math.round(base * 0.15);
    const travel = (u.allowanceTravel !== undefined && u.allowanceTravel !== null && !isNaN(u.allowanceTravel)) ? Number(u.allowanceTravel) : 3000;
    const pf = (u.deductionPF !== undefined && u.deductionPF !== null && !isNaN(u.deductionPF)) ? Number(u.deductionPF) : Math.round(base * 0.08);
    const pt = (u.deductionPT !== undefined && u.deductionPT !== null && !isNaN(u.deductionPT)) ? Number(u.deductionPT) : 200;
    const tds = (u.deductionTDS !== undefined && u.deductionTDS !== null && !isNaN(u.deductionTDS)) ? Number(u.deductionTDS) : (base > 60000 ? 10 : 5);
    const workLoc = u.workLocation || u.preferredLocation || (Array.isArray(u.preferredLocations) ? u.preferredLocations.join(', ') : '') || (schedule.location || 'Head Office');

    return `
      <div class="profile-card">
        <div class="header-row">
          <div class="logo-area">
            <span class="logo-title">HS GROUP DELHI</span>
            <span class="logo-sub">House of Surya</span>
          </div>
          <div class="doc-title">
            EMPLOYEE PROFILE DOSSIER<br>
            <span style="font-size:11px; font-weight:normal">Generated: ${new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div class="profile-info-row">
          ${u.photo ? `
            <img class="profile-photo" src="${u.photo}">
          ` : `
            <div class="profile-photo-placeholder">${initials}</div>
          `}
          <div>
            <h2 class="profile-title">${Utils.escape(u.name)}</h2>
            <div class="profile-subtitle">${Utils.escape(u.designation || 'Staff')} • ${Utils.escape(u.department || 'Operations')}</div>
          </div>
        </div>

        <div class="section-title">Employment Credentials</div>
        <div class="grid-container">
          <div class="info-block"><span class="label">Employee ID</span><span class="value">${Utils.escape(u.employeeId || u.id || 'N/A')}</span></div>
          <div class="info-block"><span class="label">Username</span><span class="value">${Utils.escape(u.username || 'N/A')}</span></div>
          <div class="info-block"><span class="label">Role Permission</span><span class="value">${Utils.escape(u.role || 'N/A')}</span></div>
          <div class="info-block"><span class="label">Date of Joining</span><span class="value">${Utils.escape(u.dateOfJoining || 'N/A')}</span></div>
        </div>

        <div class="section-title">Personal Contact Details</div>
        <div class="grid-container">
          <div class="info-block"><span class="label">Email Address</span><span class="value">${Utils.escape(u.email || 'N/A')}</span></div>
          <div class="info-block"><span class="label">Mobile Number</span><span class="value">${Utils.escape(u.phone || 'N/A')}</span></div>
          <div class="info-block"><span class="label">Emergency Contact</span><span class="value">${Utils.escape(u.emergencyContact || 'N/A')}</span></div>
          <div class="info-block"><span class="label">Residential Address</span><span class="value">${Utils.escape(u.address || 'N/A')}</span></div>
          <div class="info-block"><span class="label">City</span><span class="value">${Utils.escape(u.city || 'Delhi')}</span></div>
          <div class="info-block"><span class="label">Date of Birth</span><span class="value">${Utils.escape(u.dob || 'N/A')}</span></div>
        </div>

        <div class="section-title">Assigned Shift & Logistics</div>
        <div class="grid-container">
          <div class="info-block"><span class="label">Shift Schedule</span><span class="value">${Utils.escape(schedule.name || 'N/A')} (${schedule.startTime || '--:--'} - ${schedule.endTime || '--:--'})</span></div>
          <div class="info-block"><span class="label">Preferred Worksite Location</span><span class="value">${Utils.escape(workLoc)}</span></div>
          <div class="info-block"><span class="label">Verification Status</span><span class="value">${Utils.escape(u.profileVerificationStatus || 'Approved')}</span></div>
        </div>

        <div class="section-title">Financial Compensation Setup</div>
        <div class="grid-container">
          <div class="info-block"><span class="label">Base Salary</span><span class="value">₹${base.toLocaleString()}</span></div>
          <div class="info-block"><span class="label">HRA / Travel Allowance</span><span class="value">₹${hra.toLocaleString()} / ₹${travel.toLocaleString()}</span></div>
          <div class="info-block"><span class="label">PF / PT Deductions</span><span class="value">₹${pf.toLocaleString()} / ₹${pt.toLocaleString()}</span></div>
          <div class="info-block"><span class="label">TDS Tax Rate</span><span class="value">${tds}%</span></div>
        </div>

        <div class="footer-note">
          This document is a system-generated employee profile document from HS Group Delhi.
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Download Employee Profiles</title>
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
}


// -------------------------------------------------------------------------
// COMPONENT 2: DOWNLOAD REPORT MODAL
// -------------------------------------------------------------------------
export async function openReportDownloadModal(preSelectedUserId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
  `;
  
  const activeDB = getActiveDB();
  const activeAuth = getActiveAuth();

  if (!activeDB.data || !Array.isArray(activeDB.data.users) || activeDB.data.users.length === 0) {
    if (typeof activeDB.init === 'function') {
      try {
        await activeDB.init();
      } catch (e) {
        console.warn('DB.init warning in openReportDownloadModal:', e);
      }
    }
  }

  let rawUsers = (activeDB.getUsers ? activeDB.getUsers() : (activeDB.data ? activeDB.data.users : [])) || [];

  if (!rawUsers || rawUsers.length === 0) {
    try {
      const baseUrl = (typeof window !== 'undefined' && window.apiBaseUrl) ? window.apiBaseUrl : '';
      const res = await fetch(baseUrl + '/api/db-state?v=' + Date.now());
      if (res.ok) {
        const state = await res.json();
        if (state && Array.isArray(state.users) && state.users.length > 0) {
          activeDB.data = state;
          if (typeof window !== 'undefined' && window.DB) window.DB.data = state;
          rawUsers = state.users;
        }
      }
    } catch (err) {
      console.warn('Fallback direct fetch to /api/db-state failed:', err);
    }
  }

  if (activeAuth && typeof activeAuth.init === 'function' && !activeAuth.currentUser) {
    activeAuth.init();
  }
  const loggedInUser = (activeAuth.getCurrentUser ? activeAuth.getCurrentUser() : activeAuth.currentUser) || {};
  const userRole = String(loggedInUser.role || '').toLowerCase();
  const isAdminOrHrOrManager = userRole === 'hr' || userRole === 'admin' || userRole === 'manager' || userRole.includes('admin') || userRole.includes('manager');

  let users = [];
  if (isAdminOrHrOrManager || !loggedInUser.id) {
    users = rawUsers.filter(u => u && u.status !== 'Inactive');
    if (users.length === 0) {
      users = rawUsers.filter(Boolean);
    }
  } else if (loggedInUser.id) {
    users = rawUsers.filter(u => u && (u.id === loggedInUser.id || (u.employeeId && u.employeeId === loggedInUser.employeeId)));
    if (users.length === 0 && loggedInUser.name) {
      users = [loggedInUser];
    }
  } else {
    users = rawUsers.filter(u => u && u.status !== 'Inactive');
    if (users.length === 0) {
      users = rawUsers.filter(Boolean);
    }
  }

  const isChecked = (uId) => {
    if (preSelectedUserId) return uId === preSelectedUserId;
    return true;
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  overlay.innerHTML = `
    <div class="modal-content card-panel" style="max-width: 460px; padding: 24px; display:flex; flex-direction:column; gap:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:var(--shadow-lg)">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px">
        <h3 style="margin:0; font-size:16px; font-weight:800; color:var(--text-primary)">📥 Download Report</h3>
        <button class="close-modal-btn" style="background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer">&times;</button>
      </div>

      <div style="font-size:12px; color:var(--text-muted)">
        Select employees and the target monthly period to export attendance and payroll work reports.
      </div>

      <!-- Period Selection -->
      <div style="display:flex; gap:12px;">
        <div class="form-group" style="flex:1">
          <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">Month</label>
          <select id="report-download-month" class="form-input" style="background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); padding:8px; border-radius:8px">
            ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => `<option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">Year</label>
          <select id="report-download-year" class="form-input" style="background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); padding:8px; border-radius:8px">
            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
        <label class="form-label" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">Select Employees</label>
        <input type="text" id="report-search-input" class="form-input" placeholder="🔍 Search employee name or ID..." style="padding:8px 12px; font-size:12px; margin-bottom:4px; background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); border-radius:8px">
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; padding:2px 4px">
          <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; cursor:pointer; color:var(--text-secondary)">
            <input type="checkbox" id="report-select-all" style="cursor:pointer" ${!preSelectedUserId ? 'checked' : ''}> Select All
          </label>
          <span id="report-selection-count" style="font-size:11.5px; font-weight:600; color:var(--cyan)">0 selected</span>
        </div>

        <div id="report-checkbox-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; display: flex; flex-direction: column; gap:8px; background: rgba(0,0,0,0.15)">
          ${users.map(u => {
            const uName = u.name || u.username || 'Employee';
            const uEmpId = u.employeeId || u.id || '';
            const checked = isChecked(u.id);
            return `
            <label class="report-chk-item" data-name="${String(uName).toLowerCase()}" data-empid="${String(uEmpId).toLowerCase()}" data-id="${u.id}" style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; padding:4px 6px; border-radius:var(--radius-sm);">
              <input type="checkbox" class="report-user-checkbox" value="${u.id}" style="cursor:pointer" ${checked ? 'checked' : ''}>
              <span style="font-weight:600; color:var(--text-primary)">${Utils.escape(uName)}</span>
              <span style="color:var(--text-muted); font-size:11px">(${Utils.escape(uEmpId)})</span>
            </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="report-format-select" style="font-size:11.5px; font-weight:700; color:var(--text-secondary)">File Format</label>
        <select id="report-format-select" class="form-input" style="background:rgba(0,0,0,0.15); border:1px solid var(--border); color:var(--text-primary); padding:8px; border-radius:8px">
          <option value="pdf">PDF Document (.pdf)</option>
          <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
        </select>
      </div>

      <div id="report-warning-box" style="display:none; padding:10px 14px; border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-sm); background:rgba(239,68,68,0.05); color:var(--error); font-size:11.5px; font-weight:600; line-height:1.45;"></div>

      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px; border-top:1px solid var(--border); padding-top:14px">
        <button class="btn btn-secondary cancel-modal-btn" style="width:auto; padding:8px 16px; font-size:12.5px; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; cursor:pointer">Cancel</button>
        <button class="btn btn-cyan" id="btn-report-export-action" style="width:auto; padding:8px 20px; font-size:12.5px; font-weight:700; background:var(--primary); color:#ffffff; border:none; border-radius:8px; cursor:pointer">Download</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector('#report-search-input');
  const selectAllChk = overlay.querySelector('#report-select-all');
  const checkboxList = overlay.querySelector('#report-checkbox-list');
  const selectionCount = overlay.querySelector('#report-selection-count');
  const warningBox = overlay.querySelector('#report-warning-box');
  const downloadBtn = overlay.querySelector('#btn-report-export-action');
  const monthSelect = overlay.querySelector('#report-download-month');
  const yearSelect = overlay.querySelector('#report-download-year');
  const formatSelect = overlay.querySelector('#report-format-select');

  const getCheckedUserIds = () => {
    return Array.from(checkboxList.querySelectorAll('.report-user-checkbox:checked')).map(el => el.value);
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

  checkboxList.addEventListener('change', (e) => {
    if (e.target.classList.contains('report-user-checkbox')) {
      const visibleCheckboxes = Array.from(checkboxList.querySelectorAll('.report-chk-item'))
        .filter(el => el.style.display !== 'none')
        .map(el => el.querySelector('.report-user-checkbox'));
      const allVisibleChecked = visibleCheckboxes.every(cb => cb.checked);
      selectAllChk.checked = allVisibleChecked;
      checkValidation();
    }
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = checkboxList.querySelectorAll('.report-chk-item');
    items.forEach(item => {
      const name = item.dataset.name;
      const empid = item.dataset.empid;
      if (name.includes(query) || empid.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    const visibleCheckboxes = Array.from(checkboxList.querySelectorAll('.report-chk-item'))
      .filter(el => el.style.display !== 'none')
      .map(el => el.querySelector('.report-user-checkbox'));
    const allVisibleChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
    selectAllChk.checked = allVisibleChecked;
  });

  selectAllChk.addEventListener('change', () => {
    const checked = selectAllChk.checked;
    const items = checkboxList.querySelectorAll('.report-chk-item');
    items.forEach(item => {
      if (item.style.display !== 'none') {
        const cb = item.querySelector('.report-user-checkbox');
        if (cb) cb.checked = checked;
      }
    });
    checkValidation();
  });

  const closeModalOverlay = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  overlay.querySelector('.close-modal-btn').onclick = closeModalOverlay;
  overlay.querySelector('.cancel-modal-btn').onclick = closeModalOverlay;

  checkValidation();

  downloadBtn.addEventListener('click', async () => {
    const checkedIds = getCheckedUserIds();
    const month = parseInt(monthSelect.value, 10);
    const year = parseInt(yearSelect.value, 10);
    const format = formatSelect.value;

    downloadBtn.setAttribute('disabled', 'true');
    downloadBtn.textContent = 'Generating...';

    // Call API Route
    const reportData = await AppAPI.fetchReportDownload(checkedIds, month, year);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthStr = monthNames[month];

    if (format === 'pdf') {
      downloadReportPDF(reportData, monthStr, year);
    } else {
      const filename = `Attendance_Report_${monthStr}_${year}.xlsx`;
      downloadReportExcel(reportData, filename);
    }

    downloadBtn.removeAttribute('disabled');
    downloadBtn.textContent = 'Download';
    closeModalOverlay();
  });
}

function downloadReportPDF(reports, monthStr, year) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocker blocked the download window. Please allow popups for this site.');
    return;
  }

  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
      body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #ffffff;
        color: #1e1b18;
        margin: 0;
        padding: 30px;
      }
      .report-container {
        margin-bottom: 50px;
        page-break-inside: avoid;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #89201B;
        padding-bottom: 16px;
        margin-bottom: 24px;
      }
      .logo-title {
        font-size: 24px;
        font-weight: 800;
        color: #89201B;
      }
      .logo-sub {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #b45309;
      }
      .doc-title {
        text-align: right;
        font-size: 14px;
        color: #6b7280;
        font-weight: 600;
      }
      .report-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 16px;
        color: #111827;
      }
      .custom-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
      }
      .custom-table th, .custom-table td {
        border: 1px solid #e5e7eb;
        padding: 10px;
        text-align: left;
      }
      .custom-table th {
        background-color: #f9fafb;
        font-weight: 700;
        color: #374151;
      }
      .custom-table tr:nth-child(even) {
        background-color: #f9fafb;
      }
      .stat-highlight {
        font-weight: bold;
        color: #89201B;
      }
      .footer-note {
        margin-top: 24px;
        font-size: 11px;
        color: #9ca3af;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        padding-top: 12px;
      }
      @media print {
        body { padding: 0; }
        .report-container { page-break-after: always; }
        .report-container:last-child { page-break-after: avoid; }
      }
    </style>
  `;

  const reportsHTML = reports.map(r => {
    const u = r.user;
    const p = r.payroll;
    const logs = r.logs;

    const logRows = logs.length > 0 
      ? logs.map(l => {
          // Calculate duration string inline
          let duration = '-';
          if (l.checkIn && l.checkOut) {
            const [inH, inM] = l.checkIn.split(':').map(Number);
            const [outH, outM] = l.checkOut.split(':').map(Number);
            let diff = (outH * 60 + outM) - (inH * 60 + inM);
            if (diff > 0) {
              duration = `${Math.floor(diff/60)}h ${diff%60}m`;
            }
          }
          return `
            <tr>
              <td>${l.date}</td>
              <td>${l.checkIn || '--:--'}</td>
              <td>${l.checkOut || '--:--'}</td>
              <td>${duration}</td>
              <td>${l.status || 'Normal'}</td>
              <td>${l.location || 'Office'}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="6" style="text-align:center; color:#9ca3af">No logs registered for this month.</td></tr>`;

    return `
      <div class="report-container">
        <div class="header-row">
          <div>
            <span class="logo-title">HS GROUP DELHI</span><br>
            <span class="logo-sub">House of Surya</span>
          </div>
          <div class="doc-title">
            MONTHLY ATTENDANCE & PAYROLL REPORT<br>
            <span style="font-size:11px; font-weight:normal">Period: ${monthStr} ${year}</span>
          </div>
        </div>

        <div class="report-title">Employee: <strong>${Utils.escape(u.name)}</strong> (ID: ${Utils.escape(u.employeeId || u.id)})</div>

        <h4 style="margin:0 0 8px 0; color:#b45309; text-transform:uppercase; font-size:11px; letter-spacing:1px">1. Attendance Summary Metrics</h4>
        <table class="custom-table">
          <thead>
            <tr>
              <th>Total Work Days</th>
              <th>Present Days</th>
              <th>Absent Days</th>
              <th>Late Days</th>
              <th>Half Days</th>
              <th>Total Hours Logged</th>
              <th>Overtime Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${p.workingDays || 0} days</td>
              <td class="stat-highlight">${p.presentDays || 0} days</td>
              <td>${p.absentDays || 0} days</td>
              <td>${p.lateDays || 0} days</td>
              <td>${p.halfDays || 0} days</td>
              <td>${r.totalHours}</td>
              <td>${r.overtimeHours}</td>
            </tr>
          </tbody>
        </table>

        <h4 style="margin:16px 0 8px 0; color:#b45309; text-transform:uppercase; font-size:11px; letter-spacing:1px">2. Payroll & Payout Aggregate</h4>
        <table class="custom-table">
          <thead>
            <tr>
              <th>Base Salary</th>
              <th>Allowances (HRA + Travel)</th>
              <th>Statutory Deductions (PF + PT + TDS)</th>
              <th>Attendance Deductions</th>
              <th>Net Payout Estimate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>₹${((p.baseSalary || 0).toLocaleString())}</td>
              <td>₹${((p.allowanceHRA || 0) + (p.allowanceTravel || 0)).toLocaleString()}</td>
              <td>₹${((p.deductionPF || 0) + (p.deductionPT || 0) + (p.deductionTDSVal || 0)).toLocaleString()}</td>
              <td>₹${((p.absentDeduction || 0) + (p.sundayDeduction || 0) + (p.halfDayDeduction || 0)).toLocaleString()}</td>
              <td class="stat-highlight" style="font-size:13px; color:#89201B">₹${(p.netSalary || 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <h4 style="margin:16px 0 8px 0; color:#b45309; text-transform:uppercase; font-size:11px; letter-spacing:1px">3. Daily Shift Check-In / Out Log</h4>
        <table class="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Worksite</th>
            </tr>
          </thead>
          <tbody>
            ${logRows}
          </tbody>
        </table>

        <div class="footer-note">
          This document is generated by the HS Group Attendance Management System. Confidential.
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Download Attendance Reports</title>
      ${styles}
    </head>
    <body>
      ${reportsHTML}
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
}

function downloadReportExcel(reports, filename) {
  const excelData = [];
  
  reports.forEach(r => {
    const u = r.user;
    const p = r.payroll;
    
    excelData.push({
      'Employee ID': u.employeeId || u.id || 'N/A',
      'Employee Name': u.name || 'N/A',
      'Department': u.department || 'N/A',
      'Designation': u.designation || 'N/A',
      'Total Work Days': p.workingDays || 0,
      'Actual Working Days': p.actualWorkingDays || p.presentDays || 0,
      'Present Days': p.presentDays || 0,
      'Absent Days': p.absentDays || 0,
      'Sunday Penalties': p.unpaidSundayDays || 0,
      'Late Days': p.lateDays || 0,
      'Half Days': p.halfDays || 0,
      'Total Hours': r.totalHours,
      'Overtime Hours': r.overtimeHours,
      'Base Salary (INR)': p.baseSalary || 0,
      'Allowances (INR)': (p.allowanceHRA || 0) + (p.allowanceTravel || 0),
      'PF + PT Deductions (INR)': (p.deductionPF || 0) + (p.deductionPT || 0),
      'TDS Tax Deduction (INR)': p.deductionTDSVal || 0,
      'Attendance Deductions (INR)': (p.absentDeduction || 0) + (p.sundayDeduction || 0) + (p.halfDayDeduction || 0),
      'Net Payout (INR)': p.netSalary || 0
    });
  });

  const doExcelExport = () => {
    try {
      const headers = [
        'Employee ID', 'Employee Name', 'Department', 'Designation',
        'Total Work Days', 'Actual Working Days', 'Present Days', 'Absent Days', 'Sunday Penalties', 'Late Days', 'Half Days',
        'Total Hours', 'Overtime Hours',
        'Base Salary (INR)', 'Allowances (INR)',
        'PF + PT Deductions (INR)', 'TDS Tax Deduction (INR)',
        'Attendance Deductions (INR)', 'Net Payout (INR)'
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
      
      XLSX.writeFile(workbook, filename);
    } catch (e) {
      alert('Failed to generate Excel file. Downloading CSV instead.');
      downloadReportCSV(excelData, filename.replace('.xlsx', '.csv'));
    }
  };

  if (typeof XLSX !== 'undefined') {
    doExcelExport();
  } else {
    loadSheetJS(doExcelExport, () => {
      alert('Excel library not loaded. Downloading CSV instead.');
      downloadReportCSV(excelData, filename.replace('.xlsx', '.csv'));
    });
  }
}

function downloadReportCSV(data, filename) {
  const headers = Object.keys(data[0] || {});
  const rows = data.map(item => Object.values(item));
  Utils.exportToCSV(filename, headers, rows);
}
