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
        <div style="text-align:right;">
          <div style="font-weight:700; font-size:13.5px; color:var(--text-primary);">${Utils.escape(user.name)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${roleTitle}</div>
        </div>
        <button id="btn-navbar-logout" class="btn btn-secondary" style="font-size:12px; padding:6px 14px;">Logout</button>
      </div>
    </header>
  `;
}
