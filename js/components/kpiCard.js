// js/components/kpiCard.js - Dashboard Metric Stat Widget Builder
import { html } from '../utils/helpers.js';

export function renderKpiCard({ id, title, count, icon, iconClass = 'stat-icon-blue', style = '' }) {
  return html`
    <div class="stat-card" id="${id}" style="cursor: pointer; ${style}">
      <div class="stat-icon ${iconClass}">${icon}</div>
      <div class="stat-info">
        <span class="stat-value">${count}</span>
        <span class="stat-label">${title}</span>
      </div>
    </div>
  `;
}
