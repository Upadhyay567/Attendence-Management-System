// js/components/geofenceMap.js - Reusable HTML5 Canvas Geofence Radar Map
import { html } from '../utils/helpers.js';

export function drawRadarMap(canvasId, targetLat, targetLng, currentLat, currentLng, distanceMeters, inRange, worksiteName = 'Worksite', isOfflineMode = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.clearRect(0, 0, width, height);

  // Background Grid Pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 20;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Geofence Radius Circles (100m target radius)
  const outerRadius = 85;
  const innerRadius = 45;

  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = inRange ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = inRange ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  ctx.stroke();

  // Radar Sweeping Line Animation (if active)
  if (!isOfflineMode) {
    const time = Date.now() / 1000;
    const sweepAngle = (time * 2) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, outerRadius, sweepAngle, sweepAngle + 0.3);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = inRange ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    ctx.fill();
  }

  // Target Worksite Center Node
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Worksite Label
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'center';
  ctx.fillText(worksiteName, centerX, centerY + 22);

  // User Current Location Node
  if (currentLat !== null && currentLng !== null && distanceMeters !== null) {
    const scale = outerRadius / 100;
    const displayDist = Math.min(distanceMeters, 120) * scale;
    const angle = (currentLat - targetLat) * 1000;
    const userX = centerX + Math.cos(angle) * displayDist;
    const userY = centerY + Math.sin(angle) * displayDist;

    ctx.beginPath();
    ctx.arc(userX, userY, 6, 0, Math.PI * 2);
    ctx.fillStyle = inRange ? '#10b981' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
