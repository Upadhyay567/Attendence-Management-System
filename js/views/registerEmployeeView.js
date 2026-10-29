// js/views/registerEmployeeView.js - Full-Screen Unified Employee & Payroll Registration Portal
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html, formatTimeRange12h } from '../utils/helpers.js';
import { showToastNotification } from '../components/toast.js';
import { showAccountCreationSuccessModal } from '../components/accountModal.js';
import { openFullScreenImageModal } from '../components/modals.js';

export function renderRegisterEmployeeView() {
  const main = document.getElementById('main-view');
  if (!main) return;

  const currentUser = Auth.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'hr' && currentUser.role !== 'manager' && currentUser.role !== 'admin')) {
    alert('Unauthorized: Only HR Admin Managers and Operations Managers can access the registration portal.');
    window.location.hash = '#dashboard';
    return;
  }

  // Suggest next EMP ID
  let maxId = 99;
  (DB.data.users || []).forEach(u => {
    if (u && u.employeeId && String(u.employeeId).toUpperCase().startsWith('EMP')) {
      const num = parseInt(String(u.employeeId).substring(3).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  });
  const suggestedEmpId = 'EMP-' + (maxId + 1);

  const schedules = DB.getSchedules() || [];
  const managers = (DB.getUsers() || []).filter(u => u && u.role === 'manager');
  const admins = (DB.getUsers() || []).filter(u => u && (u.role === 'hr' || u.role === 'manager' || u.role === 'admin'));
  const todayStr = new Date().toISOString().split('T')[0];

  let editorPhotoDataUrl = '';

  main.innerHTML = `
    <div class="content-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
          <a href="#admin-users" style="color:var(--text-muted); font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
            <span>👥</span> Employee Directory
          </a>
          <span style="color:var(--text-muted); font-size:11px;">/</span>
          <span style="color:var(--primary, #89201B); font-size:12px; font-weight:700;">New Registration</span>
        </div>
        <h1 class="content-title" style="margin:0; font-size:24px; font-weight:800; color:var(--text-primary); letter-spacing:-0.02em;">
          Register New Employee
        </h1>
        <div class="content-subtitle" style="font-size:13px; color:var(--text-muted); margin-top:4px;">
          Complete employee personal credentials and initial payroll compensation side by side.
        </div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button type="button" class="btn btn-secondary" id="btn-reg-cancel-top" style="padding:9px 18px; width:auto; font-size:13px; font-weight:600; cursor:pointer;">
          ✕ Cancel
        </button>
        <button type="submit" form="full-employee-registration-form" id="btn-reg-submit-top" class="btn-primary-equify" style="display:inline-flex; align-items:center; gap:8px; padding:10px 22px; font-size:13.5px; font-weight:700; cursor:pointer; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); color:#ffffff; border:1px solid #fbbf24; border-radius:8px; box-shadow:0 4px 12px rgba(137,32,27,0.35);">
          <span>💾</span> Save & Register Employee
        </button>
      </div>
    </div>

    <form id="full-employee-registration-form" style="display:flex; flex-direction:column; gap:24px; padding-bottom:30px;">
      <!-- Side by Side 2-Column Responsive Grid -->
      <div style="display:grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap:24px; align-items:start;" id="reg-two-column-container">
        
        <!-- LEFT COLUMN: EMPLOYEE DETAILS -->
        <div class="card-panel" style="padding:24px; border-radius:14px; background:var(--bg-surface, #1e1e24); border:1px solid var(--border); box-shadow:0 10px 30px rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:18px;">
          <div style="border-bottom:1px solid var(--border); padding-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:20px;">👤</span>
              <div>
                <h2 style="margin:0; font-size:16px; font-weight:800; color:var(--text-primary);">Employee Details & Job Role</h2>
                <span style="font-size:11.5px; color:var(--text-muted);">Personal profile, identity, contacts, shifts & documents</span>
              </div>
            </div>
            <span class="badge" style="background:rgba(137,32,27,0.15); color:var(--primary, #89201B); font-weight:700; font-size:11px; padding:4px 8px; border:1px solid rgba(137,32,27,0.3);">Step 1 of 2</span>
          </div>

          <!-- Profile Photo Upload & Remove Section -->
          <div class="form-group" style="display:flex; align-items:center; gap:16px; background:rgba(255,255,255,0.02); padding:14px; border-radius:12px; border:1px solid var(--border); margin-bottom:0;">
            <div id="reg-photo-preview" style="width:68px; height:68px; border-radius:12px; background:linear-gradient(135deg,#89201B,#5c0f0a); border:2px solid #fbbf24; box-shadow:0 4px 12px rgba(0,0,0,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;" title="Employee Photo">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:38px; height:38px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <input type="file" id="reg-photo-file-input" accept="image/*" style="display:none">
              <div style="display:flex; gap:8px; align-items:center;">
                <button id="btn-reg-upload-photo" class="btn btn-sm" type="button" style="width:auto; padding:6px 14px; font-size:12px; font-weight:700; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); border:none; color:#fff; border-radius:8px; cursor:pointer;">
                  📷 Upload Photo
                </button>
                <button id="btn-reg-remove-photo" class="btn btn-sm" type="button" style="width:auto; padding:6px 14px; font-size:12px; font-weight:700; background:#fdf2f2; border:1px solid #fecaca; color:#dc2626; border-radius:8px; cursor:pointer; display:none;">
                  🗑️ Remove
                </button>
              </div>
              <div style="font-size:11px; color:var(--text-muted)">Supports PNG, JPG. Max size 2MB.</div>
            </div>
          </div>

          <!-- Basic Personal Info -->
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="reg-name" style="font-weight:700;">Full Name <span style="color:var(--danger);font-size:11px">* (Letters only)</span></label>
            <input class="form-input" type="text" id="reg-name" required placeholder="e.g. Rahul Sharma" autocomplete="off">
          </div>

          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-empid" style="font-weight:700;">Employee ID <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="text" id="reg-empid" value="${suggestedEmpId}" required placeholder="e.g. EMP-101">
            </div>
            <div>
              <label class="form-label" for="reg-email" style="font-weight:700;">Email Address <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="email" id="reg-email" required placeholder="e.g. rahul@company.com">
            </div>
          </div>

          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-phone" style="font-weight:700;">Mobile Number <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="tel" id="reg-phone" required placeholder="e.g. +91 9876543210">
            </div>
            <div>
              <label class="form-label" for="reg-dob" style="font-weight:700;">Date of Birth <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="date" id="reg-dob" required>
            </div>
          </div>

          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-gender">Gender</label>
              <select class="form-input" id="reg-gender" required>
                <option value="Male" selected>Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="reg-blood-group">Blood Group</label>
              <select class="form-input" id="reg-blood-group">
                <option value="">-- Select Blood Group --</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <!-- Branch & Pincode -->
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-branch">Branch</label>
              <input class="form-input" type="text" id="reg-branch" placeholder="e.g. Delhi Head Office">
            </div>
            <div>
              <label class="form-label" for="reg-pincode">Pincode</label>
              <input class="form-input" type="text" id="reg-pincode" placeholder="e.g. 110001" maxlength="10">
            </div>
          </div>

          <!-- City & State -->
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-city" style="font-weight:700;">City <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="text" id="reg-city" required placeholder="e.g. New Delhi" value="Delhi">
            </div>
            <div>
              <label class="form-label" for="reg-state" style="font-weight:700;">State <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="text" id="reg-state" required placeholder="e.g. Delhi" value="Delhi">
            </div>
          </div>

          <!-- Biometric User ID & Password -->
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-biometric-id">Biometric User ID <span style="color:var(--text-muted);font-size:11px">(Machine ID)</span></label>
              <input class="form-input" type="text" id="reg-biometric-id" placeholder="e.g. 101">
            </div>
            <div>
              <label class="form-label" for="reg-pass">Security Password</label>
              <input class="form-input" type="password" id="reg-pass" placeholder="Leave blank for Surya@123">
            </div>
          </div>

          <!-- Department & Designation -->
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-dept" style="font-weight:700;">Department <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="text" id="reg-dept" placeholder="e.g. Sales / Production" required>
            </div>
            <div>
              <label class="form-label" for="reg-desg" style="font-weight:700;">Designation <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="text" id="reg-desg" placeholder="e.g. Sales Associate" required>
            </div>
          </div>

          <!-- Date of Joining & Emergency Contact -->
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-doj" style="font-weight:700;">Date of Joining</label>
              <input class="form-input" type="date" id="reg-doj" value="">
            </div>
            <div>
              <label class="form-label" for="reg-emergency" style="font-weight:700;">Emergency Contact <span style="color:var(--danger);font-size:11px">*</span></label>
              <input class="form-input" type="text" id="reg-emergency" placeholder="+91 98765 00000" required>
            </div>
          </div>

          <!-- Role & Manager Hierarchy -->
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
            <div>
              <label class="form-label" for="reg-role">Portal Access Role</label>
              <select class="form-input" id="reg-role" required>
                <option value="employee" selected>Employee</option>
                <option value="hr">HR Coordinator</option>
                <option value="manager">Operations Manager</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="reg-manager">Assigned Manager</label>
              <select class="form-input" id="reg-manager">
                <option value="">-- No Manager Assigned --</option>
                ${managers.map(m => `<option value="${m.id}">${Utils.escape(m.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="reg-assigned-by">Assigned By <span style="color:var(--text-muted);font-size:11px">(HR/Manager Registering)</span></label>
            <select class="form-input" id="reg-assigned-by">
              ${admins.map(a => `
                <option value="${a.id}" ${currentUser && a.id === currentUser.id ? 'selected' : ''}>
                  ${Utils.escape(a.name)} (${a.role === 'hr' ? 'HR' : (a.role === 'manager' ? 'Manager' : 'Admin')})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Shift Schedules & Locations -->
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-weight:700;">Assigned Shift Schedule(s) & Work Location(s)</label>
            <div id="reg-schedule-checkboxes" style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-sm); padding:12px; max-height:220px; overflow-y:auto;">
              ${schedules.map((s, idx) => {
                const isChecked = false;
                const shiftLoc = s.location || 'Delhi Head Office';
                return `
                  <div class="shift-assign-card" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:var(--radius-sm); padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; margin:0; user-select:none;">
                        <input type="checkbox" name="reg_shift_select" value="${s.id}" class="reg-shift-checkbox" data-shift-id="${s.id}" ${isChecked ? 'checked' : ''} style="cursor:pointer; width:15px; height:15px; accent-color:var(--primary);">
                        <span><strong>${Utils.escape(s.name)}</strong> <span style="color:var(--text-secondary); font-size:11.5px;">(${formatTimeRange12h(s.startTime, s.endTime)})</span></span>
                      </label>
                      <span style="font-size:10px; color:var(--text-muted); background:rgba(255,255,255,0.04); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.06); white-space:nowrap;">⏱️ ${s.gracePeriod || 15}m Grace</span>
                    </div>
                    <div class="reg-shift-loc-picker-block" id="reg-shift-loc-block-${s.id}" style="display:${isChecked ? 'flex' : 'none'}; align-items:center; gap:8px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.08); margin-left:22px; flex-wrap:wrap;">
                      <span style="font-size:11px; font-weight:600; color:var(--text-secondary); white-space:nowrap;">📍 Location:</span>
                      <select class="reg-shift-location-select form-input" data-shift-id="${s.id}" id="reg-shift-loc-${s.id}" style="flex:1; min-width:160px; max-width:240px; height:30px; padding:2px 8px; font-size:11.5px; border-radius:var(--radius-sm); cursor:pointer;">
                        ${Object.keys(window.OFFICE_COORDINATES || { 'Delhi Head Office': true, 'Chattarpur Office': true, 'PITAM PURA': true, 'WH-1340': true }).filter(l => !l.includes('28.6952') && l !== 'Office HQ' && l !== 'Mock Device').map(loc => `
                          <option value="${loc}" ${shiftLoc === loc ? 'selected' : ''}>${loc}</option>
                        `).join('')}
                      </select>
                      <button type="button" class="btn-reg-shift-custom-loc btn btn-sm" data-shift-id="${s.id}" style="width:auto; height:28px; padding:0 8px; font-size:11px; font-weight:600; background:rgba(6,182,212,0.1); color:var(--cyan); border:1px solid rgba(6,182,212,0.3); border-radius:6px; cursor:pointer;">✏️ Custom</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Documents -->
          <div class="form-group" style="border-top:1px solid var(--border); padding-top:15px; margin-bottom:0;">
            <label class="form-label" style="font-weight:700; color:var(--text-secondary);">Document Management</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:8px;">
              <div>
                <label class="form-label" for="reg-resume" style="font-size:11px;">Resume / CV File</label>
                <input class="form-input" type="file" id="reg-resume" accept=".pdf,.jpg,.jpeg,.png">
              </div>
              <div>
                <label class="form-label" for="reg-aadhar" style="font-size:11px;">Aadhaar Card File</label>
                <input class="form-input" type="file" id="reg-aadhar" accept=".pdf,.jpg,.jpeg,.png">
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: PAYROLL & FINANCIALS -->
        <div class="card-panel" style="padding:24px; border-radius:14px; background:var(--bg-surface, #1e1e24); border:1px solid var(--border); box-shadow:0 10px 30px rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:18px;">
          <div style="border-bottom:1px solid var(--border); padding-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:20px;">💳</span>
              <div>
                <h2 style="margin:0; font-size:16px; font-weight:800; color:var(--text-primary);">Payroll & Banking Setup</h2>
                <span style="font-size:11.5px; color:var(--text-muted);">Salary, allowances, deductions, PF/UAN, and bank accounts</span>
              </div>
            </div>
            <span class="badge" style="background:rgba(16,185,129,0.15); color:var(--success); font-weight:700; font-size:11px; padding:4px 8px; border:1px solid rgba(16,185,129,0.3);">Step 2 of 2</span>
          </div>

          <!-- Section 1: Salary & Bonus -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span>💰</span> Monthly Base Compensation & Bonus
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
              <div>
                <label class="form-label" for="reg-salary" style="font-weight:700;">Base Salary (INR/Month)</label>
                <input class="form-input" type="number" id="reg-salary" placeholder="e.g. 50000" min="0" step="100">
              </div>
              <div>
                <label class="form-label" for="reg-bonus" style="font-weight:700;">Bonus (INR)</label>
                <input class="form-input" type="number" id="reg-bonus" placeholder="e.g. 5000" min="0" step="100">
              </div>
            </div>
          </div>

          <!-- Section 2: Allowances -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span>➕</span> Monthly Allowances (Earnings)
              </div>
              <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">Auto-calculates from HRA + Travel + CCA + Performance + Other + Bonus</span>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" for="reg-total-allowances" style="font-weight:700; color:var(--success);">Total Allowances (INR/Month)</label>
              <input class="form-input" type="number" id="reg-total-allowances" placeholder="e.g. 15000" style="font-weight:700; border-color:rgba(16,185,129,0.3);">
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:10px;">
              <div>
                <label class="form-label" for="reg-hra" style="font-size:11.5px;">HRA (INR/Month)</label>
                <input class="form-input" type="number" id="reg-hra" placeholder="e.g. 10000" min="0">
              </div>
              <div>
                <label class="form-label" for="reg-travel" style="font-size:11.5px;">Travel Allowance (INR/Month)</label>
                <input class="form-input" type="number" id="reg-travel" placeholder="e.g. 3000" min="0">
              </div>
              <div>
                <label class="form-label" for="reg-cca" style="font-size:11.5px;">CCA (INR/Month)</label>
                <input class="form-input" type="number" id="reg-cca" placeholder="e.g. 2000" min="0">
              </div>
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
              <div>
                <label class="form-label" for="reg-performance" style="font-size:11.5px;">Performance Amount (INR)</label>
                <input class="form-input" type="number" id="reg-performance" placeholder="e.g. 5000" min="0">
              </div>
              <div>
                <label class="form-label" for="reg-other-allowances" style="font-size:11.5px;">Other Allowances (INR)</label>
                <input class="form-input" type="number" id="reg-other-allowances" placeholder="e.g. 1500" min="0">
              </div>
            </div>
          </div>

          <!-- Section 3: Deductions -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span>➖</span> Monthly Deductions
              </div>
              <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">Auto-calculates from PF + ESI + Advance + Others + TDS</span>
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" for="reg-total-deductions" style="font-weight:700; color:#ef4444;">Total Deduction (INR/Month)</label>
              <input class="form-input" type="number" id="reg-total-deductions" placeholder="e.g. 6200" style="font-weight:700; border-color:rgba(239,68,68,0.3);">
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:10px;">
              <div>
                <label class="form-label" for="reg-pf" style="font-size:11px;">PF (INR/Month)</label>
                <input class="form-input" type="number" id="reg-pf" placeholder="12% (Max ₹1,800 on ₹15k ceiling)" min="0">
              </div>
              <div>
                <label class="form-label" for="reg-esi" style="font-size:11px;">ESI Deduction (INR/Month)</label>
                <input class="form-input" type="number" id="reg-esi" placeholder="0.75% if gross ≤ ₹21k, else ₹0" min="0">
              </div>
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:0;">
              <div>
                <label class="form-label" for="reg-advance" style="font-size:11px;">Advance Salary (INR)</label>
                <input class="form-input" type="number" id="reg-advance" placeholder="e.g. 2000" min="0">
              </div>
              <div>
                <label class="form-label" for="reg-other-deductions" style="font-size:11px;">Others Deduction (INR)</label>
                <input class="form-input" type="number" id="reg-other-deductions" placeholder="e.g. 500" min="0">
              </div>
              <div>
                <label class="form-label" for="reg-tds" style="font-size:11px;">TDS Rate (%)</label>
                <input class="form-input" type="number" id="reg-tds" placeholder="e.g. 10" min="0" max="100">
              </div>
            </div>
          </div>

          <!-- Section 4: Statutory & Social Security -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span>🏛️</span> Statutory PF, UAN & ESI Numbers
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-bottom:0;">
              <div>
                <label class="form-label" for="reg-uan" style="font-size:11.5px;">UAN No. <span style="font-size:10px; color:var(--text-muted);">(Universal Account No)</span></label>
                <input class="form-input" type="text" id="reg-uan" placeholder="e.g. 101234567890">
              </div>
              <div>
                <label class="form-label" for="reg-pf-no" style="font-size:11.5px;">PF No. <span style="font-size:10px; color:var(--text-muted);">(Provident Fund No)</span></label>
                <input class="form-input" type="text" id="reg-pf-no" placeholder="e.g. DL/CPM/0012345/000">
              </div>
              <div>
                <label class="form-label" for="reg-esi-no" style="font-size:11.5px;">ESI No. <span style="font-size:10px; color:var(--text-muted);">(Employee State Insurance No)</span></label>
                <input class="form-input" type="text" id="reg-esi-no" placeholder="e.g. 11000123456789001">
              </div>
            </div>
          </div>

          <!-- Section 5: Banking Details -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:12px; padding:16px;">
            <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <span>🏦</span> Bank Account & Disbursement
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label class="form-label" for="reg-bank-name" style="font-size:11.5px;">Bank Name</label>
                <input class="form-input" type="text" id="reg-bank-name" placeholder="e.g. State Bank of India">
              </div>
              <div>
                <label class="form-label" for="reg-account-number" style="font-size:11.5px;">Account Number</label>
                <input class="form-input" type="text" id="reg-account-number" placeholder="e.g. 987654321012">
              </div>
            </div>
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:0;">
              <div>
                <label class="form-label" for="reg-ifsc" style="font-size:11.5px;">IFSC Code</label>
                <input class="form-input" type="text" id="reg-ifsc" placeholder="e.g. SBIN0001234" style="text-transform:uppercase;">
              </div>
              <div>
                <label class="form-label" for="reg-bank-branch" style="font-size:11.5px;">Bank Branch Name</label>
                <input class="form-input" type="text" id="reg-bank-branch" placeholder="e.g. Chandni Chowk Branch">
              </div>
            </div>
          </div>

          <!-- Real-Time Net Pay Preview Card -->
          <div style="background:linear-gradient(135deg, rgba(137,32,27,0.15) 0%, rgba(30,41,59,0.3) 100%); border:1px solid rgba(251,191,36,0.3); border-radius:12px; padding:16px;">
            <div style="font-size:12px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
              📊 Real-Time Compensation Summary
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px;">
              <span style="color:var(--text-secondary);">Gross Monthly Earnings:</span>
              <strong id="preview-gross-val" style="color:var(--success);">₹0</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:8px;">
              <span style="color:var(--text-secondary);">Total Monthly Deductions:</span>
              <strong id="preview-deduct-val" style="color:#ef4444;">₹0</strong>
            </div>
            <div style="border-top:1px dashed rgba(255,255,255,0.15); padding-top:8px; display:flex; justify-content:space-between; font-size:14px;">
              <span style="font-weight:700; color:var(--text-primary);">Estimated Net Take-Home:</span>
              <strong id="preview-net-val" style="color:#fbbf24; font-size:16px; font-weight:800;">₹0</strong>
            </div>
          </div>

        </div>

      </div>

      <!-- BOTTOM ACTION BAR -->
      <div class="card-panel" style="padding:16px 24px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface, #1e1e24); border:1px solid var(--border);">
        <button type="button" class="btn btn-secondary" id="btn-reg-cancel-bottom" style="padding:10px 20px; width:auto; font-size:13px; font-weight:600; cursor:pointer;">
          ← Back to Employee Directory
        </button>
        <button type="submit" id="btn-reg-submit-bottom" class="btn-primary-equify" style="display:inline-flex; align-items:center; gap:8px; padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); color:#ffffff; border:1px solid #fbbf24; border-radius:8px; box-shadow:0 4px 15px rgba(137,32,27,0.4);">
          <span>💾</span> Save & Register Employee
        </button>
      </div>
    </form>
  `;

  // Photo upload and preview logic
  const fileInput = document.getElementById('reg-photo-file-input');
  const btnUpload = document.getElementById('btn-reg-upload-photo');
  const btnRemove = document.getElementById('btn-reg-remove-photo');
  const previewBox = document.getElementById('reg-photo-preview');

  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('File size exceeds 2MB limit.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          editorPhotoDataUrl = evt.target.result;
          if (previewBox) {
            previewBox.innerHTML = html`<img src="${editorPhotoDataUrl}" style="width:100%; height:100%; object-fit:contain;">`;
            previewBox.style.background = 'transparent';
            previewBox.style.cursor = 'pointer';
          }
          if (btnRemove) btnRemove.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (previewBox) {
    previewBox.addEventListener('click', () => {
      if (editorPhotoDataUrl && typeof openFullScreenImageModal === 'function') {
        openFullScreenImageModal(editorPhotoDataUrl);
      }
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      editorPhotoDataUrl = '';
      if (previewBox) {
        previewBox.innerHTML = html`<svg viewBox="0 0 24 24" fill="currentColor" style="width:38px; height:38px; color:#fbbf24;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg>`;
        previewBox.style.background = 'linear-gradient(135deg,#89201B,#5c0f0a)';
        previewBox.style.cursor = 'default';
      }
      btnRemove.style.display = 'none';
      if (fileInput) fileInput.value = '';
    });
  }

  // Shift assignment checkboxes
  main.querySelectorAll('.reg-shift-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const sid = cb.getAttribute('data-shift-id');
      const block = document.getElementById(`reg-shift-loc-block-${sid}`);
      if (block) {
        block.style.display = cb.checked ? 'flex' : 'none';
      }
    });
  });

  // Custom shift location picker
  main.querySelectorAll('.btn-reg-shift-custom-loc').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.getAttribute('data-shift-id');
      const locSelect = document.getElementById(`reg-shift-loc-${sid}`);
      if (locSelect) {
        if (typeof window.enterCustomLocation === 'function') {
          window.enterCustomLocation(locSelect);
        } else {
          const custom = prompt('Enter custom worksite location name:');
          if (custom && custom.trim()) {
            const opt = document.createElement('option');
            opt.value = custom.trim();
            opt.textContent = custom.trim();
            opt.selected = true;
            locSelect.appendChild(opt);
          }
        }
      }
    });
  });

  // Live Payroll Calculation Listeners
  let userManuallySetAllowances = false;
  let userManuallySetDeductions = false;

  const salaryInput = document.getElementById('reg-salary');
  const bonusInput = document.getElementById('reg-bonus');
  const hraInput = document.getElementById('reg-hra');
  const travelInput = document.getElementById('reg-travel');
  const ccaInput = document.getElementById('reg-cca');
  const performanceInput = document.getElementById('reg-performance');
  const otherAllowancesInput = document.getElementById('reg-other-allowances');
  const totalAllowancesInput = document.getElementById('reg-total-allowances');

  const pfInput = document.getElementById('reg-pf');
  const esiInput = document.getElementById('reg-esi');
  const advanceInput = document.getElementById('reg-advance');
  const otherDeductionsInput = document.getElementById('reg-other-deductions');
  const tdsInput = document.getElementById('reg-tds');
  const totalDeductionsInput = document.getElementById('reg-total-deductions');

  const previewGross = document.getElementById('preview-gross-val');
  const previewDeduct = document.getElementById('preview-deduct-val');
  const previewNet = document.getElementById('preview-net-val');

  function updateCompensationSummary() {
    const base = parseFloat(salaryInput ? salaryInput.value : 0) || 0;
    const allowances = parseFloat(totalAllowancesInput ? totalAllowancesInput.value : 0) || 0;
    const deductions = parseFloat(totalDeductionsInput ? totalDeductionsInput.value : 0) || 0;

    const gross = base + allowances;
    const net = Math.max(0, gross - deductions);

    if (previewGross) previewGross.textContent = `₹${gross.toLocaleString()}`;
    if (previewDeduct) previewDeduct.textContent = `₹${deductions.toLocaleString()}`;
    if (previewNet) previewNet.textContent = `₹${net.toLocaleString()}`;
  }

  function recalcAllowances() {
    if (totalAllowancesInput) {
      const hra = parseFloat(hraInput ? hraInput.value : 0) || 0;
      const travel = parseFloat(travelInput ? travelInput.value : 0) || 0;
      const cca = parseFloat(ccaInput ? ccaInput.value : 0) || 0;
      const performance = parseFloat(performanceInput ? performanceInput.value : 0) || 0;
      const otherAllow = parseFloat(otherAllowancesInput ? otherAllowancesInput.value : 0) || 0;
      const bonus = parseFloat(bonusInput ? bonusInput.value : 0) || 0;
      const sum = hra + travel + cca + performance + otherAllow + bonus;
      totalAllowancesInput.value = sum > 0 ? sum : 0;
    }
    updateCompensationSummary();
  }

  function recalcDeductions() {
    if (totalDeductionsInput) {
      const pf = parseFloat(pfInput ? pfInput.value : 0) || 0;
      const esi = parseFloat(esiInput ? esiInput.value : 0) || 0;
      const advance = parseFloat(advanceInput ? advanceInput.value : 0) || 0;
      const otherDed = parseFloat(otherDeductionsInput ? otherDeductionsInput.value : 0) || 0;
      const tdsRate = parseFloat(tdsInput ? tdsInput.value : 0) || 0;
      const base = parseFloat(salaryInput ? salaryInput.value : 0) || 0;
      const tdsVal = Math.round(base * (tdsRate / 100));
      const sum = pf + esi + advance + otherDed + tdsVal;
      totalDeductionsInput.value = sum > 0 ? sum : 0;
    }
    updateCompensationSummary();
  }

  if (totalAllowancesInput) {
    totalAllowancesInput.addEventListener('input', () => {
      updateCompensationSummary();
    });
  }
  if (totalDeductionsInput) {
    totalDeductionsInput.addEventListener('input', () => {
      updateCompensationSummary();
    });
  }

  [salaryInput, bonusInput, hraInput, travelInput, ccaInput, performanceInput, otherAllowancesInput].forEach(inp => {
    if (inp) inp.addEventListener('input', recalcAllowances);
  });

  [salaryInput, pfInput, esiInput, advanceInput, otherDeductionsInput, tdsInput].forEach(inp => {
    if (inp) inp.addEventListener('input', recalcDeductions);
  });

  // Cancel buttons
  const handleCancel = () => {
    window.location.hash = '#admin-users';
  };
  const btnCancelTop = document.getElementById('btn-reg-cancel-top');
  const btnCancelBottom = document.getElementById('btn-reg-cancel-bottom');
  if (btnCancelTop) btnCancelTop.addEventListener('click', handleCancel);
  if (btnCancelBottom) btnCancelBottom.addEventListener('click', handleCancel);

  // Form Submission
  const form = document.getElementById('full-employee-registration-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('reg-name') ? document.getElementById('reg-name').value.trim() : '';
      const employeeId = document.getElementById('reg-empid') ? document.getElementById('reg-empid').value.trim() : '';
      const email = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';
      const phone = document.getElementById('reg-phone') ? document.getElementById('reg-phone').value.trim() : '';
      const dob = document.getElementById('reg-dob') ? document.getElementById('reg-dob').value : '';
      const gender = document.getElementById('reg-gender') ? document.getElementById('reg-gender').value : 'Male';
      const bloodGroup = document.getElementById('reg-blood-group') ? document.getElementById('reg-blood-group').value : '';
      const branch = document.getElementById('reg-branch') ? document.getElementById('reg-branch').value.trim() : '';
      const pincode = document.getElementById('reg-pincode') ? document.getElementById('reg-pincode').value.trim() : '';
      const city = document.getElementById('reg-city') ? document.getElementById('reg-city').value.trim() : '';
      const state = document.getElementById('reg-state') ? document.getElementById('reg-state').value.trim() : '';
      const biometricUserId = document.getElementById('reg-biometric-id') ? document.getElementById('reg-biometric-id').value.trim() : '';
      const password = document.getElementById('reg-pass') ? document.getElementById('reg-pass').value.trim() : '';
      const department = document.getElementById('reg-dept') ? document.getElementById('reg-dept').value.trim() : '';
      const designation = document.getElementById('reg-desg') ? document.getElementById('reg-desg').value.trim() : '';
      const dateOfJoining = document.getElementById('reg-doj') ? document.getElementById('reg-doj').value : '';
      const emergencyContact = document.getElementById('reg-emergency') ? document.getElementById('reg-emergency').value.trim() : '';
      const role = document.getElementById('reg-role') ? document.getElementById('reg-role').value : 'employee';
      const managerId = document.getElementById('reg-manager') ? document.getElementById('reg-manager').value : '';
      const assignedById = document.getElementById('reg-assigned-by') ? document.getElementById('reg-assigned-by').value : (currentUser ? currentUser.id : '');

      // Payroll values
      const baseSalaryVal = document.getElementById('reg-salary') ? document.getElementById('reg-salary').value.trim() : '';
      const baseSalary = baseSalaryVal === '' ? null : Number(baseSalaryVal);
      const bonusVal = document.getElementById('reg-bonus') ? document.getElementById('reg-bonus').value.trim() : '';
      const bonus = bonusVal === '' ? null : Number(bonusVal);

      const totalAllowancesVal = document.getElementById('reg-total-allowances') ? document.getElementById('reg-total-allowances').value.trim() : '';
      const totalAllowances = totalAllowancesVal === '' ? null : Number(totalAllowancesVal);
      const hraVal = document.getElementById('reg-hra') ? document.getElementById('reg-hra').value.trim() : '';
      const allowanceHRA = hraVal === '' ? null : Number(hraVal);
      const travelVal = document.getElementById('reg-travel') ? document.getElementById('reg-travel').value.trim() : '';
      const allowanceTravel = travelVal === '' ? null : Number(travelVal);
      const ccaVal = document.getElementById('reg-cca') ? document.getElementById('reg-cca').value.trim() : '';
      const allowanceCCA = ccaVal === '' ? null : Number(ccaVal);
      const perfVal = document.getElementById('reg-performance') ? document.getElementById('reg-performance').value.trim() : '';
      const allowancePerformance = perfVal === '' ? null : Number(perfVal);
      const otherAllowVal = document.getElementById('reg-other-allowances') ? document.getElementById('reg-other-allowances').value.trim() : '';
      const allowanceOther = otherAllowVal === '' ? null : Number(otherAllowVal);

      const totalDeductionsVal = document.getElementById('reg-total-deductions') ? document.getElementById('reg-total-deductions').value.trim() : '';
      const totalDeductions = totalDeductionsVal === '' ? null : Number(totalDeductionsVal);
      const pfVal = document.getElementById('reg-pf') ? document.getElementById('reg-pf').value.trim() : '';
      const deductionPF = pfVal === '' ? null : Number(pfVal);
      const esiVal = document.getElementById('reg-esi') ? document.getElementById('reg-esi').value.trim() : '';
      const deductionESI = esiVal === '' ? null : Number(esiVal);
      const advanceVal = document.getElementById('reg-advance') ? document.getElementById('reg-advance').value.trim() : '';
      const deductionAdvance = advanceVal === '' ? null : Number(advanceVal);
      const otherDedVal = document.getElementById('reg-other-deductions') ? document.getElementById('reg-other-deductions').value.trim() : '';
      const deductionOther = otherDedVal === '' ? null : Number(otherDedVal);
      const deductionPT = 0;
      const tdsVal = document.getElementById('reg-tds') ? document.getElementById('reg-tds').value.trim() : '';
      const deductionTDS = tdsVal === '' ? null : Number(tdsVal);

      const uanNo = document.getElementById('reg-uan') ? document.getElementById('reg-uan').value.trim() : '';
      const pfNo = document.getElementById('reg-pf-no') ? document.getElementById('reg-pf-no').value.trim() : '';
      const esiNo = document.getElementById('reg-esi-no') ? document.getElementById('reg-esi-no').value.trim() : '';
      const bankName = document.getElementById('reg-bank-name') ? document.getElementById('reg-bank-name').value.trim() : '';
      const accountNumber = document.getElementById('reg-account-number') ? document.getElementById('reg-account-number').value.trim() : '';
      const ifscCode = document.getElementById('reg-ifsc') ? document.getElementById('reg-ifsc').value.trim().toUpperCase() : '';
      const bankBranchName = document.getElementById('reg-bank-branch') ? document.getElementById('reg-bank-branch').value.trim() : '';

      // Shifts & Locations
      const selectedShiftCheckboxes = Array.from(main.querySelectorAll('input[name="reg_shift_select"]:checked'));
      const scheduleIds = selectedShiftCheckboxes.map(cb => cb.value);
      const scheduleId = scheduleIds.length > 0 ? scheduleIds[0] : null;

      const shiftLocations = {};
      selectedShiftCheckboxes.forEach(cb => {
        const sid = cb.value;
        const locSelect = document.getElementById(`reg-shift-loc-${sid}`);
        shiftLocations[sid] = locSelect ? locSelect.value.trim() : '';
      });
      const preferredLocation = (scheduleId && shiftLocations[scheduleId]) ? shiftLocations[scheduleId] : (Object.values(shiftLocations).find(Boolean) || '');

      // Validation
      if (password) {
        const rules = Auth.validatePassword ? Auth.validatePassword(password) : { valid: true };
        if (!rules.valid) {
          alert('Password must have minimum 6 chars, 1 uppercase, and 1 special symbol.');
          return;
        }
      }

      if (window.ValidationUtils && typeof window.ValidationUtils.validateProfile === 'function') {
        const v = window.ValidationUtils.validateProfile({ name, employeeId, email, phone, dob, dateOfJoining });
        if (!v.valid) {
          alert(v.message);
          return;
        }
      } else {
        if (!name || !employeeId || !email || !phone) {
          alert('Please fill out all required fields marked with *.');
          return;
        }
      }

      // Check duplicate ID / Username
      const allUsers = DB.getUsers();
      const enteredId = employeeId.trim().toUpperCase();
      const duplicateUser = allUsers.find(u => u && u.employeeId && String(u.employeeId).trim().toUpperCase() === enteredId);
      if (duplicateUser) {
        alert(`Employee ID ${employeeId} is already registered. Please choose another ID.`);
        return;
      }

      const submitBtnTop = document.getElementById('btn-reg-submit-top');
      const submitBtnBottom = document.getElementById('btn-reg-submit-bottom');
      [submitBtnTop, submitBtnBottom].forEach(btn => {
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '⏳ Saving...';
        }
      });

      // Files
      const resumeFile = document.getElementById('reg-resume') ? document.getElementById('reg-resume').files[0] : null;
      const aadharFile = document.getElementById('reg-aadhar') ? document.getElementById('reg-aadhar').files[0] : null;

      const resumeObj = resumeFile ? {
        name: resumeFile.name,
        size: (resumeFile.size / 1024).toFixed(0) + ' KB',
        date: todayStr
      } : null;

      const aadharObj = aadharFile ? {
        name: aadharFile.name,
        size: (aadharFile.size / 1024).toFixed(0) + ' KB',
        date: todayStr
      } : null;

      const rawPassword = password || 'Surya@123';
      const finalPassword = Utils.hashPassword ? Utils.hashPassword(rawPassword) : rawPassword;
      const finalUsername = name.toLowerCase().replace(/\s+/g, '') || employeeId.toLowerCase();

      const newUserPayload = {
        name,
        employeeId: employeeId || suggestedEmpId,
        biometricUserId,
        biometricId: biometricUserId,
        email,
        phone,
        dob,
        username: finalUsername,
        password: finalPassword,
        role,
        baseSalary,
        scheduleId,
        scheduleIds,
        shiftLocations,
        preferredLocation,
        gender,
        bloodGroup,
        branch,
        pincode,
        city,
        state,
        department,
        designation,
        dateOfJoining,
        emergencyContact,
        managerId,
        assignedById,
        photo: editorPhotoDataUrl || null,
        resume: resumeObj,
        aadhar: aadharObj,
        bonus,
        totalAllowances,
        allowanceHRA,
        allowanceTravel,
        allowanceCCA,
        allowancePerformance,
        allowanceOther,
        totalDeduction: totalDeductions,
        totalDeductions,
        deductionPF,
        deductionESI,
        deductionAdvance,
        deductionOther,
        deductionPT: 0,
        deductionTDS,
        uanNo,
        uanNumber: uanNo,
        pfNo,
        pfNumber: pfNo,
        esiNo,
        esiNumber: esiNo,
        bankName,
        accountNumber,
        ifscCode,
        bankBranchName,
        profileVerificationStatus: 'Approved'
      };

      const createdUser = DB.addUser(newUserPayload);
      if (createdUser && DB.notifyEmployeeProfileChange) {
        DB.notifyEmployeeProfileChange(createdUser.id, 'created', `Welcome ${name}! Your employee profile was registered by ${currentUser.name}.`, currentUser);
      }

      if (window.showAccountCreationSuccessModal && createdUser) {
        window.showAccountCreationSuccessModal(createdUser, rawPassword);
      } else if (typeof showToastNotification === 'function') {
        showToastNotification(`✅ Employee ${name} registered successfully with payroll!`, 'success');
      } else {
        alert(`Employee ${name} registered successfully!`);
      }

      // Background non-blocking sync
      (async () => {
        try {
          let sessionToken = '';
          try {
            const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
            if (sess) sessionToken = JSON.parse(sess).token || '';
          } catch (e) {}

          const syncData = { ...DB.data };
          if (Array.isArray(syncData.attendanceLogs) && syncData.attendanceLogs.length > 100) {
            syncData.attendanceLogs = syncData.attendanceLogs.slice(-100);
          }

          await fetch((window.apiBaseUrl || '') + '/api/mutate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
            },
            body: JSON.stringify({ action: 'sync', data: syncData })
          });
        } catch (err) {
          console.warn('Network error synchronizing mutation with backend database:', err);
        }
      })();

      // Navigate to Employee Directory
      window.location.hash = '#admin-users';
    });
  }
}
