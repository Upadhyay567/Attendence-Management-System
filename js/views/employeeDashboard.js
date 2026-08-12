// js/views/employeeDashboard.js - Employee Dashboard & Geofence Worksite Panel
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils } from '../utils/helpers.js';
import { closeModal, openFullScreenImageModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderEmployeeDashboard() {
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
        <div class="password-wrapper" style="position:relative">
          <input type="password" id="forgot-newpwd" class="form-input" placeholder="Minimum 6 characters" required style="padding-right: 44px !important; width:100%; box-sizing:border-box">
          <button type="button" id="btn-toggle-reset-pwd-1" class="password-toggle-btn" title="Toggle password visibility" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-secondary); cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0; border-radius:6px; transition:color 0.2s ease;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
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
        <div class="password-wrapper" style="position:relative">
          <input type="password" id="forgot-confirmpwd" class="form-input" placeholder="Re-enter new password" required style="padding-right: 44px !important; width:100%; box-sizing:border-box">
          <button type="button" id="btn-toggle-reset-pwd-2" class="password-toggle-btn" title="Toggle password visibility" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-secondary); cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0; border-radius:6px; transition:color 0.2s ease;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </button>
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
  const svgEyeOpen = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const svgEyeClosed = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  modal.querySelector('#btn-toggle-reset-pwd-1').addEventListener('click', (e) => {
    e.preventDefault();
    const isCurrentlyPassword = newPwdInput.type === 'password';
    newPwdInput.type = isCurrentlyPassword ? 'text' : 'password';
    modal.querySelector('#btn-toggle-reset-pwd-1').innerHTML = isCurrentlyPassword ? svgEyeOpen : svgEyeClosed;
  });

  modal.querySelector('#btn-toggle-reset-pwd-2').addEventListener('click', (e) => {
    e.preventDefault();
    const isCurrentlyPassword = confirmPwdInput.type === 'password';
    confirmPwdInput.type = isCurrentlyPassword ? 'text' : 'password';
    modal.querySelector('#btn-toggle-reset-pwd-2').innerHTML = isCurrentlyPassword ? svgEyeOpen : svgEyeClosed;
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