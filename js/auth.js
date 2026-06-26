// auth.js - Authentication Service & Biometric Simulators
import { DB } from './db.js';

const SESSION_KEY = 'attendance_current_session';

export const Auth = {
  currentUser: null,

  init() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        this.currentUser = DB.getUser(session.id);
      } catch (e) {
        console.error('Failed to parse session', e);
      }
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  login(username, employeeId, password) {
    let user = null;
    if (username && employeeId) {
      const u = DB.getUserByUsername(username);
      if (u && u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase().trim()) {
        user = u;
      }
    } else if (username) {
      user = DB.getUserByUsername(username);
    } else if (employeeId) {
      user = DB.getUsers().find(u => u.employeeId && u.employeeId.toLowerCase() === employeeId.toLowerCase().trim());
    }

    if (user && user.password === password) {
      this.currentUser = user;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id }));
      return { success: true, user };
    }
    return { success: false, message: 'Invalid credentials or password.' };
  },

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
  },

  registerBiometric(userId, type) {
    const user = DB.getUser(userId);
    if (user) {
      user.biometricRegistered = user.biometricRegistered || { face: false, finger: false };
      user.biometricRegistered[type] = true;
      DB.updateUser(userId, { biometricRegistered: user.biometricRegistered });
      return true;
    }
    return false;
  },

  unregisterBiometric(userId, type) {
    const user = DB.getUser(userId);
    if (user && user.biometricRegistered) {
      user.biometricRegistered[type] = false;
      DB.updateUser(userId, { biometricRegistered: user.biometricRegistered });
      return true;
    }
    return false;
  },

  // Password Security Strength Validation
  validatePassword(password) {
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_]/.test(password);
    const isNotJustNumbers = /\D/.test(password); // true if contains at least one non-digit
    const isLongEnough = password.length >= 6;

    return {
      valid: hasUpper && hasSpecial && isNotJustNumbers && isLongEnough,
      hasUpper,
      hasSpecial,
      isNotJustNumbers,
      isLongEnough
    };
  },

  // Simulated Biometric Scan Engines

  // 1. Fingerprint Scanner Engine
  simulateFingerprintScan(canvas, onProgress, onComplete, onError) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = 150;
    let height = canvas.height = 150;
    let progress = 0;
    let animId = null;
    let active = true;

    function draw() {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);

      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 60, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 60, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (progress / 100)));
      ctx.strokeStyle = progress < 100 ? 'var(--primary)' : 'var(--success)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 40, 0, Math.PI * 2);
      ctx.fillStyle = progress < 100 ? 'rgba(251, 191, 36, 0.05)' : 'rgba(16, 185, 129, 0.1)';
      ctx.fill();

      ctx.font = '600 14px "Inter", sans-serif';
      ctx.fillStyle = progress < 100 ? 'var(--text-secondary)' : 'var(--success)';
      ctx.textAlign = 'center';
      ctx.fillText(progress < 100 ? `${Math.floor(progress)}%` : 'VERIFIED', width / 2, height / 2 + 5);

      if (progress < 100) {
        progress += 1.5;
        onProgress(progress);
        animId = requestAnimationFrame(draw);
      } else {
        onComplete();
      }
    }

    draw();

    return {
      cancel() {
        active = false;
        if (animId) cancelAnimationFrame(animId);
        ctx.clearRect(0, 0, width, height);
      }
    };
  },

  // 2. Face Scanner Engine
  async startFaceScan(video, overlayCanvas, onProgress, onComplete, onError) {
    let stream = null;
    let animId = null;
    let active = true;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      video.srcObject = stream;
      video.play();
    } catch (err) {
      console.warn('Webcam camera blocked or unavailable, running canvas scanner animation only', err);
    }

    const ctx = overlayCanvas.getContext('2d');
    let width = overlayCanvas.width = 320;
    let height = overlayCanvas.height = 240;
    let progress = 0;
    let scanLineY = 20;
    let scanDirection = 1;

    function renderHUD() {
      if (!active) return;
      ctx.clearRect(0, 0, width, height);

      // Oval frame for face positioning
      ctx.strokeStyle = progress < 100 ? 'var(--primary)' : 'var(--success)';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 10]);
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, 70, 90, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner guides
      const offset = 20;
      ctx.strokeStyle = progress < 100 ? 'rgba(251, 191, 36, 0.4)' : 'var(--success)';
      ctx.lineWidth = 3;
      // Top Left Corner
      ctx.beginPath(); ctx.moveTo(offset, offset + 20); ctx.lineTo(offset, offset); ctx.lineTo(offset + 20, offset); ctx.stroke();
      // Top Right Corner
      ctx.beginPath(); ctx.moveTo(width - offset, offset + 20); ctx.lineTo(width - offset, offset); ctx.lineTo(width - offset - 20, offset); ctx.stroke();
      // Bottom Left Corner
      ctx.beginPath(); ctx.moveTo(offset, height - offset - 20); ctx.lineTo(offset, height - offset); ctx.lineTo(offset + 20, height - offset); ctx.stroke();
      // Bottom Right Corner
      ctx.beginPath(); ctx.moveTo(width - offset, height - offset - 20); ctx.lineTo(width - offset, height - offset); ctx.lineTo(width - offset - 20, height - offset); ctx.stroke();

      if (progress < 100) {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
        ctx.shadowColor = 'var(--cyan)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 70, scanLineY);
        ctx.lineTo(width / 2 + 70, scanLineY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        scanLineY += scanDirection * 2;
        if (scanLineY > height / 2 + 90 || scanLineY < height / 2 - 90) {
          scanDirection *= -1;
        }

        if (progress > 30 && progress < 80) {
          ctx.fillStyle = 'var(--primary)';
          const points = [
            { x: width / 2 - 25, y: height / 2 - 20 },
            { x: width / 2 + 25, y: height / 2 - 20 },
            { x: width / 2, y: height / 2 + 10 },
            { x: width / 2 - 20, y: height / 2 + 35 },
            { x: width / 2 + 20, y: height / 2 + 35 }
          ];
          points.forEach((p, idx) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            if (idx > 0) {
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
              ctx.beginPath();
              ctx.moveTo(points[idx - 1].x, points[idx - 1].y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
          });
        }
      }

      ctx.fillStyle = 'rgba(26, 12, 15, 0.85)';
      ctx.fillRect(40, height - 35, width - 80, 20);
      
      ctx.fillStyle = progress < 100 ? 'var(--cyan)' : 'var(--success)';
      ctx.fillRect(44, height - 31, (width - 88) * (progress / 100), 12);

      ctx.font = '600 11px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(progress < 100 ? `MATCHING FACE MAPPING: ${Math.floor(progress)}%` : 'FACE KEY VERIFIED', width / 2, height - 21);

      if (progress < 100) {
        progress += 1;
        onProgress(progress);
        animId = requestAnimationFrame(renderHUD);
      } else {
        onComplete();
      }
    }

    renderHUD();

    return {
      stop() {
        active = false;
        if (animId) cancelAnimationFrame(animId);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        ctx.clearRect(0, 0, width, height);
      }
    };
  }
};
