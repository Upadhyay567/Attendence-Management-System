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
  overlay.innerHTML = `
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
