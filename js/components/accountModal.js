// js/components/accountModal.js - Create Account & Success Modals
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils } from '../utils/helpers.js';
import { closeModal } from './modals.js';
import { showToastNotification } from './toast.js';

export function showAccountCreationSuccessModal(newUser, plainTextPassword) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(12px);
    display: flex; justify-content: center; align-items: center; z-index: 999999;
    animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;
  
  const roleName = newUser.role === 'hr' ? 'HR Coordinator' : (newUser.role === 'manager' ? 'Operations Manager' : 'Employee');

  const card = document.createElement('div');
  card.className = 'modal-content card-panel';
  card.style.cssText = `
    max-width: 460px; width: 90%; padding: 32px;
    background: #faf7f2 !important;
    border: 1px solid rgba(16, 185, 129, 0.25) !important;
    border-radius: 24px; box-shadow: 0 16px 40px rgba(16, 185, 129, 0.1);
    text-align: center;
  `;

  card.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: #10b981; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #1a0504; letter-spacing: -0.01em;">Account Created Successfully</h3>
      <p style="font-size: 12px; color: #64748b; margin: 6px 0 0;">The portal account has been saved to the database.</p>
    </div>
    
    <div style="background: #ffffff; border: 1px solid rgba(137, 32, 27, 0.08); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; text-align: left;">
      <div style="display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px solid rgba(0,0,0,0.03); padding-bottom: 8px;">
        <span style="color: #64748b; font-weight: 600;">Employee ID:</span>
        <strong style="color: #1e293b; font-family: monospace;">${newUser.employeeId || (newUser.username ? newUser.username.toUpperCase() : '')}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px solid rgba(0,0,0,0.03); padding-bottom: 8px;">
        <span style="color: #64748b; font-weight: 600;">User ID:</span>
        <strong style="color: #1e293b; font-family: monospace;">${newUser.id || ''}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px solid rgba(0,0,0,0.03); padding-bottom: 8px;">
        <span style="color: #64748b; font-weight: 600;">Login Email:</span>
        <strong style="color: #1e293b;">${newUser.email || '—'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px solid rgba(0,0,0,0.03); padding-bottom: 8px;">
        <span style="color: #64748b; font-weight: 600;">Generated Password:</span>
        <strong style="color: #dc2626; font-family: monospace; font-size: 13.5px; letter-spacing: 0.5px; background: rgba(220,38,38,0.05); padding: 2px 6px; border-radius: 4px;">${plainTextPassword}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px solid rgba(0,0,0,0.03); padding-bottom: 8px;">
        <span style="color: #64748b; font-weight: 600;">Role Name:</span>
        <strong style="color: #1e293b;">${roleName}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
        <span style="color: #64748b; font-weight: 600;">Role ID:</span>
        <strong style="color: #1e293b; font-family: monospace;">${newUser.role}</strong>
      </div>
    </div>

    <div style="display: flex; justify-content: center;">
      <button class="btn btn-secondary" id="btn-success-popup-close" style="min-width: 140px; padding: 10px 24px; font-weight: 700; border-radius: 12px; cursor: pointer; background: linear-gradient(135deg, #89201B 0%, #591411 100%); color: #fff; border: none; box-shadow: 0 4px 12px rgba(137,32,27,0.2);">Close</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  
  card.querySelector('#btn-success-popup-close').addEventListener('click', () => {
    closeModal(overlay);
  });
}
if (typeof window !== 'undefined') {
  window.showAccountCreationSuccessModal = showAccountCreationSuccessModal;
}

export function showAccountModal(editUser = null) {
  const isEdit = !!editUser;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100vw; height:100vh;
    background: rgba(10, 15, 29, 0.85); backdrop-filter: blur(12px);
    display:flex; justify-content:center; align-items:center; z-index:10000;
    animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;

  const initialRole = isEdit ? editUser.role : 'hr';
  const initialIdLabel = (initialRole === 'hr') ? 'HR ID *' : (initialRole === 'manager' || initialRole === 'finance_manager') ? 'Manager ID *' : 'Employee ID *';
  const initialPlaceholder = (initialRole === 'hr') ? 'e.g. HR100' : (initialRole === 'manager' || initialRole === 'finance_manager') ? 'e.g. MGR100' : 'e.g. EMP100';

  const modal = document.createElement('div');
  modal.className = 'modal-content card-panel';
  modal.style.cssText = `
    max-width: 520px; width: 92%; padding: 32px;
    background: #faf7f2 !important;
    border: 1px solid rgba(137, 32, 27, 0.15) !important;
    border-radius: 24px; box-shadow: 0 16px 40px rgba(137,32,27,0.1);
  `;

  modal.innerHTML = `
    <!-- Modal Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:1px solid rgba(137,32,27,0.08); padding-bottom:16px">
      <div style="display:flex; align-items:center; gap:12px">
        <div style="width:38px; height:38px; border-radius:10px; background:rgba(137,32,27,0.08); border:1px solid rgba(137,32,27,0.15); display:flex; align-items:center; justify-content:center; font-size:18px">
          ${isEdit ? '✏️' : '👤'}
        </div>
        <div>
          <h3 style="font-size:18px; font-weight:800; color:#1a0504; margin:0; letter-spacing:-0.01em">
            ${isEdit ? 'Edit Account' : 'Create Account'}
          </h3>
          <div style="font-size:11.5px; color:#64748b; margin-top:2px">Configure credentials and role permissions</div>
        </div>
      </div>
      <button class="close-modal-btn" id="btn-close-acct-modal" style="background:rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.1); width:32px; height:32px; border-radius:50%; font-size:18px; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s ease">&times;</button>
    </div>

    <!-- Role Selection Tabs -->
    <div id="create-acct-role-tabs" style="display:grid; grid-template-columns:${isEdit ? '1fr 1fr 1fr' : '1fr 1fr'}; gap:12px; margin-bottom:20px">
      <button type="button" class="acct-role-tab" data-role="hr" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:16px; cursor:pointer; transition:all 0.2s">
        <div class="role-tab-icon" style="width:32px; height:32px; border-radius:50%; background:rgba(137, 32, 27, 0.1); color:#89201B; display:flex; align-items:center; justify-content:center; font-size:14px">👤</div>
        <span style="font-size:11.5px; font-weight:700; color:#1e293b">HR / Admin</span>
      </button>
      <button type="button" class="acct-role-tab" data-role="manager" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:16px; cursor:pointer; transition:all 0.2s">
        <div class="role-tab-icon" style="width:32px; height:32px; border-radius:50%; background:rgba(137, 32, 27, 0.1); color:#89201B; display:flex; align-items:center; justify-content:center; font-size:14px">ℹ️</div>
        <span style="font-size:11.5px; font-weight:700; color:#1e293b">Manager</span>
      </button>
      ${isEdit ? `
      <button type="button" class="acct-role-tab" data-role="employee" style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; background:#fff; border:1px solid #cbd5e1; border-radius:16px; cursor:pointer; transition:all 0.2s">
        <div class="role-tab-icon" style="width:32px; height:32px; border-radius:50%; background:rgba(137, 32, 27, 0.1); color:#89201B; display:flex; align-items:center; justify-content:center; font-size:14px">📋</div>
        <span style="font-size:11.5px; font-weight:700; color:#1e293b">Employee</span>
      </button>
      ` : ''}
    </div>

    <!-- Upload Photo Section -->
    <div style="display:flex; align-items:center; gap:12px; justify-content:center; margin-bottom:20px">
      <div id="acct-photo-preview" style="width:48px; height:48px; border-radius:50%; background:#f1f5f9; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; font-size:20px; color:#64748b; overflow:hidden; cursor:pointer">
        ${isEdit && editUser.photo ? `<img src="${editUser.photo}" style="width:100%; height:100%; object-fit:cover;">` : '👤'}
      </div>
      <input type="file" id="acct-input-photo-file" accept="image/*" style="display:none">
      <button type="button" id="btn-acct-upload-photo" style="background:#fff; border:1px solid #cbd5e1; padding:6px 14px; border-radius:20px; font-size:11px; font-weight:700; color:#1e293b; cursor:pointer">Upload Photo</button>
    </div>

    <form id="acct-form" style="display:flex; flex-direction:column; gap:14px">
      <!-- Hidden original role select for backing state compatibility -->
      <select id="acct-input-role" style="display:none">
        <option value="hr">HR Administrator</option>
        <option value="manager">Operations Manager</option>
        <option value="employee">Employee</option>
      </select>

      <div>
        <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">FULL NAME *</label>
        <input type="text" id="acct-input-name" class="form-control" placeholder="e.g. Ananya Sharma" value="${isEdit ? Utils.escape(editUser.name) : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <label id="lbl-acct-id-type" style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">${initialIdLabel}</label>
          <input type="text" id="acct-input-username" class="form-control" placeholder="${initialPlaceholder}" value="${isEdit ? Utils.escape(editUser.username || editUser.employeeId || '') : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
        </div>
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">EMAIL ADDRESS *</label>
          <input type="email" id="acct-input-email" class="form-control" placeholder="e.g. alex@gmail.com" value="${isEdit ? Utils.escape(editUser.email || '') : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box; transition:border-color 0.2s ease">
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">PASSWORD *</label>
          <div class="password-wrapper" style="position:relative">
            <input type="password" id="acct-input-password" class="form-control" placeholder="••••••••" ${isEdit ? '' : 'required'} style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 44px 10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
            <button type="button" id="btn-toggle-pwd-vis" class="password-toggle-btn" title="Toggle password visibility" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#64748b; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0; transition:color 0.2s ease">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
          <div style="font-size:10px; color:#64748b; margin-top:4px">Must contain uppercase & special character.</div>
        </div>
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">CONFIRM PASSWORD *</label>
          <div class="password-wrapper" style="position:relative">
            <input type="password" id="acct-input-confirm-password" class="form-control" placeholder="••••••••" ${isEdit ? '' : 'required'} style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 44px 10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
            <button type="button" id="btn-toggle-confirm-pwd-vis" class="password-toggle-btn" title="Toggle password visibility" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#64748b; cursor:pointer; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0; transition:color 0.2s ease">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
            <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; letter-spacing:0.02em; margin:0">PORTAL ACCESS *</label>
          </div>
          <select id="acct-input-role-select" class="form-control" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box; cursor:pointer">
            <option value="hr" ${initialRole === 'hr' ? 'selected' : ''}>HR Administrator</option>
            <option value="manager" ${initialRole === 'manager' || initialRole === 'finance_manager' ? 'selected' : ''}>Operations Manager</option>
            ${isEdit ? `<option value="employee" ${initialRole === 'employee' ? 'selected' : ''}>Employee</option>` : ''}
          </select>
        </div>
        <div>
          <label style="display:block; font-size:11.5px; font-weight:700; color:#1a0504; margin-bottom:6px; letter-spacing:0.02em">MOBILE NUMBER *</label>
          <input type="tel" id="acct-input-mobile" class="form-control" placeholder="e.g. 9876543210" value="${isEdit ? Utils.escape(editUser.phone || editUser.mobile || '') : ''}" required style="background:#fff; border:1px solid #cbd5e1; color:#1e293b; font-size:13px; padding:10px 12px; border-radius:10px; width:100%; box-sizing:border-box">
        </div>
      </div>

      <div id="acct-form-error" style="display:none; padding:10px 14px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; color:#b91c1c; font-size:11.5px; font-weight:600; line-height:1.45"></div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:6px; border-top:1px solid rgba(137,32,27,0.08); padding-top:20px">
        <button type="button" class="btn" id="btn-cancel-acct-modal" style="padding:10px 22px; font-size:12.5px; font-weight:700; border-radius:12px; background:#fff; border:1px solid #cbd5e1; color:#1e293b; cursor:pointer; transition:all 0.2s ease">Cancel</button>
        <button type="submit" class="btn" style="padding:10px 24px; font-size:12.5px; font-weight:700; border-radius:12px; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border:none; color:#ffffff; cursor:pointer; box-shadow:0 4px 14px rgba(220,38,38,0.3); transition:all 0.2s ease">${isEdit ? 'Save Changes' : 'Create Account'}</button>
      </div>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const pwdInput = modal.querySelector('#acct-input-password');
  const confirmPwdInput = modal.querySelector('#acct-input-confirm-password');
  const togglePwdBtn = modal.querySelector('#btn-toggle-pwd-vis');
  const roleSelect = modal.querySelector('#acct-input-role');
  const roleSelectDropdown = modal.querySelector('#acct-input-role-select');
  const tabs = modal.querySelectorAll('.acct-role-tab');
  const idLabelEl = modal.querySelector('#lbl-acct-id-type');
  const usernameInput = modal.querySelector('#acct-input-username');
  const emailInput = modal.querySelector('#acct-input-email');

  let uploadedPhotoDataUrl = isEdit && editUser.photo ? editUser.photo : '';
  const photoPreview = modal.querySelector('#acct-photo-preview');
  const photoFileInput = modal.querySelector('#acct-input-photo-file');
  const uploadPhotoBtn = modal.querySelector('#btn-acct-upload-photo');

  if (photoFileInput && (photoPreview || uploadPhotoBtn)) {
    const triggerFileSelect = () => photoFileInput.click();
    if (photoPreview) photoPreview.addEventListener('click', triggerFileSelect);
    if (uploadPhotoBtn) uploadPhotoBtn.addEventListener('click', triggerFileSelect);

    photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedPhotoDataUrl = event.target.result;
          if (photoPreview) {
            photoPreview.innerHTML = `<img src="${uploadedPhotoDataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const emailStrictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const val = emailInput.value.trim();
      if (!val) {
        emailInput.style.borderColor = '#cbd5e1';
      } else if (emailStrictRegex.test(val)) {
        emailInput.style.borderColor = '#10b981';
      } else {
        emailInput.style.borderColor = '#ef4444';
      }
    });
  }

  const updateRoleLabels = () => {
    const val = roleSelect.value;
    let currentVal = usernameInput ? usernameInput.value.trim() : '';
    const numMatch = currentVal.match(/\d+/);
    const numPart = numMatch ? numMatch[0] : '100';

    if (val === 'hr') {
      if (idLabelEl) idLabelEl.textContent = 'HR ID *';
      if (usernameInput) {
        if (!isEdit || !usernameInput.value) usernameInput.value = `HR${numPart}`;
        usernameInput.placeholder = 'e.g. HR100';
      }
    } else if (val === 'manager' || val === 'finance_manager') {
      if (idLabelEl) idLabelEl.textContent = 'Manager ID *';
      if (usernameInput) {
        if (!isEdit || !usernameInput.value) usernameInput.value = `MGR${numPart}`;
        usernameInput.placeholder = 'e.g. MGR100';
      }
    } else {
      if (idLabelEl) idLabelEl.textContent = 'Employee ID *';
      if (usernameInput) {
        if (!isEdit || !usernameInput.value) usernameInput.value = `EMP${numPart}`;
        usernameInput.placeholder = 'e.g. EMP100';
      }
    }
  };

  const setTabActive = (role) => {
    tabs.forEach(tab => {
      const tabRole = tab.dataset.role;
      if (tabRole === role) {
        tab.style.borderColor = '#89201B';
        tab.style.borderWidth = '2px';
        tab.style.boxShadow = '0 4px 12px rgba(137,32,27,0.12)';
        tab.style.opacity = '1';
      } else {
        tab.style.borderColor = '#cbd5e1';
        tab.style.borderWidth = '1px';
        tab.style.boxShadow = 'none';
        tab.style.opacity = '0.6';
      }
    });
    roleSelect.value = role;
    if (roleSelectDropdown) {
      roleSelectDropdown.value = role;
    }
    updateRoleLabels();
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setTabActive(tab.dataset.role);
    });
  });

  if (roleSelectDropdown) {
    roleSelectDropdown.addEventListener('change', () => {
      let role = roleSelectDropdown.value;
      if (role !== 'hr' && role !== 'manager' && role !== 'employee') {
        role = 'employee';
      }
      setTabActive(role);
    });
  }

  // Initialize role
  setTabActive(initialRole);

  const svgEyeOpen = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const svgEyeClosed = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  if (togglePwdBtn && pwdInput) {
    togglePwdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        togglePwdBtn.innerHTML = svgEyeOpen;
        togglePwdBtn.style.color = '#dc2626';
      } else {
        pwdInput.type = 'password';
        togglePwdBtn.innerHTML = svgEyeClosed;
        togglePwdBtn.style.color = '#64748b';
      }
    });
  }

  const toggleConfirmPwdBtn = modal.querySelector('#btn-toggle-confirm-pwd-vis');
  if (toggleConfirmPwdBtn && confirmPwdInput) {
    toggleConfirmPwdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirmPwdInput.type === 'password') {
        confirmPwdInput.type = 'text';
        toggleConfirmPwdBtn.innerHTML = svgEyeOpen;
        toggleConfirmPwdBtn.style.color = '#dc2626';
      } else {
        confirmPwdInput.type = 'password';
        toggleConfirmPwdBtn.innerHTML = svgEyeClosed;
        toggleConfirmPwdBtn.style.color = '#64748b';
      }
    });
  }

  const closeModalHandler = () => {
    closeModal(overlay);
  };

  modal.querySelector('#btn-close-acct-modal').addEventListener('click', closeModalHandler);
  modal.querySelector('#btn-cancel-acct-modal').addEventListener('click', closeModalHandler);

  modal.querySelector('#acct-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = modal.querySelector('#acct-form-error');
    errorEl.style.display = 'none';

    const name = modal.querySelector('#acct-input-name').value.trim();
    const username = modal.querySelector('#acct-input-username').value.trim();
    const email = modal.querySelector('#acct-input-email').value.trim();
    const mobile = modal.querySelector('#acct-input-mobile').value.trim();
    const password = pwdInput.value;
    const confirmPassword = confirmPwdInput ? confirmPwdInput.value : '';
    const role = modal.querySelector('#acct-input-role').value;
    const selectedOption = roleSelectDropdown ? roleSelectDropdown.options[roleSelectDropdown.selectedIndex] : null;
    const customRoleName = selectedOption ? (selectedOption.dataset.customName || selectedOption.text) : role;

    if (!name || !username || !email || !mobile || (!isEdit && !password)) {
      errorEl.textContent = '⚠️ Please fill out all required fields.';
      errorEl.style.display = 'block';
      return;
    }

    if (!isEdit && password !== confirmPassword) {
      errorEl.textContent = '⚠️ Passwords do not match. Please verify both password fields.';
      errorEl.style.display = 'block';
      return;
    }

    if (!emailStrictRegex.test(email)) {
      errorEl.textContent = '⚠️ Invalid Email Format! Please enter a valid email address (e.g. alex@gmail.com or name@surya.group).';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[0-9+\s\-()]{7,15}$/.test(mobile)) {
      errorEl.textContent = '⚠️ Please enter a valid Mobile Number (7-15 digits).';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(name)) {
      errorEl.textContent = '⚠️ Full Name can only contain letters (A-Z) and spaces.';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      errorEl.textContent = '⚠️ Username can only contain letters, numbers, underscores, dots, or hyphens.';
      errorEl.style.display = 'block';
      return;
    }

    const existingUser = DB.getUserByUsernameOrId(username);
    if (existingUser && (!isEdit || existingUser.id !== editUser.id)) {
      errorEl.textContent = `⚠️ The Employee ID / HR ID '${username.toUpperCase()}' is already taken. Please choose another one.`;
      errorEl.style.display = 'block';
      return;
    }

    const existingUserByEmail = DB.getUserByEmail(email);
    if (existingUserByEmail && (!isEdit || existingUserByEmail.id !== editUser.id)) {
      errorEl.textContent = `⚠️ Email '${email}' is already registered to another account.`;
      errorEl.style.display = 'block';
      return;
    }

    if (password) {
      const pwdVal = Auth.validatePassword(password);
      if (!pwdVal.valid) {
        errorEl.textContent = '⚠️ Password must be at least 6 characters long and include an uppercase letter and a special character (!@#$%^&*).';
        errorEl.style.display = 'block';
        return;
      }
    }

    let department = '';
    let designation = '';
    if (role === 'hr') {
      department = 'Human Resources';
      designation = 'HR Coordinator';
    } else if (role === 'manager') {
      department = 'Operations';
      designation = 'Operations Manager';
    } else {
      department = isEdit ? (editUser.department || 'Staff') : 'Staff';
      designation = isEdit ? (editUser.designation || 'Employee') : 'Employee';
    }

    if (customRoleName && customRoleName !== 'hr' && customRoleName !== 'manager' && customRoleName !== 'employee') {
      department = customRoleName;
      designation = customRoleName;
    }

    const currentUser = Auth.getCurrentUser() || {};

    const payload = {
      name,
      username,
      employeeId: isEdit ? (editUser.employeeId || username.toUpperCase()) : username.toUpperCase(),
      email,
      phone: mobile,
      mobile: mobile,
      role,
      status: isEdit ? (editUser.status || 'Active') : 'Active',
      department,
      designation,
      photo: uploadedPhotoDataUrl,
      managerId: isEdit ? (editUser.managerId || '') : (currentUser.role === 'manager' ? currentUser.id : ''),
      assignedById: isEdit ? (editUser.assignedById || '') : (currentUser.role === 'hr' || currentUser.role === 'manager' ? currentUser.id : '')
    };

    if (password) {
      payload.password = Utils.hashPassword(password);
    }

    if (isEdit) {
      DB.updateUser(editUser.id, payload);
    } else {
      const createdUser = DB.addUser(payload);
      if (createdUser && createdUser.id) {
        payload.id = createdUser.id;
      }
    }

    closeModal(overlay);

    try {
      const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
      const token = sess ? JSON.parse(sess).token : '';
      await fetch((window.apiBaseUrl || '') + '/api/mutate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ action: 'sync', data: DB.data })
      });
    } catch (err) {
      console.warn('Network error synchronizing mutation with backend database:', err);
    }

    if (typeof renderAdminUsers === 'function') renderAdminUsers();
    if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
    if (typeof renderAccountManagementView === 'function') renderAccountManagementView();

    if (isEdit) {
      if (typeof CustomDialog !== 'undefined' && CustomDialog.alert) {
        await CustomDialog.alert(`Account for ${name} (${username}) updated successfully.`);
      } else {
        alert(`Account for ${name} (${username}) updated successfully.`);
      }
    } else {
      if (typeof showAccountCreationSuccessModal === 'function') {
        showAccountCreationSuccessModal(payload, password);
      } else if (window.showAccountCreationSuccessModal) {
        window.showAccountCreationSuccessModal(payload, password);
      } else {
        if (typeof CustomDialog !== 'undefined' && CustomDialog.alert) {
          await CustomDialog.alert(`Account for ${name} (${username}) created successfully.`);
        } else {
          alert(`Account for ${name} (${username}) created successfully.`);
        }
      }
    }
  });
}
if (typeof window !== 'undefined') {
  window.showAccountModal = showAccountModal;
}
