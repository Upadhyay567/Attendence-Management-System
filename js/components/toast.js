// js/components/toast.js - Toast Notifications Engine

export function showToastNotification(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.pointerEvents = 'auto';
  toast.style.minWidth = '280px';
  toast.style.maxWidth = '360px';
  toast.style.padding = '14px 18px';
  toast.style.borderRadius = 'var(--radius-md)';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '12px';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '600';
  toast.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';

  if (type === 'success') {
    toast.style.background = 'var(--success-bg, rgba(16, 185, 129, 0.95))';
    toast.style.color = '#ffffff';
    toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
  } else if (type === 'error') {
    toast.style.background = 'var(--error-bg, rgba(239, 68, 68, 0.95))';
    toast.style.color = '#ffffff';
    toast.style.border = '1px solid rgba(239, 68, 68, 0.3)';
  } else {
    toast.style.background = 'var(--card-bg, rgba(30, 41, 59, 0.95))';
    toast.style.color = 'var(--text-primary, #ffffff)';
    toast.style.border = '1px solid var(--border, rgba(255,255,255,0.1))';
  }

  toast.innerHTML = html`<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.showToastNotification = showToastNotification;
