// js/components/navbar.js - Top Navigation Bar Component
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';

export function renderNavbar() {
  const user = Auth.getCurrentUser();
  if (!user) return '';

  const roleTitle = user.role === 'hr' ? 'HR Admin Manager' : (user.role === 'manager' ? 'Operations Manager' : (user.role === 'finance_manager' ? 'Finance Manager' : 'Employee'));

  return html`
    <header class="top-navbar" style="display:flex; justify-content:space-between; align-items:center; padding: 14px 28px; background: rgba(15,23,42,0.9); border-bottom: 1px solid var(--border); backdrop-filter: blur(10px);">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="/surya-logo.png" alt="Surya Logo" style="height:32px; object-fit:contain;" onerror="this.style.display='none'">
        <span style="font-weight:800; font-size:16px; color:var(--primary); letter-spacing:0.02em;">HS GROUP</span>
      </div>

      <div style="display:flex; align-items:center; gap:16px;">
        <!-- Header Notification Bell Button for Instant Alerts -->
        <div class="notification-widget" style="position:relative">
          <button id="btn-notifications-toggle" class="top-nav-icon-btn" title="Notifications" style="background:rgba(255,255,255,0.04); border:1px solid var(--border); color:var(--text-primary); padding:8px 12px; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700;">
            <span>🔔</span>
            <span style="font-size:11.5px">Alerts</span>
            <span class="top-nav-badge" id="notification-count" style="display:none; background:var(--error, #ef4444); color:#ffffff; font-size:10px; font-weight:800; padding:1px 6px; border-radius:10px; margin-left:2px">0</span>
          </button>
          
          <div id="notifications-dropdown" style="display:none; position:absolute; top:100%; right:0; width:340px; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.5); z-index:1001; margin-top:10px;">
            <div style="padding:14px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center">
              <strong style="font-size:13.5px; color:var(--text-primary)">Profile & System Alerts</strong>
            </div>
            <div id="notifications-list" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column">
              <!-- populated dynamically -->
            </div>
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-weight:700; font-size:13.5px; color:var(--text-primary);">${Utils.escape(user.name)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${roleTitle}</div>
        </div>
        <button id="btn-navbar-logout" class="btn btn-secondary" style="font-size:12px; padding:6px 14px;">Logout</button>
      </div>
    </header>
  `;
}
