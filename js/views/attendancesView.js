// js/views/attendancesView.js - Attendance Registers & Check-in/Out Logs
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal, openFullScreenImageModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

let adminAttendancesCurrentPage = 1;
let adminAttendancesRowsPerPage = 10;
let adminAttendancesSortField = 'date';
let adminAttendancesSortOrder = 'desc';
let adminAttendancesSearchQuery = '';
let adminAttendancesSelectedIds = new Set();
let adminAttendancesSelectedMonth = new Date().getMonth();
let adminAttendancesSelectedYear = new Date().getFullYear();
let adminAttendancesLocationFilter = '';
let adminAttendancesFilterMode = 'month'; // 'month' or 'manual'
let adminAttendancesSingleDate = ''; // 'YYYY-MM-DD'
let adminAttendancesFromDate = ''; // 'YYYY-MM-DD'
let adminAttendancesToDate = ''; // 'YYYY-MM-DD'
let adminAttendancesDateRangeError = '';
let adminAttendancesActiveTab = 'month'; // 'month' or 'manual'
let adminAttendancesPickerYear = new Date().getFullYear();

export function renderAdminAttendances() {
  const main = document.getElementById('main-view');
  const currentUser = Auth.getCurrentUser();
  if (!currentUser) return;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const mIdx = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    return `${shortMonthNames[mIdx] || ''} ${day}, ${y}`;
  }

  function getFilterButtonLabel() {
    if (adminAttendancesFilterMode === 'manual') {
      if (adminAttendancesSingleDate) {
        return `📅 ${formatShortDate(adminAttendancesSingleDate)}`;
      }
      if (adminAttendancesFromDate && adminAttendancesToDate) {
        return `📅 ${formatShortDate(adminAttendancesFromDate)} → ${formatShortDate(adminAttendancesToDate)}`;
      }
      if (adminAttendancesFromDate) {
        return `📅 ${formatShortDate(adminAttendancesFromDate)}`;
      }
      if (adminAttendancesToDate) {
        return `📅 ${formatShortDate(adminAttendancesToDate)}`;
      }
    }
    return `${monthNames[adminAttendancesSelectedMonth]}, ${adminAttendancesSelectedYear}`;
  }

  function updateFilterButtonLabel() {
    const lbl = document.getElementById('lbl-admin-att-current-month');
    if (lbl) {
      lbl.textContent = getFilterButtonLabel();
    }
  }

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

          <!-- Calendar / Date Filter Button & Popover -->
          <div style="position: relative; flex-shrink: 0;" id="admin-att-calendar-container">
            <button type="button" id="admin-att-calendar-btn" class="btn btn-secondary" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: auto !important; height: 34px; padding: 0 14px; font-size: 14px; font-weight: 700; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); cursor: pointer; white-space: nowrap; transition: all 0.2s ease; box-sizing: border-box;">
              <span id="lbl-admin-att-current-month">${getFilterButtonLabel()}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: var(--text-secondary);">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </button>
            <input type="month" id="admin-att-month-picker" value="${adminAttendancesSelectedYear}-${String(adminAttendancesSelectedMonth + 1).padStart(2, '0')}" style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;">

            <!-- Calendar & Manual Date Filter Popover -->
            <div id="admin-att-calendar-popover" style="display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 1050; width: 330px; background: var(--bg-card, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 10px; box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 8px 10px -4px rgba(0, 0, 0, 0.08); padding: 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; box-sizing: border-box; color: var(--text-primary);">
              
              <!-- Tab Header Switcher -->
              <div style="display: flex; background: var(--bg-secondary, #f1f5f9); padding: 3px; border-radius: 8px; margin-bottom: 14px; gap: 4px;">
                <button type="button" id="tab-att-month-view" style="flex: 1; border: none; background: ${adminAttendancesActiveTab === 'month' ? 'var(--bg-card, #ffffff)' : 'transparent'}; color: ${adminAttendancesActiveTab === 'month' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)'}; font-weight: ${adminAttendancesActiveTab === 'month' ? '700' : '600'}; font-size: 13px; padding: 6px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: ${adminAttendancesActiveTab === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; transition: all 0.15s ease;">
                  📅 Month View
                </button>
                <button type="button" id="tab-att-manual-view" style="flex: 1; border: none; background: ${adminAttendancesActiveTab === 'manual' ? 'var(--bg-card, #ffffff)' : 'transparent'}; color: ${adminAttendancesActiveTab === 'manual' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)'}; font-weight: ${adminAttendancesActiveTab === 'manual' ? '700' : '600'}; font-size: 13px; padding: 6px 8px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: ${adminAttendancesActiveTab === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; transition: all 0.15s ease;">
                  📆 Manual Date
                </button>
              </div>

              <!-- Content Pane 1: Month View -->
              <div id="pane-att-month-view" style="display: ${adminAttendancesActiveTab === 'month' ? 'block' : 'none'};">
                <!-- Year Header Stepper -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                  <button type="button" id="btn-att-prev-year" style="width: 28px; height: 28px; border: 1px solid var(--border, #cbd5e1); border-radius: 6px; background: var(--bg-secondary, #f8fafc); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">‹</button>
                  <span id="lbl-att-picker-year" style="font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em;">${adminAttendancesPickerYear}</span>
                  <button type="button" id="btn-att-next-year" style="width: 28px; height: 28px; border: 1px solid var(--border, #cbd5e1); border-radius: 6px; background: var(--bg-secondary, #f8fafc); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">›</button>
                </div>

                <!-- 12-Month Grid -->
                <div id="grid-att-months" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;"></div>

                <!-- Bottom Helper Row -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border, #f1f5f9); padding-top: 10px; margin-top: 6px;">
                  <button type="button" id="btn-att-clear-month" style="background: none; border: none; color: var(--primary, #2563eb); font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 2px 4px;">
                    Reset
                  </button>
                  <button type="button" id="btn-att-this-month" style="background: none; border: none; color: var(--primary, #2563eb); font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 2px 4px;">
                    This month
                  </button>
                </div>
              </div>

              <!-- Content Pane 2: Manual Date View -->
              <div id="pane-att-manual-view" style="display: ${adminAttendancesActiveTab === 'manual' ? 'block' : 'none'};">
                <!-- Section A: Single Selected Date -->
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <label for="input-att-single-date" style="font-size: 12px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.03em;">
                      Single Date
                    </label>
                    <button type="button" id="btn-att-quick-today" style="background: none; border: none; color: var(--primary, #2563eb); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; text-decoration: underline;">
                      Select Today
                    </button>
                  </div>
                  <input type="date" id="input-att-single-date" value="${adminAttendancesSingleDate || ''}" class="form-input" style="width: 100%; height: 34px; padding: 0 10px; font-size: 13.5px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); box-sizing: border-box;">
                  <div style="font-size: 11px; color: var(--text-muted, #64748b); margin-top: 4px;">
                    Filter for a single day. From/To range is not required.
                  </div>
                </div>

                <!-- Divider -->
                <div style="display: flex; align-items: center; gap: 8px; margin: 12px 0 10px 0;">
                  <div style="flex: 1; height: 1px; background: var(--border, #e2e8f0);"></div>
                  <span style="font-size: 10.5px; font-weight: 700; color: var(--text-muted, #94a3b8); text-transform: uppercase; letter-spacing: 0.05em;">OR Date Range</span>
                  <div style="flex: 1; height: 1px; background: var(--border, #e2e8f0);"></div>
                </div>

                <!-- Section B: Date Range -->
                <div style="margin-bottom: 10px;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div>
                      <label for="input-att-from-date" style="display: block; font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                        From Date <span style="font-size: 10px; color: var(--text-muted);">(Optional)</span>
                      </label>
                      <input type="date" id="input-att-from-date" value="${adminAttendancesFromDate || ''}" class="form-input" style="width: 100%; height: 34px; padding: 0 8px; font-size: 12.5px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); box-sizing: border-box;">
                    </div>
                    <div>
                      <label for="input-att-to-date" style="display: block; font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                        To Date <span style="font-size: 10px; color: var(--text-muted);">(Optional)</span>
                      </label>
                      <input type="date" id="input-att-to-date" value="${adminAttendancesToDate || ''}" class="form-input" style="width: 100%; height: 34px; padding: 0 8px; font-size: 12.5px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); box-sizing: border-box;">
                    </div>
                  </div>
                  
                  <!-- Validation Error Container -->
                  <div id="att-date-range-error" style="display: ${adminAttendancesDateRangeError ? 'flex' : 'none'}; color: #ef4444; font-size: 11.5px; font-weight: 600; margin-top: 6px; align-items: center; gap: 4px; background: #fef2f2; padding: 4px 8px; border-radius: 4px; border: 1px solid #fecaca;">
                    <span>⚠️ ${adminAttendancesDateRangeError || 'To Date cannot be earlier than From Date'}</span>
                  </div>

                  <div style="font-size: 11px; color: var(--text-muted, #64748b); margin-top: 5px;">
                    Fill both for date range, or either one to check that single date.
                  </div>
                </div>

                <!-- Footer buttons in Manual Date -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border, #f1f5f9); padding-top: 10px; margin-top: 12px;">
                  <button type="button" id="btn-att-reset-filter" style="background: none; border: 1px solid var(--border, #cbd5e1); border-radius: 5px; color: var(--text-secondary); font-size: 12px; font-weight: 600; padding: 5px 10px; cursor: pointer;">
                    Reset to Month
                  </button>
                  <button type="button" id="btn-att-close-popover" class="btn btn-primary" style="background: var(--primary, #2563eb); color: #fff; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; padding: 5px 14px; cursor: pointer;">
                    Done
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Location Filter Dropdown -->
          <div style="position: relative; flex-shrink: 0;">
            <select id="admin-att-location-filter" class="form-input" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; height: 34px; padding: 0 12px; font-size: 13.5px; font-weight: 600; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); cursor: pointer; min-width: 150px; appearance: auto; -webkit-appearance: menulist; box-sizing: border-box; transition: all 0.2s ease;">
              <option value="">All Locations</option>
            </select>
          </div>

          <!-- Real-Time Biometric Sync Button -->
          <button id="btn-admin-att-sync-quick" class="btn btn-secondary" title="Sync Real-Time Biometric Punches" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: auto !important; height: 34px; padding: 0 12px; font-size: 13.5px; font-weight: 600; border-radius: 6px; border: 1px solid #93c5fd; background: #eff6ff; color: #1d4ed8; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; box-sizing: border-box;">
            <span id="quick-att-sync-icon" style="display: inline-block;">🔄</span>
            <span>Sync Biometric</span>
          </button>

          <!-- Actions Dropdown Button -->
          <div style="position: relative; flex-shrink: 0;">
            <button id="admin-att-actions-btn" class="btn btn-secondary" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 7px; width: auto !important; height: 34px; padding: 0 15px; font-size: 14px; font-weight: 600; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); cursor: pointer; white-space: nowrap; transition: all 0.2s ease; box-sizing: border-box;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Actions
            </button>
            <div id="admin-att-actions-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 4px); background: #ffffff; border: 1px solid rgba(0,0,0,0.12); border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.12); z-index: 1000; min-width: 150px; padding: 4px 0; overflow: hidden; animation: fadeIn 0.15s ease;">
              <button id="btn-admin-att-sync-dropdown" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 18px; font-size: 14px; font-weight: 600; border: none; background: transparent; color: #2563eb; cursor: pointer; text-align: left; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(37,99,235,0.08)'" onmouseout="this.style.background='transparent'">
                <span id="att-sync-menu-icon" style="display: inline-block;">🔄</span> Sync Biometric
              </button>
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
            <input type="number" id="input-att-current-page" min="1" max="1" value="1" style="width: 40px; height: 22px; text-align: center; padding: 0; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 700; border: none; background: transparent; color: var(--text-primary); outline: none;">
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
                <th style="cursor: pointer; padding: 12px 14px; user-select: none; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);" id="th-att-status">
                  <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 12px;">↑↓</span> Status
                  </span>
                </th>
                <th style="text-align: right; padding: 12px 16px; width: 100px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 700; color: var(--text-primary);">
                  Actions
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

  // Calendar / Manual Date Filter Popover Controller
  const calBtn = document.getElementById('admin-att-calendar-btn');
  const calPopover = document.getElementById('admin-att-calendar-popover');
  const tabMonth = document.getElementById('tab-att-month-view');
  const tabManual = document.getElementById('tab-att-manual-view');
  const paneMonth = document.getElementById('pane-att-month-view');
  const paneManual = document.getElementById('pane-att-manual-view');
  const btnPrevYear = document.getElementById('btn-att-prev-year');
  const btnNextYear = document.getElementById('btn-att-next-year');
  const lblPickerYear = document.getElementById('lbl-att-picker-year');
  const btnClearMonth = document.getElementById('btn-att-clear-month');
  const btnThisMonth = document.getElementById('btn-att-this-month');
  const singleDateInput = document.getElementById('input-att-single-date');
  const fromDateInput = document.getElementById('input-att-from-date');
  const toDateInput = document.getElementById('input-att-to-date');
  const errContainer = document.getElementById('att-date-range-error');
  const btnQuickToday = document.getElementById('btn-att-quick-today');
  const btnResetFilter = document.getElementById('btn-att-reset-filter');
  const btnClosePopover = document.getElementById('btn-att-close-popover');

  function renderMonthGrid() {
    const grid = document.getElementById('grid-att-months');
    if (!grid) return;
    grid.innerHTML = shortMonthNames.map((m, idx) => {
      const isSelected = adminAttendancesFilterMode === 'month' &&
        adminAttendancesSelectedYear === adminAttendancesPickerYear &&
        adminAttendancesSelectedMonth === idx;
      
      const bg = isSelected ? 'var(--primary, #2563eb)' : 'var(--bg-secondary, #f8fafc)';
      const color = isSelected ? '#ffffff' : 'var(--text-primary)';
      const border = isSelected ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border, #e2e8f0)';
      const fw = isSelected ? '700' : '500';

      return `<button type="button" class="btn-att-month-cell" data-month="${idx}" style="height: 32px; font-size: 12.5px; font-weight: ${fw}; background: ${bg}; color: ${color}; border: ${border}; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; outline: none;">${m}</button>`;
    }).join('');

    grid.querySelectorAll('.btn-att-month-cell').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mIdx = parseInt(btn.getAttribute('data-month'), 10);
        adminAttendancesFilterMode = 'month';
        adminAttendancesSelectedYear = adminAttendancesPickerYear;
        adminAttendancesSelectedMonth = mIdx;
        adminAttendancesSingleDate = '';
        adminAttendancesFromDate = '';
        adminAttendancesToDate = '';
        adminAttendancesDateRangeError = '';
        adminAttendancesCurrentPage = 1;
        adminAttendancesSortField = 'date';
        adminAttendancesSortOrder = 'desc';
        if (singleDateInput) singleDateInput.value = '';
        if (fromDateInput) fromDateInput.value = '';
        if (toDateInput) toDateInput.value = '';
        showRangeError('');
        
        updateFilterButtonLabel();
        renderMonthGrid();
        updateTable();
        
        if (calPopover) calPopover.style.display = 'none';
      });
    });
  }

  function switchPickerTab(tab) {
    adminAttendancesActiveTab = tab;
    if (tab === 'month') {
      if (tabMonth) {
        tabMonth.style.background = 'var(--bg-card, #ffffff)';
        tabMonth.style.color = 'var(--primary, #2563eb)';
        tabMonth.style.fontWeight = '700';
        tabMonth.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }
      if (tabManual) {
        tabManual.style.background = 'transparent';
        tabManual.style.color = 'var(--text-muted, #64748b)';
        tabManual.style.fontWeight = '600';
        tabManual.style.boxShadow = 'none';
      }
      if (paneMonth) paneMonth.style.display = 'block';
      if (paneManual) paneManual.style.display = 'none';
      renderMonthGrid();
    } else {
      if (tabManual) {
        tabManual.style.background = 'var(--bg-card, #ffffff)';
        tabManual.style.color = 'var(--primary, #2563eb)';
        tabManual.style.fontWeight = '700';
        tabManual.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }
      if (tabMonth) {
        tabMonth.style.background = 'transparent';
        tabMonth.style.color = 'var(--text-muted, #64748b)';
        tabMonth.style.fontWeight = '600';
        tabMonth.style.boxShadow = 'none';
      }
      if (paneMonth) paneMonth.style.display = 'none';
      if (paneManual) paneManual.style.display = 'block';
    }
  }

  function showRangeError(msg) {
    adminAttendancesDateRangeError = msg;
    if (errContainer) {
      if (msg) {
        errContainer.innerHTML = `<span>⚠️ ${msg}</span>`;
        errContainer.style.display = 'flex';
      } else {
        errContainer.style.display = 'none';
      }
    }
  }

  function handleSingleDateChange() {
    const val = singleDateInput ? singleDateInput.value.trim() : '';
    if (val) {
      adminAttendancesFilterMode = 'manual';
      adminAttendancesSingleDate = val;
      adminAttendancesFromDate = '';
      adminAttendancesToDate = '';
      if (fromDateInput) fromDateInput.value = '';
      if (toDateInput) toDateInput.value = '';
      showRangeError('');
      adminAttendancesCurrentPage = 1;
      updateFilterButtonLabel();
      updateTable();
    } else {
      if (!adminAttendancesFromDate && !adminAttendancesToDate) {
        adminAttendancesFilterMode = 'month';
        adminAttendancesSingleDate = '';
        showRangeError('');
        adminAttendancesCurrentPage = 1;
        updateFilterButtonLabel();
        updateTable();
      }
    }
  }

  function handleRangeChange() {
    const fromVal = fromDateInput ? fromDateInput.value.trim() : '';
    const toVal = toDateInput ? toDateInput.value.trim() : '';

    if (fromVal || toVal) {
      adminAttendancesSingleDate = '';
      if (singleDateInput) singleDateInput.value = '';
    }

    if (fromVal && toVal && toVal < fromVal) {
      showRangeError('To Date cannot be earlier than From Date');
      return;
    }

    showRangeError('');

    if (fromVal || toVal) {
      adminAttendancesFilterMode = 'manual';
      adminAttendancesFromDate = fromVal;
      adminAttendancesToDate = toVal;
      adminAttendancesCurrentPage = 1;
      // When date range (From Date -> To Date) is selected, sort chronologically: From Date -> Next Date -> To Date (asc)
      if (fromVal && toVal) {
        adminAttendancesSortField = 'date';
        adminAttendancesSortOrder = 'asc';
      }
      updateFilterButtonLabel();
      updateTable();
    } else {
      if (!adminAttendancesSingleDate) {
        adminAttendancesFilterMode = 'month';
        adminAttendancesFromDate = '';
        adminAttendancesToDate = '';
        adminAttendancesCurrentPage = 1;
        adminAttendancesSortField = 'date';
        adminAttendancesSortOrder = 'desc';
        updateFilterButtonLabel();
        updateTable();
      }
    }
  }

  // Bind popover controls
  if (calBtn && calPopover) {
    calBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = calPopover.style.display === 'block';
      if (!isOpen) {
        calPopover.style.display = 'block';
        if (adminAttendancesActiveTab === 'month') {
          renderMonthGrid();
        }
      } else {
        calPopover.style.display = 'none';
      }
    });

    calPopover.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
      if (calPopover && !calPopover.contains(e.target) && e.target !== calBtn && !calBtn.contains(e.target)) {
        calPopover.style.display = 'none';
      }
    });
  }

  if (tabMonth) tabMonth.addEventListener('click', () => switchPickerTab('month'));
  if (tabManual) tabManual.addEventListener('click', () => switchPickerTab('manual'));

  if (btnPrevYear) {
    btnPrevYear.addEventListener('click', (e) => {
      e.stopPropagation();
      adminAttendancesPickerYear--;
      if (lblPickerYear) lblPickerYear.textContent = adminAttendancesPickerYear;
      renderMonthGrid();
    });
  }

  if (btnNextYear) {
    btnNextYear.addEventListener('click', (e) => {
      e.stopPropagation();
      adminAttendancesPickerYear++;
      if (lblPickerYear) lblPickerYear.textContent = adminAttendancesPickerYear;
      renderMonthGrid();
    });
  }

  if (btnThisMonth) {
    btnThisMonth.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = new Date();
      adminAttendancesPickerYear = now.getFullYear();
      adminAttendancesSelectedYear = now.getFullYear();
      adminAttendancesSelectedMonth = now.getMonth();
      adminAttendancesFilterMode = 'month';
      adminAttendancesSingleDate = '';
      adminAttendancesFromDate = '';
      adminAttendancesToDate = '';
      adminAttendancesDateRangeError = '';
      adminAttendancesCurrentPage = 1;
      adminAttendancesSortField = 'date';
      adminAttendancesSortOrder = 'desc';
      if (singleDateInput) singleDateInput.value = '';
      if (fromDateInput) fromDateInput.value = '';
      if (toDateInput) toDateInput.value = '';
      if (lblPickerYear) lblPickerYear.textContent = adminAttendancesPickerYear;
      showRangeError('');
      updateFilterButtonLabel();
      renderMonthGrid();
      updateTable();
      if (calPopover) calPopover.style.display = 'none';
    });
  }

  if (btnClearMonth) {
    btnClearMonth.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = new Date();
      adminAttendancesPickerYear = now.getFullYear();
      adminAttendancesSelectedYear = now.getFullYear();
      adminAttendancesSelectedMonth = now.getMonth();
      adminAttendancesFilterMode = 'month';
      adminAttendancesSingleDate = '';
      adminAttendancesFromDate = '';
      adminAttendancesToDate = '';
      adminAttendancesDateRangeError = '';
      adminAttendancesCurrentPage = 1;
      adminAttendancesSortField = 'date';
      adminAttendancesSortOrder = 'desc';
      if (singleDateInput) singleDateInput.value = '';
      if (fromDateInput) fromDateInput.value = '';
      if (toDateInput) toDateInput.value = '';
      if (lblPickerYear) lblPickerYear.textContent = adminAttendancesPickerYear;
      showRangeError('');
      updateFilterButtonLabel();
      renderMonthGrid();
      updateTable();
    });
  }

  if (singleDateInput) {
    singleDateInput.addEventListener('input', handleSingleDateChange);
    singleDateInput.addEventListener('change', handleSingleDateChange);
  }

  if (btnQuickToday) {
    btnQuickToday.addEventListener('click', (e) => {
      e.stopPropagation();
      const today = Utils.getTodayString();
      if (singleDateInput) singleDateInput.value = today;
      handleSingleDateChange();
    });
  }

  if (fromDateInput) {
    fromDateInput.addEventListener('input', handleRangeChange);
    fromDateInput.addEventListener('change', handleRangeChange);
  }

  if (toDateInput) {
    toDateInput.addEventListener('input', handleRangeChange);
    toDateInput.addEventListener('change', handleRangeChange);
  }

  if (btnResetFilter) {
    btnResetFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = new Date();
      adminAttendancesFilterMode = 'month';
      adminAttendancesSelectedYear = now.getFullYear();
      adminAttendancesSelectedMonth = now.getMonth();
      adminAttendancesPickerYear = now.getFullYear();
      adminAttendancesSingleDate = '';
      adminAttendancesFromDate = '';
      adminAttendancesToDate = '';
      adminAttendancesDateRangeError = '';
      adminAttendancesSortField = 'date';
      adminAttendancesSortOrder = 'desc';
      if (singleDateInput) singleDateInput.value = '';
      if (fromDateInput) fromDateInput.value = '';
      if (toDateInput) toDateInput.value = '';
      showRangeError('');
      switchPickerTab('month');
      updateFilterButtonLabel();
      renderMonthGrid();
      updateTable();
    });
  }

  if (btnClosePopover) {
    btnClosePopover.addEventListener('click', (e) => {
      e.stopPropagation();
      if (calPopover) calPopover.style.display = 'none';
    });
  }

  // Initial render of month grid
  renderMonthGrid();

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

  // Location Filter Dropdown Event
  const locSelectInput = document.getElementById('admin-att-location-filter');
  if (locSelectInput) {
    locSelectInput.addEventListener('change', (e) => {
      adminAttendancesLocationFilter = e.target.value.trim();
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

  // Biometric Synchronization Handler
  const handleBiometricSync = async (clickedBtn) => {
    const icon = clickedBtn ? clickedBtn.querySelector('span') : null;
    if (icon) icon.style.animation = 'spin 1s linear infinite';
    try {
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Syncing biometric punches from all devices...', 'info');
      }
      let token = '';
      try {
        const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
        if (sess) token = JSON.parse(sess).token || '';
      } catch (_) {}

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch((window.apiBaseUrl || '') + '/api/biometric/sync', {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (data && data.success) {
        await DB.init('immediate');
        renderTable();
        const punchCount = (data.wdms?.transactionsCount || 0) + (data.local?.syncedLogs || 0);
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast(`Biometric sync complete! Fetched latest data across terminals (${punchCount} punches checked).`, 'success');
        }
      } else {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
          Utils.showToast(`Biometric sync notice: ${data?.message || 'Sync finished with notices'}`, 'warning');
        }
      }
    } catch (err) {
      console.error('Biometric sync error:', err);
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast(`Biometric sync failed: ${err.message}`, 'error');
      }
    } finally {
      if (icon) icon.style.animation = '';
    }
  };

  const btnSyncQuick = document.getElementById('btn-admin-att-sync-quick');
  if (btnSyncQuick) {
    btnSyncQuick.addEventListener('click', () => handleBiometricSync(btnSyncQuick));
  }

  const btnSyncDropdown = document.getElementById('btn-admin-att-sync-dropdown');
  if (btnSyncDropdown) {
    btnSyncDropdown.addEventListener('click', () => {
      const menu = document.getElementById('admin-att-actions-menu');
      if (menu) menu.style.display = 'none';
      handleBiometricSync(btnSyncDropdown);
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

          const employees = DB.getUsers().filter(u => u && u.status !== 'Inactive');
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
    'th-att-atwork': 'atWorkMins',
    'th-att-status': 'status'
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
    // 1. Fetch user records across all roles (Employees, HR, and Managers)
    const allUsers = DB.getUsers();
    const activeUsers = allUsers.filter(u => u && u.status !== 'Inactive');
    const userMap = new Map(activeUsers.map(u => [u.id, u]));

    const rawLogs = DB.getLogs().filter(log => {
      if (!userMap.has(log.userId)) return false;
      if (!log.date) return false;

      if (adminAttendancesFilterMode === 'manual') {
        if (adminAttendancesSingleDate) {
          return log.date === adminAttendancesSingleDate;
        }
        if (adminAttendancesFromDate && adminAttendancesToDate) {
          if (adminAttendancesToDate < adminAttendancesFromDate) return false;
          return log.date >= adminAttendancesFromDate && log.date <= adminAttendancesToDate;
        }
        if (adminAttendancesFromDate) {
          return log.date === adminAttendancesFromDate;
        }
        if (adminAttendancesToDate) {
          return log.date === adminAttendancesToDate;
        }
        return true;
      }

      const [y, m] = log.date.split('-');
      const logYear = parseInt(y, 10);
      const logMonth = parseInt(m, 10) - 1; // 0-indexed
      return logYear === adminAttendancesSelectedYear && logMonth === adminAttendancesSelectedMonth;
    });

    // Map logs with rich display values
    const mappedLogs = rawLogs.map(log => {
      const emp = userMap.get(log.userId);
      const empName = emp ? emp.name : 'Unknown User';
      const empId = emp ? (emp.employeeId || emp.id) : '';
      const userShiftIds = Array.isArray(emp?.scheduleIds) && emp.scheduleIds.length > 0
        ? emp.scheduleIds.filter(Boolean)
        : (emp?.scheduleId ? [emp.scheduleId] : []);

      let shift = null;
      if (userShiftIds.length > 0) {
        if (log.shiftId && userShiftIds.includes(log.shiftId)) {
          shift = DB.getSchedule(log.shiftId);
        } else {
          shift = DB.getSchedule(userShiftIds[0]);
        }
      }
      const shiftName = shift ? shift.name : '-';
      const location = (log.location && log.location.trim()) || (emp?.preferredLocation && emp.preferredLocation.trim()) || '-';
      
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
        location,
        emp,
        employeeName: empName,
        employeeId: empId,
        shiftName,
        atWorkStr,
        atWorkMins
      };
    });

    // Populate Location Dropdown options dynamically for current month
    const locFilterSelect = document.getElementById('admin-att-location-filter');
    if (locFilterSelect) {
      const distinctLocs = Array.from(new Set([
        ...mappedLogs.map(l => (l.location || '').trim()).filter(Boolean),
        ...Object.keys(DB.getOfficeCoordinates() || {})
      ])).filter(loc => {
        if (!loc) return false;
        const l = loc.toLowerCase();
        return !l.includes('kohat') && !l.includes('not assigned') && !l.includes('none') && !l.includes('--') && !l.startsWith('(') && !l.startsWith('worksite') && !l.endsWith('-close');
      }).sort((a, b) => a.localeCompare(b));

      const currentVal = adminAttendancesLocationFilter;
      const opts = `<option value="">All Locations (${mappedLogs.length})</option>` +
        distinctLocs.map(loc => {
          const count = mappedLogs.filter(l => (l.location || '').toLowerCase().trim() === loc.toLowerCase().trim()).length;
          return `<option value="${Utils.escape(loc)}" ${currentVal === loc ? 'selected' : ''}>${Utils.escape(loc)} (${count})</option>`;
        }).join('');

      if (locFilterSelect.innerHTML !== opts) {
        locFilterSelect.innerHTML = opts;
      }
    }

    // 2. Filter by location
    let filtered = mappedLogs;
    if (adminAttendancesLocationFilter) {
      const targetLoc = adminAttendancesLocationFilter.toLowerCase().trim();
      filtered = filtered.filter(l => {
        const logLoc = (l.location || '').toLowerCase().trim();
        return logLoc === targetLoc;
      });
    }

    // 3. Filter by search query
    if (adminAttendancesSearchQuery) {
      const q = adminAttendancesSearchQuery.toLowerCase();
      filtered = filtered.filter(l => {
        return l.employeeName.toLowerCase().includes(q) ||
               l.employeeId.toLowerCase().includes(q) ||
               l.date.toLowerCase().includes(q) ||
               (l.location && l.location.toLowerCase().includes(q)) ||
               l.shiftName.toLowerCase().includes(q) ||
               (l.checkIn && l.checkIn.includes(q)) ||
               (l.checkOut && l.checkOut.includes(q)) ||
               (l.status && l.status.toLowerCase().includes(q));
      });
    }

    // 3. Sort
    filtered.sort((a, b) => {
      let sortField = adminAttendancesSortField;
      let sortOrder = adminAttendancesSortOrder;

      // When date range (From Date -> To Date) is active and sorted by date,
      // strictly display in chronological order: From Date -> Next Date -> Next Date -> To Date (asc)
      const isDateRange = adminAttendancesFilterMode === 'manual' &&
        adminAttendancesFromDate && adminAttendancesToDate;

      if (isDateRange && sortField === 'date') {
        sortOrder = 'asc';
      }

      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;

      // Secondary tie-breaker for same date: sort by employee name asc, then checkIn asc
      if (sortField === 'date') {
        const nameA = (a.employeeName || '').toLowerCase();
        const nameB = (b.employeeName || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        const timeA = a.checkIn || '';
        const timeB = b.checkIn || '';
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;
      }
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
          <td colspan="9" style="text-align: center; padding: 48px 20px; color: var(--text-muted); font-size: 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
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

        const userShiftIds = Array.isArray(log.emp?.scheduleIds) && log.emp.scheduleIds.length > 0
          ? log.emp.scheduleIds.filter(Boolean)
          : (log.emp?.scheduleId ? [log.emp.scheduleId] : []);
        let shift = null;
        if (userShiftIds.length > 0) {
          if (log.shiftId && userShiftIds.includes(log.shiftId)) {
            shift = DB.getSchedule(log.shiftId);
          } else {
            shift = DB.getSchedule(userShiftIds[0]);
          }
        }
        
        let isLateArrival = false;
        if (log.checkIn && shift) {
          const [inH, inM] = log.checkIn.split(':').map(Number);
          const [startH, startM] = shift.startTime.split(':').map(Number);
          const checkInMins = inH * 60 + inM;
          const startMins = startH * 60 + startM;
          const grace = shift.gracePeriod || 0;
          if (checkInMins > startMins + grace) {
            isLateArrival = true;
          }
        }
        
        let isEarlyDeparture = false;
        if (log.checkOut && shift) {
          const [outH, outM] = log.checkOut.split(':').map(Number);
          const [endH, endM] = shift.endTime.split(':').map(Number);
          const checkOutMins = outH * 60 + outM;
          const endMins = endH * 60 + endM;
          if (checkOutMins < endMins) {
            isEarlyDeparture = true;
          }
        }

        let s = log.status;
        if (!shift) {
          s = log.checkIn ? 'On Time' : 'Absent';
        } else if (!s || s === 'Present') {
          s = 'On Time';
          if (shift && shift.startTime && log.checkIn) {
            const [sH, sM] = shift.startTime.split(':').map(Number);
            const [iH, iM] = log.checkIn.split(':').map(Number);
            const sMins = sH * 60 + (sM || 0);
            const iMins = iH * 60 + (iM || 0);
            const grace = shift.gracePeriod !== undefined ? Number(shift.gracePeriod) : 15;
            const halfDayLimit = shift.halfDayLimit !== undefined ? Number(shift.halfDayLimit) : 120;
            if (iMins > sMins + grace) s = 'Late';
            if (iMins >= sMins + halfDayLimit) s = 'Half Day';
          }
        }
        let badgeClass = 'badge-on-time';
        if (s === 'Late') badgeClass = 'badge-late';
        else if (s === 'Half Day') badgeClass = 'badge-half-day';
        else if (s === 'Absent') badgeClass = 'badge-absent';

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
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 500; color: #1e293b; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
              ${checkInDisplay}
              ${isLateArrival ? `<div style="font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 2px;">Late Arrival</div>` : ''}
            </td>
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 500; color: #1e293b; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
              ${checkOutDisplay}
              ${isEarlyDeparture ? `<div style="font-size: 11px; color: #f97316; font-weight: 600; margin-top: 2px;">Early Departure</div>` : ''}
            </td>
            <td style="padding: 12px 14px; font-size: 14px; color: #334155; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
              <div style="font-weight: 500;">${Utils.escape(log.shiftName)}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                <span style="opacity: 0.85;">📍</span> <span>${Utils.escape(log.location)}</span>
              </div>
            </td>
            <td style="padding: 12px 14px; font-size: 14px; font-weight: 700; color: #1e293b; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">${log.atWorkStr}</td>
            <td style="padding: 12px 14px; font-size: 13px; font-family: Calibri, 'Segoe UI', Arial, sans-serif;">
              <span class="badge ${badgeClass}">${s}</span>
            </td>
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
    btnFirst.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (adminAttendancesCurrentPage !== 1) {
        adminAttendancesCurrentPage = 1;
        updateTable();
      }
    };
  }

  const btnPrev = document.getElementById('btn-att-prev-page');
  if (btnPrev) {
    btnPrev.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (adminAttendancesCurrentPage > 1) {
        adminAttendancesCurrentPage--;
        updateTable();
      }
    };
  }

  const btnNext = document.getElementById('btn-att-next-page');
  if (btnNext) {
    btnNext.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const totalPages = parseInt(document.getElementById('span-att-total-pages')?.textContent, 10) || 1;
      if (adminAttendancesCurrentPage < totalPages) {
        adminAttendancesCurrentPage++;
        updateTable();
      }
    };
  }

  const btnLast = document.getElementById('btn-att-last-page');
  if (btnLast) {
    btnLast.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const totalPages = parseInt(document.getElementById('span-att-total-pages')?.textContent, 10) || 1;
      if (adminAttendancesCurrentPage !== totalPages) {
        adminAttendancesCurrentPage = totalPages;
        updateTable();
      }
    };
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

  // Real-time synchronization listeners for live biometric punches
  const onAttSync = () => {
    if (document.getElementById('admin-attendances-tbody')) {
      updateTable();
    }
  };
  window.removeEventListener('db_updated', window._adminAttDbUpdateHandler);
  window._adminAttDbUpdateHandler = onAttSync;
  window.addEventListener('db_updated', window._adminAttDbUpdateHandler);

  window.removeEventListener('biometric_sync_complete', window._adminAttBioSyncHandler);
  window._adminAttBioSyncHandler = onAttSync;
  window.addEventListener('biometric_sync_complete', window._adminAttBioSyncHandler);
}

// Modal for Creating New Attendance Record
function showCreateAttendanceModal() {
  const users = DB.getUsers().filter(u => u && u.status !== 'Inactive');
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
          <label class="form-label" style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Select User *</label>
          <select id="modal-create-att-user" class="form-input" required style="width: 100%; font-size: 13px;">
            ${users.map(e => `
              <option value="${e.id}">${Utils.escape(e.name)} (${Utils.escape(e.employeeId || e.id)}) - ${Utils.escape(e.role || 'employee')}</option>
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

// Helper to export Attendance records to CSV/Excel matching active view filters
function exportEmployeeAttendancesCSV(specificLogIds = null) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const allUsers = DB.getUsers();
  const activeUsers = allUsers.filter(u => u && u.status !== 'Inactive');
  const userMap = new Map(activeUsers.map(u => [u.id, u]));

  let logs = DB.getLogs().filter(log => {
    if (!userMap.has(log.userId)) return false;
    if (!log.date) return false;

    if (adminAttendancesFilterMode === 'manual') {
      if (adminAttendancesSingleDate) {
        return log.date === adminAttendancesSingleDate;
      }
      if (adminAttendancesFromDate && adminAttendancesToDate) {
        if (adminAttendancesToDate < adminAttendancesFromDate) return false;
        return log.date >= adminAttendancesFromDate && log.date <= adminAttendancesToDate;
      }
      if (adminAttendancesFromDate) {
        return log.date === adminAttendancesFromDate;
      }
      if (adminAttendancesToDate) {
        return log.date === adminAttendancesToDate;
      }
      return true;
    }

    const [y, m] = log.date.split('-');
    const logYear = parseInt(y, 10);
    const logMonth = parseInt(m, 10) - 1;
    return logYear === adminAttendancesSelectedYear && logMonth === adminAttendancesSelectedMonth;
  });

  // Map with rich attributes
  let mappedLogs = logs.map(log => {
    const emp = userMap.get(log.userId);
    const empName = emp ? emp.name : 'Unknown User';
    const empId = emp ? (emp.employeeId || emp.id) : '';
    const userShiftIds = Array.isArray(emp?.scheduleIds) && emp.scheduleIds.length > 0
      ? emp.scheduleIds.filter(Boolean)
      : (emp?.scheduleId ? [emp.scheduleId] : []);

    let shift = null;
    if (userShiftIds.length > 0) {
      if (log.shiftId && userShiftIds.includes(log.shiftId)) {
        shift = DB.getSchedule(log.shiftId);
      } else {
        shift = DB.getSchedule(userShiftIds[0]);
      }
    }
    const shiftName = shift ? shift.name : '-';
    const location = (log.location && log.location.trim()) || (emp?.preferredLocation && emp.preferredLocation.trim()) || '-';
    
    let atWorkStr = '--';
    if (log.checkIn && log.checkOut) {
      const atWork = Utils.calculateDuration(log.checkIn, log.checkOut);
      atWorkStr = atWork === '-' ? '--' : atWork;
    } else if (log.checkIn && !log.checkOut) {
      atWorkStr = 'In Session';
    }

    let checkInDisplay = log.checkIn || '--';
    if (checkInDisplay !== '--' && checkInDisplay.length === 5) checkInDisplay += ':00';
    
    let checkOutDisplay = log.checkOut || '--';
    if (checkOutDisplay !== '--' && checkOutDisplay.length === 5) checkOutDisplay += ':00';

    return {
      ...log,
      emp,
      employeeName: empName,
      employeeId: empId,
      shiftName,
      location,
      atWorkStr,
      checkInDisplay,
      checkOutDisplay
    };
  });

  // Apply location filter if set
  if (adminAttendancesLocationFilter) {
    const targetLoc = adminAttendancesLocationFilter.toLowerCase().trim();
    mappedLogs = mappedLogs.filter(l => (l.location || '').toLowerCase().trim() === targetLoc);
  }

  // Apply search query filter if set
  if (adminAttendancesSearchQuery) {
    const q = adminAttendancesSearchQuery.toLowerCase().trim();
    mappedLogs = mappedLogs.filter(l => {
      return (l.employeeName || '').toLowerCase().includes(q) ||
             (l.employeeId || '').toLowerCase().includes(q) ||
             (l.date || '').toLowerCase().includes(q) ||
             (l.location || '').toLowerCase().includes(q) ||
             (l.shiftName || '').toLowerCase().includes(q) ||
             (l.checkIn || '').includes(q) ||
             (l.checkOut || '').includes(q) ||
             (l.status || '').toLowerCase().includes(q);
    });
  }

  // If specific checkbox IDs selected, narrow down to those
  if (specificLogIds && specificLogIds.length > 0) {
    const idSet = new Set(specificLogIds);
    mappedLogs = mappedLogs.filter(l => idSet.has(l.id));
  }

  if (mappedLogs.length === 0) {
    if (typeof showToastNotification === 'function') {
      showToastNotification('⚠️ No attendance records to export for current filter criteria.', 'warning');
    } else {
      alert('No attendance records to export for current filter criteria.');
    }
    return;
  }

  const locSlug = adminAttendancesLocationFilter ? `_${adminAttendancesLocationFilter.replace(/\s+/g, '_')}` : '';
  let dateSlug = '';
  let dateLabel = '';
  if (adminAttendancesFilterMode === 'manual') {
    if (adminAttendancesSingleDate) {
      dateSlug = `_${adminAttendancesSingleDate}`;
      dateLabel = adminAttendancesSingleDate;
    } else if (adminAttendancesFromDate && adminAttendancesToDate) {
      dateSlug = `_${adminAttendancesFromDate}_to_${adminAttendancesToDate}`;
      dateLabel = `${adminAttendancesFromDate} to ${adminAttendancesToDate}`;
    } else if (adminAttendancesFromDate) {
      dateSlug = `_${adminAttendancesFromDate}`;
      dateLabel = adminAttendancesFromDate;
    } else if (adminAttendancesToDate) {
      dateSlug = `_${adminAttendancesToDate}`;
      dateLabel = adminAttendancesToDate;
    } else {
      dateSlug = '_custom';
      dateLabel = 'Custom';
    }
  } else {
    const monthName = monthNames[adminAttendancesSelectedMonth] || 'All';
    dateSlug = `_${monthName}_${adminAttendancesSelectedYear}`;
    dateLabel = `${monthName} ${adminAttendancesSelectedYear}`;
  }
  const filename = `Attendances${dateSlug}${locSlug}.xlsx`;
  const headers = ['Employee Name', 'Employee ID', 'Date', 'Check-In', 'Check-Out', 'Shift', 'At Work', 'Status', 'Location'];
  
  // Sort mappedLogs to match table sorting and chronological order
  mappedLogs.sort((a, b) => {
    let sortField = adminAttendancesSortField;
    let sortOrder = adminAttendancesSortOrder;
    if (adminAttendancesFilterMode === 'manual' && adminAttendancesFromDate && adminAttendancesToDate && sortField === 'date') {
      sortOrder = 'asc';
    }
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    if (sortField === 'date') {
      const nameA = (a.employeeName || '').toLowerCase();
      const nameB = (b.employeeName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
    }
    return 0;
  });

  const rows = mappedLogs.map(l => [
    l.employeeName,
    l.employeeId,
    l.date || '',
    l.checkInDisplay,
    l.checkOutDisplay,
    l.shiftName,
    l.atWorkStr,
    l.status || 'On Time',
    l.location
  ]);

  Utils.exportToExcel(filename, headers, rows);

  if (typeof showToastNotification === 'function') {
    showToastNotification(`📥 Exported ${rows.length} attendance records (${dateLabel}) successfully.`, 'success');
  }
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
