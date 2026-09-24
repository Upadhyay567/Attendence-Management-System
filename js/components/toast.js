// js/components/toast.js - Toast Notifications Engine
import { html } from '../utils/helpers.js';

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

  const isLight = typeof document !== 'undefined' && document.body && document.body.classList.contains('light-theme');

  if (type === 'success') {
    toast.style.background = isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.95)';
    toast.style.color = isLight ? '#065f46' : '#ffffff';
    toast.style.border = isLight ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.3)';
    toast.style.boxShadow = isLight ? '0 8px 24px rgba(5, 150, 105, 0.15)' : '0 10px 25px rgba(0,0,0,0.3)';
  } else if (type === 'error') {
    toast.style.background = isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.95)';
    toast.style.color = isLight ? '#991b1b' : '#ffffff';
    toast.style.border = isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.3)';
    toast.style.boxShadow = isLight ? '0 8px 24px rgba(220, 38, 38, 0.15)' : '0 10px 25px rgba(0,0,0,0.3)';
  } else if (type === 'warning') {
    toast.style.background = isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.95)';
    toast.style.color = isLight ? '#92400e' : '#ffffff';
    toast.style.border = isLight ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.3)';
    toast.style.boxShadow = isLight ? '0 8px 24px rgba(217, 119, 6, 0.15)' : '0 10px 25px rgba(0,0,0,0.3)';
  } else {
    toast.style.background = isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.95)';
    toast.style.color = isLight ? '#1f0504' : '#ffffff';
    toast.style.border = isLight ? '1px solid rgba(137, 32, 27, 0.25)' : '1px solid rgba(255,255,255,0.12)';
    toast.style.boxShadow = isLight ? '0 8px 24px rgba(137, 32, 27, 0.15)' : '0 10px 25px rgba(0,0,0,0.3)';
  }

  const span = document.createElement('span');
  span.style.whiteSpace = 'pre-line';
  span.style.lineHeight = '1.4';
  span.textContent = message;
  toast.appendChild(span);
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
