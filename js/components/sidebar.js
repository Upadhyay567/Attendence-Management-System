// js/components/sidebar.js - Role-Based Navigation Sidebar Component
import { Auth } from '../core/auth.js';
import { html } from '../utils/helpers.js';

export function renderSidebar() {
  const user = Auth.getCurrentUser();
  if (!user) return '';

  const isHr = user.role === 'hr';
  const isManager = user.role === 'manager';
  const isFinance = user.role === 'finance_manager';

  return html`
    <aside class="sidebar-nav" style="width: 240px; background: var(--bg-surface); border-right: 1px solid var(--border); padding: 20px 12px; display: flex; flex-direction: column; gap: 8px;">
      <a href="#dashboard" class="nav-item">📊 Dashboard</a>
      
      ${(isHr || isManager) ? `<a href="#admin-dashboard" class="nav-item">📈 Live Monitoring</a>` : ''}
      ${(isHr || isManager) ? `<a href="#users" class="nav-item">👥 Employee Directory</a>` : ''}
      ${(isHr || isManager) ? `<a href="#schedules" class="nav-item">📅 Shift Schedules</a>` : ''}
      ${(isHr || isManager) ? `<a href="#admin-approvals" class="nav-item">📝 Leave Approvals</a>` : ''}
      ${isFinance ? `<a href="#finance" class="nav-item">💼 Finance & Payroll</a>` : ''}
    </aside>
  `;
}
