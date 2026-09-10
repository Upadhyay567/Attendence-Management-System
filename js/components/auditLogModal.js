// js/components/auditLogModal.js - Security Audit Trail Table Modal
import { Utils, html } from '../utils/helpers.js';
import { closeModal } from './modals.js';

export function showAuditLogModal(logs) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '999999';

  let logsHTML = '';
  if (!logs || logs.length === 0) {
    logsHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px 0; color:var(--text-muted);">No security audit logs recorded yet.</td></tr>';
  } else {
    logsHTML = logs.slice(0, 100).map(log => {
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
      const actionBadge = log.action ? `<span class="badge badge-neutral" style="font-family:monospace; font-size:11px; padding:3px 8px;">${Utils.escape(log.action)}</span>` : '—';
      const userStr = log.userName ? `${Utils.escape(log.userName)} (${Utils.escape(log.userRole || 'User')})` : (log.userId || 'System');
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '—');
      const ipStr = log.ipAddress || '127.0.0.1';

      return `<tr>
        <td style="font-size:12px; white-space:nowrap; padding:12px; text-align:left; color:var(--text-secondary);">${timeStr}</td>
        <td style="padding:12px; text-align:left;">${actionBadge}</td>
        <td style="font-size:13px; font-weight:600; padding:12px; text-align:left;">${userStr}</td>
        <td style="font-size:11.5px; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:12px; text-align:left;" title="${Utils.escape(detailsStr)}">${Utils.escape(detailsStr)}</td>
        <td style="font-size:11px; font-family:monospace; padding:12px; text-align:center; color:var(--text-muted);">${Utils.escape(ipStr)}</td>
      </tr>`;
    }).join('');
  }

  overlay.innerHTML = html`
    <div class="modal-content" style="max-width: 900px; width:92%; padding: 24px;">
      <div class="modal-header" style="margin-bottom: 20px;">
        <h3 class="modal-title" style="font-size: 20px; font-weight: 700; display:flex; align-items:center; gap:8px">
          <span>🛡️</span> Security & Compliance Audit Log
        </h3>
        <button class="close-modal-btn" onclick="closeModal(this.closest('.modal-overlay'))" style="border:none; background:none; cursor:pointer;">
          <svg style="width:20px;height:20px;fill:var(--text-secondary)" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div class="modal-body" style="max-height: 65vh; overflow-y: auto; margin-top:10px">
        <div class="table-container" style="border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden;">
          <table class="custom-table" style="width:100%; border-collapse: collapse; font-size:13px;">
            <thead>
              <tr style="background: rgba(243, 237, 230, 0.5); border-bottom:1px solid var(--border);">
                <th style="text-align:left; padding:12px;">Timestamp</th>
                <th style="text-align:left; padding:12px;">Action</th>
                <th style="text-align:left; padding:12px;">User / Role</th>
                <th style="text-align:left; padding:12px;">Details</th>
                <th style="text-align:center; padding:12px;">IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${logsHTML}
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))" style="width:auto; padding:8px 20px;">Close Window</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });

  document.body.appendChild(overlay);
}
