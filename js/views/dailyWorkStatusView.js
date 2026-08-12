// js/views/dailyWorkStatusView.js - Monthly 1-31 Attendance Matrix Grid
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils } from '../utils/helpers.js';
import { closeModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderDailyWorkStatus() {
  const main = document.getElementById('main-view');
  const currentUser = Auth.getCurrentUser();
  if (!currentUser) return;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonthName = monthNames[dailyWorkStatusSelectedMonth];
  const daysInMonth = new Date(dailyWorkStatusSelectedYear, dailyWorkStatusSelectedMonth + 1, 0).getDate();
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split('T')[0];

  main.innerHTML = `
    <div id="daily-work-status-page-container" style="padding: 24px 32px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; max-width: 100%; box-sizing: border-box;">
      
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 6px;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.01em;">Daily Work Status</h2>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <!-- Month/Year Picker Button -->
          <div style="position: relative;">
            <button type="button" id="btn-dws-month-picker" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 600; color: #334155; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s ease;">
              <span id="lbl-dws-current-month">${currentMonthName}, ${dailyWorkStatusSelectedYear}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </button>
            <input type="month" id="input-dws-month-picker" value="${dailyWorkStatusSelectedYear}-${String(dailyWorkStatusSelectedMonth + 1).padStart(2, '0')}" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;">
          </div>

          <!-- Filter Button -->
          <button type="button" id="btn-dws-filter-trigger" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 600; color: #334155; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.2s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span>Filter</span>
          </button>

          <!-- Export Button -->
          <button type="button" id="btn-dws-export-trigger" style="background: #D34036; border: none; border-radius: 8px; padding: 7px 16px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 700; color: #ffffff; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(211,64,54,0.3); transition: all 0.2s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Export</span>
          </button>
        </div>
      </div>

      <!-- Status Indicator Legend Row -->
      <div style="display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 10px; margin-bottom: 14px; font-size: 12.5px; color: #475569; font-weight: 500;">
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
          <span>Present</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #64748b;"></span>
          <span>Leave</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span>
          <span>Half Day Present</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #a78bfa;"></span>
          <span>Absent</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #f97316;"></span>
          <span>On Leave, But Attendance Exist</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span>
          <span>Conflict</span>
        </span>
      </div>

      <!-- Matrix Table Card -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; width: 100%;">
        <div style="overflow-x: auto; width: 100%;">
          <table id="dws-matrix-table" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12.5px; min-width: 980px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; height: 42px;">
                <th style="text-align: left; padding: 10px 16px; font-weight: 700; color: #334155; font-size: 13px; min-width: 180px; position: sticky; left: 0; background: #f8fafc; z-index: 2; border-right: 1px solid #e2e8f0;">
                  Employee
                </th>
                ${Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dayOfWeek = new Date(dailyWorkStatusSelectedYear, dailyWorkStatusSelectedMonth, dayNum).getDay();
                  const isSunday = dayOfWeek === 0;
                  return `
                    <th style="padding: 6px 2px; font-weight: ${isSunday ? '700' : '600'}; color: ${isSunday ? '#ef4444' : '#64748b'}; font-size: 12px; min-width: 28px; width: 30px; border-right: 1px solid #f1f5f9;">
                      ${dayNum}
                    </th>
                  `;
                }).join('')}
              </tr>
            </thead>
            <tbody id="dws-matrix-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid #e2e8f0; background: #ffffff; font-size: 13px;">
          <div id="dws-page-info" style="color: #64748b; font-weight: 500;">
            Page 1 of 1
          </div>
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <button type="button" id="btn-dws-prev-page" style="background: none; border: none; font-size: 14px; font-weight: 700; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.2s ease;">←</button>
            <span id="lbl-dws-page-number" style="font-weight: 700; color: #1e293b;">1</span>
            <span id="lbl-dws-total-pages" style="color: #94a3b8;">/ 1</span>
            <button type="button" id="btn-dws-next-page" style="background: none; border: none; font-size: 14px; font-weight: 700; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.2s ease;">→</button>
          </div>
        </div>
      </div>

    </div>
  `;

  // Function to render / update the table data dynamically
  const updateMatrixTable = () => {
    const tbody = document.getElementById('dws-matrix-tbody');
    if (!tbody) return;

    // 1. Fetch real employees only (no HR or Manager accounts)
    const allUsers = DB.getUsers();
    let employees = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'employee');

    if (DB.getUserBaseRole(currentUser.role) === 'employee') {
      employees = employees.filter(e => e.id === currentUser.id);
    }

    // 2. Apply Search and Department Filters
    if (dailyWorkStatusSearchQuery) {
      const q = dailyWorkStatusSearchQuery.toLowerCase();
      employees = employees.filter(e => 
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q))
      );
    }

    if (dailyWorkStatusDepartmentFilter && dailyWorkStatusDepartmentFilter !== 'all') {
      employees = employees.filter(e => (e.department || '').toLowerCase() === dailyWorkStatusDepartmentFilter.toLowerCase());
    }

    // 3. Fetch real attendance logs and approved leaves
    const allLogs = DB.getLogs();
    const allLeaves = DB.getLeaveRequests();

    // Map logs by key: `${userId}_${dateStr}`
    const logsMap = new Map();
    allLogs.forEach(l => {
      if (!l.date) return;
      const key = `${l.userId || l.employeeId}_${l.date}`;
      if (!logsMap.has(key)) logsMap.set(key, []);
      logsMap.get(key).push(l);
    });

    // Map approved leaves by userId
    const leavesMap = new Map();
    allLeaves.forEach(lv => {
      if (lv.status === 'Approved' && lv.userId) {
        if (!leavesMap.has(lv.userId)) leavesMap.set(lv.userId, []);
        leavesMap.get(lv.userId).push(lv);
      }
    });

    // Calculate total pages
    const totalEmployees = employees.length;
    const totalPages = Math.max(1, Math.ceil(totalEmployees / dailyWorkStatusRowsPerPage));
    if (dailyWorkStatusCurrentPage > totalPages) dailyWorkStatusCurrentPage = totalPages;
    if (dailyWorkStatusCurrentPage < 1) dailyWorkStatusCurrentPage = 1;

    // Slice for current page
    const startIdx = (dailyWorkStatusCurrentPage - 1) * dailyWorkStatusRowsPerPage;
    const pagedEmployees = employees.slice(startIdx, startIdx + dailyWorkStatusRowsPerPage);

    // Update pagination labels
    const pageInfoEl = document.getElementById('dws-page-info');
    const pageNumEl = document.getElementById('lbl-dws-page-number');
    const totalPagesEl = document.getElementById('lbl-dws-total-pages');
    const prevBtn = document.getElementById('btn-dws-prev-page');
    const nextBtn = document.getElementById('btn-dws-next-page');

    if (pageInfoEl) pageInfoEl.textContent = `Page ${dailyWorkStatusCurrentPage} of ${totalPages}`;
    if (pageNumEl) pageNumEl.textContent = `${dailyWorkStatusCurrentPage}`;
    if (totalPagesEl) totalPagesEl.textContent = `/ ${totalPages}`;

    if (prevBtn) {
      prevBtn.style.color = dailyWorkStatusCurrentPage > 1 ? '#334155' : '#cbd5e1';
      prevBtn.style.cursor = dailyWorkStatusCurrentPage > 1 ? 'pointer' : 'default';
    }
    if (nextBtn) {
      nextBtn.style.color = dailyWorkStatusCurrentPage < totalPages ? '#334155' : '#cbd5e1';
      nextBtn.style.cursor = dailyWorkStatusCurrentPage < totalPages ? 'pointer' : 'default';
    }

    if (pagedEmployees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${daysInMonth + 1}" style="padding: 40px 20px; text-align: center; color: #94a3b8; font-size: 13.5px;">
            No employee attendance records found for the selected filter and period.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pagedEmployees.map((emp, empIdx) => {
      const rowBg = empIdx % 2 === 0 ? '#ffffff' : '#fafafa';
      const empLabel = `${Utils.escape(emp.name)} (${Utils.escape(emp.employeeId || emp.id)})`;

      const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1;
        const dateStr = `${dailyWorkStatusSelectedYear}-${String(dailyWorkStatusSelectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayOfWeek = new Date(dailyWorkStatusSelectedYear, dailyWorkStatusSelectedMonth, dayNum).getDay();
        const isSunday = dayOfWeek === 0;

        const empLogs = logsMap.get(`${emp.id}_${dateStr}`) || logsMap.get(`${emp.employeeId}_${dateStr}`) || [];
        const empLeaves = leavesMap.get(emp.id) || [];
        const hasApprovedLeave = empLeaves.some(lv => dateStr >= lv.startDate && dateStr <= (lv.endDate || lv.startDate));

        let badgeHTML = '';

        if (hasApprovedLeave && empLogs.length > 0) {
          // On Leave, But Attendance Exist (OLA)
          badgeHTML = `<span style="width:20px; height:20px; background:#f97316; color:#ffffff; font-size:9px; font-weight:800; border-radius:3.5px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(249,115,22,0.3);" title="On Leave, But Attendance Exist (${dateStr})">OLA</span>`;
        } else if (hasApprovedLeave) {
          // Leave (L)
          badgeHTML = `<span style="width:20px; height:20px; background:#64748b; color:#ffffff; font-size:11px; font-weight:800; border-radius:3.5px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(100,116,139,0.3);" title="Leave (${dateStr})">L</span>`;
        } else if (empLogs.length > 1 && (empLogs.some(l => l.status === 'Conflict') || empLogs.length >= 3)) {
          // Conflict (C)
          badgeHTML = `<span style="width:20px; height:20px; background:#ef4444; color:#ffffff; font-size:11px; font-weight:800; border-radius:3.5px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(239,68,68,0.3);" title="Conflict (${dateStr})">C</span>`;
        } else if (empLogs.length > 0) {
          const log = empLogs[0];
          let isHalfDay = log.status === 'Half Day';
          if (!isHalfDay && log.checkIn && log.checkOut) {
            const dur = Utils.calculateDuration(log.checkIn, log.checkOut);
            const hrs = parseFloat(dur) || 0;
            if (hrs > 0 && hrs < 6) isHalfDay = true;
          }

          if (isHalfDay) {
            // Half Day Present (HP)
            badgeHTML = `<span style="width:20px; height:20px; background:#f59e0b; color:#ffffff; font-size:10px; font-weight:800; border-radius:3.5px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(245,158,11,0.3);" title="Half Day Present (${dateStr})">HP</span>`;
          } else {
            // Present (P)
            badgeHTML = `<span style="width:20px; height:20px; background:#10b981; color:#ffffff; font-size:11px; font-weight:800; border-radius:3.5px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(16,185,129,0.3);" title="Present (${dateStr})">P</span>`;
          }
        } else if (dateStr < todayStr && !isSunday) {
          // Absent (A) for past working days
          badgeHTML = `<span style="width:20px; height:20px; background:#a78bfa; color:#ffffff; font-size:11px; font-weight:800; border-radius:3.5px; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(167,139,250,0.3);" title="Absent (${dateStr})">A</span>`;
        }

        return `
          <td style="padding: 4px 1px; vertical-align: middle; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; height: 36px;">
            ${badgeHTML}
          </td>
        `;
      }).join('');

      return `
        <tr style="background: ${rowBg}; transition: background 0.15s ease;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${rowBg}'">
          <td style="text-align: left; padding: 8px 16px; font-weight: 600; color: #334155; font-size: 13px; position: sticky; left: 0; background: ${rowBg}; z-index: 1; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; white-space: nowrap;">
            ${empLabel}
          </td>
          ${dayCells}
        </tr>
      `;
    }).join('');
  };

  // Event Listeners for Controls
  const monthPickerBtn = document.getElementById('btn-dws-month-picker');
  const monthInput = document.getElementById('input-dws-month-picker');
  if (monthPickerBtn && monthInput) {
    monthPickerBtn.addEventListener('click', () => {
      if (typeof monthInput.showPicker === 'function') {
        monthInput.showPicker();
      } else {
        monthInput.click();
      }
    });

    monthInput.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        const [y, m] = val.split('-');
        dailyWorkStatusSelectedYear = parseInt(y, 10);
        dailyWorkStatusSelectedMonth = parseInt(m, 10) - 1;
        dailyWorkStatusCurrentPage = 1;
        renderDailyWorkStatus();
      }
    });
  }

  // Filter Trigger
  const filterBtn = document.getElementById('btn-dws-filter-trigger');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      showDailyWorkStatusFilterModal(updateMatrixTable);
    });
  }

  // Export Trigger
  const exportBtn = document.getElementById('btn-dws-export-trigger');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportDailyWorkStatusCSV(dailyWorkStatusSelectedYear, dailyWorkStatusSelectedMonth);
    });
  }

  // Pagination navigation listeners
  const prevBtn = document.getElementById('btn-dws-prev-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (dailyWorkStatusCurrentPage > 1) {
        dailyWorkStatusCurrentPage--;
        updateMatrixTable();
      }
    });
  }

  const nextBtn = document.getElementById('btn-dws-next-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const allUsers = DB.getUsers();
      let employees = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'employee');
      const totalPages = Math.max(1, Math.ceil(employees.length / dailyWorkStatusRowsPerPage));
      if (dailyWorkStatusCurrentPage < totalPages) {
        dailyWorkStatusCurrentPage++;
        updateMatrixTable();
      }
    });
  }

  // Initial table render
  updateMatrixTable();
}

function exportDailyWorkStatusCSV(year, month) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[month];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const allUsers = DB.getUsers();
  const employees = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'employee');
  const allLogs = DB.getLogs();
  const allLeaves = DB.getLeaveRequests();

  const logsMap = new Map();
  allLogs.forEach(l => {
    if (!l.date) return;
    const key = `${l.userId || l.employeeId}_${l.date}`;
    if (!logsMap.has(key)) logsMap.set(key, []);
    logsMap.get(key).push(l);
  });

  const leavesMap = new Map();
  allLeaves.forEach(lv => {
    if (lv.status === 'Approved' && lv.userId) {
      if (!leavesMap.has(lv.userId)) leavesMap.set(lv.userId, []);
      leavesMap.get(lv.userId).push(lv);
    }
  });

  const headers = ['Employee Name', 'Employee ID', 'Department', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'Total Present', 'Total Leave', 'Total Half-Day', 'Total Absent'];
  const rows = employees.map(emp => {
    let countP = 0;
    let countL = 0;
    let countHP = 0;
    let countA = 0;

    const dayStatuses = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, dayNum).getDay();
      const isSunday = dayOfWeek === 0;

      const empLogs = logsMap.get(`${emp.id}_${dateStr}`) || logsMap.get(`${emp.employeeId}_${dateStr}`) || [];
      const empLeaves = leavesMap.get(emp.id) || [];
      const hasApprovedLeave = empLeaves.some(lv => dateStr >= lv.startDate && dateStr <= (lv.endDate || lv.startDate));

      if (hasApprovedLeave && empLogs.length > 0) {
        return 'OLA';
      } else if (hasApprovedLeave) {
        countL++;
        return 'L';
      } else if (empLogs.length > 1 && (empLogs.some(l => l.status === 'Conflict') || empLogs.length >= 3)) {
        return 'C';
      } else if (empLogs.length > 0) {
        const log = empLogs[0];
        let isHalfDay = log.status === 'Half Day';
        if (!isHalfDay && log.checkIn && log.checkOut) {
          const dur = Utils.calculateDuration(log.checkIn, log.checkOut);
          const hrs = parseFloat(dur) || 0;
          if (hrs > 0 && hrs < 6) isHalfDay = true;
        }
        if (isHalfDay) {
          countHP++;
          return 'HP';
        } else {
          countP++;
          return 'P';
        }
      } else if (dateStr < todayStr && !isSunday) {
        countA++;
        return 'A';
      }
      return '-';
    });

    return [
      emp.name,
      emp.employeeId || emp.id,
      emp.department || 'Operations',
      ...dayStatuses,
      countP,
      countL,
      countHP,
      countA
    ];
  });

  const filename = `Daily_Work_Status_${currentMonthName}_${year}.csv`;
  Utils.exportToCSV(filename, headers, rows);
}

function showDailyWorkStatusFilterModal(onApply) {
  const allUsers = DB.getUsers().filter(u => DB.getUserBaseRole(u.role) === 'employee');
  const departments = [...new Set(allUsers.map(u => u.department || 'Operations').filter(Boolean))];