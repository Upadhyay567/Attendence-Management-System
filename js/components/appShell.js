// js/components/appShell.js - Main Application Frame Shell
import { renderNavbar } from './navbar.js';
import { renderSidebar } from './sidebar.js';
import { Auth } from '../core/auth.js';

export function renderAppShell() {
  const root = document.getElementById('app-root');
  if (!root) return;

  root.innerHTML = `
    <div class="app-layout" style="display: flex; flex-direction: column; min-height: 100vh;">
      ${renderNavbar()}
      <div style="display: flex; flex: 1;">
        ${renderSidebar()}
        <main id="main-view" class="main-content" style="flex: 1; padding: 24px; overflow-y: auto;">
          <!-- Active view will be rendered here -->
        </main>
      </div>
    </div>
  `;

  const logoutBtn = document.getElementById('btn-navbar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.hash = '#login';
    });
  }
}
