// js/views/schedulesView.js - Shift Allocation & Planning
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils } from '../utils/helpers.js';
import { closeModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderAdminSchedules() {
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
