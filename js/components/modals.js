// js/components/modals.js - Universal Modal Engine & Lightbox

export function closeModal(overlay) {
  if (!overlay || overlay.classList.contains('closing')) return;
  overlay.classList.add('closing');
  overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
}
window.closeModal = closeModal;

export function openFullScreenImageModal(imageSrc) {
  if (!imageSrc) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 15, 29, 0.95); backdrop-filter: blur(15px);
    display: flex; justify-content: center; align-items: center; z-index: 11000;
    cursor: zoom-out; animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;
  overlay.innerHTML = html`
    <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; justify-content: center; align-items: center;" onclick="event.stopPropagation();">
      <img src="${imageSrc}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 2px solid rgba(251, 191, 36, 0.4); max-height: 85vh;">
      <button id="btn-close-fullscreen-view" style="position: absolute; top: -45px; right: 0; background: none; border: none; color: #fff; font-size: 36px; cursor: pointer; font-weight: 700;">&times;</button>
    </div>
  `;
  const closeView = () => closeModal(overlay);
  overlay.addEventListener('click', closeView);
  const btnClose = overlay.querySelector('#btn-close-fullscreen-view');
  if (btnClose) btnClose.addEventListener('click', closeView);
  document.body.appendChild(overlay);
}
window.openFullScreenImageModal = openFullScreenImageModal;

export function showNotificationDetailModal(notif) {
  if (!notif) return;

  // Remove any existing notification detail modals first to avoid stacking
  document.querySelectorAll('.modal-overlay.notif-detail-overlay').forEach(el => el.remove());

  const isLight = document.body.classList.contains('light-theme');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay notif-detail-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh;
    background: ${isLight ? 'rgba(15, 23, 42, 0.65)' : 'rgba(10, 15, 29, 0.88)'};
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    display: flex; justify-content: center; align-items: center; z-index: 999999;
    animation: fadeIn 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    cursor: pointer; padding: 20px; box-sizing: border-box;
  `;

  const category = notif.category || 'Notification';
  let badgeColor = isLight 
    ? 'background:rgba(16,185,129,0.12); color:#047857; border:1px solid rgba(16,185,129,0.3)'
    : 'background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3)';
  if (category === 'General') badgeColor = isLight 
    ? 'background:rgba(217,119,6,0.12); color:#b45309; border:1px solid rgba(217,119,6,0.3)'
    : 'background:rgba(251,191,36,0.15); color:#fbbf24; border:1px solid rgba(251,191,36,0.3)';
  if (category === 'Update' || category === 'Request') badgeColor = isLight 
    ? 'background:rgba(14,165,233,0.12); color:#0369a1; border:1px solid rgba(14,165,233,0.3)'
    : 'background:rgba(6,182,212,0.15); color:#06b6d4; border:1px solid rgba(6,182,212,0.3)';
  if (category === 'Urgent' || category === 'Finance') badgeColor = isLight 
    ? 'background:rgba(225,29,72,0.12); color:#be123c; border:1px solid rgba(225,29,72,0.3)'
    : 'background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3)';
  if (category === 'Swap') badgeColor = isLight 
    ? 'background:rgba(124,58,237,0.12); color:#6d28d9; border:1px solid rgba(124,58,237,0.3)'
    : 'background:rgba(139,92,246,0.15); color:#8b5cf6; border:1px solid rgba(139,92,246,0.3)';

  const titleText = notif.title || 'System Notification';
  const descText = notif.content || notif.desc || notif.message || 'No additional message content.';
  const dateText = notif.date || new Date().toISOString().split('T')[0];
  const authorText = notif.author || (notif.sender ? notif.sender : '');

  const modalBg = isLight ? '#ffffff' : '#18181c';
  const modalBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)';
  const modalShadow = isLight ? '0 20px 50px rgba(0,0,0,0.22)' : '0 25px 60px rgba(0,0,0,0.75)';
  const titleColor = isLight ? '#0f172a' : '#f8fafc';
  const descBg = isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)';
  const descBorder = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)';
  const descTextClr = isLight ? '#334155' : '#cbd5e1';
  const subTextClr = isLight ? '#64748b' : '#94a3b8';
  const dividerClr = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const closeBtnBg = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)';
  const closeBtnBorder = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.14)';
  const closeBtnText = isLight ? '#334155' : '#f8fafc';
  const closeXBg = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)';
  const closeXBorder = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)';

  const modal = document.createElement('div');
  modal.className = 'modal-content card-panel';
  modal.style.cssText = `
    max-width: 520px; width: 92%; padding: 26px;
    background: ${modalBg} !important;
    border: 1px solid ${modalBorder} !important;
    border-radius: 20px; box-shadow: ${modalShadow} !important;
    display: flex; flex-direction: column; gap: 18px;
    position: relative; margin: 0 !important; cursor: default;
    animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  `;

  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid ${dividerClr}; padding-bottom:14px">
      <div style="display:flex; flex-direction:column; gap:6px; max-width:85%">
        <div style="display:flex; align-items:center; gap:8px">
          <span class="badge" style="font-size:11px; padding:3px 10px; border-radius:12px; font-weight:700; ${badgeColor}">${escapeHTML(category)}</span>
          <div style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; color:${subTextClr}; vertical-align:middle; line-height:1">
            <span>📅</span><span>${escapeHTML(dateText)}</span>
          </div>
        </div>
        <h3 style="font-size:18px; font-weight:800; color:${titleColor}; margin:4px 0 0 0; line-height:1.35">${escapeHTML(titleText)}</h3>
      </div>
      <button id="btn-close-notif-modal-x" style="background:${closeXBg}; border:1px solid ${closeXBorder}; width:32px; height:32px; border-radius:50%; font-size:18px; color:${subTextClr}; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0">&times;</button>
    </div>

    <div style="background:${descBg}; border:1px solid ${descBorder}; border-radius:14px; padding:18px; font-size:13.5px; color:${descTextClr}; line-height:1.6; white-space:pre-wrap; max-height:300px; overflow-y:auto">
      ${escapeHTML(descText)}
    </div>

    ${authorText ? `
      <div style="font-size:12px; color:${subTextClr}; display:flex; align-items:center; gap:6px; padding:0 2px">
        <span>👤 Sender / Author:</span>
        <strong style="color:${titleColor}">${escapeHTML(authorText)}</strong>
      </div>
    ` : ''}

    <div style="display:flex; justify-content:flex-end; gap:10px; border-top:1px solid ${dividerClr}; padding-top:14px; margin-top:4px">
      ${notif.link && notif.link !== '#' ? `
        <button id="btn-action-notif-modal" class="btn" style="font-size:12.5px; padding:9px 20px; background:linear-gradient(135deg, #89201B 0%, #5c0f0a 100%); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700; box-shadow:0 4px 14px rgba(137,32,27,0.4)">Open Module</button>
      ` : ''}
      <button id="btn-done-notif-modal" class="btn" style="font-size:12.5px; padding:9px 20px; background:${closeBtnBg}; color:${closeBtnText}; border:1px solid ${closeBtnBorder}; border-radius:8px; cursor:pointer; font-weight:600">Close</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeMe = () => {
    closeModal(overlay);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMe();
  });

  const btnX = modal.querySelector('#btn-close-notif-modal-x');
  if (btnX) btnX.addEventListener('click', closeMe);

  const btnDone = modal.querySelector('#btn-done-notif-modal');
  if (btnDone) btnDone.addEventListener('click', closeMe);

  const actionBtn = modal.querySelector('#btn-action-notif-modal');
  if (actionBtn && notif.link) {
    actionBtn.addEventListener('click', () => {
      closeMe();
      window.location.hash = notif.link;
    });
  }
}
window.showNotificationDetailModal = showNotificationDetailModal;

