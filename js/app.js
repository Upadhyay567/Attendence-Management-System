// app.js - SPA Router & Controller
import { DB } from './db.js';
import { Auth } from './auth.js';
import { Utils } from './utils.js';

let activeTimer = null;
let currentScanner = null;
let activeAdminApprovalsTab = 'leaves';

// Multi-language Translation dictionary
const Translations = {
  en: {
    brand: "HS Group Delhi",
    subtitle: "House of Surya",
    monitor: "Live Monitoring",
    employees: "Employees & Payroll",
    shifts: "Shift Schedules",
    approvals: "Approvals Desk",
    reports: "Monthly Reports",
    status: "Check-In / Status",
    leaves: "Leave Requests",
    payslips: "My Payslips",
    profile: "My Profile",
    settings: "Settings"
  },
  hi: {
    brand: "एचएस ग्रुप दिल्ली",
    subtitle: "हाउस ऑफ़ सूर्य",
    monitor: "लाइव निगरानी",
    employees: "कर्मचारी और पेरोल",
    shifts: "शिफ्ट अनुसूची",
    approvals: "स्वीकृति डेस्क",
    reports: "मासिक रिपोर्ट",
    status: "चेक-इन / स्थिति",
    leaves: "छुट्टी के अनुरोध",
    payslips: "मेरी वेतन पर्ची",
    profile: "मेरी प्रोफाइल",
    settings: "सेटिंग्स"
  },
  es: {
    brand: "HS Grupo Delhi",
    subtitle: "Casa de Surya",
    monitor: "Monitoreo en Vivo",
    employees: "Personal y Nómina",
    shifts: "Horarios de Turno",
    approvals: "Mesa de Aprobación",
    reports: "Informes Mensuales",
    status: "Fichar / Estado",
    leaves: "Solicitudes de Licencia",
    payslips: "Mis Recibos",
    profile: "Mi Perfil",
    settings: "Ajustes"
  }
};

let currentLang = localStorage.getItem('hs_app_lang') || 'en';
let activeTheme = localStorage.getItem('hs_app_theme') || 'dark';

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  DB.init();
  Auth.init();
  applyGlobalTheme();
  setupRouter();
  document.body.addEventListener('click', handleGlobalClicks);
});

function applyGlobalTheme() {
  const body = document.body;
  if (activeTheme === 'light') {
    body.classList.add('light-theme');
  } else {
    body.classList.remove('light-theme');
  }
}

// Simple Router
function setupRouter() {
  const handleRoute = () => {
    const hash = window.location.hash || '#login';
    const user = Auth.getCurrentUser();

    if (hash === '#login') {
      if (user) {
        window.location.hash = (user.role === 'hr' || user.role === 'manager') ? '#admin-dashboard' : '#dashboard';
        return;
      }
      renderLoginView();
      return;
    }

    if (!user) {
      window.location.hash = '#login';
      return;
    }

    const isManagementRoute = hash.startsWith('#admin-');
    const isEmployeeRoute = hash === '#dashboard' || hash === '#leaves' || hash.startsWith('#employee-');
    const isManagementRole = user.role === 'hr' || user.role === 'manager';

    if (isManagementRoute && !isManagementRole) {
      window.location.hash = '#dashboard';
      return;
    }
    if (isEmployeeRoute && isManagementRole) {
      window.location.hash = '#admin-dashboard';
      return;
    }

    renderAppShell();
    
    // Set Active Link in Sidebar
    document.querySelectorAll('.menu-item').forEach(li => {
      li.classList.remove('active');
      const href = li.querySelector('a')?.getAttribute('href');
      if (href === hash) li.classList.add('active');
    });

    // Render Content View
    switch (hash) {
      // Employee Routes
      case '#dashboard':
        renderEmployeeDashboard();
        break;
      case '#leaves':
        renderEmployeeLeaves();
        break;
      case '#employee-reports':
        renderEmployeeReports();
        break;
      case '#employee-profile':
        renderEmployeeProfile();
        break;
      case '#employee-verification':
        renderEmployeeVerification();
        break;
      case '#employee-swaps':
        renderEmployeeSwapsView();
        break;
      case '#settings':
        renderSettingsView();
        break;
      case '#support':
        renderEmployeeSupport();
        break;
        
      // Admin Routes
      case '#admin-dashboard':
        renderAdminDashboard();
        break;
      case '#admin-users':
        renderAdminUsers();
        break;
      case '#admin-schedules':
        renderAdminSchedules();
        break;
      case '#admin-approvals':
        renderAdminApprovals();
        break;
      case '#admin-reports':
        renderAdminReports();
        break;
      case '#admin-verification':
        renderAdminVerificationView();
        break;
      case '#admin-support':
        renderAdminSupport();
        break;
      default:
        window.location.hash = (user.role === 'hr' || user.role === 'manager') ? '#admin-dashboard' : '#dashboard';
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleGlobalClicks(e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal();
  }
}

// -------------------------------------------------------------
// RENDER SIGN IN, SIGN UP & FORGOT PASSWORD
// -------------------------------------------------------------
function renderLoginView() {
  if (activeTimer) clearInterval(activeTimer);

  // Forgot password flow state variables
  let resetUser = null;
  let simulatedOTP = '';
  let captchaAnswer = 0;
  
  let activeLoginRole = 'employee';
  let activeSignupRole = 'employee';
  
  const quotes = [
    "Rise, shine, and let your dedication build our legacy. Wishing you the best of luck for a highly productive day ahead!",
    "Every day is a fresh opportunity to learn, grow, and excel. Best of luck on your shift today!",
    "Your hard work and energy light up our workplace like the sun. Have an inspiring and successful day ahead!",
    "Great things come to those who work for it. Let's make today count together. Best wishes for a wonderful workday!",
    "Focus, dedication, and positive energy lead to excellence. Wishing you a great and productive day ahead!"
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="auth-wrapper">
      <!-- Left Hero Column -->
      <div class="auth-hero-column">
        <div class="auth-hero-overlay"></div>
        <div class="auth-hero-content">
          <!-- Branding -->
          <div class="auth-hero-brand">
            <img src="surya-logo.png" alt="Surya Logo" class="auth-hero-logo">
            <div class="auth-hero-brand-text">
              <div class="auth-hero-brand-title">HS Group Delhi</div>
              <div class="auth-hero-brand-subtitle">House of Surya</div>
            </div>
          </div>
          
          <!-- Hero Main Content -->
          <div class="auth-hero-main">
            <div class="auth-hero-tagline">WORKFORCE OPERATIONS, SIMPLIFIED</div>
            <h1 class="auth-hero-title">Make every workday count.</h1>
            <p class="auth-hero-desc">
              Track attendance, manage shifts, and streamline payroll deductions from one unified, secure workspace.
            </p>
            
            <!-- Daily Motivation / Good Vibes Badge -->
            <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(249, 115, 22, 0.04) 100%); border-left: 3px solid var(--primary); padding: 14px 20px; border-radius: var(--radius-sm); margin-bottom: 35px; max-width: 520px; display: flex; flex-direction: column; gap: 4px; backdrop-filter: blur(4px); box-shadow: 0 4px 20px rgba(0,0,0,0.15)">
              <div style="display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:var(--primary);letter-spacing:1px;text-transform:uppercase">
                <span>✨</span> DAILY INSPIRATION
              </div>
              <p style="color:var(--text-primary);font-size:13.5px;font-style:italic;line-height:1.5;margin:0">
                "${randomQuote}"
              </p>
            </div>
            
            <!-- Features Checklist -->
            <div class="auth-hero-features">
              <div class="auth-hero-feature-item">
                <span class="auth-hero-feature-num">01</span>
                <div class="auth-hero-feature-details">
                  <strong>Live Biometric Clocking</strong>
                  <span>Verify and clock in/out with face and fingerprint recognition.</span>
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
          
          <!-- Hero Footer -->
          <div class="auth-hero-footer">
            Secure attendance & workforce management for growing enterprise teams.
          </div>
        </div>
      </div>
      
      <!-- Right Form Column -->
      <div class="auth-form-column">
        <div class="auth-card" id="auth-box">
          <!-- Sign In Section -->
          <div id="signin-section">
            <div class="auth-header">
              <div class="auth-logo" style="margin-bottom: 8px; justify-content: center;">
                <img src="surya-logo.png" alt="Surya Logo" style="height: 60px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251,191,36,0.25));">
              </div>
              <div class="auth-subtitle" style="text-align: center; color: var(--text-secondary); margin-bottom: 6px;">House of Surya</div>
              <div class="auth-sub-desc" style="text-align: center;">Attendance & Payroll Portal</div>
            </div>

            <!-- Role Selection Tabs -->
            <div class="auth-tabs" id="login-role-tabs">
              <div class="auth-tab active" data-role="employee">Employee</div>
              <div class="auth-tab" data-role="hr">HR Login</div>
              <div class="auth-tab" data-role="manager">Manager</div>
            </div>

            <form id="login-form">
              <div class="form-group">
                <label class="form-label" for="username">Username</label>
                <input class="form-input" type="text" id="username" placeholder="e.g. john" autocomplete="username">
              </div>
              <div class="form-group" id="login-empid-container">
                <label class="form-label" for="login-empid">Employee ID (Optional)</label>
                <input class="form-input" type="text" id="login-empid" placeholder="e.g. EMP103">
              </div>
              
              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <div class="password-wrapper">
                  <input class="form-input" type="password" id="password" placeholder="Enter the Password" required autocomplete="current-password">
                  <button class="password-toggle-btn" type="button" tabindex="-1" title="Show/Hide Password">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                </div>
              </div>

              <div class="signup-tc-wrapper" style="margin-top: 10px; margin-bottom: 15px">
                <input type="checkbox" id="login-agree-tc" required>
                <label for="login-agree-tc">
                  I accept the <a href="#" id="btn-view-guidelines-login">Company Guidelines & T&C</a>
                </label>
              </div>

              <button class="btn" type="submit">Log In</button>
            </form>

            <div style="display:flex;justify-content:space-between;margin-top:16px;font-size:13px">
              <a href="#" id="toggle-to-forgot" style="color:var(--text-secondary);text-decoration:none">Forgot Password?</a>
              <span>New employee? <a href="#" id="toggle-to-signup" style="color:var(--primary);font-weight:600;text-decoration:none">Sign Up</a></span>
            </div>

            <div class="divider">OR SIGN IN WITH BIOMETRICS</div>

            <div class="bio-selector-grid">
              <button class="bio-option-btn" id="bio-fingerprint-login">
                <svg viewBox="0 0 24 24"><path d="M12,2C10.3,2,8.7,2.7,7.5,3.8C7.1,4.2,7.1,4.9,7.5,5.3c0.4,0.4,1,0.4,1.4,0c0.9-0.8,2.1-1.3,3.3-1.3s2.4,0.5,3.3,1.3c0.4,0.4,1,0.4,1.4,0c0.4-0.4,0.4-1.1,0-1.5C15.3,2.7,13.7,2,12,2z M12,6c-2.2,0-4,1.8-4,4v4c0,0.6-0.4,1-1,1s-1-0.4-1-1v-4c0-3.3,2.7-6,6-6s6,2.7,6,6v4c0,0.6-0.4,1-1,1s-1-0.4-1-1v-4C16,7.8,14.2,6,12,6z M12,14c-1.1,0-2-0.9-2-2v-2c0-1.1,0.9-2,2-2s2,0.9,2,2v2C14,13.1,13.1,14,12,14z M17,17c-0.6,0-1-0.4-1-1v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1C18,16.6,17.6,17,17,17z M7,17c-0.6,0-1-0.4-1-1v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1C8,16.6,7.6,17,7,17z M12,22c-2.8,0-5-2.2-5-5v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1c0,1.7,1.3,3,3,3s3-1.3,3-3v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1C17,19.8,14.8,22,12,22z"/></svg>
                <span>Fingerprint</span>
              </button>
              <button class="bio-option-btn" id="bio-face-login">
                <svg viewBox="0 0 24 24"><path d="M9 11.75a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zm6 0a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-2.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                <span>Face ID</span>
              </button>
            </div>
          </div>

          <!-- Sign Up Section -->
          <div id="signup-section" style="display:none">
            <div class="auth-header">
              <div class="auth-logo" style="margin-bottom: 8px; justify-content: center;">
                <img src="surya-logo.png" alt="Surya Logo" style="height: 60px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251,191,36,0.25));">
              </div>
              <div class="auth-subtitle" style="text-align: center; color: var(--text-secondary); margin-bottom: 6px;">Create Account</div>
              <div class="auth-sub-desc" style="text-align: center;">Secure Password Requirements</div>
            </div>

            <!-- Signup Role Tabs -->
            <div class="auth-tabs" id="signup-role-tabs">
              <div class="auth-tab active" data-role="employee">Employee</div>
              <div class="auth-tab" data-role="hr">Join as HR</div>
              <div class="auth-tab" data-role="manager">Join as Manager</div>
            </div>

            <form id="signup-form-elem">
              <div class="form-group">
                <label class="form-label" for="signup-name">Full Name</label>
                <input class="form-input" type="text" id="signup-name" placeholder="e.g. Surya Singh" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="signup-username">Username</label>
                <input class="form-input" type="text" id="signup-username" placeholder="e.g. surya" required autocomplete="username">
              </div>

              <div class="form-group" id="signup-empid-container">
                <label class="form-label" for="signup-empid">Employee ID (Optional)</label>
                <input class="form-input" type="text" id="signup-empid" placeholder="e.g. EMP103">
              </div>
              
              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label" for="signup-password">Secure Password</label>
                <div class="password-wrapper">
                  <input class="form-input" type="password" id="signup-password" placeholder="Enter the Password" required autocomplete="new-password">
                  <button class="password-toggle-btn" type="button" tabindex="-1" title="Show/Hide Password">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                </div>
              </div>
              
              <div class="signup-tc-wrapper">
                <input type="checkbox" id="signup-agree-tc" required>
                <label for="signup-agree-tc">
                  I agree to the <a href="#" id="btn-view-guidelines">Company Guidelines & T&C</a> of HS Group Delhi
                </label>
              </div>

              <div class="pass-checklist" style="margin-bottom:20px">
                <div class="checklist-item invalid" id="rule-len">❌ Minimum 6 characters</div>
                <div class="checklist-item invalid" id="rule-upper">❌ At least one uppercase letter</div>
                <div class="checklist-item invalid" id="rule-special">❌ At least one special symbol (@#$!%*)</div>
                <div class="checklist-item invalid" id="rule-number">❌ Contains non-numbers</div>
              </div>

              <button class="btn btn-success" type="submit" id="signup-submit-btn" disabled style="opacity:0.6;cursor:not-allowed">Register & Log In</button>
              <div class="signup-policy-notice" style="font-size: 11px; color: var(--text-muted); margin-top: 15px; text-align: center; line-height: 1.4;">
                By continuing, you agree to your organization’s security policies.
              </div>
            </form>

            <div style="text-align:center;margin-top:16px;font-size:13px">
              Already have an account? <a href="#" id="toggle-to-signin" style="color:var(--primary);font-weight:600;text-decoration:none">Log In</a>
            </div>
          </div>

          <!-- Forgot Password Section (With OTP and Captcha Wizard) -->
          <div id="forgot-section" style="display:none">
            <div class="auth-header">
              <div class="auth-logo" style="margin-bottom: 8px; justify-content: center;">
                <img src="surya-logo.png" alt="Surya Logo" style="height: 60px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(251,191,36,0.25));">
              </div>
              <div class="auth-subtitle" style="text-align: center; color: var(--text-secondary); margin-bottom: 6px;">Forgot Password</div>
              <div class="auth-sub-desc" style="text-align: center;">SMS / Email OTP Verification</div>
            </div>

            <!-- Forgot Step 1: Input username and request OTP -->
            <div id="forgot-step-1">
              <div class="form-group">
                <label class="form-label" for="forgot-username">Enter Username</label>
                <input class="form-input" type="text" id="forgot-username" placeholder="e.g. sarah">
              </div>
              <div class="form-group" id="forgot-empid-container">
                <label class="form-label" for="forgot-empid">Enter Employee ID (Optional)</label>
                <input class="form-input" type="text" id="forgot-empid" placeholder="e.g. EMP104">
              </div>
              <button class="btn btn-cyan" id="btn-request-otp">Send Verification OTP</button>
            </div>

            <!-- Forgot Step 2: Verification (OTP & Math Captcha) -->
            <div id="forgot-step-2" style="display:none">
              <div class="form-group">
                <label class="form-label" for="forgot-otp-input">Enter 6-Digit OTP</label>
                <input class="form-input" type="text" id="forgot-otp-input" placeholder="••••••" maxlength="6">
              </div>

              <label class="form-label">Security CAPTCHA</label>
              <div class="captcha-container">
                <div class="captcha-question" id="captcha-question-text">8 + 6 = ?</div>
                <input class="form-input" type="number" id="forgot-captcha-input" placeholder="Answer" style="flex:1;padding:8px 12px">
              </div>

              <button class="btn btn-cyan" id="btn-verify-otp-captcha">Verify Verification Keys</button>
            </div>

            <!-- Forgot Step 3: Enter new strong password -->
            <div id="forgot-step-3" style="display:none">
              <div class="form-group">
                <label class="form-label" for="forgot-new-pass">New Password</label>
                <div class="password-wrapper">
                  <input class="form-input" type="password" id="forgot-new-pass" placeholder="Enter the Password" required>
                  <button class="password-toggle-btn" type="button" tabindex="-1" title="Show/Hide Password">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label" for="forgot-confirm-pass">Confirm Password</label>
                <div class="password-wrapper">
                  <input class="form-input" type="password" id="forgot-confirm-pass" placeholder="Enter the Password" required>
                  <button class="password-toggle-btn" type="button" tabindex="-1" title="Show/Hide Password">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  </button>
                </div>
              </div>

              <div class="pass-checklist" style="margin-bottom:20px">
                <div class="checklist-item invalid" id="f-rule-len">❌ Minimum 6 characters</div>
                <div class="checklist-item invalid" id="f-rule-upper">❌ At least one uppercase letter</div>
                <div class="checklist-item invalid" id="f-rule-special">❌ At least one special symbol (@#$!%*)</div>
                <div class="checklist-item invalid" id="f-rule-number">❌ Contains non-numbers</div>
                <div class="checklist-item invalid" id="f-rule-match">❌ Passwords match</div>
              </div>

              <button class="btn btn-success" id="btn-reset-password" disabled style="opacity:0.6;cursor:not-allowed">Reset Password</button>
            </div>

            <div style="text-align:center;margin-top:20px;font-size:13px">
              Return to <a href="#" id="forgot-back-to-signin" style="color:var(--primary);font-weight:600;text-decoration:none">Sign In</a>
            </div>
          </div>

          <div id="login-alert" class="alert" style="display:none"></div>
        </div>
      </div>
    </div>
  `;

  const signinSec = document.getElementById('signin-section');
  const signupSec = document.getElementById('signup-section');
  const forgotSec = document.getElementById('forgot-section');
  const alertBox = document.getElementById('login-alert');

  // Handle Login Role Tabs click
  const loginTabs = document.getElementById('login-role-tabs');
  loginTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.auth-tab');
    if (!tab) return;
    loginTabs.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeLoginRole = tab.dataset.role;
    
    // Show/hide biometric grid based on selection (only employees support biometric clock-in/out for direct daily attendance logs)
    const bioGrid = document.querySelector('.bio-selector-grid');
    const bioDiv = document.querySelector('.divider');
    const empidContainer = document.getElementById('login-empid-container');
    if (activeLoginRole !== 'employee') {
      bioGrid.style.display = 'none';
      if (bioDiv) bioDiv.style.display = 'none';
      if (empidContainer) empidContainer.style.display = 'none';
    } else {
      bioGrid.style.display = 'grid';
      if (bioDiv) bioDiv.style.display = 'flex';
      if (empidContainer) empidContainer.style.display = 'block';
    }
  });

  // Handle Signup Role Tabs click
  const signupTabs = document.getElementById('signup-role-tabs');
  signupTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.auth-tab');
    if (!tab) return;
    signupTabs.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeSignupRole = tab.dataset.role;

    const signupEmpidContainer = document.getElementById('signup-empid-container');
    if (signupEmpidContainer) {
      if (activeSignupRole === 'employee') {
        signupEmpidContainer.style.display = 'block';
      } else {
        signupEmpidContainer.style.display = 'none';
      }
    }
  });

  // Switch sections toggles
  document.getElementById('toggle-to-signup').addEventListener('click', (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';
    signinSec.style.display = 'none';
    forgotSec.style.display = 'none';
    signupSec.style.display = 'block';
  });

  document.getElementById('toggle-to-signin').addEventListener('click', (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';
    signupSec.style.display = 'none';
    forgotSec.style.display = 'none';
    signinSec.style.display = 'block';
  });

  document.getElementById('toggle-to-forgot').addEventListener('click', (e) => {
    e.preventDefault();
    alertBox.style.display = 'none';
    signinSec.style.display = 'none';
    signupSec.style.display = 'none';
    forgotSec.style.display = 'block';
    
    // Reset forgot wizard views
    document.getElementById('forgot-step-1').style.display = 'block';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-step-3').style.display = 'none';
  });

  document.getElementById('forgot-back-to-signin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('toggle-to-signin').click();
  });

  // Password Visibility Toggle Click Handler
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
      }
    });
  });

  // View Company Guidelines Handler
  const viewGuidelines = document.getElementById('btn-view-guidelines');
  if (viewGuidelines) {
    viewGuidelines.addEventListener('click', (e) => {
      e.preventDefault();
      openGuidelinesModal();
    });
  }

  const viewGuidelinesLogin = document.getElementById('btn-view-guidelines-login');
  if (viewGuidelinesLogin) {
    viewGuidelinesLogin.addEventListener('click', (e) => {
      e.preventDefault();
      openGuidelinesModal();
    });
  }

  // Sign Up strength check
  const signupPass = document.getElementById('signup-password');
  const submitBtn = document.getElementById('signup-submit-btn');
  const rLen = document.getElementById('rule-len');
  const rUpper = document.getElementById('rule-upper');
  const rSpecial = document.getElementById('rule-special');
  const rNumber = document.getElementById('rule-number');

  signupPass.addEventListener('input', () => {
    const val = signupPass.value;
    const rules = Auth.validatePassword(val);

    const toggleRule = (elem, isValid) => {
      if (isValid) {
        elem.classList.remove('invalid');
        elem.classList.add('valid');
        elem.innerHTML = `✓ ${elem.innerHTML.substring(2)}`;
      } else {
        elem.classList.remove('valid');
        elem.classList.add('invalid');
        elem.innerHTML = `❌ ${elem.innerHTML.substring(2)}`;
      }
    };

    toggleRule(rLen, rules.isLongEnough);
    toggleRule(rUpper, rules.hasUpper);
    toggleRule(rSpecial, rules.hasSpecial);
    toggleRule(rNumber, rules.isNotJustNumbers);

    if (rules.valid) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } else {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
    }
  });

  // Forgot password strength check
  const fNewPass = document.getElementById('forgot-new-pass');
  const fConfirmPass = document.getElementById('forgot-confirm-pass');
  const fResetBtn = document.getElementById('btn-reset-password');
  const fLen = document.getElementById('f-rule-len');
  const fUpper = document.getElementById('f-rule-upper');
  const fSpecial = document.getElementById('f-rule-special');
  const fNumber = document.getElementById('f-rule-number');
  const fMatch = document.getElementById('f-rule-match');

  const checkForgotPassStrength = () => {
    const p1 = fNewPass.value;
    const p2 = fConfirmPass.value;
    const rules = Auth.validatePassword(p1);
    const matches = p1 === p2 && p1.length > 0;

    const toggleRule = (elem, isValid) => {
      if (isValid) {
        elem.classList.remove('invalid');
        elem.classList.add('valid');
        elem.innerHTML = `✓ ${elem.innerHTML.substring(2)}`;
      } else {
        elem.classList.remove('valid');
        elem.classList.add('invalid');
        elem.innerHTML = `❌ ${elem.innerHTML.substring(2)}`;
      }
    };

    toggleRule(fLen, rules.isLongEnough);
    toggleRule(fUpper, rules.hasUpper);
    toggleRule(fSpecial, rules.hasSpecial);
    toggleRule(fNumber, rules.isNotJustNumbers);
    toggleRule(fMatch, matches);

    if (rules.valid && matches) {
      fResetBtn.disabled = false;
      fResetBtn.style.opacity = '1';
      fResetBtn.style.cursor = 'pointer';
    } else {
      fResetBtn.disabled = true;
      fResetBtn.style.opacity = '0.6';
      fResetBtn.style.cursor = 'not-allowed';
    }
  };

  fNewPass.addEventListener('input', checkForgotPassStrength);
  fConfirmPass.addEventListener('input', checkForgotPassStrength);

  // Forms Submits
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const employeeId = document.getElementById('login-empid').value.trim();
    const password = document.getElementById('password').value;
    
    if (activeLoginRole === 'employee' && !username && !employeeId) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Please enter either Username or Employee ID.';
      alertBox.style.display = 'flex';
      return;
    }
    if (activeLoginRole !== 'employee' && !username) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Please enter your Username.';
      alertBox.style.display = 'flex';
      return;
    }

    let userExists = null;
    if (activeLoginRole !== 'employee') {
      userExists = DB.getUserByUsername(username);
    } else {
      if (username && employeeId) {
        const u = DB.getUserByUsername(username);
        if (u && u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase()) {
          userExists = u;
        }
      } else if (username) {
        userExists = DB.getUserByUsername(username);
      } else if (employeeId) {
        userExists = DB.getUsers().find(u => u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase());
      }
    }

    if (!userExists) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Invalid credentials or user does not exist.';
      alertBox.style.display = 'flex';
      return;
    }

    // Role Match Check
    if (userExists.role !== activeLoginRole) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = `This account is registered as a ${userExists.role.toUpperCase()}. Please select the correct tab above.`;
      alertBox.style.display = 'flex';
      return;
    }

    const res = Auth.login(username, employeeId, password);
    if (res.success) {
      const isManagement = res.user.role === 'hr' || res.user.role === 'manager';
      window.location.hash = isManagement ? '#admin-dashboard' : '#dashboard';
    } else {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = res.message;
      alertBox.style.display = 'flex';
    }
  });

  document.getElementById('signup-form-elem').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = signupPass.value;

    const rules = Auth.validatePassword(password);
    if (!rules.valid) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Please meet all password strength rules.';
      alertBox.style.display = 'flex';
      return;
    }

    const employeeIdVal = (activeSignupRole === 'employee') ? document.getElementById('signup-empid').value.trim() : null;
    const employeeId = employeeIdVal || null;

    const newUser = DB.registerUser(username, name, password, activeSignupRole, employeeId);
    if (newUser) {
      Auth.login(username, newUser.employeeId, password);
      sessionStorage.setItem('hs_fresh_signup', 'true');
      const isManagement = newUser.role === 'hr' || newUser.role === 'manager';
      window.location.hash = isManagement ? '#admin-dashboard' : '#dashboard';
    } else {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = employeeId ? 'Username or Employee ID is already taken.' : 'Username is already taken.';
      alertBox.style.display = 'flex';
    }
  });

  // Forgot password step 1 (Validate User & Trigger OTP)
  document.getElementById('btn-request-otp').addEventListener('click', () => {
    const username = document.getElementById('forgot-username').value.trim();
    const employeeId = document.getElementById('forgot-empid').value.trim();

    if (!username && !employeeId) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Please enter either Username or Employee ID.';
      alertBox.style.display = 'flex';
      return;
    }

    let user = null;
    if (username && employeeId) {
      const u = DB.getUserByUsername(username);
      if (u && u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase()) {
        user = u;
      }
    } else if (username) {
      user = DB.getUserByUsername(username);
    } else if (employeeId) {
      user = DB.getUsers().find(u => u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase());
    }

    if (!user) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'User account not found in system.';
      alertBox.style.display = 'flex';
      return;
    }

    resetUser = user;
    alertBox.style.display = 'none';

    // Dispatch simulated OTP
    simulatedOTP = String(Math.floor(100000 + Math.random() * 900000));
    
    // Math Captcha setup
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    captchaAnswer = n1 + n2;
    document.getElementById('captcha-question-text').textContent = `${n1} + ${n2} = ?`;

    // Swap view
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';

    // Flash OTP Notification banner
    alertBox.className = 'alert alert-success';
    alertBox.innerHTML = `🔑 OTP Code sent via SMS/Email to ${user.name}. Code: <strong>${simulatedOTP}</strong> (simulated)`;
    alertBox.style.display = 'flex';
  });

  // Forgot password step 2 (Verify OTP & Math Captcha)
  document.getElementById('btn-verify-otp-captcha').addEventListener('click', () => {
    const enteredOTP = document.getElementById('forgot-otp-input').value.trim();
    const enteredCaptcha = Number(document.getElementById('forgot-captcha-input').value);

    if (enteredOTP !== simulatedOTP) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Incorrect OTP code entered. Please try again.';
      alertBox.style.display = 'flex';
      return;
    }

    if (enteredCaptcha !== captchaAnswer) {
      alertBox.className = 'alert alert-error';
      alertBox.textContent = 'Incorrect security CAPTCHA answer.';
      alertBox.style.display = 'flex';
      return;
    }

    alertBox.style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'none';
    document.getElementById('forgot-step-3').style.display = 'block';
  });

  // Forgot password step 3 (Reset password submission)
  document.getElementById('btn-reset-password').addEventListener('click', () => {
    const newPass = fNewPass.value;
    
    if (resetUser) {
      DB.resetUserPassword(resetUser.username, newPass);
      alertBox.className = 'alert alert-success';
      alertBox.textContent = 'Password reset successfully! Log in using your new credentials.';
      alertBox.style.display = 'flex';
      
      // Clear forms
      document.getElementById('forgot-username').value = '';
      if (document.getElementById('forgot-empid')) document.getElementById('forgot-empid').value = '';
      document.getElementById('forgot-otp-input').value = '';
      document.getElementById('forgot-captcha-input').value = '';
      fNewPass.value = '';
      fConfirmPass.value = '';

      // Direct back to sign in
      setTimeout(() => {
        document.getElementById('toggle-to-signin').click();
      }, 1500);
    }
  });

  document.getElementById('bio-fingerprint-login').addEventListener('click', () => triggerBiometricAuth('finger'));
  document.getElementById('bio-face-login').addEventListener('click', () => triggerBiometricAuth('face'));
}

// -------------------------------------------------------------
// RENDER APP SHELL
// -------------------------------------------------------------
function renderAppShell() {
  const root = document.getElementById('app-root');
  const user = Auth.getCurrentUser();
  const avatarText = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const labels = Translations[currentLang] || Translations.en;

  let menuHTML = '';
  if (user.role === 'hr' || user.role === 'manager') {
    menuHTML = `
      <li class="menu-item" id="nav-admin-dashboard"><a href="#admin-dashboard">
        <svg viewBox="0 0 24 24"><path d="M10 20H5v-7H2l10-9 10 9h-3v7h-5v-6h-2v6z"/></svg> ${labels.monitor}
      </a></li>
      <li class="menu-item" id="nav-admin-users"><a href="#admin-users">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> ${labels.employees}
      </a></li>
      <li class="menu-item" id="nav-admin-schedules"><a href="#admin-schedules">
        <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg> ${labels.shifts}
      </a></li>
      <li class="menu-item" id="nav-admin-approvals"><a href="#admin-approvals">
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> ${labels.approvals}
      </a></li>
      <li class="menu-item" id="nav-admin-reports"><a href="#admin-reports">
        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> ${labels.reports}
      </a></li>
      <li class="menu-item" id="nav-admin-verification"><a href="#admin-verification">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Verification Docs
      </a></li>
      <li class="menu-item" id="nav-admin-support"><a href="#admin-support">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Support Tickets
      </a></li>
      <li class="menu-item" id="nav-settings"><a href="#settings">
        <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 c-0.12,0.21-0.08,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.21,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg> ${labels.settings}
      </a></li>
    `;
  } else {
    menuHTML = `
      <li class="menu-item" id="nav-dashboard"><a href="#dashboard">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg> ${labels.status}
      </a></li>
      <li class="menu-item" id="nav-leaves"><a href="#leaves">
        <svg viewBox="0 0 24 24"><path d="M14 6c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h10c.55 0 1-.45 1-1V6zm6 2c0-.55-.45-1-1-1h-3c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h3c.55 0 1-.45 1-1V8z"/></svg> ${labels.leaves}
      </a></li>
      <li class="menu-item" id="nav-employee-reports"><a href="#employee-reports">
        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> ${labels.payslips}
      </a></li>
      <li class="menu-item" id="nav-employee-profile"><a href="#employee-profile">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"/></svg> ${labels.profile}
      </a></li>
      <li class="menu-item" id="nav-employee-verification"><a href="#employee-verification">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Verification Docs
      </a></li>
      <li class="menu-item" id="nav-employee-swaps"><a href="#employee-swaps">
        <svg viewBox="0 0 24 24"><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/></svg> Shift Swaps
      </a></li>
      <li class="menu-item" id="nav-support"><a href="#support">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Support Helpdesk
      </a></li>
      <li class="menu-item" id="nav-settings"><a href="#settings">
        <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 c-0.12,0.21-0.08,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.21,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg> ${labels.settings}
      </a></li>
    `;
  }

  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand" style="display:flex;flex-direction:column;align-items:center;padding:15px;border-bottom:1px solid var(--border);margin-bottom:10px">
        <img src="surya-logo.png" alt="Surya Logo" style="height:45px;object-fit:contain;margin-bottom:4px;filter:drop-shadow(0 0 8px rgba(251,191,36,0.15))">
        <div class="auth-subtitle" style="font-size:11px;text-align:center;margin-top:2px;color:var(--text-secondary)">${labels.subtitle}</div>
      </div>
      <ul class="sidebar-menu">
        ${menuHTML}
      </ul>
      <div class="sidebar-footer">
        <div class="user-profile-summary">
          <div class="avatar">${avatarText}</div>
          <div class="user-info-text">
            <span class="user-name">${Utils.escape(user.name)}</span>
            <span class="user-role">${user.role}</span>
          </div>
        </div>
        <button class="logout-btn" id="logout-trigger" title="Log Out">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
    </aside>
    <main class="main-content" id="main-view"></main>
  `;

  document.getElementById('logout-trigger').addEventListener('click', () => {
    Auth.logout();
    window.location.hash = '#login';
  });
}

// -------------------------------------------------------------
// EMPLOYEE DASHBOARD & LIVE TIMERS
// -------------------------------------------------------------
function renderEmployeeDashboard() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const todayLog = DB.getTodayLog(user.id);
  const schedule = DB.getSchedule(user.scheduleId);

  // Biometric setup enrollment checker banner
  const needsBiometrics = !user.biometricRegistered?.face && !user.biometricRegistered?.finger;
  const isFreshSignup = sessionStorage.getItem('hs_fresh_signup') === 'true';

  let alertBannerHTML = '';
  if (needsBiometrics) {
    alertBannerHTML = `
      <div class="card-panel" style="border-left: 4px solid var(--primary);background:rgba(251,191,36,0.05);margin-bottom:24px" id="biometric-wizard-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
          <div>
            <h4 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;color:var(--primary);font-weight:700">🧬 Complete Biometric Enrollment</h4>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">
              ${isFreshSignup ? 'Registration successful! ' : ''}Enable Face ID or Fingerprint scanner to activate zero-credential check-ins/outs.
            </div>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn-cyan" id="wizard-face-reg" style="width:auto;padding:8px 16px;font-size:12px">Setup Face ID</button>
            <button class="btn btn-cyan" id="wizard-finger-reg" style="width:auto;padding:8px 16px;font-size:12px">Setup Fingerprint</button>
          </div>
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
    </div>
    
    <div class="content-body">
      ${alertBannerHTML}

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

              <!-- Fixed clock actions row supporting biometric checkout -->
              <div class="clock-actions-row">
                ${!todayLog 
                  ? `
                    <button class="btn btn-success" id="btn-regular-checkin">Clock In (Password)</button>
                    <div class="divider" style="margin: 12px 0">OR BIOMETRIC CLOCK IN</div>
                    <div class="clock-biometric-triggers">
                      <button class="btn btn-cyan btn-secondary" id="btn-face-checkin">Face Clock-In</button>
                      <button class="btn btn-cyan btn-secondary" id="btn-finger-checkin">Fingerprint Clock-In</button>
                    </div>
                  ` 
                  : (todayLog.checkOut 
                      ? `<button class="btn" style="background:rgba(255,255,255,0.05);cursor:not-allowed;" disabled>Checked Out Today</button>`
                      : `
                        <button class="btn btn-danger" id="btn-regular-checkout">Clock Out (Password)</button>
                        <div class="divider" style="margin: 12px 0">OR BIOMETRIC CLOCK OUT</div>
                        <div class="clock-biometric-triggers">
                          <button class="btn btn-danger btn-secondary" id="btn-face-checkout" style="color:var(--error);border-color:rgba(239,68,68,0.2)">Face Clock-Out</button>
                          <button class="btn btn-danger btn-secondary" id="btn-finger-checkout" style="color:var(--error);border-color:rgba(239,68,68,0.2)">Fingerprint Clock-Out</button>
                        </div>
                      `
                    )
                }
              </div>
            </div>
          </div>

          <!-- GPS Geofence Card -->
          <div class="card-panel gps-sim-card">
            <div class="card-panel-header">
              <h3 class="card-panel-title">📍 Simulated GPS Geofence</h3>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:13px;color:var(--text-secondary)">GPS Status:</span>
                <span style="display:flex;align-items:center">
                  <span id="gps-radar" class="gps-radar-indicator in-range"></span>
                  <span id="gps-status-badge" class="badge badge-on-time">In Range</span>
                </span>
              </div>
              <div style="font-size:12px;color:var(--text-secondary);line-height:1.5">
                Current Coordinates: <strong id="gps-coords-display" style="color:var(--text-primary)">28.6139° N, 77.2090° E</strong>
                <br>
                Distance from Delhi HQ: <strong id="gps-distance-display" style="color:var(--text-primary)">0 meters</strong>
              </div>
              
              <!-- Location Simulation Selector -->
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label" style="font-size:11px;margin-bottom:6px">Mock Current Location (To test company policy):</label>
                <select class="form-input" id="gps-mock-selector" style="padding:8px 12px;font-size:13px;background:rgba(255,255,255,0.02)">
                  <option value="hq">Delhi HQ Office (In Range - 0m)</option>
                  <option value="connaught">Connaught Place Hub (Out of Range - 5.2 km)</option>
                  <option value="noida">Noida Branch Home (Out of Range - 18.7 km)</option>
                  <option value="remote">Remote (Outside Geofence - 24.5 km)</option>
                </select>
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
                <strong style="color:var(--text-primary)">${schedule.startTime} - ${schedule.endTime}</strong>
              </div>
              <div class="shift-meta-row">
                <span>Grace Period:</span>
                <strong style="color:var(--warning)">${schedule.gracePeriod} minutes</strong>
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

          <div class="card-panel">
            <div class="card-panel-header">
              <h3 class="card-panel-title">My Recent Activity Logs</h3>
            </div>
            <div class="table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="employee-logs-table-body">
                  <!-- Loaded dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Live updates tick
  startLiveClock();
  startActiveWorkTimer(todayLog);
  renderPersonalLogs(user.id);

  // Geofencing Simulation setup
  let mockLoc = sessionStorage.getItem('hs_mock_location') || 'hq';
  const gpsSelect = document.getElementById('gps-mock-selector');
  if (gpsSelect) {
    gpsSelect.value = mockLoc;
    gpsSelect.addEventListener('change', (e) => {
      mockLoc = e.target.value;
      sessionStorage.setItem('hs_mock_location', mockLoc);
      updateGpsUI(mockLoc);
    });
  }

  // Biometrics setup wizards
  if (needsBiometrics) {
    document.getElementById('wizard-face-reg').addEventListener('click', () => openBiometricsSetupFlow(user.id, 'face'));
    document.getElementById('wizard-finger-reg').addEventListener('click', () => openBiometricsSetupFlow(user.id, 'finger'));
  }

  // Dashboard Check-in actions
  if (!todayLog) {
    document.getElementById('btn-regular-checkin').addEventListener('click', () => handlePinClockIn(user.id));
    document.getElementById('btn-face-checkin').addEventListener('click', () => triggerBiometricVerification(user.id, 'face', 'in'));
    document.getElementById('btn-finger-checkin').addEventListener('click', () => triggerBiometricVerification(user.id, 'finger', 'in'));
  } else if (!todayLog.checkOut) {
    document.getElementById('btn-regular-checkout').addEventListener('click', () => handleClockOut(user.id));
    document.getElementById('btn-face-checkout').addEventListener('click', () => triggerBiometricVerification(user.id, 'face', 'out'));
    document.getElementById('btn-finger-checkout').addEventListener('click', () => triggerBiometricVerification(user.id, 'finger', 'out'));
  }

  // Initialize GPS state
  if (gpsSelect) {
    updateGpsUI(mockLoc);
  }

  function updateGpsUI(val) {
    const badge = document.getElementById('gps-status-badge');
    const radar = document.getElementById('gps-radar');
    const coords = document.getElementById('gps-coords-display');
    const dist = document.getElementById('gps-distance-display');
    
    const faceIn = document.getElementById('btn-face-checkin');
    const fingerIn = document.getElementById('btn-finger-checkin');
    const faceOut = document.getElementById('btn-face-checkout');
    const fingerOut = document.getElementById('btn-finger-checkout');
    const regularIn = document.getElementById('btn-regular-checkin');

    let justBlock = document.getElementById('gps-justification-block');
    if (!justBlock) {
      justBlock = document.createElement('div');
      justBlock.id = 'gps-justification-block';
      justBlock.style.marginTop = '12px';
      justBlock.style.transition = 'all 0.3s ease';
      justBlock.innerHTML = `
        <label class="form-label" style="font-size:11px;margin-bottom:6px;color:var(--error);display:flex;align-items:center;gap:4px">
          ⚠️ Out of Geofence Deviation: Enter remote justification *
        </label>
        <textarea class="form-input" id="gps-justification-input" placeholder="Enter justification for remote check-in..." rows="2" style="font-size:12px;background:rgba(255,255,255,0.02);border-color:var(--error)"></textarea>
      `;
      const selectEl = document.getElementById('gps-mock-selector');
      if (selectEl) {
        selectEl.parentNode.parentNode.appendChild(justBlock);
      }
    }

    const justInput = document.getElementById('gps-justification-input');

    if (val === 'hq') {
      justBlock.style.display = 'none';
      if (justInput) justInput.value = '';
      if (badge) {
        badge.textContent = 'In Range';
        badge.className = 'badge badge-on-time';
      }
      if (radar) {
        radar.className = 'gps-radar-indicator in-range';
      }
      if (coords) coords.textContent = '28.6139° N, 77.2090° E';
      if (dist) dist.textContent = '0 meters';
      
      // Enable biometric buttons
      [faceIn, fingerIn, faceOut, fingerOut].forEach(btn => {
        if (btn) {
          btn.removeAttribute('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          btn.setAttribute('title', 'Biometric verification');
        }
      });
      if (regularIn) {
        regularIn.removeAttribute('disabled');
        regularIn.style.opacity = '1';
        regularIn.style.cursor = 'pointer';
      }
    } else {
      justBlock.style.display = 'block';
      if (badge) {
        badge.textContent = 'Out of Range';
        badge.className = val === 'connaught' ? 'badge badge-late' : 'badge badge-absent';
      }
      if (radar) {
        radar.className = 'gps-radar-indicator out-of-range';
      }
      if (coords) {
        if (val === 'connaught') coords.textContent = '28.6289° N, 77.2189° E';
        else if (val === 'noida') coords.textContent = '28.6273° N, 77.3725° E';
        else coords.textContent = '28.5355° N, 77.3910° E';
      }
      if (dist) {
        if (val === 'connaught') dist.textContent = '5.2 km';
        else if (val === 'noida') dist.textContent = '18.7 km';
        else dist.textContent = '24.5 km';
      }
      
      // Disable biometric buttons
      [faceIn, fingerIn, faceOut, fingerOut].forEach(btn => {
        if (btn) {
          btn.setAttribute('disabled', 'true');
          btn.style.opacity = '0.4';
          btn.style.cursor = 'not-allowed';
          btn.setAttribute('title', 'Biometric logging requires Delhi HQ coordinates');
        }
      });

      const validateJustification = () => {
        if (regularIn) {
          if (justInput && justInput.value.trim().length > 0) {
            regularIn.removeAttribute('disabled');
            regularIn.style.opacity = '1';
            regularIn.style.cursor = 'pointer';
          } else {
            regularIn.setAttribute('disabled', 'true');
            regularIn.style.opacity = '0.4';
            regularIn.style.cursor = 'not-allowed';
          }
        }
      };

      validateJustification();
      if (justInput) {
        justInput.removeEventListener('input', validateJustification);
        justInput.addEventListener('input', validateJustification);
      }
    }
  }
}

// Biometric Enrollment Wizard
function openBiometricsSetupFlow(userId, type) {
  openBiometricScanner(userId, type, (success) => {
    if (success) {
      Auth.registerBiometric(userId, type);
      sessionStorage.removeItem('hs_fresh_signup');
      alert(`Success! Your ${type === 'face' ? 'Face ID' : 'Fingerprint'} is now enrolled.`);
      renderEmployeeDashboard();
    }
  });
}

function renderPersonalLogs(userId) {
  const logs = DB.getLogs(userId).slice(0, 7);
  const tbody = document.getElementById('employee-logs-table-body');
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No logs recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => {
    let statusClass = 'badge-on-time';
    if (l.status === 'Late') statusClass = 'badge-late';
    if (l.status === 'Half Day') statusClass = 'badge-half-day';
    return `
      <tr>
        <td>${Utils.formatDate(l.date)}</td>
        <td>${l.checkIn || '--:--'}</td>
        <td>${l.checkOut || '--:--'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${Utils.escape(l.location || 'Office Headquarters')}</td>
        <td><span class="badge ${statusClass}">${l.status}</span></td>
      </tr>
    `;
  }).join('');
}

function handlePinClockIn(userId) {
  const pass = prompt('Enter your Account Password to Clock In:');
  if (pass === null) return;
  const user = DB.getUser(userId);
  if (user && user.password === pass) {
    const mockLoc = sessionStorage.getItem('hs_mock_location') || 'hq';
    let locationName = 'Delhi HQ Office';
    let deviationFlag = false;
    let justification = '';
    let coords = '28.6139° N, 77.2090° E';
    let distance = 0;

    if (mockLoc === 'connaught') {
      locationName = 'Connaught Place Hub';
      deviationFlag = true;
      coords = '28.6289° N, 77.2189° E';
      distance = 5.2;
    } else if (mockLoc === 'noida') {
      locationName = 'Noida Branch Home';
      deviationFlag = true;
      coords = '28.6273° N, 77.3725° E';
      distance = 18.7;
    } else if (mockLoc === 'remote') {
      locationName = 'Remote (Outside Geofence)';
      deviationFlag = true;
      coords = '28.5355° N, 77.3910° E';
      distance = 24.5;
    }

    if (deviationFlag) {
      const justInput = document.getElementById('gps-justification-input');
      justification = justInput ? justInput.value.trim() : '';
      if (!justification) {
        alert('Out of Geofence Check-In requires a justification.');
        return;
      }
    }

    DB.checkIn(userId, 'none', locationName, deviationFlag, justification, coords, distance);
    renderEmployeeDashboard();
  } else {
    alert('Invalid Password credentials.');
  }
}

function handleClockOut(userId) {
  if (confirm('Clock Out?')) {
    DB.checkOut(userId);
    renderEmployeeDashboard();
  }
}


// Biometric validation for check-ins/outs
function triggerBiometricVerification(userId, type, direction = 'in') {
  const mockLoc = sessionStorage.getItem('hs_mock_location') || 'hq';
  if (mockLoc !== 'hq') {
    alert(`Biometric Geofence Error: Your current GPS coordinates are out of range for biometric mapping. Under HS Group guidelines, biometric clock-in is strictly restricted to Delhi HQ coordinates. Please switch to Delhi HQ location or check in using your Account Password.`);
    return;
  }

  const user = DB.getUser(userId);
  if (!user.biometricRegistered || !user.biometricRegistered[type]) {
    alert(`Please register your ${type === 'face' ? 'Face ID' : 'Fingerprint'} first. Falling back to PIN/Password...`);
    if (direction === 'in') handlePinClockIn(userId);
    else handleClockOut(userId);
    return;
  }

  openBiometricScanner(userId, type, (success) => {
    if (success) {
      if (direction === 'in') {
        DB.checkIn(userId, type, 'Delhi HQ Office');
      } else {
        DB.checkOut(userId, type);
      }
      renderEmployeeDashboard();
    }
  });
}

// Settings Panel View
function renderSettingsView() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">System Settings</h1>
        <div class="content-subtitle">Change theme color gradients, update languages, and check builds.</div>
      </div>
    </div>

    <div class="content-body">
      <div class="settings-section-grid">
        <!-- Theme Card (Cleaned Solar labels) -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Appearance Theme</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:rgba(255,255,255,0.01)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:18px">🌇</span>
                <div>
                  <strong style="display:block;font-size:13px">Dark Mode</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Sunset burgundy/gold theme</span>
                </div>
              </div>
              <input type="radio" name="settings-theme" value="dark" ${activeTheme === 'dark' ? 'checked' : ''}>
            </label>

            <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:rgba(255,255,255,0.01)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:18px">🌅</span>
                <div>
                  <strong style="display:block;font-size:13px">Light Mode</strong>
                  <span style="font-size:11px;color:var(--text-muted)">Sunrise cream/gold theme</span>
                </div>
              </div>
              <input type="radio" name="settings-theme" value="light" ${activeTheme === 'light' ? 'checked' : ''}>
            </label>
          </div>
        </div>

        <!-- Language Card -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Interface Language</h3>
          </div>
          <div class="form-group">
            <select class="form-input" id="settings-lang-select" style="padding:12px">
              <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English (US)</option>
              <option value="hi" ${currentLang === 'hi' ? 'selected' : ''}>Hindi (हिन्दी)</option>
              <option value="es" ${currentLang === 'es' ? 'selected' : ''}>Spanish (Español)</option>
            </select>
          </div>
          <button class="btn btn-secondary" id="btn-save-lang" style="font-size:13px">Change Language</button>
        </div>

        <!-- Version updates checker -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Build & Version Checks</h3>
          </div>
          <div style="font-size:14px;margin-bottom:15px">
            <div>Current Version: <strong>v1.3.0</strong></div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Last verified: Today</div>
          </div>
          
          <button class="btn" id="btn-check-version" style="font-size:13px">Check for Version Updates</button>
          
          <div id="version-check-status" style="display:none;margin-top:15px;font-size:12px;color:var(--text-secondary);align-items:center;gap:8px"></div>
        </div>

        <!-- Account Session Card -->
        <div class="card-panel">
          <div class="card-panel-header">
            <h3 class="card-panel-title">Account Session</h3>
          </div>
          <div style="font-size:14px;margin-bottom:15px;display:flex;flex-direction:column;gap:8px">
            <div>Logged in as: <strong>${Utils.escape(user ? user.name : 'Unknown')}</strong></div>
            <div style="font-size:11px;color:var(--text-secondary)">Role: <span style="text-transform:uppercase;font-weight:600;color:var(--primary)">${user ? user.role : 'N/A'}</span></div>
          </div>
          
          <button class="btn btn-danger" id="btn-settings-logout" style="font-size:13px;width:100%;display:flex;align-items:center;justify-content:center;gap:8px">
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            Log Out Account
          </button>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('input[name="settings-theme"]').forEach(rad => {
    rad.addEventListener('change', (e) => {
      activeTheme = e.target.value;
      localStorage.setItem('hs_app_theme', activeTheme);
      applyGlobalTheme();
    });
  });

  document.getElementById('btn-save-lang').addEventListener('click', () => {
    const val = document.getElementById('settings-lang-select').value;
    currentLang = val;
    localStorage.setItem('hs_app_lang', currentLang);
    renderAppShell();
    renderSettingsView();
    alert('Language updated successfully / भाषा सफलतापूर्वक अपडेट की गई / Idioma actualizado con éxito');
  });

  const verBtn = document.getElementById('btn-check-version');
  const verStatus = document.getElementById('version-check-status');

  verBtn.addEventListener('click', () => {
    verBtn.disabled = true;
    verStatus.style.display = 'flex';
    verStatus.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:pulseScan 1s infinite;display:inline-block"></span> Checking HS Group server hubs...`;
    
    setTimeout(() => {
      verStatus.innerHTML = `✓ System is up to date. Latest version <strong>v1.3.0</strong> is active.`;
      verBtn.disabled = false;
    }, 2000);
  });

  document.getElementById('btn-settings-logout').addEventListener('click', () => {
    Auth.logout();
    window.location.hash = '#login';
  });
}

// -------------------------------------------------------------
// CORE SHARED SUB-FUNCTIONS
// -------------------------------------------------------------
function renderEmployeeLeaves() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Leave Request Desk</h1>
        <div class="content-subtitle">Request leaves and check status approvals.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Apply for New Leave</h3></div>
          <form id="leave-request-form">
            <div class="form-group">
              <label class="form-label" for="leave-type">Leave Type</label>
              <select class="form-input" id="leave-type" required>
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Annual">Annual Leave</option>
              </select>
            </div>
            <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="form-label" for="leave-start">Start Date</label>
                <input class="form-input" type="date" id="leave-start" required>
              </div>
              <div>
                <label class="form-label" for="leave-end">End Date</label>
                <input class="form-input" type="date" id="leave-end" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="leave-reason">Reason for Leave</label>
              <textarea class="form-input" id="leave-reason" placeholder="Describe the reason..." rows="3" required style="resize:vertical"></textarea>
            </div>
            <button class="btn" type="submit">Submit Request</button>
          </form>
          <div id="leave-alert" style="display:none"></div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Leave Request History</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead><tr><th>Dates</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody id="leave-history-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  renderPersonalLeaves(user.id);

  document.getElementById('leave-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('leave-type').value;
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value.trim();
    if (new Date(start) > new Date(end)) {
      showLeaveAlert('Start date cannot be after end date.', 'error');
      return;
    }
    DB.applyLeave(user.id, type, start, end, reason);
    showLeaveAlert('Leave request submitted successfully!', 'success');
    document.getElementById('leave-request-form').reset();
    renderPersonalLeaves(user.id);
  });
}

function renderEmployeeReports() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const today = new Date();
  let selectedMonth = today.getMonth();
  let selectedYear = today.getFullYear();

  main.innerHTML = `
    <div class="content-header" id="employee-payslip-tab-header">
      <div>
        <h1 class="content-title">My Payroll Statements</h1>
        <div class="content-subtitle">View salary statements, attendance deductions, and download payslips.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel report-filter-bar" style="margin-bottom:24px">
        <div style="display:flex;gap:8px;align-items:center">
          <label class="form-label" style="margin:0" for="emp-report-month">Select Period:</label>
          <select class="form-input" id="emp-report-month" style="width:130px;padding:8px">
            ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select class="form-input" id="emp-report-year" style="width:100px;padding:8px">
            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-cyan" id="btn-emp-print-payslip" style="margin-left:auto;padding:10px 18px;width:auto;font-size:13px">🖨️ Print Payslip</button>
      </div>
      <div id="payslip-render-container"></div>
    </div>
  `;
  const refreshPayslip = () => renderEmployeePayslip(user.id, selectedMonth, selectedYear);
  document.getElementById('emp-report-month').addEventListener('change', (e) => { selectedMonth = Number(e.target.value); refreshPayslip(); });
  document.getElementById('emp-report-year').addEventListener('change', (e) => { selectedYear = Number(e.target.value); refreshPayslip(); });
  document.getElementById('btn-emp-print-payslip').addEventListener('click', () => window.print());
  refreshPayslip();
}

function renderEmployeePayslip(userId, month, year) {
  const container = document.getElementById('payslip-render-container');
  const payroll = DB.calculateMonthlyPayroll(userId, month, year);
  if (!payroll) {
    container.innerHTML = `<div class="card-panel" style="text-align:center;color:var(--text-secondary)">No payroll data recorded for this month.</div>`;
    return;
  }
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  container.innerHTML = `
    <div class="payslip-wrapper">
      <div class="payslip-header">
        <div>
          <div class="payslip-company-name">HS Group Delhi</div>
          <div class="payslip-company-desc">House of Surya | Employee Salary Statement</div>
        </div>
        <div class="payslip-title">PAYSLIP RECEIPT</div>
      </div>
      <div class="payslip-grid">
        <div class="payslip-meta-block">
          <div><strong>Employee Name:</strong> ${Utils.escape(payroll.employeeName)}</div>
          <div><strong>Account Code:</strong> ${userId}</div>
          <div><strong>Designation:</strong> Staff Associate</div>
        </div>
        <div class="payslip-meta-block">
          <div><strong>Statement Period:</strong> ${monthNames[month]} ${year}</div>
          <div><strong>Total Working Days:</strong> ${payroll.workingDays} days</div>
          <div><strong>Present Days:</strong> ${payroll.presentDays} days</div>
        </div>
      </div>
      <table class="payslip-table">
        <thead>
          <tr>
            <th>Description of Allowances / Deductions</th>
            <th style="text-align:right">Earning Rate / Allowances</th>
            <th style="text-align:right">Deducted Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Base Fixed Monthly Salary</td>
            <td style="text-align:right">₹${payroll.baseSalary.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>House Rent Allowance (HRA)</td>
            <td style="text-align:right">₹${payroll.allowanceHRA.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>Travel Allowance</td>
            <td style="text-align:right">₹${payroll.allowanceTravel.toLocaleString()}</td>
            <td style="text-align:right">-</td>
          </tr>
          <tr>
            <td>Absent Penalties (${payroll.absentDays} days absent)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.absentDeduction.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Half-day Salary Deductions (${payroll.halfDays} occurrences)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.halfDayDeduction.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Provident Fund (PF) Deduction</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionPF.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Professional Tax (PT)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionPT.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Tax Deducted at Source (TDS) (${payroll.deductionTDS}%)</td>
            <td style="text-align:right">-</td>
            <td style="text-align:right;color:#ef4444">₹${payroll.deductionTDSVal.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>Net Disbursed Take-home Salary</td>
            <td style="text-align:right" colspan="2">₹${payroll.netSalary.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:40px;font-size:11px;color:#64748b">
        <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;width:120px;text-align:center">HR Dept Seal</div>
        <div style="border-top:1.5px solid #cbd5e1;padding-top:6px;width:120px;text-align:center">Signature of Recipient</div>
      </div>
    </div>
  `;
}

function renderEmployeeProfile() {
  const user = DB.getUser(Auth.getCurrentUser().id);
  const main = document.getElementById('main-view');

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">My Details</h1>
        <div class="content-subtitle">Complete your details and update your personal information.</div>
      </div>
    </div>
    <div class="content-body">
      <div style="max-width: 800px; margin: 0 auto;">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Personal Details</h3></div>
          <form id="profile-details-form">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px">
              <div class="form-group">
                <label class="form-label" for="prof-name">Full Name</label>
                <input class="form-input" type="text" id="prof-name" value="${Utils.escape(user.name)}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-empid">Employee ID</label>
                <input class="form-input" type="text" id="prof-empid" value="${Utils.escape(user.employeeId)}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-username">Username</label>
                <input class="form-input" type="text" id="prof-username" value="${Utils.escape(user.username)}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-email">Email Address</label>
                <input class="form-input" type="email" id="prof-email" value="${Utils.escape(user.email)}" placeholder="username@surya.group" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-phone">Mobile Number</label>
                <input class="form-input" type="text" id="prof-phone" value="${Utils.escape(user.phone)}" placeholder="+91 9999999999" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-dob">Date of Birth</label>
                <input class="form-input" type="date" id="prof-dob" value="${user.dob || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-gender">Gender</label>
                <select class="form-input" id="prof-gender" required>
                  <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${user.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-emergency">Emergency Contact</label>
                <input class="form-input" type="text" id="prof-emergency" value="${Utils.escape(user.emergencyContact || '')}" placeholder="Emergency contact phone" required>
              </div>
              <div class="form-group" style="grid-column:span 2">
                <label class="form-label" for="prof-address">Address</label>
                <input class="form-input" type="text" id="prof-address" value="${Utils.escape(user.address)}" placeholder="Street/Building info" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-city">City</label>
                <input class="form-input" type="text" id="prof-city" value="${Utils.escape(user.city)}" placeholder="e.g. Delhi" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-dept">Department</label>
                <input class="form-input" type="text" id="prof-dept" value="${Utils.escape(user.department || 'General')}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-designation">Designation</label>
                <input class="form-input" type="text" id="prof-designation" value="${Utils.escape(user.designation || 'Associate')}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-doj">Date of Joining</label>
                <input class="form-input" type="date" id="prof-doj" value="${user.dateOfJoining || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-hra">HRA Allowance (INR/Month)</label>
                <input class="form-input" type="number" id="prof-hra" value="${user.allowanceHRA !== undefined ? user.allowanceHRA : Math.round(user.baseSalary * 0.15)}">
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-travel">Travel Allowance (INR/Month)</label>
                <input class="form-input" type="number" id="prof-travel" value="${user.allowanceTravel !== undefined ? user.allowanceTravel : 3000}">
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-pf">Provident Fund (PF) (INR/Month)</label>
                <input class="form-input" type="number" id="prof-pf" value="${user.deductionPF !== undefined ? user.deductionPF : Math.round(user.baseSalary * 0.08)}">
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-pt">Professional Tax (PT)</label>
                <input class="form-input" type="number" id="prof-pt" value="${user.deductionPT !== undefined ? user.deductionPT : 200}">
              </div>
              <div class="form-group">
                <label class="form-label" for="prof-tds">TDS Tax Rate (%)</label>
                <input class="form-input" type="number" id="prof-tds" value="${user.deductionTDS !== undefined ? user.deductionTDS : 5}" min="0" max="100">
              </div>
            </div>
            <button class="btn" type="submit">Update Profile Info</button>
          </form>
          <div id="profile-alert" style="display:none;margin-top:12px"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('profile-details-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    const employeeId = document.getElementById('prof-empid').value.trim();
    const username = document.getElementById('prof-username').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const dob = document.getElementById('prof-dob').value;
    const gender = document.getElementById('prof-gender').value;
    const emergencyContact = document.getElementById('prof-emergency').value.trim();
    const address = document.getElementById('prof-address').value.trim();
    const city = document.getElementById('prof-city').value.trim();
    const department = document.getElementById('prof-dept').value.trim();
    const designation = document.getElementById('prof-designation').value.trim();
    const dateOfJoining = document.getElementById('prof-doj').value;

    const allowanceHRA = Number(document.getElementById('prof-hra').value);
    const allowanceTravel = Number(document.getElementById('prof-travel').value);
    const deductionPF = Number(document.getElementById('prof-pf').value);
    const deductionPT = Number(document.getElementById('prof-pt').value);
    const deductionTDS = Number(document.getElementById('prof-tds').value);

    DB.updateUserProfile(user.id, { 
      name, employeeId, username, email, phone, dob, gender, emergencyContact, address, city, department, designation, dateOfJoining,
      allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS
    });
    
    Auth.init(); // Refresh current session user object
    
    const alert = document.getElementById('profile-alert');
    alert.className = 'alert alert-success';
    alert.textContent = 'Profile details updated successfully!';
    alert.style.display = 'flex';
    setTimeout(() => { alert.style.display = 'none'; }, 3000);
    
    renderAppShell();
    renderEmployeeProfile();
  });
}

function renderEmployeeVerification() {
  const user = DB.getUser(Auth.getCurrentUser().id);
  const main = document.getElementById('main-view');

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Verification Documents</h1>
        <div class="content-subtitle">Manage your resume, Aadhaar, bank details, and identity verification folders.</div>
      </div>
    </div>
    <div class="content-body">
      <div style="max-width: 800px; margin: 0 auto;">
        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:15px">Verification Controls</h3>
            <button class="btn" id="btn-profile-upload-modal" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Upload Verification Doc</button>
          </div>
        </div>
        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">Resume / CV Attachment</h3>
            <button class="btn" id="btn-cv-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span id="cv-zone-title">${user.resume ? 'Replace Resume PDF' : 'Upload Resume PDF'}</span>
            </button>
            <input type="file" id="cv-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div id="cv-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="cv-progress-fill" style="width:0%;height:100%;background:var(--cyan);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="cv-file-display" style="margin-top:10px"></div>
        </div>
        
        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">Aadhar Card Attachment</h3>
            <button class="btn" id="btn-aadhar-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span id="aadhar-zone-title">${user.aadhar ? 'Replace Aadhaar Card' : 'Upload Aadhaar Card'}</span>
            </button>
            <input type="file" id="aadhar-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div id="aadhar-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="aadhar-progress-fill" style="width:0%;height:100%;background:var(--cyan);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="aadhar-file-display" style="margin-top:10px"></div>
        </div>

        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">Bank Details Attachment</h3>
            <button class="btn" id="btn-bank-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span id="bank-zone-title">${user.bankDetails ? 'Replace Bank Details' : 'Upload Bank Details'}</span>
            </button>
            <input type="file" id="bank-file-input" style="display:none" accept=".pdf,.jpg,.jpeg,.png">
          </div>
          <div id="bank-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="bank-progress-fill" style="width:0%;height:100%;background:var(--cyan);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="bank-file-display" style="margin-top:10px"></div>
        </div>

        <div class="card-panel doc-card-panel" style="margin-bottom:24px; padding: 15px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px;">
            <h3 class="card-panel-title" style="margin:0; font-size:14px">ID Identification Documents</h3>
            <button class="btn" id="btn-doc-upload-trigger" style="width:310px; font-size:12.5px; padding:8px 16px; background:var(--primary); color:var(--bg-app); font-weight:600; display:flex; justify-content:center; align-items:center; gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span>Attach ID Proof</span>
            </button>
            <input type="file" id="doc-file-input" style="display:none" accept=".jpg,.jpeg,.png,.pdf">
          </div>
          <div id="doc-progress-bar" style="display:none;background:rgba(255,255,255,0.05);height:10px;border-radius:5px;margin-top:12px;overflow:hidden">
            <div id="doc-progress-fill" style="width:0%;height:100%;background:var(--success);transition:width 0.1s"></div>
          </div>
          <div class="uploaded-files-list" id="docs-list-display" style="margin-top:10px"></div>
        </div>
      </div>
    </div>
  `;

  renderResumeDisplay(user.id);
  renderAadharDisplay(user.id);
  renderBankDetailsDisplay(user.id);
  renderDocumentsDisplay(user.id);

  const profileUploadBtn = document.getElementById('btn-profile-upload-modal');
  if (profileUploadBtn) {
    profileUploadBtn.addEventListener('click', () => {
      openUploadDocumentModal(user.id);
    });
  }

  const cvTrigger = document.getElementById('btn-cv-upload-trigger');
  const cvInput = document.getElementById('cv-file-input');
  if (cvTrigger) cvTrigger.addEventListener('click', () => cvInput.click());
  cvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'resume');
  });

  const aadharTrigger = document.getElementById('btn-aadhar-upload-trigger');
  const aadharInput = document.getElementById('aadhar-file-input');
  if (aadharTrigger) aadharTrigger.addEventListener('click', () => aadharInput.click());
  aadharInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'aadhar');
  });

  const bankTrigger = document.getElementById('btn-bank-upload-trigger');
  const bankInput = document.getElementById('bank-file-input');
  if (bankTrigger) bankTrigger.addEventListener('click', () => bankInput.click());
  bankInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'bank');
  });

  const docTrigger = document.getElementById('btn-doc-upload-trigger');
  const docInput = document.getElementById('doc-file-input');
  if (docTrigger) docTrigger.addEventListener('click', () => docInput.click());
  docInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleMockUpload(user.id, file, 'document');
  });
}

function renderResumeDisplay(userId) {
  const user = DB.getUser(userId);
  const cvDisplay = document.getElementById('cv-file-display');
  
  const cvTrigger = document.getElementById('btn-cv-upload-trigger');
  const cvTitleEl = document.getElementById('cv-zone-title');
  if (cvTrigger && cvTitleEl) {
    if (user.resume) {
      cvTrigger.style.background = 'rgba(255,255,255,0.05)';
      cvTrigger.style.color = 'var(--text-primary)';
      cvTrigger.style.border = '1px solid var(--border)';
      cvTitleEl.textContent = 'Replace CV Resume File';
    } else {
      cvTrigger.style.background = 'var(--primary)';
      cvTrigger.style.color = 'var(--bg-app)';
      cvTrigger.style.border = 'none';
      cvTitleEl.textContent = 'Click to Upload Resume PDF';
    }
  }

  if (!user.resume) {
    cvDisplay.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No Resume uploaded yet.</div>`;
    return;
  }
  cvDisplay.innerHTML = `
    <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(user.resume.name)}</div>
        <div class="file-item-meta">${user.resume.size} | ${user.resume.date}</div>
      </div>
      <div class="doc-actions-group" style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-secondary btn-xs" id="view-resume-btn" style="padding:4px 8px;font-size:11px">View</button>
        <button class="btn btn-secondary btn-xs" id="download-resume-btn" style="padding:4px 8px;font-size:11px">Download</button>
        <button class="btn btn-secondary btn-xs" id="replace-resume-btn" style="padding:4px 8px;font-size:11px">Replace</button>
        <button class="btn btn-delete-xs" id="delete-resume-btn" style="padding:4px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer">Delete</button>
      </div>
    </div>
  `;
  document.getElementById('view-resume-btn').addEventListener('click', () => showDocumentPreview(userId, 'resume'));
  document.getElementById('download-resume-btn').addEventListener('click', () => downloadDocumentSimulated(userId, 'resume'));
  document.getElementById('replace-resume-btn').addEventListener('click', () => document.getElementById('cv-file-input').click());
  document.getElementById('delete-resume-btn').addEventListener('click', () => {
    if (confirm('Delete CV resume?')) {
      DB.deleteResume(userId);
      renderResumeDisplay(userId);
    }
  });
}

function renderAadharDisplay(userId) {
  const user = DB.getUser(userId);
  const aadharDisplay = document.getElementById('aadhar-file-display');
  
  const aadharTrigger = document.getElementById('btn-aadhar-upload-trigger');
  const aadharTitleEl = document.getElementById('aadhar-zone-title');
  if (aadharTrigger && aadharTitleEl) {
    if (user.aadhar) {
      aadharTrigger.style.background = 'rgba(255,255,255,0.05)';
      aadharTrigger.style.color = 'var(--text-primary)';
      aadharTrigger.style.border = '1px solid var(--border)';
      aadharTitleEl.textContent = 'Replace Aadhar Card File';
    } else {
      aadharTrigger.style.background = 'var(--primary)';
      aadharTrigger.style.color = 'var(--bg-app)';
      aadharTrigger.style.border = 'none';
      aadharTitleEl.textContent = 'Click to Upload Aadhar Card PDF';
    }
  }

  if (!user.aadhar) {
    aadharDisplay.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No Aadhar Card uploaded yet.</div>`;
    return;
  }
  aadharDisplay.innerHTML = `
    <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="13" y2="16"></line></svg>
        <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(user.aadhar.name)}</div>
        <div class="file-item-meta">${user.aadhar.size} | ${user.aadhar.date}</div>
      </div>
      <div class="doc-actions-group" style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-secondary btn-xs" id="view-aadhar-btn" style="padding:4px 8px;font-size:11px">View</button>
        <button class="btn btn-secondary btn-xs" id="download-aadhar-btn" style="padding:4px 8px;font-size:11px">Download</button>
        <button class="btn btn-secondary btn-xs" id="replace-aadhar-btn" style="padding:4px 8px;font-size:11px">Replace</button>
        <button class="btn btn-delete-xs" id="delete-aadhar-btn" style="padding:4px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer">Delete</button>
      </div>
    </div>
  `;
  document.getElementById('view-aadhar-btn').addEventListener('click', () => showDocumentPreview(userId, 'aadhar'));
  document.getElementById('download-aadhar-btn').addEventListener('click', () => downloadDocumentSimulated(userId, 'aadhar'));
  document.getElementById('replace-aadhar-btn').addEventListener('click', () => document.getElementById('aadhar-file-input').click());
  document.getElementById('delete-aadhar-btn').addEventListener('click', () => {
    if (confirm('Delete Aadhar Card?')) {
      DB.deleteAadhar(userId);
      renderAadharDisplay(userId);
    }
  });
}

function renderBankDetailsDisplay(userId) {
  const user = DB.getUser(userId);
  const bankDisplay = document.getElementById('bank-file-display');
  
  const bankTrigger = document.getElementById('btn-bank-upload-trigger');
  const bankTitleEl = document.getElementById('bank-zone-title');
  if (bankTrigger && bankTitleEl) {
    if (user.bankDetails) {
      bankTrigger.style.background = 'rgba(255,255,255,0.05)';
      bankTrigger.style.color = 'var(--text-primary)';
      bankTrigger.style.border = '1px solid var(--border)';
      bankTitleEl.textContent = 'Replace Bank Details File';
    } else {
      bankTrigger.style.background = 'var(--primary)';
      bankTrigger.style.color = 'var(--bg-app)';
      bankTrigger.style.border = 'none';
      bankTitleEl.textContent = 'Click to Upload Cancelled Cheque / Passbook';
    }
  }

  if (!bankDisplay) return;
  if (!user.bankDetails) {
    bankDisplay.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No Bank Details uploaded yet.</div>`;
    return;
  }
  bankDisplay.innerHTML = `
    <div class="file-item" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><path d="M3 21h18M3 10h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 18h16M7 18v-4M12 18v-4M17 18v-4"></path></svg>
        <div class="file-item-name" style="flex:1;margin-left:8px">${Utils.escape(user.bankDetails.name)}</div>
        <div class="file-item-meta">${user.bankDetails.size} | ${user.bankDetails.date}</div>
      </div>
      <div class="doc-actions-group" style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-secondary btn-xs" id="view-bank-btn" style="padding:4px 8px;font-size:11px">View</button>
        <button class="btn btn-secondary btn-xs" id="download-bank-btn" style="padding:4px 8px;font-size:11px">Download</button>
        <button class="btn btn-secondary btn-xs" id="replace-bank-btn" style="padding:4px 8px;font-size:11px">Replace</button>
        <button class="btn btn-delete-xs" id="delete-bank-btn" style="padding:4px 8px;font-size:11px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:4px;cursor:pointer">Delete</button>
      </div>
    </div>
  `;
  document.getElementById('view-bank-btn').addEventListener('click', () => showDocumentPreview(userId, 'bank'));
  document.getElementById('download-bank-btn').addEventListener('click', () => downloadDocumentSimulated(userId, 'bank'));
  document.getElementById('replace-bank-btn').addEventListener('click', () => document.getElementById('bank-file-input').click());
  document.getElementById('delete-bank-btn').addEventListener('click', () => {
    if (confirm('Delete Bank Details?')) {
      DB.deleteBankDetails(userId);
      renderBankDetailsDisplay(userId);
    }
  });
}

function renderDocumentsDisplay(userId) {
  const user = DB.getUser(userId);
  const display = document.getElementById('docs-list-display');
  if (!user.documents || user.documents.length === 0) {
    display.innerHTML = `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:10px 0">No ID documents attached.</div>`;
    return;
  }
  display.innerHTML = user.documents.map(d => `
    <div class="file-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--primary);flex-shrink:0"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
      <div class="file-item-name">${Utils.escape(d.name)}</div>
      <div class="file-item-meta">${d.size} | ${d.date}</div>
      <button class="file-item-delete btn-delete-doc" data-docid="${d.id}" title="Remove" style="font-size:11px;background:none;border:none;color:#ef4444;cursor:pointer">Delete</button>
    </div>
  `).join('');
  display.querySelectorAll('.btn-delete-doc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.docid;
      if (confirm('Delete this ID proof?')) {
        DB.deleteDocument(userId, docId);
        renderDocumentsDisplay(userId);
      }
    });
  });
}

function handleMockUpload(userId, file, type) {
  let progressFill, progressBar;
  if (type === 'resume') {
    progressFill = document.getElementById('cv-progress-fill');
    progressBar = document.getElementById('cv-progress-bar');
  } else if (type === 'aadhar') {
    progressFill = document.getElementById('aadhar-progress-fill');
    progressBar = document.getElementById('aadhar-progress-bar');
  } else if (type === 'bank') {
    progressFill = document.getElementById('bank-progress-fill');
    progressBar = document.getElementById('bank-progress-bar');
  } else {
    progressFill = document.getElementById('doc-progress-fill');
    progressBar = document.getElementById('doc-progress-bar');
  }
  if (progressBar) progressBar.style.display = 'block';
  if (progressFill) progressFill.style.width = '0%';
  let percent = 0;
  const interval = setInterval(() => {
    percent += 10;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (percent >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        if (progressBar) progressBar.style.display = 'none';
        const sizeStr = (file.size / 1024).toFixed(0) + ' KB';
        if (type === 'resume') {
          DB.uploadResume(userId, file.name, sizeStr);
          const titleEl = document.getElementById('cv-zone-title');
          if (titleEl) titleEl.textContent = 'Replace CV Resume File';
        } else if (type === 'aadhar') {
          DB.uploadAadhar(userId, file.name, sizeStr);
          const titleEl = document.getElementById('aadhar-zone-title');
          if (titleEl) titleEl.textContent = 'Replace Aadhar Card File';
        } else if (type === 'bank') {
          DB.uploadBankDetails(userId, file.name, sizeStr);
          const titleEl = document.getElementById('bank-zone-title');
          if (titleEl) titleEl.textContent = 'Replace Bank Details File';
        } else {
          DB.uploadDocument(userId, file.name, sizeStr);
        }

        const currentHash = window.location.hash || '#login';
        if (currentHash === '#employee-profile' || currentHash === '#employee-verification') {
          renderResumeDisplay(userId);
          renderAadharDisplay(userId);
          renderBankDetailsDisplay(userId);
          renderDocumentsDisplay(userId);
        } else if (currentHash === '#admin-verification') {
          renderAdminVerificationView();
        }
      }, 300);
    }
  }, 80);
}

function showDocumentPreview(userId, docType) {
  const user = DB.getUser(userId);
  let doc = null;
  if (docType === 'resume') {
    doc = user.resume;
  } else if (docType === 'aadhar') {
    doc = user.aadhar;
  } else if (docType === 'bank') {
    doc = user.bankDetails;
  }
  if (!doc) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  let modalTitle = '';
  if (docType === 'resume') modalTitle = 'Resume / CV';
  else if (docType === 'aadhar') modalTitle = 'Aadhar Card';
  else if (docType === 'bank') modalTitle = 'Bank Details (Passbook / Cancelled Cheque)';

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 600px">
      <div class="modal-header">
        <h3 class="modal-title">${modalTitle} - Preview</h3>
        <button class="close-modal-btn" id="close-preview-modal-btn">✕</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;padding:20px;border:1px dashed var(--border);border-radius:var(--radius-md);background:rgba(255,255,255,0.02)">
        <div style="font-size:48px">${docType === 'resume' ? '📄' : (docType === 'aadhar' ? '🪪' : '🏦')}</div>
        <div style="font-weight:600;font-size:16px">${Utils.escape(doc.name)}</div>
        <div style="color:var(--text-muted);font-size:12px">${doc.size} | Uploaded on ${doc.date}</div>
        <hr style="width:100%;border:0;border-top:1px solid var(--border);margin:12px 0">
        <div style="width:100%;text-align:left;font-size:13px;line-height:1.6;color:var(--text-secondary)">
          <p><strong>Simulated File Contents:</strong></p>
          ${docType === 'resume' ? `
            <div style="background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;font-family:monospace">
              <strong>RESUME / CV</strong><br>
              Candidate Name: ${Utils.escape(user.name)}<br>
              Role: ${Utils.escape(user.designation || 'Software Engineer')}<br>
              Department: ${Utils.escape(user.department || 'Engineering')}<br>
              Email: ${Utils.escape(user.email || 'N/A')}<br>
              Phone: ${Utils.escape(user.phone || 'N/A')}<br><br>
              [MOCK RESUME DOCUMENT CONTENTS VERIFIED]
            </div>
          ` : docType === 'aadhar' ? `
            <div style="background:linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%);padding:16px;border-radius:8px;border:1px solid rgba(245,158,11,0.2);position:relative;font-family:'Inter',sans-serif;color:var(--text-secondary)">
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(245,158,11,0.2);padding-bottom:8px;margin-bottom:12px">
                <strong style="color:var(--primary)">GOVERNMENT OF INDIA</strong>
                <span style="font-size:10px;color:var(--text-muted)">Aadhaar Card Simulator</span>
              </div>
              <div style="display:flex;gap:16px;align-items:center">
                <div style="width:60px;height:75px;background:rgba(255,255,255,0.05);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:32px">👤</div>
                <div>
                  <div style="font-size:14px;font-weight:700;margin-bottom:4px">${Utils.escape(user.name)}</div>
                  <div style="font-size:11px">DOB: ${user.dob || 'N/A'}</div>
                  <div style="font-size:11px">Gender: ${user.gender || 'N/A'}</div>
                  <div style="font-size:11px">Address: ${Utils.escape(user.address || 'N/A')}, ${Utils.escape(user.city || '')}</div>
                </div>
              </div>
              <div style="text-align:center;margin-top:16px;font-size:15px;font-weight:700;letter-spacing:2px;color:var(--primary)">
                XXXX - XXXX - 1234
              </div>
            </div>
          ` : `
            <div style="background:rgba(0,0,0,0.2);padding:12px;border-radius:4px;font-family:monospace">
              <strong>BANK ACCOUNT DETAILS</strong><br>
              Account Holder: ${Utils.escape(user.name)}<br>
              Bank Name: State Bank of India<br>
              Account Number: XXXXXX9876<br>
              IFSC Code: SBIN0001234<br>
              Branch: New Delhi Main Branch<br><br>
              [MOCK BANK DOCUMENT CONTENTS VERIFIED]
            </div>
          `}
        </div>
      </div>
      <div class="modal-actions" style="margin-top:20px;display:flex;justify-content:flex-end;gap:12px">
        <button class="btn btn-secondary" id="close-preview-modal-btn2">Close</button>
        <button class="btn btn-cyan" id="btn-preview-download">Download File</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('close-preview-modal-btn').addEventListener('click', close);
  document.getElementById('close-preview-modal-btn2').addEventListener('click', close);
  document.getElementById('btn-preview-download').addEventListener('click', () => {
    downloadDocumentSimulated(userId, docType);
  });
}

function downloadDocumentSimulated(userId, docType) {
  const user = DB.getUser(userId);
  let doc = null;
  if (docType === 'resume') {
    doc = user.resume;
  } else if (docType === 'aadhar') {
    doc = user.aadhar;
  } else if (docType === 'bank') {
    doc = user.bankDetails;
  } else {
    doc = (user.documents || []).find(d => d.id === docType) || (user.documents && user.documents.length > 0 ? user.documents[0] : null);
  }
  if (!doc) return;

  const content = `Official Document Download: ${doc.name}\nUploaded by user: ${user.name} (${user.employeeId})\nUpload Date: ${doc.date}\nFile Size: ${doc.size}\nStatus: VERIFIED\n\n[MOCK FILE SYSTEM CONTENT CONTENT FOR SECURITY COMPLIANCE]`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.name.endsWith('.txt') ? doc.name : (doc.name.substring(0, doc.name.lastIndexOf('.')) + '_mock.txt');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderPersonalLeaves(userId) {
  const leaves = DB.getLeaveRequests(userId);
  const tbody = document.getElementById('leave-history-table-body');
  if (leaves.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No leaves applied yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = leaves.map(lv => {
    let statusClass = 'badge-pending';
    if (lv.status === 'Approved') statusClass = 'badge-approved';
    if (lv.status === 'Rejected') statusClass = 'badge-rejected';
    return `
      <tr>
        <td style="font-weight:500">${Utils.formatDate(lv.startDate)}<br><span style="font-size:11px;color:var(--text-secondary)">to ${Utils.formatDate(lv.endDate)}</span></td>
        <td>${lv.type}</td>
        <td><span class="badge ${statusClass}">${lv.status}</span></td>
        <td style="font-size:12px;color:var(--text-secondary)">
          <strong>Reason:</strong> ${Utils.escape(lv.reason)}
          ${lv.managerComment ? `<br><strong style="color:var(--primary)">Manager:</strong> ${Utils.escape(lv.managerComment)}` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function showLeaveAlert(msg, type) {
  const alert = document.getElementById('leave-alert');
  alert.className = `alert alert-${type}`;
  alert.textContent = msg;
  alert.style.display = 'flex';
  setTimeout(() => { alert.style.display = 'none'; }, 4000);
}

// Live ticking clocks
function startLiveClock() {
  const timeEl = document.getElementById('clock-live-time');
  const dateEl = document.getElementById('clock-live-date');
  const tick = () => {
    const now = new Date();
    if (timeEl) timeEl.textContent = now.toTimeString().split(' ')[0];
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };
  tick();
  if (activeTimer) clearInterval(activeTimer);
  activeTimer = setInterval(tick, 1000);
}

function startActiveWorkTimer(todayLog) {
  const timerEl = document.getElementById('active-work-timer');
  if (!timerEl) return;
  if (!todayLog || todayLog.checkOut) {
    timerEl.textContent = todayLog && todayLog.checkOut ? Utils.calculateDuration(todayLog.checkIn, todayLog.checkOut) : '00h 00m 00s';
    return;
  }
  const [inHour, inMin] = todayLog.checkIn.split(':').map(Number);
  const checkInDate = new Date();
  checkInDate.setHours(inHour, inMin, 0, 0);
  const update = () => {
    const diffMs = new Date() - checkInDate;
    if (diffMs < 0) { timerEl.textContent = '00h 00m 00s'; return; }
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    timerEl.textContent = `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };
  update();
  const durTimer = setInterval(() => {
    if (!document.getElementById('active-work-timer')) { clearInterval(durTimer); return; }
    update();
  }, 1000);
}

function triggerBiometricAuth(type) {
  const username = document.getElementById('username').value.trim();
  const employeeId = document.getElementById('login-empid').value.trim();
  if (!username && !employeeId) {
    const alert = document.getElementById('login-alert');
    alert.className = 'alert alert-error';
    alert.textContent = 'Please enter Username or Employee ID first.';
    alert.style.display = 'flex';
    return;
  }
  let user = null;
  if (username && employeeId) {
    const u = DB.getUserByUsername(username);
    if (u && u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase()) {
      user = u;
    }
  } else if (username) {
    user = DB.getUserByUsername(username);
  } else if (employeeId) {
    user = DB.getUsers().find(u => u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase());
  }

  if (!user) {
    const alert = document.getElementById('login-alert');
    alert.className = 'alert alert-error';
    alert.textContent = `User account not found.`;
    alert.style.display = 'flex';
    return;
  }
  if (!user.biometricRegistered || !user.biometricRegistered[type]) {
    const alert = document.getElementById('login-alert');
    alert.className = 'alert alert-error';
    alert.textContent = `${type === 'face' ? 'Face ID' : 'Fingerprint'} is not registered. Use standard login first.`;
    alert.style.display = 'flex';
    return;
  }
  openBiometricScanner(user.id, type, (success) => {
    if (success) {
      Auth.login(user.username, user.employeeId, user.password);
      window.location.hash = (user.role === 'hr' || user.role === 'manager') ? '#admin-dashboard' : '#dashboard';
    }
  });
}

function openBiometricScanner(userId, type, onComplete) {
  const body = document.body;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'biometric-modal';
  const title = type === 'face' ? 'Face Verification Scanning' : 'Fingerprint Auth Touchpad';
  let innerHTML = '';
  if (type === 'finger') {
    innerHTML = `
      <div class="biometric-scanner-box">
        <div class="fingerprint-trigger-area" id="fingerprint-scan-pad">
          <svg class="fingerprint-icon-svg" viewBox="0 0 24 24"><path d="M12,2C10.3,2,8.7,2.7,7.5,3.8C7.1,4.2,7.1,4.9,7.5,5.3c0.4,0.4,1,0.4,1.4,0c0.9-0.8,2.1-1.3,3.3-1.3s2.4,0.5,3.3,1.3c0.4,0.4,1,0.4,1.4,0c0.4-0.4,0.4-1.1,0-1.5C15.3,2.7,13.7,2,12,2z M12,6c-2.2,0-4,1.8-4,4v4c0,0.6-0.4,1-1,1s-1-0.4-1-1v-4c0-3.3,2.7-6,6-6s6,2.7,6,6v4c0,0.6-0.4,1-1,1s-1-0.4-1-1v-4C16,7.8,14.2,6,12,6z M12,14c-1.1,0-2-0.9-2-2v-2c0-1.1,0.9-2,2-2s2,0.9,2,2v2C14,13.1,13.1,14,12,14z M17,17c-0.6,0-1-0.4-1-1v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1C18,16.6,17.6,17,17,17z M7,17c-0.6,0-1-0.4-1-1v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1C8,16.6,7.6,17,7,17z M12,22c-2.8,0-5-2.2-5-5v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1c0,1.7,1.3,3,3,3s3-1.3,3-3v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1C17,19.8,14.8,22,12,22z"/></svg>
          <canvas id="fingerprint-canvas" style="position:absolute;top:0;left:0;pointer-events:none"></canvas>
        </div>
        <div class="scanner-hint-text" id="scanner-hint">PRESS AND HOLD ON THE FINGERPRINT READER</div>
      </div>
    `;
  } else {
    innerHTML = `
      <div class="biometric-scanner-box">
        <div class="camera-feed-container">
          <video id="face-video" class="camera-feed-video" autoplay playsinline muted></video>
          <canvas id="face-hud" class="camera-hud-canvas"></canvas>
        </div>
        <div class="scanner-hint-text">ALIGN YOUR FACE AND WAIT FOR MATCH RATIO</div>
      </div>
    `;
  }
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="close-modal-btn" id="close-scanner">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      ${innerHTML}
    </div>
  `;
  body.appendChild(modal);

  const cleanUpScanner = () => {
    if (currentScanner) {
      if (type === 'finger') currentScanner.cancel();
      else currentScanner.stop();
      currentScanner = null;
    }
  };

  document.getElementById('close-scanner').addEventListener('click', () => { cleanUpScanner(); modal.remove(); });

  if (type === 'finger') {
    const pad = document.getElementById('fingerprint-scan-pad');
    const canvas = document.getElementById('fingerprint-canvas');
    const hint = document.getElementById('scanner-hint');
    let holding = false;
    const startHold = () => {
      if (holding) return;
      holding = true;
      pad.classList.add('scanning');
      hint.textContent = 'SCANNING FINGERPRINT CORE...';
      currentScanner = Auth.simulateFingerprintScan(canvas, () => {}, () => {
        pad.classList.remove('scanning');
        pad.classList.add('success');
        hint.textContent = 'ACCESS GRANTED';
        setTimeout(() => { cleanUpScanner(); modal.remove(); onComplete(true); }, 800);
      });
    };
    const stopHold = () => { if (!holding) return; holding = false; pad.classList.remove('scanning'); hint.textContent = 'PRESS AND HOLD SCANNER PAD'; cleanUpScanner(); };
    pad.addEventListener('mousedown', startHold);
    pad.addEventListener('mouseup', stopHold);
    pad.addEventListener('mouseleave', stopHold);
    pad.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(); });
    pad.addEventListener('touchend', stopHold);
  } else {
    const video = document.getElementById('face-video');
    const canvas = document.getElementById('face-hud');
    Auth.startFaceScan(video, canvas, () => {}, () => {
      setTimeout(() => { cleanUpScanner(); modal.remove(); onComplete(true); }, 1200);
    }).then(scanner => currentScanner = scanner);
  }
}

function renderEmployeeSupport() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const tickets = DB.getTickets().filter(t => t.userId === user.id);

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Support Helpdesk</h1>
        <div class="content-subtitle">Submit requests or view responses from HR & Management.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split" style="grid-template-columns: 1fr 1.3fr">
        <!-- New Ticket Form -->
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Submit Support Ticket</h3></div>
          <form id="support-ticket-form">
            <div class="form-group">
              <label class="form-label" for="support-category">Issue Category</label>
              <select class="form-input" id="support-category" required>
                <option value="Attendance">Attendance Correction</option>
                <option value="Payroll">Payroll / Salary Deductions</option>
                <option value="Shift/Schedule">Shift / Work Schedule</option>
                <option value="Technical Issue">Technical Support</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="support-subject">Subject</label>
              <input class="form-input" type="text" id="support-subject" placeholder="Summary of the issue" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="support-message">Description</label>
              <textarea class="form-input" id="support-message" rows="5" placeholder="Detailed description of your issue..." required style="resize:vertical"></textarea>
            </div>
            <button class="btn" type="submit">Submit Ticket</button>
          </form>
          <div id="support-alert" class="alert alert-success" style="display:none;margin-top:15px"></div>
        </div>

        <!-- Ticket History -->
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Ticket History</h3></div>
          <div class="tickets-list" style="display:flex;flex-direction:column;gap:15px;max-height:500px;overflow-y:auto;padding-right:4px">
            ${tickets.length === 0 ? `
              <div style="text-align:center;color:var(--text-muted);padding:40px 0">No support tickets submitted yet.</div>
            ` : tickets.map(t => {
              const statusClass = t.status === 'Resolved' ? 'badge-on-time' : 'badge-absent';
              return `
                <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:15px;display:flex;flex-direction:column;gap:8px">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <span style="font-size:11px;color:var(--text-secondary)">Category: <strong>${t.category}</strong> | Date: ${t.date}</span>
                    <span class="badge ${statusClass}">${t.status}</span>
                  </div>
                  <h4 style="font-size:14px;color:var(--primary);margin:0">${Utils.escape(t.subject)}</h4>
                  <p style="font-size:12px;color:var(--text-primary);margin:0;line-height:1.4">${Utils.escape(t.message)}</p>
                  
                  ${t.responses.length > 0 ? `
                    <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:10px;margin-top:8px">
                      <div style="font-size:11px;color:var(--success);font-weight:700;margin-bottom:4px">Response from ${t.responses[0].responder} (${t.responses[0].date}):</div>
                      <div style="font-size:12px;color:var(--text-primary);line-height:1.4">${Utils.escape(t.responses[0].text)}</div>
                    </div>
                  ` : `
                    <div style="font-size:11px;color:var(--text-muted);font-style:italic;margin-top:4px">Waiting for response from HR Desk...</div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('support-ticket-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('support-category').value;
    const subject = document.getElementById('support-subject').value.trim();
    const message = document.getElementById('support-message').value.trim();

    DB.addTicket(user.id, category, subject, message);
    
    const alert = document.getElementById('support-alert');
    alert.textContent = 'Support ticket submitted successfully!';
    alert.style.display = 'flex';
    
    setTimeout(() => {
      renderEmployeeSupport();
    }, 1500);
  });
}

function renderAdminSupport() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const allTickets = DB.getTickets();
  const allUsers = DB.getUsers();

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Customer Support Tickets</h1>
        <div class="content-subtitle">Respond to technical issues, attendance corrections, and payroll queries.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel">
        <div class="card-panel-header"><h3 class="card-panel-title">Active Support Queue</h3></div>
        <div style="display:flex;flex-direction:column;gap:15px;margin-top:15px">
          ${allTickets.length === 0 ? `
            <div style="text-align:center;color:var(--text-muted);padding:40px 0">No tickets found in database.</div>
          ` : allTickets.map(t => {
            const ticketUser = allUsers.find(u => u.id === t.userId) || { name: 'Unknown User', employeeId: 'N/A' };
            const statusClass = t.status === 'Resolved' ? 'badge-on-time' : 'badge-absent';
            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px">
                  <span style="font-size:12px;color:var(--text-secondary)">
                    Submitted by: <strong>${Utils.escape(ticketUser.name)} (${ticketUser.employeeId})</strong> 
                    | Category: <strong>${t.category}</strong> 
                    | Date: ${t.date}
                  </span>
                  <span class="badge ${statusClass}">${t.status}</span>
                </div>
                <div>
                  <h4 style="font-size:15px;color:var(--primary);margin:0 0 6px 0">${Utils.escape(t.subject)}</h4>
                  <p style="font-size:13px;color:var(--text-primary);margin:0;line-height:1.4">${Utils.escape(t.message)}</p>
                </div>
                
                ${t.status === 'Open' ? `
                  <div style="margin-top:8px;border-top:1px dashed var(--border);padding-top:12px">
                    <div class="form-group" style="margin-bottom:8px">
                      <label class="form-label" style="font-size:11px">Response Text</label>
                      <textarea class="form-input" id="resp-text-${t.id}" rows="2" placeholder="Type response here..." required></textarea>
                    </div>
                    <button class="btn btn-xs btn-respond-ticket" data-id="${t.id}" style="width:auto;padding:6px 14px;font-size:12px">Submit Resolution</button>
                  </div>
                ` : `
                  <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius-sm);padding:12px;margin-top:8px">
                    <div style="font-size:11px;color:var(--success);font-weight:700;margin-bottom:4px">Response from ${t.responses[0].responder} (${t.responses[0].date}):</div>
                    <div style="font-size:12px;color:var(--text-primary);line-height:1.4">${Utils.escape(t.responses[0].text)}</div>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.btn-respond-ticket').forEach(btn => btn.addEventListener('click', (e) => {
    const btnElem = e.target.closest('.btn-respond-ticket');
    if (!btnElem) return;
    const ticketId = btnElem.dataset.id;
    const responseText = document.getElementById(`resp-text-${ticketId}`).value.trim();
    if (!responseText) {
      alert('Please type a response before submitting.');
      return;
    }

    const responderName = user.role === 'hr' ? 'HR Coordinator' : 'Operations Manager';
    DB.respondToTicket(ticketId, responderName, responseText);
    renderAdminSupport();
  }));
}

function renderAdminVerificationView() {
  const main = document.getElementById('main-view');
  const employees = DB.getUsers().filter(u => u.role === 'employee');

  main.innerHTML = `
    <div class="content-header" style="display:flex; justify-content:space-between; align-items:center">
      <div>
        <h1 class="content-title">Employee Onboarding Verification</h1>
        <div class="content-subtitle">Review onboarding documents and verification status.</div>
      </div>
      <div>
        <button class="btn" id="btn-admin-open-upload" style="width:auto; font-size:11px; padding:5px 10px; font-weight:600; background:var(--primary); color:var(--bg-app); display:flex; align-items:center; gap:6px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px; height:16px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> Upload Verification Document</button>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Resume / CV</th>
                <th>Aadhaar Card</th>
                <th>Bank Details</th>
                <th>ID Verification Docs</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(u => {
                const getDocStatusHTML = (doc, type) => {
                  if (!doc) {
                    return `<span class="badge badge-absent" style="font-size:11px">❌ Missing</span>`;
                  }
                  
                  if (type === 'document') {
                    if (Array.isArray(doc) && doc.length === 0) {
                      return `<span class="badge badge-absent" style="font-size:11px">❌ Missing</span>`;
                    }
                    const docObj = Array.isArray(doc) ? doc[0] : doc;
                    return `
                      <div style="display:flex; flex-direction:column; gap:4px">
                        <span class="badge badge-on-time" style="font-size:11px; width:fit-content">✅ Uploaded</span>
                        <div style="font-size:10px; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; max-width:150px" title="${Utils.escape(docObj.name)}">${Utils.escape(docObj.name)}</div>
                        <div style="display:flex; gap:6px; margin-top:2px">
                          <a href="#" class="btn-verify-download" data-userid="${u.id}" data-doctype="document" data-docid="${docObj.id}" style="color:var(--primary); text-decoration:none; font-size:11px; font-weight:600">Download</a>
                        </div>
                      </div>
                    `;
                  }

                  return `
                    <div style="display:flex; flex-direction:column; gap:4px">
                      <span class="badge badge-on-time" style="font-size:11px; width:fit-content">✅ Uploaded</span>
                      <div style="font-size:10px; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; max-width:150px" title="${Utils.escape(doc.name)}">${Utils.escape(doc.name)}</div>
                      <div style="display:flex; gap:6px; margin-top:2px">
                        <a href="#" class="btn-verify-view" data-userid="${u.id}" data-doctype="${type}" style="color:var(--primary); text-decoration:none; font-size:11px; font-weight:600; margin-right:8px">View</a>
                        <a href="#" class="btn-verify-download" data-userid="${u.id}" data-doctype="${type}" style="color:var(--primary); text-decoration:none; font-size:11px; font-weight:600">Download</a>
                      </div>
                    </div>
                  `;
                };

                const resumeHTML = getDocStatusHTML(u.resume, 'resume');
                const aadharHTML = getDocStatusHTML(u.aadhar, 'aadhar');
                const bankHTML = getDocStatusHTML(u.bankDetails, 'bank');
                const generalDocHTML = getDocStatusHTML(u.documents && u.documents.length > 0 ? u.documents[0] : null, 'document');

                const avatarLetters = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return `
                  <tr>
                    <td>
                      <div style="display:flex; align-items:center; gap:10px">
                        <div class="avatar" style="width:36px; height:36px; font-size:12px; margin:0">${avatarLetters}</div>
                        <div style="display:flex; flex-direction:column">
                          <strong style="font-size:14px">${Utils.escape(u.name)}</strong>
                          <span style="font-size:11px; color:var(--text-muted)">${Utils.escape(u.email || '')}</span>
                        </div>
                      </div>
                    </td>
                    <td style="font-weight:600">${Utils.escape(u.department || 'Engineering')}</td>
                    <td>${resumeHTML}</td>
                    <td>${aadharHTML}</td>
                    <td>${bankHTML}</td>
                    <td>${generalDocHTML}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-admin-open-upload').addEventListener('click', () => {
    openUploadDocumentModal();
  });

  document.querySelectorAll('.btn-verify-view').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = e.target.dataset.userid;
      const docType = e.target.dataset.doctype;
      showDocumentPreview(userId, docType);
    });
  });

  document.querySelectorAll('.btn-verify-download').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const userId = e.target.dataset.userid;
      const docType = e.target.dataset.doctype;
      
      if (docType === 'document') {
        const u = DB.getUser(userId);
        const doc = u.documents && u.documents.length > 0 ? u.documents[0] : null;
        if (doc) downloadDocumentSimulated(userId, doc.id);
      } else {
        downloadDocumentSimulated(userId, docType);
      }
    });
  });
}

function closeModal() {
  const modal = document.getElementById('biometric-modal') || document.querySelector('.modal-overlay');
  if (modal) {
    const closeBtn = modal.querySelector('.close-modal-btn');
    if (closeBtn) closeBtn.click();
    else modal.remove();
  }
}

function openUploadDocumentModal(preselectedUserId = null) {
  const isPreselected = preselectedUserId !== null;
  const currentSessionUser = Auth.getCurrentUser();
  const allEmployees = DB.getUsers().filter(u => u.role === 'employee');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  let employeeOptionsHTML = '';
  if (isPreselected) {
    const targetUser = DB.getUser(preselectedUserId);
    employeeOptionsHTML = `<option value="${targetUser.id}" selected>${Utils.escape(targetUser.name)} — ${Utils.escape(targetUser.department || 'Staff')}</option>`;
  } else {
    employeeOptionsHTML = allEmployees.map(u => 
      `<option value="${u.id}">${Utils.escape(u.name)} — ${Utils.escape(u.department || 'Staff')}</option>`
    ).join('');
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 500px">
      <div class="modal-header">
        <h3 class="modal-title">Upload verification document</h3>
        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
          <svg style="width:16px; height:16px; fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:20px">Attach a document to an employee profile.</div>
      
      <form id="verification-document-upload-form">
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" style="font-weight:600; font-size:12px; margin-bottom:6px" for="upload-doc-employee">Employee</label>
          <select class="form-input" id="upload-doc-employee" required ${isPreselected ? 'disabled' : ''}>
            ${employeeOptionsHTML}
          </select>
        </div>
        
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" style="font-weight:600; font-size:12px; margin-bottom:6px" for="upload-doc-type">Document type</label>
          <select class="form-input" id="upload-doc-type" required>
            <option value="resume">Resume / CV</option>
            <option value="aadhar">Aadhaar Card</option>
            <option value="bank">Bank Details (Cancelled Cheque / Passbook)</option>
            <option value="document">Government ID (PAN / Passport)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label" style="font-weight:600; font-size:12px; margin-bottom:6px" for="upload-doc-file">Document file</label>
          <input class="form-input" type="file" id="upload-doc-file" accept=".pdf,.jpg,.jpeg,.png" required style="padding:10px">
          <div style="font-size:10px; color:var(--text-muted); margin-top:6px; line-height:1.4">PDF or image, maximum 1 MB. Prototype storage is browser-local.</div>
        </div>

        <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:12px; border-top:1px solid var(--border); padding-top:15px; margin-top:20px">
          <button class="btn btn-secondary" type="button" style="width:auto; padding:8px 20px; font-size:13px" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn" type="submit" style="width:auto; padding:8px 20px; font-size:13px; background:var(--primary); color:var(--bg-app); font-weight:600">Upload document</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('verification-document-upload-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('upload-doc-employee').value;
    const docType = document.getElementById('upload-doc-type').value;
    const fileInput = document.getElementById('upload-doc-file');
    const file = fileInput.files[0];

    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    overlay.remove();
    handleMockUpload(userId, file, docType);
  });
}

function renderAdminDashboard() {
  const main = document.getElementById('main-view');
  const logs = DB.getLogs();
  const users = DB.getUsers().filter(u => u.role !== 'hr' && u.role !== 'manager');
  const leaves = DB.getLeaveRequests();
  const todayStr = new Date().toISOString().split('T')[0];
  const presentToday = logs.filter(l => l.date === todayStr && l.checkIn);
  const lateToday = presentToday.filter(l => l.status === 'Late');
  const onLeaveToday = leaves.filter(lv => lv.status === 'Approved' && todayStr >= lv.startDate && todayStr <= lv.endDate);
  
  const presentCount = presentToday.length;
  const lateCount = lateToday.length;
  const leaveCount = onLeaveToday.length;
  const totalEmployees = users.length;
  const absentCount = totalEmployees - presentCount - leaveCount;

  // Group today's checked-in employees by location for HR View
  const todayLogs = logs.filter(l => l.date === todayStr);
  const locationGroups = {
    'Delhi HQ Office': [],
    'Connaught Place Hub': [],
    'Noida Branch Home': []
  };

  todayLogs.forEach(l => {
    if (l.checkIn) {
      const u = DB.getUser(l.userId);
      if (u) {
        const loc = l.location || 'Delhi HQ Office';
        if (!locationGroups[loc]) {
          locationGroups[loc] = [];
        }
        locationGroups[loc].push({ id: u.id, name: u.name, time: l.checkIn, bio: l.biometricUsed });
      }
    }
  });

  const currentUser = Auth.getCurrentUser();
  let worksitePanelHTML = '';
  if (currentUser && (currentUser.role === 'hr' || currentUser.role === 'manager')) {
    worksitePanelHTML = `
      <div class="card-panel" style="margin-top:20px">
        <div class="card-panel-header">
          <h3 class="card-panel-title">🏢 Today's Worksite Distribution (Management View)</h3>
        </div>
        <div class="worksite-grid" style="display:grid;grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-top:15px">
          ${Object.entries(locationGroups).map(([locName, staffList]) => {
            let locIcon = '📍';
            if (locName.includes('HQ')) locIcon = '🏢';
            else if (locName.includes('Hub')) locIcon = '🏬';
            else if (locName.includes('Home')) locIcon = '🏠';

            const staffListHTML = staffList.length === 0
              ? `<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No staff checked in here today.</div>`
              : staffList.map(s => `
                  <div class="btn-view-staff-detail" data-id="${s.id}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(255,255,255,0.01);border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;cursor:pointer;transition:all 0.2s ease">
                    <span style="font-weight:600;color:var(--text-primary);text-decoration:underline">${Utils.escape(s.name)}</span>
                    <span style="font-size:11px;color:var(--text-secondary)">In: ${s.time} (${s.bio !== 'none' ? '🧬 ' + s.bio : '🔑 Pass'})</span>
                  </div>
                `).join('');

            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px">
                  <strong style="font-size:14px;color:var(--primary);display:flex;align-items:center;gap:6px">
                    <span>${locIcon}</span> ${locName}
                  </strong>
                  <span class="badge badge-on-time" style="padding:2px 8px;font-size:10px">${staffList.length} Present</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto">
                  ${staffListHTML}
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
        <h1 class="content-title">Live Attendance Monitoring</h1>
        <div class="content-subtitle">Real-time status tracking for workspace logs.</div>
      </div>
      <div><button class="btn btn-secondary" id="btn-admin-reset-db">Reset Demo Data</button></div>
    </div>
    <div class="content-body">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-blue">👥</div>
          <div class="stat-info"><span class="stat-value">${totalEmployees}</span><span class="stat-label">Total Staff</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-green">✅</div>
          <div class="stat-info"><span class="stat-value">${presentCount}</span><span class="stat-label">Present Now</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-amber">⏰</div>
          <div class="stat-info"><span class="stat-value">${lateCount}</span><span class="stat-label">Late Arrivals</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-red">❌</div>
          <div class="stat-info"><span class="stat-value">${absentCount < 0 ? 0 : absentCount}</span><span class="stat-label">Absent Today</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon-cyan">📁</div>
          <div class="stat-info"><span class="stat-value">${leaveCount}</span><span class="stat-label">Approved Leave</span></div>
        </div>
      </div>
      <div class="dashboard-split" style="grid-template-columns: 1.8fr 1fr">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Today's Live Attendance Feed</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>Checked In</th>
                  <th>Checked Out</th>
                  <th>Verification</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="live-feed-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Leave Request Alert Inbox</h3></div>
          <div id="admin-pending-leaves-box" style="display:flex;flex-direction:column;gap:12px"></div>
        </div>
      </div>
      ${worksitePanelHTML}
    </div>
  `;
  const feedBody = document.getElementById('live-feed-table-body');
  // todayLogs is pre-filtered at top
  if (todayLogs.length === 0) {
    feedBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No check-ins logged today.</td></tr>`;
  } else {
    feedBody.innerHTML = todayLogs.map(l => {
      const u = DB.getUser(l.userId);
      const sch = DB.getSchedule(u.scheduleId);
      let statusClass = 'badge-on-time';
      if (l.status === 'Late') statusClass = 'badge-late';
      if (l.status === 'Half Day') statusClass = 'badge-half-day';
      const devBadge = l.deviationFlag ? `<br><span class="badge badge-late" style="display:inline-block;margin-top:4px;padding:2px 6px;font-size:10px;font-weight:600">⚠️ Out of Geofence (${l.distance} km)</span>` : '';
      return `
        <tr>
          <td style="font-weight:600">${Utils.escape(u.name)}</td>
          <td>${sch ? Utils.escape(sch.name) : '-'}</td>
          <td>${l.checkIn || '--:--'}</td>
          <td>${l.checkOut || '--:--'}</td>
          <td style="text-transform:capitalize;font-size:12px;color:var(--text-secondary)">
            ${l.biometricUsed !== 'none' ? `🧬 ${l.biometricUsed}` : '🔑 Password'}
          </td>
          <td style="font-size:12px;color:var(--text-secondary)">
            ${Utils.escape(l.location || 'Office Headquarters')}
            ${devBadge}
          </td>
          <td><span class="badge ${statusClass}">${l.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  const pendingInbox = document.getElementById('admin-pending-leaves-box');
  const pendingLeaves = leaves.filter(lv => lv.status === 'Pending');
  if (pendingLeaves.length === 0) {
    pendingInbox.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--text-muted);font-size:13px">All leave folders are cleared.</div>`;
  } else {
    pendingInbox.innerHTML = pendingLeaves.map(lv => {
      const u = DB.getUser(lv.userId);
      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between">
            <strong style="font-size:14px">${Utils.escape(u.name)}</strong>
            <span class="badge badge-pending">${lv.type}</span>
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">
            Dates: ${Utils.formatDate(lv.startDate)} to ${Utils.formatDate(lv.endDate)}
          </div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.4">"${Utils.escape(lv.reason)}"</div>
          <div style="display:flex;gap:8px;margin-top:4px">
            <a href="#admin-approvals" class="btn" style="padding:6px 12px;font-size:12px;width:auto">Process Request</a>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('btn-admin-reset-db').addEventListener('click', () => {
    if (confirm('Reset mock database structures and clear edits?')) {
      DB.reset();
      renderAdminDashboard();
    }
  });

  // Bind worksite staff detail click actions
  document.querySelectorAll('.btn-view-staff-detail').forEach(el => {
    el.addEventListener('click', (e) => {
      const userId = el.getAttribute('data-id');
      openStaffDetailModal(userId);
    });
  });
}

function renderAdminUsers() {
  const main = document.getElementById('main-view');
  const users = DB.getUsers().filter(u => u.role !== 'hr' && u.role !== 'manager');
  const user = Auth.getCurrentUser();
  const addBtnHTML = user.role === 'hr' ? `<div><button class="btn" id="btn-add-user-modal">Add New Employee</button></div>` : '';

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Employee Registers & Payroll Setup</h1>
        <div class="content-subtitle">Manage company staff files, base salaries, and biometrics.</div>
      </div>
      ${addBtnHTML}
    </div>
    <div class="content-body">
      <div class="card-panel">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Username</th>
                <th>Security Password</th>
                <th>Assigned Shift</th>
                <th>Preferred Location</th>
                <th>Base Salary</th>
                <th>Biometrics</th>
                <th>Profile Controls</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const sch = DB.getSchedule(u.scheduleId);
                const hasFace = u.biometricRegistered?.face ? '✅ Configured' : '❌ Empty';
                const hasFinger = u.biometricRegistered?.finger ? '✅ Configured' : '❌ Empty';
                
                const actionsHTML = user.role === 'hr'
                  ? `
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-secondary btn-edit-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Edit Profile</button>
                      <button class="btn btn-cyan btn-bioreg-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Biometric Keys</button>
                      <button class="btn btn-danger btn-delete-user" data-id="${u.id}" style="padding:6px 10px;width:auto;font-size:11px">Delete</button>
                    </div>
                  `
                  : `
                    <div style="font-size:11px;color:var(--text-muted)">HR Control Only</div>
                  `;
                
                return `
                  <tr>
                    <td style="font-weight:600">${Utils.escape(u.name)}</td>
                    <td>${Utils.escape(u.username)}</td>
                    <td><code>${Utils.escape(u.password)}</code></td>
                    <td>${sch ? Utils.escape(sch.name) : '-'}</td>
                    <td style="font-size:12px;color:var(--text-secondary)">${Utils.escape(u.preferredLocation || 'Delhi HQ Office')}</td>
                    <td style="font-weight:700;color:var(--primary)">₹${(u.baseSalary || 50000).toLocaleString()}</td>
                    <td style="font-size:12px;line-height:1.4">
                      Face: <strong style="color:${u.biometricRegistered?.face ? 'var(--success)' : 'var(--error)'}">${hasFace}</strong><br>
                      Finger: <strong style="color:${u.biometricRegistered?.finger ? 'var(--success)' : 'var(--error)'}">${hasFinger}</strong>
                    </td>
                    <td>
                      ${actionsHTML}
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
  const addBtn = document.getElementById('btn-add-user-modal');
  if (addBtn) addBtn.addEventListener('click', () => openUserModal());
  document.querySelectorAll('.btn-edit-user').forEach(btn => btn.addEventListener('click', (e) => openUserModal(e.target.dataset.id)));
  document.querySelectorAll('.btn-bioreg-user').forEach(btn => btn.addEventListener('click', (e) => openBiometricsConfigModal(e.target.dataset.id)));
  document.querySelectorAll('.btn-delete-user').forEach(btn => btn.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    const u = DB.getUser(id);
    if (confirm(`Remove employee ${u.name}? All log items will be permanently cleared.`)) {
      DB.deleteUser(id);
      renderAdminUsers();
    }
  }));
}

function openUserModal(userId = null) {
  const isEdit = userId !== null;
  const user = isEdit ? DB.getUser(userId) : null;
  const schedules = DB.getSchedules();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 600px">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Modify Employee Profile' : 'Register New Employee'}</h3>
        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <form id="user-editor-form">
        <div class="form-group">
          <label class="form-label" for="editor-name">Full Name</label>
          <input class="form-input" type="text" id="editor-name" value="${isEdit ? Utils.escape(user.name) : ''}" required>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-username">Username</label>
            <input class="form-input" type="text" id="editor-username" value="${isEdit ? Utils.escape(user.username) : ''}" required ${isEdit ? 'disabled' : ''}>
          </div>
          <div>
            <label class="form-label" for="editor-gender">Gender</label>
            <select class="form-input" id="editor-gender" required>
              <option value="Male" ${isEdit && user.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${isEdit && user.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Other" ${isEdit && user.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-pass">Security Password</label>
            <input class="form-input" type="text" id="editor-pass" value="${isEdit ? Utils.escape(user.password) : ''}" required>
          </div>
          <div>
            <label class="form-label" for="editor-salary">Base Salary (INR/Month)</label>
            <input class="form-input" type="number" id="editor-salary" value="${isEdit ? (user.baseSalary || 50000) : 50000}" required>
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-hra" style="font-size:11px">HRA (INR/Month)</label>
            <input class="form-input" type="number" id="editor-hra" value="${isEdit ? (user.allowanceHRA !== undefined ? user.allowanceHRA : Math.round(user.baseSalary * 0.15)) : Math.round(50000 * 0.15)}">
          </div>
          <div>
            <label class="form-label" for="editor-travel" style="font-size:11px">Travel (INR/Month)</label>
            <input class="form-input" type="number" id="editor-travel" value="${isEdit ? (user.allowanceTravel !== undefined ? user.allowanceTravel : 3000) : 3000}">
          </div>
          <div>
            <label class="form-label" for="editor-pf" style="font-size:11px">PF (INR/Month)</label>
            <input class="form-input" type="number" id="editor-pf" value="${isEdit ? (user.deductionPF !== undefined ? user.deductionPF : Math.round(user.baseSalary * 0.08)) : Math.round(50000 * 0.08)}">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-pt" style="font-size:11px">Professional Tax (PT)</label>
            <input class="form-input" type="number" id="editor-pt" value="${isEdit ? (user.deductionPT !== undefined ? user.deductionPT : 200) : 200}">
          </div>
          <div>
            <label class="form-label" for="editor-tds" style="font-size:11px">TDS Tax Rate (%)</label>
            <input class="form-input" type="number" id="editor-tds" value="${isEdit ? (user.deductionTDS !== undefined ? user.deductionTDS : 5) : 5}" min="0" max="100">
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-dept">Department</label>
            <input class="form-input" type="text" id="editor-dept" value="${isEdit ? Utils.escape(user.department || '') : ''}" placeholder="e.g. Engineering" required>
          </div>
          <div>
            <label class="form-label" for="editor-desg">Designation</label>
            <input class="form-input" type="text" id="editor-desg" value="${isEdit ? Utils.escape(user.designation || '') : ''}" placeholder="e.g. Developer" required>
          </div>
        </div>
        <div class="form-group" style="display:grid;grid-template-columns: 1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="editor-doj">Date of Joining</label>
            <input class="form-input" type="date" id="editor-doj" value="${isEdit ? (user.dateOfJoining || '') : new Date().toISOString().split('T')[0]}" required>
          </div>
          <div>
            <label class="form-label" for="editor-emergency">Emergency Contact</label>
            <input class="form-input" type="text" id="editor-emergency" value="${isEdit ? Utils.escape(user.emergencyContact || '') : ''}" placeholder="+91 98765 00000" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="editor-role">Portal Access Role</label>
          <select class="form-input" id="editor-role" required>
            <option value="employee" ${isEdit && user.role === 'employee' ? 'selected' : ''}>Employee</option>
            <option value="hr" ${isEdit && user.role === 'hr' ? 'selected' : ''}>HR Coordinator</option>
            <option value="manager" ${isEdit && user.role === 'manager' ? 'selected' : ''}>Operations Manager</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="editor-schedule">Assigned Shift Schedule</label>
          <select class="form-input" id="editor-schedule" required>
            ${schedules.map(s => `<option value="${s.id}" ${isEdit && user.scheduleId === s.id ? 'selected' : ''}>${Utils.escape(s.name)} (${s.startTime}-${s.endTime})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="editor-preferred-location">Preferred Work Location</label>
          <select class="form-input" id="editor-preferred-location" required>
            <option value="Delhi HQ Office" ${isEdit && user.preferredLocation === 'Delhi HQ Office' ? 'selected' : ''}>Delhi HQ Office</option>
            <option value="Connaught Place Hub" ${isEdit && user.preferredLocation === 'Connaught Place Hub' ? 'selected' : ''}>Connaught Place Hub</option>
            <option value="Noida Branch Home" ${isEdit && user.preferredLocation === 'Noida Branch Home' ? 'selected' : ''}>Noida Branch Home</option>
          </select>
        </div>
        <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 15px; margin-top: 15px">
          <label class="form-label" style="font-weight: 700; color: var(--text-secondary)">Document Management</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px">
            <div>
              <label class="form-label" for="editor-resume" style="font-size: 11px">Resume / CV File</label>
              <input class="form-input" type="file" id="editor-resume" accept=".pdf,.jpg,.jpeg,.png">
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;" id="editor-resume-status">
                ${isEdit && user.resume ? `Current: ${Utils.escape(user.resume.name)} (${user.resume.size})` : 'No file attached'}
              </div>
            </div>
            <div>
              <label class="form-label" for="editor-aadhar" style="font-size: 11px">Aadhaar Card File</label>
              <input class="form-input" type="file" id="editor-aadhar" accept=".pdf,.jpg,.jpeg,.png">
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;" id="editor-aadhar-status">
                ${isEdit && user.aadhar ? `Current: ${Utils.escape(user.aadhar.name)} (${user.aadhar.size})` : 'No file attached'}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn" type="submit">${isEdit ? 'Save Changes' : 'Create User'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('user-editor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('editor-name').value.trim();
    const username = document.getElementById('editor-username').value.trim();
    const password = document.getElementById('editor-pass').value.trim();
    const baseSalary = Number(document.getElementById('editor-salary').value);
    const scheduleId = document.getElementById('editor-schedule').value;
    const role = document.getElementById('editor-role').value;
    const preferredLocation = document.getElementById('editor-preferred-location').value;
    const gender = document.getElementById('editor-gender').value;
    const department = document.getElementById('editor-dept').value.trim();
    const designation = document.getElementById('editor-desg').value.trim();
    const dateOfJoining = document.getElementById('editor-doj').value;
    const emergencyContact = document.getElementById('editor-emergency').value.trim();

    const allowanceHRA = Number(document.getElementById('editor-hra').value);
    const allowanceTravel = Number(document.getElementById('editor-travel').value);
    const deductionPF = Number(document.getElementById('editor-pf').value);
    const deductionPT = Number(document.getElementById('editor-pt').value);
    const deductionTDS = Number(document.getElementById('editor-tds').value);

    const rules = Auth.validatePassword(password);
    if (!rules.valid) {
      alert('Password must have minimum 6 chars, 1 uppercase, and 1 special symbol.');
      return;
    }

    const resumeFile = document.getElementById('editor-resume').files[0];
    const aadharFile = document.getElementById('editor-aadhar').files[0];

    let resumeObj = isEdit ? user.resume : null;
    let aadharObj = isEdit ? user.aadhar : null;

    if (resumeFile) {
      resumeObj = {
        name: resumeFile.name,
        size: (resumeFile.size / 1024).toFixed(0) + ' KB',
        date: new Date().toISOString().split('T')[0]
      };
    }
    if (aadharFile) {
      aadharObj = {
        name: aadharFile.name,
        size: (aadharFile.size / 1024).toFixed(0) + ' KB',
        date: new Date().toISOString().split('T')[0]
      };
    }

    if (isEdit) {
      DB.updateUser(userId, { name, password, baseSalary, scheduleId, role, preferredLocation, gender, department, designation, dateOfJoining, emergencyContact, resume: resumeObj, aadhar: aadharObj, allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS });
    } else {
      if (DB.getUserByUsernameOrId(username)) {
        alert('Username or Employee ID is already taken.');
        return;
      }
      DB.addUser({ name, username, password, role, baseSalary, scheduleId, preferredLocation, gender, department, designation, dateOfJoining, emergencyContact, resume: resumeObj, aadhar: aadharObj, allowanceHRA, allowanceTravel, deductionPF, deductionPT, deductionTDS });
    }
    overlay.remove();
    renderAdminUsers();
  });
}

function openBiometricsConfigModal(userId) {
  const user = DB.getUser(userId);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const faceReg = user.biometricRegistered?.face;
  const fingerReg = user.biometricRegistered?.finger;

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 420px">
      <div class="modal-header">
        <h3 class="modal-title">Biometric Setup: ${Utils.escape(user.name)}</h3>
        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);border:1px solid var(--border);padding:16px;border-radius:var(--radius-sm)">
          <div>
            <strong style="display:block;font-size:14px">Face Recognition ID</strong>
            <span style="font-size:12px;color:var(--text-secondary)" id="status-face-text">${faceReg ? '✅ Configured' : '❌ Empty'}</span>
          </div>
          <button class="btn btn-cyan" id="action-face-bioreg" style="width:auto;padding:8px 14px;font-size:13px">${faceReg ? 'Remove Face' : 'Register Face'}</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);border:1px solid var(--border);padding:16px;border-radius:var(--radius-sm)">
          <div>
            <strong style="display:block;font-size:14px">Fingerprint Registry</strong>
            <span style="font-size:12px;color:var(--text-secondary)" id="status-finger-text">${fingerReg ? '✅ Configured' : '❌ Empty'}</span>
          </div>
          <button class="btn btn-cyan" id="action-finger-bioreg" style="width:auto;padding:8px 14px;font-size:13px">${fingerReg ? 'Remove Print' : 'Register Print'}</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const faceBtn = document.getElementById('action-face-bioreg');
  const fingerBtn = document.getElementById('action-finger-bioreg');
  const faceTxt = document.getElementById('status-face-text');
  const fingerTxt = document.getElementById('status-finger-text');

  faceBtn.addEventListener('click', () => {
    const activeUser = DB.getUser(userId);
    const registered = activeUser.biometricRegistered?.face;
    if (registered) {
      Auth.unregisterBiometric(userId, 'face');
      faceBtn.textContent = 'Register Face';
      faceTxt.textContent = '❌ Empty';
    } else {
      Auth.registerBiometric(userId, 'face');
      faceBtn.textContent = 'Remove Face';
      faceTxt.textContent = '✅ Configured';
    }
    renderAdminUsers();
  });

  fingerBtn.addEventListener('click', () => {
    const activeUser = DB.getUser(userId);
    const registered = activeUser.biometricRegistered?.finger;
    if (registered) {
      Auth.unregisterBiometric(userId, 'finger');
      fingerBtn.textContent = 'Register Print';
      fingerTxt.textContent = '❌ Empty';
    } else {
      Auth.registerBiometric(userId, 'finger');
      fingerBtn.textContent = 'Remove Print';
      fingerTxt.textContent = '✅ Configured';
    }
    renderAdminUsers();
  });
}

function renderAdminSchedules() {
  const main = document.getElementById('main-view');
  const schedules = DB.getSchedules();
  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Shift Calendars & Shifts</h1>
        <div class="content-subtitle">Design active work hour calendars and assign shift profiles.</div>
      </div>
      <div><button class="btn" id="btn-add-schedule-modal">Add Shift Pattern</button></div>
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
            <div class="shift-meta-row"><span>Working Hours:</span><strong style="color:var(--text-primary)">${s.startTime} - ${s.endTime}</strong></div>
            <div class="shift-meta-row"><span>Grace Period:</span><strong style="color:var(--warning)">${s.gracePeriod} minutes</strong></div>
            <div class="shift-days-row">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => `<div class="day-bubble ${s.workDays.includes(i) ? 'active' : ''}">${day}</div>`).join('')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('btn-add-schedule-modal').addEventListener('click', () => openScheduleModal());
  document.querySelectorAll('.btn-edit-shift').forEach(btn => btn.addEventListener('click', (e) => {
    const btnElem = e.target.closest('.btn-edit-shift');
    if (btnElem) openScheduleModal(btnElem.dataset.id);
  }));
  document.querySelectorAll('.btn-delete-shift').forEach(btn => btn.addEventListener('click', (e) => {
    const btnElem = e.target.closest('.btn-delete-shift');
    if (!btnElem) return;
    const id = btnElem.dataset.id;
    if (confirm('Delete shift calendar?')) {
      const deleted = DB.deleteSchedule(id);
      if (!deleted) alert('Cannot delete the last shift.');
      renderAdminSchedules();
    }
  }));
}

function openScheduleModal(schedId = null) {
  const isEdit = schedId !== null;
  const sched = isEdit ? DB.getSchedule(schedId) : null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Edit Shift Pattern' : 'Create New Shift Calendar'}</h3>
        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <form id="schedule-form">
        <div class="form-group">
          <label class="form-label" for="sched-name">Shift Profile Name</label>
          <input class="form-input" type="text" id="sched-name" value="${isEdit ? Utils.escape(sched.name) : ''}" required placeholder="Day Shift">
        </div>
        <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="form-label" for="sched-start">Start Time</label>
            <input class="form-input" type="time" id="sched-start" value="${isEdit ? sched.startTime : '09:00'}" required>
          </div>
          <div>
            <label class="form-label" for="sched-end">End Time</label>
            <input class="form-input" type="time" id="sched-end" value="${isEdit ? sched.endTime : '17:00'}" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="sched-grace">Grace Period (Minutes)</label>
          <input class="form-input" type="number" id="sched-grace" value="${isEdit ? sched.gracePeriod : '15'}" min="0" max="60" required>
        </div>
        <div class="form-group">
          <label class="form-label">Working Days</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            ${days.map((d, idx) => `
              <label style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);padding:6px 12px;border-radius:16px;font-size:12px;cursor:pointer">
                <input type="checkbox" name="workdays" value="${idx}" ${isEdit && sched.workDays.includes(idx) ? 'checked' : (!isEdit && idx > 0 && idx < 6 ? 'checked' : '')}>
                ${d.substring(0,3)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn" type="submit">${isEdit ? 'Save Shift' : 'Create Shift'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('schedule-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sched-name').value.trim();
    const startTime = document.getElementById('sched-start').value;
    const endTime = document.getElementById('sched-end').value;
    const gracePeriod = Number(document.getElementById('sched-grace').value);
    const workDays = Array.from(document.querySelectorAll('input[name="workdays"]:checked')).map(cb => Number(cb.value));
    if (workDays.length === 0) { alert('Select working days.'); return; }
    if (isEdit) { DB.updateSchedule(schedId, { name, startTime, endTime, gracePeriod, workDays }); }
    else { DB.addSchedule({ name, startTime, endTime, gracePeriod, workDays }); }
    overlay.remove();
    renderAdminSchedules();
  });
}

function renderAdminApprovals() {
  const main = document.getElementById('main-view');
  const leaves = DB.getLeaveRequests();
  const swaps = DB.getShiftSwaps().filter(s => s.status === 'Pending Manager');
  const allSwaps = DB.getShiftSwaps();
  const allDeviations = DB.getLogs().filter(l => l.coords);

  const pendingLeavesCount = leaves.filter(l => l.status === 'Pending').length;
  const pendingSwapsCount = swaps.length;
  const pendingDeviationsCount = DB.getLogs().filter(l => l.deviationFlag).length;

  let tabContentHTML = '';

  if (activeAdminApprovalsTab === 'leaves') {
    tabContentHTML = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr><th>Employee</th><th>Leave Type</th><th>Duration Range</th><th>Reason Notes</th><th>Request Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${leaves.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No leaves registered.</td></tr>` : ''}
            ${leaves.map(lv => {
              const u = DB.getUser(lv.userId);
              let statusClass = 'badge-pending';
              if (lv.status === 'Approved') statusClass = 'badge-approved';
              if (lv.status === 'Rejected') statusClass = 'badge-rejected';
              return `
                <tr>
                  <td style="font-weight:600">${u ? Utils.escape(u.name) : 'Unknown'}</td>
                  <td><strong>${lv.type}</strong></td>
                  <td>${Utils.formatDate(lv.startDate)}<br><span style="font-size:11px;color:var(--text-secondary)">to ${Utils.formatDate(lv.endDate)}</span></td>
                  <td style="max-width:250px;font-size:12px;color:var(--text-secondary);line-height:1.4">"${Utils.escape(lv.reason)}"${lv.managerComment ? `<br><span style="color:var(--primary)"><strong>Comment:</strong> ${Utils.escape(lv.managerComment)}</span>` : ''}</td>
                  <td>${Utils.formatDate(lv.requestDate)}</td>
                  <td><span class="badge ${statusClass}">${lv.status}</span></td>
                  <td>
                    ${lv.status === 'Pending' ? `
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-success btn-approve-leave" data-id="${lv.id}" style="padding:6px 12px;width:auto;font-size:12px">Approve</button>
                        <button class="btn btn-danger btn-reject-leave" data-id="${lv.id}" style="padding:6px 12px;width:auto;font-size:12px">Reject</button>
                      </div>
                    ` : `<span style="font-size:11px;color:var(--text-muted)">Completed</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeAdminApprovalsTab === 'swaps') {
    tabContentHTML = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr><th>Requester</th><th>Coworker</th><th>Reason</th><th>Coworker Response</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${allSwaps.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">No shift swaps registered.</td></tr>` : ''}
            ${allSwaps.map(s => {
              const sender = DB.getUser(s.senderId);
              const receiver = DB.getUser(s.receiverId);
              const senderSched = sender ? DB.getSchedule(sender.scheduleId) : null;
              const receiverSched = receiver ? DB.getSchedule(receiver.scheduleId) : null;
              let statusClass = 'badge-pending';
              if (s.status === 'Pending Manager') statusClass = 'badge-approved';
              else if (s.status === 'Approved') statusClass = 'badge-approved';
              else if (s.status === 'Rejected') statusClass = 'badge-rejected';

              return `
                <tr>
                  <td style="font-weight:600">
                    ${sender ? Utils.escape(sender.name) : 'Unknown'}
                    <br><span style="font-size:11px;color:var(--text-secondary)">Shift: ${senderSched ? Utils.escape(senderSched.name) : 'None'}</span>
                  </td>
                  <td style="font-weight:600">
                    ${receiver ? Utils.escape(receiver.name) : 'Unknown'}
                    <br><span style="font-size:11px;color:var(--text-secondary)">Shift: ${receiverSched ? Utils.escape(receiverSched.name) : 'None'}</span>
                  </td>
                  <td style="font-size:12px;color:var(--text-secondary)">"${Utils.escape(s.reason)}"</td>
                  <td style="font-size:12px;color:var(--text-secondary)">"${Utils.escape(s.coworkerComment || 'No comment')}"</td>
                  <td><span class="badge ${statusClass}">${s.status}</span></td>
                  <td>
                    ${s.status === 'Pending Manager' ? `
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-success btn-approve-swap" data-id="${s.id}" style="padding:6px 12px;width:auto;font-size:12px">Approve</button>
                        <button class="btn btn-danger btn-reject-swap" data-id="${s.id}" style="padding:6px 12px;width:auto;font-size:12px">Reject</button>
                      </div>
                    ` : `<span style="font-size:11px;color:var(--text-muted)">${s.status === 'Pending Coworker' ? 'Awaiting Coworker' : 'Completed'}</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (activeAdminApprovalsTab === 'geofence') {
    tabContentHTML = `
      <div class="table-container">
        <table class="custom-table">
          <thead>
            <tr><th>Employee</th><th>Date/Time</th><th>Location</th><th>Coordinates (Distance)</th><th>Justification</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${allDeviations.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No remote check-ins logged.</td></tr>` : ''}
            ${allDeviations.map(l => {
              const u = DB.getUser(l.userId);
              let statusClass = 'badge-pending';
              if (l.status === 'On Time') statusClass = 'badge-approved';
              else if (l.status === 'Late' || l.status === 'Deviation Logged') statusClass = 'badge-rejected';

              return `
                <tr>
                  <td style="font-weight:600">${u ? Utils.escape(u.name) : 'Unknown'}</td>
                  <td>${Utils.formatDate(l.date)} at ${l.checkIn}</td>
                  <td>${Utils.escape(l.location)}</td>
                  <td>${l.coords} (${l.distance} km)</td>
                  <td style="max-width:200px;font-size:12px;color:var(--text-secondary)">"${Utils.escape(l.justification || 'None')}"${l.managerComment ? `<br><span style="color:var(--primary)"><strong>Comment:</strong> ${Utils.escape(l.managerComment)}</span>` : ''}</td>
                  <td>
                    ${l.deviationFlag 
                      ? `<span class="badge badge-pending">Pending Approval</span>`
                      : `<span class="badge ${statusClass}">${l.status === 'On Time' ? 'Excused' : 'Violation Flagged'}</span>`
                    }
                  </td>
                  <td>
                    ${l.deviationFlag ? `
                      <div style="display:flex;gap:6px">
                        <button class="btn btn-success btn-excuse-deviation" data-id="${l.id}" style="padding:6px 12px;width:auto;font-size:12px">Excuse</button>
                        <button class="btn btn-danger btn-violation-deviation" data-id="${l.id}" style="padding:6px 12px;width:auto;font-size:12px">Flag Violation</button>
                      </div>
                    ` : `<span style="font-size:11px;color:var(--text-muted)">Completed</span>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Approvals Desk</h1>
        <div class="content-subtitle">Authorize leaves, employee shift swaps, and geofence deviations.</div>
      </div>
    </div>
    <div class="content-body">
      <div style="display:flex;gap:12px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:10px">
        <button class="btn-tab-approval ${activeAdminApprovalsTab === 'leaves' ? 'active' : ''}" data-tab="leaves" style="background:none;border:none;padding:8px 16px;color:${activeAdminApprovalsTab === 'leaves' ? 'var(--primary)' : 'var(--text-secondary)'};cursor:pointer;font-weight:600;font-size:14px;border-bottom:${activeAdminApprovalsTab === 'leaves' ? '2px solid var(--primary)' : 'none'};transition:all 0.2s">
          Leave Requests (${pendingLeavesCount})
        </button>
        <button class="btn-tab-approval ${activeAdminApprovalsTab === 'swaps' ? 'active' : ''}" data-tab="swaps" style="background:none;border:none;padding:8px 16px;color:${activeAdminApprovalsTab === 'swaps' ? 'var(--primary)' : 'var(--text-secondary)'};cursor:pointer;font-weight:600;font-size:14px;border-bottom:${activeAdminApprovalsTab === 'swaps' ? '2px solid var(--primary)' : 'none'};transition:all 0.2s">
          Shift Swaps (${pendingSwapsCount})
        </button>
        <button class="btn-tab-approval ${activeAdminApprovalsTab === 'geofence' ? 'active' : ''}" data-tab="geofence" style="background:none;border:none;padding:8px 16px;color:${activeAdminApprovalsTab === 'geofence' ? 'var(--primary)' : 'var(--text-secondary)'};cursor:pointer;font-weight:600;font-size:14px;border-bottom:${activeAdminApprovalsTab === 'geofence' ? '2px solid var(--primary)' : 'none'};transition:all 0.2s">
          Geofence Deviations (${pendingDeviationsCount})
        </button>
      </div>

      <div class="card-panel">
        ${tabContentHTML}
      </div>
    </div>
  `;

  document.querySelectorAll('.btn-tab-approval').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeAdminApprovalsTab = e.target.getAttribute('data-tab');
      renderAdminApprovals();
    });
  });

  if (activeAdminApprovalsTab === 'leaves') {
    document.querySelectorAll('.btn-approve-leave').forEach(btn => btn.addEventListener('click', (e) => processLeaveRequest(e.target.dataset.id, 'Approved')));
    document.querySelectorAll('.btn-reject-leave').forEach(btn => btn.addEventListener('click', (e) => processLeaveRequest(e.target.dataset.id, 'Rejected')));
  }

  if (activeAdminApprovalsTab === 'swaps') {
    document.querySelectorAll('.btn-approve-swap').forEach(btn => btn.addEventListener('click', (e) => processManagerSwap(e.target.dataset.id, true)));
    document.querySelectorAll('.btn-reject-swap').forEach(btn => btn.addEventListener('click', (e) => processManagerSwap(e.target.dataset.id, false)));
  }

  if (activeAdminApprovalsTab === 'geofence') {
    document.querySelectorAll('.btn-excuse-deviation').forEach(btn => btn.addEventListener('click', (e) => processGeofenceDeviation(e.target.dataset.id, true)));
    document.querySelectorAll('.btn-violation-deviation').forEach(btn => btn.addEventListener('click', (e) => processGeofenceDeviation(e.target.dataset.id, false)));
  }
}

function processLeaveRequest(id, status) {
  const comment = prompt(`Add a manager comment:`);
  if (comment === null) return;
  DB.updateLeaveStatus(id, status, comment);
  renderAdminApprovals();
}

function processManagerSwap(swapId, approve) {
  const comment = prompt(`Add a manager comment (optional):`);
  if (comment === null) return;
  DB.respondToShiftSwapManager(swapId, approve, comment);
  renderAdminApprovals();
}

function processGeofenceDeviation(logId, excuse) {
  const comment = prompt(`Add a manager review comment (optional):`);
  if (comment === null) return;
  if (excuse) {
    DB.excuseDeviation(logId, comment);
  } else {
    DB.flagDeviationAsViolation(logId, comment);
  }
  renderAdminApprovals();
}

function renderAdminReports() {
  const main = document.getElementById('main-view');
  const today = new Date();
  let selectedMonth = today.getMonth();
  let selectedYear = today.getFullYear();

  main.innerHTML = `
    <div class="content-header" id="employee-payslip-tab-header">
      <div>
        <h1 class="content-title">Monthly Payroll & Attendance Ledger</h1>
        <div class="content-subtitle">Inspect aggregated logs, salary deductions, and print payslips.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="card-panel report-filter-bar" style="margin-bottom:24px">
        <div style="display:flex;gap:8px;align-items:center">
          <label class="form-label" style="margin:0" for="report-month">Period:</label>
          <select class="form-input" id="report-month" style="width:130px;padding:8px">
            ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => `<option value="${idx}" ${idx === selectedMonth ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <select class="form-input" id="report-year" style="width:100px;padding:8px">
            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
        <div style="margin-left:auto;display:flex;gap:12px">
          <button class="btn btn-secondary" id="btn-export-csv" style="padding:10px 18px;width:auto;font-size:13px">📥 Export CSV</button>
          <button class="btn btn-cyan" id="btn-print-report" style="padding:10px 18px;width:auto;font-size:13px">🖨️ Print Sheet</button>
        </div>
      </div>
      <div class="stats-grid" id="report-stats-box" style="margin-bottom:24px"></div>
      <div class="dashboard-split" style="grid-template-columns:1.8fr 1fr;margin-bottom:24px">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Staff Salary & Leave Ledger</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead><tr><th>Employee</th><th>Base Salary</th><th>Present/Absent</th><th>Deductions</th><th>Net Disbursed</th><th>Statement</th></tr></thead>
              <tbody id="report-table-body"></tbody>
            </table>
          </div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Monthly Punctuality Ratio</h3></div>
          <div class="svg-chart-container" id="report-chart-box"></div>
        </div>
      </div>
      <div id="admin-payslip-preview-drawer" style="display:none;margin-top:30px"></div>
    </div>
  `;
  const refreshReports = () => compileReports(selectedMonth, selectedYear);
  document.getElementById('report-month').addEventListener('change', (e) => { selectedMonth = Number(e.target.value); refreshReports(); });
  document.getElementById('report-year').addEventListener('change', (e) => { selectedYear = Number(e.target.value); refreshReports(); });
  document.getElementById('btn-export-csv').addEventListener('click', () => exportReportCSV(selectedMonth, selectedYear));
  document.getElementById('btn-print-report').addEventListener('click', () => window.print());
  refreshReports();
}

function compileReports(month, year) {
  const users = DB.getUsers().filter(u => u.role !== 'hr' && u.role !== 'manager');
  let grandGrossSalary = 0;
  let grandDeductions = 0;
  let grandNetPayout = 0;
  let totalPresentDays = 0;
  let totalLateDays = 0;

  const userPayrollData = users.map(u => {
    const p = DB.calculateMonthlyPayroll(u.id, month, year);
    grandGrossSalary += p.grossEarnings;
    grandDeductions += p.totalDeductions;
    grandNetPayout += p.netSalary;
    totalPresentDays += p.presentDays;
    totalLateDays += p.lateDays;
    return p;
  });

  document.getElementById('report-stats-box').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon stat-icon-blue">📁</div>
      <div class="stat-info"><span class="stat-value">₹${grandGrossSalary.toLocaleString()}</span><span class="stat-label">Gross Payroll Budget</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon-red">⏰</div>
      <div class="stat-info"><span class="stat-value">₹${grandDeductions.toLocaleString()}</span><span class="stat-label">Total Deductions (Leave & Tax)</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon stat-icon-green">⏱️</div>
      <div class="stat-info"><span class="stat-value">₹${grandNetPayout.toLocaleString()}</span><span class="stat-label">Net Salary Disbursed</span></div>
    </div>
  `;

  document.getElementById('report-table-body').innerHTML = userPayrollData.map(p => `
    <tr>
      <td style="font-weight:600">${Utils.escape(p.employeeName)}</td>
      <td>₹${p.baseSalary.toLocaleString()}</td>
      <td style="font-size:12px">Present: <strong>${p.presentDays}</strong>d<br>Absent: <span style="color:${p.absentDays > 0 ? 'var(--error)' : 'currentColor'}">${p.absentDays}</span>d</td>
      <td style="color:var(--error);font-weight:600">-₹${p.totalDeductions.toLocaleString()}</td>
      <td style="color:var(--success);font-weight:700">₹${p.netSalary.toLocaleString()}</td>
      <td><button class="btn btn-cyan btn-view-payslip-admin" data-id="${p.userId}" style="padding:6px 10px;width:auto;font-size:11px">Inspect</button></td>
    </tr>
  `).join('');

  renderReportChart(totalPresentDays, totalLateDays);

  document.querySelectorAll('.btn-view-payslip-admin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uId = e.target.dataset.id;
      const drawer = document.getElementById('admin-payslip-preview-drawer');
      drawer.style.display = 'block';
      const p = DB.calculateMonthlyPayroll(uId, month, year);
      const uDetails = DB.getUser(uId);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      drawer.innerHTML = `
        <div class="card-panel">
          <div class="card-panel-header" id="employee-payslip-tab-header">
            <h3 class="card-panel-title">Employee Payslip Preview</h3>
            <div style="display:flex;gap:10px">
              <button class="btn btn-cyan" id="btn-admin-print-single-payslip" style="padding:6px 12px;width:auto;font-size:12px">🖨️ Print Statement</button>
              <button class="btn btn-secondary" onclick="document.getElementById('admin-payslip-preview-drawer').style.display='none'" style="padding:6px 12px;width:auto;font-size:12px">Close</button>
            </div>
          </div>
          <div class="payslip-wrapper">
            <div class="payslip-header">
              <div>
                <div class="payslip-company-name">HS Group Delhi</div>
                <div class="payslip-company-desc">House of Surya | Employee Salary Statement</div>
              </div>
              <div class="payslip-title">PAYSLIP RECEIPT</div>
            </div>
            <div class="payslip-grid">
              <div class="payslip-meta-block">
                <div><strong>Employee Name:</strong> ${Utils.escape(p.employeeName)}</div>
                <div><strong>Account Code:</strong> ${p.userId}</div>
                <div><strong>Designation:</strong> ${Utils.escape(uDetails.designation || 'Staff Associate')}</div>
              </div>
              <div class="payslip-meta-block">
                <div><strong>Statement Period:</strong> ${monthNames[month]} ${year}</div>
                <div><strong>Total Working Days:</strong> ${p.workingDays} days</div>
                <div><strong>Present Days:</strong> ${p.presentDays} days</div>
              </div>
            </div>
            <table class="payslip-table">
              <thead>
                <tr>
                  <th>Description of Allowances / Deductions</th>
                  <th style="text-align:right">Earning Rate / Allowances</th>
                  <th style="text-align:right">Deducted Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Fixed Monthly Salary</td>
                  <td style="text-align:right">₹${p.baseSalary.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td style="text-align:right">₹${p.allowanceHRA.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Travel Allowance</td>
                  <td style="text-align:right">₹${p.allowanceTravel.toLocaleString()}</td>
                  <td style="text-align:right">-</td>
                </tr>
                <tr>
                  <td>Absent Penalties (${p.absentDays} days absent)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.absentDeduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Half-day Salary Deductions (${p.halfDays} occurrences)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.halfDayDeduction.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Provident Fund (PF) Deduction</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionPF.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Professional Tax (PT)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionPT.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Tax Deducted at Source (TDS) (${p.deductionTDS}%)</td>
                  <td style="text-align:right">-</td>
                  <td style="text-align:right;color:#ef4444">₹${p.deductionTDSVal.toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>Net Salary Disbursed</td>
                  <td style="text-align:right" colspan="2">₹${p.netSalary.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      document.getElementById('btn-admin-print-single-payslip').addEventListener('click', () => window.print());
      drawer.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function renderReportChart(present, late) {
  const chartBox = document.getElementById('report-chart-box');
  const onTime = present - late;
  const onTimePct = present > 0 ? Math.round((onTime / present) * 100) : 0;
  const latePct = present > 0 ? Math.round((late / present) * 100) : 0;
  chartBox.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">
      <svg width="150" height="150" viewBox="0 0 36 36" style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="4"></circle>
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--success)" stroke-width="4" stroke-dasharray="${onTimePct} ${100 - onTimePct}" stroke-dashoffset="25"></circle>
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" stroke-width="4" stroke-dasharray="${latePct} ${100 - latePct}" stroke-dashoffset="${25 - onTimePct}"></circle>
      </svg>
      <div style="display:flex;gap:16px;margin-top:16px;font-size:12px">
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--success)"></span>On-Time (${onTimePct}%)</span>
        <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--primary)"></span>Late (${latePct}%)</span>
      </div>
    </div>
  `;
}

function exportReportCSV(month, year) {
  const users = DB.getUsers().filter(u => u.role !== 'hr' && u.role !== 'manager');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const filename = `HS_Group_Payroll_Report_${monthNames[month]}_${year}.csv`;
  const headers = ['Employee Name', 'Base Salary', 'HRA', 'Travel Allowance', 'Working Days', 'Days Present', 'Absent Days', 'Half Days', 'Absent/Half-Day Deductions', 'PF Deduction', 'PT Deduction', 'TDS Deduction', 'Net Disbursed Payout'];
  const rows = users.map(u => {
    const p = DB.calculateMonthlyPayroll(u.id, month, year);
    return [p.employeeName, p.baseSalary, p.allowanceHRA, p.allowanceTravel, p.workingDays, p.presentDays, p.absentDays, p.halfDays, p.attendanceDeductions, p.deductionPF, p.deductionPT, p.deductionTDSVal, p.netSalary];
  });
  Utils.exportToCSV(filename, headers, rows);
}

function openGuidelinesModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 480px;animation: scaleUp 0.3s ease">
      <div class="modal-header">
        <h3 class="modal-title">Company Shift Guidelines</h3>
        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.5">
        <p style="margin-bottom: 15px">Please review the standard shift schedules and leave parameters for HS Group Delhi (House of Surya):</p>
        <div class="guidelines-list">
          <div class="guideline-item">
            <span class="guideline-icon">📅</span>
            <div class="guideline-details">
              <strong>Work Week Shift</strong>
              <span>Monday to Saturday working days (Sunday weekly off).</span>
            </div>
          </div>
          <div class="guideline-item">
            <span class="guideline-icon">⏱️</span>
            <div class="guideline-details">
              <strong>Shift Timings</strong>
              <span>09:00 AM to 07:00 PM standard office hours.</span>
            </div>
          </div>
          <div class="guideline-item">
            <span class="guideline-icon">🌴</span>
            <div class="guideline-details">
              <strong>Monthly Leave Cap</strong>
              <span>Maximum of 2 approved paid leaves per month. Absences beyond this limit are subject to daily rate deduction.</span>
            </div>
          </div>
          <div class="guideline-item">
            <span class="guideline-icon">📍</span>
            <div class="guideline-details">
              <strong>Office Attendance Rules</strong>
              <span>Must be checked in from preferred office coordinates or headquarters location for biometric mapping.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions" style="margin-top:20px">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()">Understood & Accept</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function openStaffDetailModal(userId) {
  const user = DB.getUser(userId);
  if (!user) return;
  const schedule = DB.getSchedule(user.scheduleId);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const avatarLetters = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Biometrics info
  const hasFace = user.biometricRegistered?.face ? 'Configured' : 'Not Registered';
  const hasFinger = user.biometricRegistered?.finger ? 'Configured' : 'Not Registered';

  // Workdays description
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const workDaysStr = schedule.workDays && schedule.workDays.length > 0
    ? schedule.workDays.map(d => dayNames[d]).join(', ')
    : 'None';

  // Documents list HTML
  let documentsHTML = '';
  if (user.resume) {
    documentsHTML += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
        <div>
          <strong style="font-size:12px;color:var(--text-primary)">Resume / CV</strong>
          <div style="font-size:10px;color:var(--text-muted)">${Utils.escape(user.resume.name)} (${user.resume.size})</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-cyan btn-view-doc" data-type="resume" style="padding:4px 10px;font-size:11px;width:auto">View</button>
          <button class="btn btn-secondary btn-download-doc" data-type="resume" style="padding:4px 10px;font-size:11px;width:auto">Download</button>
        </div>
      </div>
    `;
  }
  if (user.aadhar) {
    documentsHTML += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
        <div>
          <strong style="font-size:12px;color:var(--text-primary)">Aadhaar Card</strong>
          <div style="font-size:10px;color:var(--text-muted)">${Utils.escape(user.aadhar.name)} (${user.aadhar.size})</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-cyan btn-view-doc" data-type="aadhar" style="padding:4px 10px;font-size:11px;width:auto">View</button>
          <button class="btn btn-secondary btn-download-doc" data-type="aadhar" style="padding:4px 10px;font-size:11px;width:auto">Download</button>
        </div>
      </div>
    `;
  }
  if (user.documents && user.documents.length > 0) {
    user.documents.forEach(doc => {
      documentsHTML += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px">
          <div>
            <strong style="font-size:12px;color:var(--text-primary)">Gov ID Proof</strong>
            <div style="font-size:10px;color:var(--text-muted)">${Utils.escape(doc.name)} (${doc.size})</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-download-doc" data-type="document" data-docid="${doc.id}" style="padding:4px 10px;font-size:11px;width:auto">Download</button>
          </div>
        </div>
      `;
    });
  }
  if (!documentsHTML) {
    documentsHTML = `<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:12px;border:1px dashed var(--border);border-radius:var(--radius-sm)">No verification documents uploaded.</div>`;
  }

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 750px; max-height: 90vh; overflow-y: auto; padding: 28px">
      <div class="modal-header" style="border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 20px">
        <div style="display:flex; align-items:center; gap:12px">
          <div class="avatar" style="width:44px; height:44px; font-size:14px; margin:0">${avatarLetters}</div>
          <div>
            <h3 class="modal-title" style="margin:0; font-size:18px">${Utils.escape(user.name)}</h3>
            <div style="font-size:12px; color:var(--text-muted)">Employee Code: <strong>${Utils.escape(user.employeeId)}</strong> | Role: ${Utils.escape(user.role)}</div>
          </div>
        </div>
        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px">
        
        <!-- Column 1: Personal Details & Shifts -->
        <div style="display:flex; flex-direction:column; gap:16px">
          
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Personal Information</h4>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--text-secondary)">
              <div><strong>Department:</strong> ${Utils.escape(user.department || 'N/A')}</div>
              <div><strong>Designation:</strong> ${Utils.escape(user.designation || 'N/A')}</div>
              <div><strong>Email:</strong> ${Utils.escape(user.email || 'N/A')}</div>
              <div><strong>Phone:</strong> ${Utils.escape(user.phone || 'N/A')}</div>
              <div><strong>Date of Birth:</strong> ${user.dob || 'N/A'}</div>
              <div><strong>Gender:</strong> ${user.gender || 'N/A'}</div>
              <div><strong>Date of Joining:</strong> ${user.dateOfJoining || 'N/A'}</div>
              <div><strong>Home Address:</strong> ${Utils.escape(user.address || 'N/A')}, ${Utils.escape(user.city || '')}</div>
              <div><strong>Emergency Contact:</strong> ${Utils.escape(user.emergencyContact || 'N/A')}</div>
            </div>
          </div>
 
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Work Shift Schedule</h4>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--text-secondary)">
              <div><strong>Shift Name:</strong> ${Utils.escape(schedule.name)}</div>
              <div><strong>Working Hours:</strong> ${schedule.startTime} to ${schedule.endTime}</div>
              <div><strong>Grace Period:</strong> ${schedule.gracePeriod} minutes</div>
              <div><strong>Working Days:</strong> ${workDaysStr}</div>
              <div><strong>Preferred Location:</strong> ${Utils.escape(user.preferredLocation || 'Delhi HQ Office')}</div>
            </div>
          </div>
 
          ${(() => {
            const logs = DB.getLogs(user.id);
            const latestLog = logs && logs.length > 0 ? logs[0] : null;
            if (latestLog && latestLog.coords) {
              return `
                <div style="background:rgba(239,68,68,0.02); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-md); padding:16px; margin-top:16px">
                  <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--error)">Out of Geofence Deviation (Latest)</h4>
                  <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--text-secondary)">
                    <div><strong>Location:</strong> ${Utils.escape(latestLog.location)}</div>
                    <div><strong>Deviation Coords:</strong> ${latestLog.coords} (${latestLog.distance} km)</div>
                    <div style="line-height:1.4"><strong>Justification:</strong> "${Utils.escape(latestLog.justification || 'None')}"</div>
                    ${latestLog.managerComment ? `<div style="color:var(--primary);font-weight:600">Comment: ${Utils.escape(latestLog.managerComment)}</div>` : ''}
                  </div>
                </div>
              `;
            }
            return '';
          })()}
 
        </div>
 
        <!-- Column 2: Payroll, Biometrics & Documents -->
        <div style="display:flex; flex-direction:column; gap:16px">
          
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Corporate Payroll Settings</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px; color:var(--text-secondary)">
              <div><strong>Base Salary:</strong> <span style="color:var(--text-primary)">₹${(user.baseSalary || 50000).toLocaleString()}</span></div>
              <div><strong>HRA Allowance:</strong> <span style="color:var(--text-primary)">₹${(user.allowanceHRA !== undefined ? user.allowanceHRA : Math.round(user.baseSalary * 0.15)).toLocaleString()}</span></div>
              <div><strong>Travel Allowance:</strong> <span style="color:var(--text-primary)">₹${(user.allowanceTravel !== undefined ? user.allowanceTravel : 3000).toLocaleString()}</span></div>
              <div><strong>Provident Fund (PF):</strong> <span style="color:var(--text-primary)">₹${(user.deductionPF !== undefined ? user.deductionPF : Math.round(user.baseSalary * 0.08)).toLocaleString()}</span></div>
              <div><strong>Professional Tax:</strong> <span style="color:var(--text-primary)">₹${(user.deductionPT !== undefined ? user.deductionPT : 200).toLocaleString()}</span></div>
              <div><strong>TDS Tax Rate:</strong> <span style="color:var(--text-primary)">${user.deductionTDS !== undefined ? user.deductionTDS : 5}%</span></div>
            </div>
          </div>
 
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Biometric Key Config</h4>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--text-secondary)">
              <div><strong>Face Identification:</strong> ${hasFace}</div>
              <div><strong>Fingerprint Scanner:</strong> ${hasFinger}</div>
            </div>
          </div>
 
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); border-radius:var(--radius-md); padding:16px">
            <h4 style="margin:0 0 12px 0; font-size:14px; color:var(--primary)">Verification Attachments</h4>
            <div style="display:flex; flex-direction:column; gap:6px">
              ${documentsHTML}
            </div>
          </div>

        </div>

      </div>

      <div class="modal-actions" style="margin-top:20px; border-top:1px solid var(--border); padding-top:14px; display:flex; justify-content:flex-end">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()" style="width:auto; padding:8px 24px">Close Details</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add click events inside modal
  overlay.querySelectorAll('.btn-view-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      showDocumentPreview(userId, type);
    });
  });

  overlay.querySelectorAll('.btn-download-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const docId = btn.getAttribute('data-docid');
      if (type === 'document') {
        downloadDocumentSimulated(userId, docId);
      } else {
        downloadDocumentSimulated(userId, type);
      }
    });
  });
}

// -------------------------------------------------------------
// EMPLOYEE SHIFT SWAPS DESK UI
// -------------------------------------------------------------
function renderEmployeeSwapsView() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');
  const coworkers = DB.getUsers().filter(u => u.id !== user.id && u.role !== 'hr' && u.role !== 'manager');
  const userSchedule = DB.getSchedule(user.scheduleId);

  main.innerHTML = `
    <div class="content-header">
      <div>
        <h1 class="content-title">Shift Swap Requests Desk</h1>
        <div class="content-subtitle">Request shift swaps with coworkers, and manage incoming requests.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split" style="grid-template-columns:1fr 1.5fr">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Request a Shift Swap</h3></div>
          <div style="background:rgba(251,191,36,0.05);border-left:4px solid var(--primary);padding:12px;border-radius:6px;margin-bottom:16px;font-size:13px;line-height:1.4">
            <strong>My Current Shift:</strong> ${userSchedule ? Utils.escape(userSchedule.name) : 'None'} (${userSchedule ? userSchedule.startTime : ''} - ${userSchedule ? userSchedule.endTime : ''})
          </div>
          <form id="shift-swap-request-form">
            <div class="form-group">
              <label class="form-label" for="swap-coworker">Select Coworker</label>
              <select class="form-input" id="swap-coworker" required>
                <option value="">-- Choose Coworker --</option>
                ${coworkers.map(c => {
                  const s = DB.getSchedule(c.scheduleId);
                  return `<option value="${c.id}">${Utils.escape(c.name)} [${s ? Utils.escape(s.name) : 'No Shift'}]</option>`;
                }).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="swap-reason">Reason for Swap</label>
              <textarea class="form-input" id="swap-reason" placeholder="Describe why you want to swap shifts..." rows="3" required style="resize:vertical"></textarea>
            </div>
            <button class="btn" type="submit">Submit Swap Request</button>
          </form>
          <div id="swap-alert" style="display:none;margin-top:12px"></div>
        </div>

        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Shift Swap Requests Ledger</h3></div>
          <div style="margin-bottom:20px">
            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text-primary)">📥 Received Requests</h4>
            <div class="table-container">
              <table class="custom-table" id="received-swaps-table">
                <thead><tr><th>Sender</th><th>Their Shift</th><th>Reason Notes</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody id="received-swaps-tbody"></tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text-primary)">📤 Sent Requests</h4>
            <div class="table-container">
              <table class="custom-table" id="sent-swaps-table">
                <thead><tr><th>Coworker</th><th>Their Shift</th><th>Reason Notes</th><th>Status</th></tr></thead>
                <tbody id="sent-swaps-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderEmployeeSwapsData(user.id);

  document.getElementById('shift-swap-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const coworkerId = document.getElementById('swap-coworker').value;
    const reason = document.getElementById('swap-reason').value.trim();
    if (!coworkerId) {
      showSwapAlert('Please select a coworker.', 'error');
      return;
    }
    DB.submitShiftSwap(user.id, coworkerId, reason);
    showSwapAlert('Shift swap request submitted successfully!', 'success');
    document.getElementById('shift-swap-request-form').reset();
    renderEmployeeSwapsData(user.id);
  });
}

function renderEmployeeSwapsData(userId) {
  const receivedTbody = document.getElementById('received-swaps-tbody');
  const sentTbody = document.getElementById('sent-swaps-tbody');
  const swaps = DB.getShiftSwaps();

  const received = swaps.filter(s => s.receiverId === userId);
  const sent = swaps.filter(s => s.senderId === userId);

  receivedTbody.innerHTML = received.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No received requests.</td></tr>` : received.map(s => {
    const sender = DB.getUser(s.senderId);
    const senderSchedule = sender ? DB.getSchedule(sender.scheduleId) : null;
    let statusClass = 'badge-pending';
    if (s.status === 'Pending Manager') statusClass = 'badge-approved';
    else if (s.status === 'Approved') statusClass = 'badge-approved';
    else if (s.status === 'Rejected') statusClass = 'badge-rejected';

    return `
      <tr>
        <td style="font-weight:600">${sender ? Utils.escape(sender.name) : 'Unknown'}</td>
        <td>${senderSchedule ? Utils.escape(senderSchedule.name) : 'None'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">"${Utils.escape(s.reason)}"${s.coworkerComment ? `<br><span style="color:var(--text-secondary)"><strong>My response:</strong> ${Utils.escape(s.coworkerComment)}</span>` : ''}</td>
        <td><span class="badge ${statusClass}">${s.status}</span></td>
        <td>
          ${s.status === 'Pending Coworker' ? `
            <div style="display:flex;gap:4px">
              <button class="btn btn-success btn-accept-swap" data-id="${s.id}" style="padding:4px 8px;font-size:11px;width:auto">Accept</button>
              <button class="btn btn-danger btn-reject-swap" data-id="${s.id}" style="padding:4px 8px;font-size:11px;width:auto">Reject</button>
            </div>
          ` : `<span style="font-size:11px;color:var(--text-muted)">Completed</span>`}
        </td>
      </tr>
    `;
  }).join('');

  sentTbody.innerHTML = sent.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No sent requests.</td></tr>` : sent.map(s => {
    const receiver = DB.getUser(s.receiverId);
    const receiverSchedule = receiver ? DB.getSchedule(receiver.scheduleId) : null;
    let statusClass = 'badge-pending';
    if (s.status === 'Pending Manager') statusClass = 'badge-approved';
    else if (s.status === 'Approved') statusClass = 'badge-approved';
    else if (s.status === 'Rejected') statusClass = 'badge-rejected';

    return `
      <tr>
        <td style="font-weight:600">${receiver ? Utils.escape(receiver.name) : 'Unknown'}</td>
        <td>${receiverSchedule ? Utils.escape(receiverSchedule.name) : 'None'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">"${Utils.escape(s.reason)}"${s.coworkerComment ? `<br><span style="color:var(--text-secondary)"><strong>Coworker:</strong> ${Utils.escape(s.coworkerComment)}</span>` : ''}${s.managerComment ? `<br><span style="color:var(--primary)"><strong>Manager:</strong> ${Utils.escape(s.managerComment)}</span>` : ''}</td>
        <td><span class="badge ${statusClass}">${s.status}</span></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.btn-accept-swap').forEach(btn => btn.addEventListener('click', (e) => processCoworkerSwap(e.target.dataset.id, true)));
  document.querySelectorAll('.btn-reject-swap').forEach(btn => btn.addEventListener('click', (e) => processCoworkerSwap(e.target.dataset.id, false)));
}

function processCoworkerSwap(swapId, accept) {
  const comment = prompt(`Add a response comment (optional):`);
  if (comment === null) return;
  DB.respondToShiftSwapCoworker(swapId, accept, comment);
  renderEmployeeSwapsView();
}

function showSwapAlert(msg, type) {
  const alert = document.getElementById('swap-alert');
  alert.style.display = 'block';
  alert.style.padding = '10px';
  alert.style.borderRadius = '4px';
  alert.style.fontSize = '13px';
  alert.style.marginBottom = '12px';
  if (type === 'success') {
    alert.style.background = 'rgba(16,185,129,0.1)';
    alert.style.color = 'var(--success)';
    alert.style.border = '1px solid var(--success)';
  } else {
    alert.style.background = 'rgba(239,68,68,0.1)';
    alert.style.color = 'var(--error)';
    alert.style.border = '1px solid var(--error)';
  }
  alert.innerText = msg;
  setTimeout(() => { alert.style.display = 'none'; }, 4000);
}
