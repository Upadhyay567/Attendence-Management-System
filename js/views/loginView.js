// js/views/loginView.js - Role Selection & Authentication View
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal } from '../components/modals.js';

let AUTH_REQUIRE_ID_MANDATORY = true;

export function renderLoginView() {
  if (activeTimer) clearInterval(activeTimer);

  // Clear any geofencing state so next login starts clean
  sessionStorage.removeItem('hs_pending_auto_checkin_time');
  sessionStorage.removeItem('hs_mock_location');
  sessionStorage.removeItem('hs_current_resolved_coords');
  sessionStorage.removeItem('hs_current_resolved_distance');
  sessionStorage.removeItem('hs_current_resolved_in_range');
  window.lastGpsInRangeState = undefined;

  const root = document.getElementById('app-root');

  const allUsers = DB.getUsers();
  const hrUsers = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'hr');
  const managerUsers = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'manager' || DB.getUserBaseRole(u.role) === 'finance_manager');
  const employeeUsers = allUsers.filter(u => DB.getUserBaseRole(u.role) === 'employee');

  const getInitials = (name) => (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  const getRoleItemsHTML = (users, defaultSubtitle) => {
    return users.map(u => {
      const nameVal = u.name || u.username || '';
      return `
        <button class="staff-item" data-username="${Utils.escape(u.username)}">
          <div class="staff-item-avatar">${Utils.escape(getInitials(nameVal))}</div>
          <div class="staff-item-info">
            <div class="staff-item-name">${Utils.escape(nameVal)}</div>
            <div class="staff-item-subtitle">${Utils.escape(u.designation || defaultSubtitle)}</div>
          </div>
          <div class="staff-item-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </button>
      `;
    }).join('');
  };

  root.removeAttribute('data-shell-user-id');
  root.innerHTML = html`
    <div class="auth-wrapper">
      <div class="auth-hero-column">
        <div class="auth-hero-overlay"></div>
        <div class="auth-hero-content">
          <div class="auth-hero-brand">
            <img src="surya-logo.png?v=7" alt="Surya Logo" class="auth-hero-logo">
            <div class="auth-hero-brand-text">
              <div class="auth-hero-brand-title">HS Group Delhi</div>
              <div class="auth-hero-brand-subtitle">House of Surya</div>
            </div>
          </div>
          <div class="auth-hero-main">
            <div class="auth-hero-tagline">WORKFORCE OPERATIONS, SIMPLIFIED</div>
            <h1 class="auth-hero-title">Make every workday count.</h1>
            <p class="auth-hero-desc">
              Track attendance, manage shifts, and streamline payroll deductions from one unified, secure workspace.
            </p>
            <div class="auth-hero-features">
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">01</span>
                <div class="auth-hero-feature-details">
                  <strong>Live Geofence Check-in</strong>
                  <span>Verify and clock in/out instantly when you arrive at your worksite.</span>
                </div>
              </div>
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">02</span>
                <div class="auth-hero-feature-details">
                  <strong>Smart Shift Scheduling</strong>
                  <span>Seamless shift allocation, rotation, and worksite distribution planning.</span>
                </div>
              </div>
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">03</span>
                <div class="auth-hero-feature-details">
                  <strong>Payroll & Leave Ledger</strong>
                  <span>Automated leave balance checks and precise payroll deduction tracking.</span>
                </div>
              </div>
            </div>
          </div>
          <div class="auth-hero-footer">
            Secure attendance & workforce management for growing enterprise teams.
          </div>
        </div>
      </div>
      <div class="auth-form-column">
        <div class="auth-card" id="auth-box" style="max-width: 480px; width: 100%; padding: 32px;">
          <!-- Content dynamically rendered by renderRolesList() -->
        </div>
      </div>
    </div>
  `;

  const renderRolesList = () => {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;

    authBox.innerHTML = html`
      <div id="role-selector-section" style="animation: fadeIn 0.3s ease;">
        <div class="auth-header" style="position:relative; margin-bottom: 24px; text-align: center;">
          <div class="auth-logo" style="margin-bottom: 12px; justify-content: center; display: flex;">
            <img src="surya-logo.png?v=7" alt="Surya Logo" style="height: 65px; object-fit: contain; mix-blend-mode: multiply;">
          </div>
          <div class="auth-title" style="text-align: center; font-size: 22px; font-weight: 800; color: var(--primary); margin-bottom: 4px;">House of Surya</div>
          <div class="auth-subtitle" style="text-align: center; color: var(--text-secondary); margin-bottom: 8px; font-weight: 700; font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase;">WORKFORCE OPERATIONS PORTAL</div>
          <div class="auth-sub-desc" style="text-align: center; font-size: 13px; color: var(--text-muted);">Select your role to access your dashboard</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- HR Button -->
          <button class="role-portal-btn" data-role="hr" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 16px; pointer-events: none;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div style="pointer-events: none;">
                <div style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">HR / Admin Portal</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Manage payroll, user directories & request approvals</div>
              </div>
            </div>
            <div style="font-size: 15px; color: var(--text-muted); font-weight: bold; margin-left: 10px; pointer-events: none;">➔</div>
          </button>

          <!-- Manager Button -->
          <button class="role-portal-btn" data-role="manager" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 16px; pointer-events: none;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <div style="pointer-events: none;">
                <div style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">Manager Portal</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Review shift swaps & oversee team operations</div>
              </div>
            </div>
            <div style="font-size: 15px; color: var(--text-muted); font-weight: bold; margin-left: 10px; pointer-events: none;">➔</div>
          </button>

          <!-- Employee Button -->
          <button class="role-portal-btn" data-role="employee" style="cursor: pointer;">
            <div style="display: flex; align-items: center; gap: 16px; pointer-events: none;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(6, 182, 212, 0.15); color: #06b6d4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; pointer-events: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                  <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-4 5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H8zm4 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm4 8H8v-.5c0-1.33 2.67-2 4-2s4 .67 4 2v.5z"/>
                </svg>
              </div>
              <div style="pointer-events: none;">
                <div style="font-size: 14.5px; font-weight: 700; color: var(--text-primary);">Employee Portal</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Clock in/out, view payslips & schedules</div>
              </div>
            </div>
            <div style="font-size: 15px; color: var(--text-muted); font-weight: bold; margin-left: 10px; pointer-events: none;">➔</div>
          </button>
        </div>

        <div class="auth-policy-footer" style="margin-top: 24px; text-align: center; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 16px;">
          By logging in, you agree to the <a href="#" id="btn-show-policy" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Company Policy & Guidelines</a>.
        </div>
      </div>
    `;

    // Bind portal button clicks
    authBox.querySelectorAll('.role-portal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const role = targetBtn.getAttribute('data-role');
        renderUsersList(role);
      });
    });

    const policyBtn = document.getElementById('btn-show-policy');
    if (policyBtn) {
      policyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showCompanyPolicyModal();
      });
    }
  };

  const renderUsersList = (role) => {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;

    let roleTitle = '';
    let usersList = [];
    let defaultSubtitle = '';

    if (role === 'hr') {
      roleTitle = 'HR / Admin';
      usersList = hrUsers;
      defaultSubtitle = 'HR / Admin';
    } else if (role === 'manager') {
      roleTitle = 'Managers';
      usersList = managerUsers;
      defaultSubtitle = 'Operations Manager';
    } else {
      roleTitle = 'Employees';
      usersList = employeeUsers;
      defaultSubtitle = 'Employee';
    }

    const itemsHTML = getRoleItemsHTML(usersList, defaultSubtitle) || `<div style="font-size:11.5px;color:var(--text-secondary);text-align:center;padding:20px">No accounts registered under this role.</div>`;

    authBox.innerHTML = html`
      <div id="role-users-section" style="animation: fadeIn 0.3s ease;">
        <div class="auth-header" style="margin-bottom: 20px; text-align: center; position: relative;">
          <button id="btn-back-to-roles" style="position: absolute; left: 0; top: 0; background: transparent; border: none; color: var(--primary); font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 6px 0;">
            ◀ Back
          </button>
          <div class="auth-logo" style="margin-bottom: 8px; justify-content: center; display: flex;">
            <img src="surya-logo.png?v=7" alt="Surya Logo" style="height: 50px; object-fit: contain; mix-blend-mode: multiply;">
          </div>
          <div class="auth-title" style="text-align: center; font-size: 18px; font-weight: 700; color: var(--primary);">${roleTitle} Portal</div>
          <div class="auth-sub-desc" style="text-align: center; font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">SELECT YOUR ACCOUNT TO CONTINUE</div>
        </div>
        
        <div class="staff-list" style="max-height: 320px; overflow-y: auto;">
          ${itemsHTML}
        </div>
      </div>
    `;

    // Bind back button
    authBox.querySelector('#btn-back-to-roles').addEventListener('click', renderRolesList);

    // Bind user selection
    authBox.querySelectorAll('.staff-item').forEach(userBtn => {
      userBtn.addEventListener('click', () => {
        const username = userBtn.getAttribute('data-username');
        const user = DB.getUserByUsername(username);
        if (user) {
          showVerificationScreen(user);
        }
      });
    });
  };

  const showVerificationScreen = (selectedUser) => {
    const authBox = document.getElementById('auth-box');
    if (!authBox) return;

    authBox.classList.remove('auth-card-wide');

    let idLabelText = 'Employee ID';
    let placeholderText = 'e.g. EMP100';

    if (selectedUser.role === 'hr') {
      idLabelText = 'HR ID';
      placeholderText = 'e.g. HR100';
    } else if (selectedUser.role === 'manager' || selectedUser.role === 'finance_manager') {
      idLabelText = 'Manager ID';
      placeholderText = 'e.g. MGR100';
    }

    const isHrOrManager = selectedUser && (selectedUser.role === 'hr' || selectedUser.role === 'manager' || selectedUser.role === 'finance_manager');

    const skipButtonHTML = (!AUTH_REQUIRE_ID_MANDATORY && !isHrOrManager)
      ? `<button class="btn btn-secondary" id="btn-verify-id-skip" style="width: 100%; font-weight: 600; background: rgba(255,255,255,0.03); border-color: var(--border); color: var(--text-primary)">Skip & Continue</button>`
      : '';

    authBox.innerHTML = html`
      <div id="auth-verification-section" style="animation: fadeIn 0.3s ease; padding: 10px;">
        <div class="auth-header" style="margin-bottom: 24px; text-align: center; position: relative;">
          <div class="auth-logo" style="margin-bottom: 12px; justify-content: center; display: flex;">
            <img src="surya-logo.png?v=7" alt="Surya Logo" style="height: 65px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251,191,36,0.25)); mix-blend-mode: multiply;">
          </div>
          <div class="auth-title" style="font-size: 20px; font-weight: 700; color: var(--primary);">Secure Portal Access</div>
          <div class="auth-subtitle" style="color: var(--text-secondary); margin-bottom: 8px;">Verify identity to initialize dashboard</div>
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label class="form-label" for="auth-id-input" style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; display: block;">${idLabelText} *</label>
          <input type="text" id="auth-id-input" class="form-input" placeholder="${placeholderText}" value="${Utils.escape(selectedUser.employeeId || selectedUser.username || '')}" style="background: rgba(255,255,255,0.02); text-transform: uppercase; font-size: 13px;" autofocus>
        </div>

        ${isHrOrManager ? `
        <div class="form-group" style="margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <label class="form-label" for="auth-pwd-input" style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 0; display: block;">Password *</label>
            <button type="button" id="btn-forgot-password-trigger" style="background:none; border:none; color:var(--primary); font-size:11.5px; font-weight:700; cursor:pointer; padding:0; text-decoration:underline">Forgot Password?</button>
          </div>
          <div style="position:relative">
            <input type="password" id="auth-pwd-input" class="form-input" placeholder="Enter account password" style="background: rgba(255,255,255,0.02); font-size: 13px; padding-right: 40px;">
            <button type="button" id="btn-toggle-auth-pwd" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--primary); cursor:pointer; font-size:14px; display:flex; align-items:center;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- Warning Box -->
        <div id="auth-verify-warning" style="display: none; padding: 10px 14px; border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius-sm); background: rgba(239,68,68,0.05); color: var(--error); font-size: 11.5px; font-weight: 600; line-height: 1.45; margin-bottom: 18px;">
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${isHrOrManager ? `
          <button class="btn" id="btn-verify-id-submit" style="width: 100%; font-weight: 700; font-size: 13px; padding: 10px 0; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; border: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4); cursor: pointer;">Log In</button>
          ` : `
          <button class="btn btn-cyan" id="btn-verify-id-submit" style="width: 100%; font-weight: 700; font-size: 13px;">Log In</button>
          ${skipButtonHTML}
          `}
          ${(!isHrOrManager && skipButtonHTML) ? '' : `
          <button class="btn btn-secondary" id="btn-verify-id-skip-dev" style="width: 100%; font-weight: 700; font-size: 13px; background: rgba(255,255,255,0.03); border: 1.5px dashed var(--primary); color: var(--primary); border-radius: 12px; cursor: pointer; padding: 10px 0;">Skip & Continue</button>
          `}

          ${isHrOrManager ? `
          <div style="margin-top: 6px; text-align: center; font-size: 12.5px; color: var(--text-secondary);">
            Don't have an account? <a href="#" id="btn-verify-id-create-acc" style="color: #89201B; font-weight: 700; text-decoration: underline; transition: color 0.2s;">Create Account</a>
          </div>
          ` : ''}

          <button class="btn btn-secondary" id="btn-verify-id-back" style="width: 100%; background: transparent; border-color: transparent; font-size: 12px; color: var(--text-muted); cursor: pointer; padding: 6px 0;">← Back to Select Account</button>
        </div>
        <div class="auth-policy-footer" style="margin-top: 20px; text-align: center; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 12px;">
          By logging in, you agree to the <a href="#" id="btn-show-policy-verify" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Company Policy</a>.
        </div>
      </div>
    `;

    const inputEl = authBox.querySelector('#auth-id-input');
    const pwdEl = authBox.querySelector('#auth-pwd-input');
    const toggleAuthPwdBtn = authBox.querySelector('#btn-toggle-auth-pwd');
    const warningEl = authBox.querySelector('#auth-verify-warning');
    const submitBtn = authBox.querySelector('#btn-verify-id-submit');
    const skipBtn = authBox.querySelector('#btn-verify-id-skip');
    const skipDevBtn = authBox.querySelector('#btn-verify-id-skip-dev');
    const backBtn = authBox.querySelector('#btn-verify-id-back');
    const createAccBtn = authBox.querySelector('#btn-verify-id-create-acc');
    const forgotPwdBtn = authBox.querySelector('#btn-forgot-password-trigger');

    if (forgotPwdBtn) {
      forgotPwdBtn.addEventListener('click', () => {
        const prefilledId = inputEl ? inputEl.value.trim() : (selectedUser ? selectedUser.employeeId : '');
        showForgotPasswordModal(prefilledId);
      });
    }

    if (toggleAuthPwdBtn && pwdEl) {
      const svgEyeOpen = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      const svgEyeClosed = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      toggleAuthPwdBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (pwdEl.type === 'password') {
          pwdEl.type = 'text';
          toggleAuthPwdBtn.innerHTML = svgEyeOpen;
        } else {
          pwdEl.type = 'password';
          toggleAuthPwdBtn.innerHTML = svgEyeClosed;
        }
      });
    }

    if (createAccBtn) {
      createAccBtn.addEventListener('click', () => {
        showAccountModal();
      });
    }

    const handleVerification = () => {
      const enteredId = inputEl.value.trim();
      const enteredPwd = pwdEl ? pwdEl.value : '';

      if (!enteredId) {
        warningEl.textContent = `⚠️ Please enter your ${idLabelText}.`;
        warningEl.style.display = 'block';
        return;
      }

      const allUsers = DB.getUsers();
      const matchedUser = allUsers.find(u => 
        (u.employeeId && u.employeeId.toUpperCase() === enteredId.toUpperCase()) ||
        (u.username && u.username.toLowerCase() === enteredId.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === enteredId.toLowerCase()) ||
        (u.id && u.id.toLowerCase() === enteredId.toLowerCase())
      );

      if (!matchedUser) {
        warningEl.textContent = `⚠️ Invalid ${idLabelText}. No matching account found.`;
        warningEl.style.display = 'block';
        return;
      }

      // Check role match
      const expectedRole = selectedUser.role;
      let isRoleValid = false;
      if (expectedRole === 'hr' && matchedUser.role === 'hr') isRoleValid = true;
      if ((expectedRole === 'manager' || expectedRole === 'finance_manager') && (matchedUser.role === 'manager' || matchedUser.role === 'finance_manager')) isRoleValid = true;
      if (expectedRole === 'employee' && matchedUser.role === 'employee') isRoleValid = true;

      if (!isRoleValid) {
        warningEl.textContent = `⚠️ Access Denied: Account '${enteredId}' is an ${matchedUser.role.toUpperCase()} account and cannot log in from the ${expectedRole.toUpperCase()} portal.`;
        warningEl.style.display = 'block';
        return;
      }

      if (matchedUser.status === 'Inactive') {
        warningEl.textContent = `⚠️ Your account is Inactive. Please contact HR.`;
        warningEl.style.display = 'block';
        return;
      }

      if (isHrOrManager) {
        if (!enteredPwd) {
          warningEl.textContent = `⚠️ Password is required to log in to this account.`;
          warningEl.style.display = 'block';
          return;
        }
        if (matchedUser.password) {
          const isValidPwd = Utils.verifyPassword(enteredPwd, matchedUser.password);
          if (!isValidPwd) {
            warningEl.textContent = `⚠️ Invalid Password. Please check your password and try again.`;
            warningEl.style.display = 'block';
            return;
          }
        }
      }

      proceedLogin(matchedUser);
    };

    submitBtn.addEventListener('click', handleVerification);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleVerification();
      }
    });
    if (pwdEl) {
      pwdEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleVerification();
        }
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        proceedLogin(selectedUser);
      });
    }

    if (skipDevBtn) {
      skipDevBtn.addEventListener('click', () => {
        proceedLogin(selectedUser);
      });
    }

    backBtn.addEventListener('click', () => {
      renderLoginView();
    });

    const policyLinkVerify = authBox.querySelector('#btn-show-policy-verify');
    if (policyLinkVerify) {
      policyLinkVerify.addEventListener('click', (e) => {
        e.preventDefault();
        showCompanyPolicyModal();
      });
    }
  };

  const proceedLogin = (user) => {
    Auth.currentUser = user;
    const sessionData = JSON.stringify({
      id: user.id,
      token: 'session_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
      loginTime: new Date().toISOString()
    });
    sessionStorage.setItem('attendance_current_session', sessionData);
    localStorage.setItem('attendance_current_session', sessionData);
    
    const baseRole = DB.getUserBaseRole(user.role);
    const targetHash = (baseRole === 'hr' || baseRole === 'manager' || baseRole === 'finance_manager') 
      ? '#admin-dashboard' 
      : '#dashboard';

    if (window.location.hash === targetHash) {
      window.dispatchEvent(new Event('hashchange'));
    } else {
      window.location.hash = targetHash;
    }
  };

  // Bootstrap login view with Role Selector list
  renderRolesList();
}