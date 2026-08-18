import { Utils } from './utils.js';

// Inject styles dynamically on load
const styles = `
  @keyframes birthdayPopupOpen {
    0% { transform: scale(0.85); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes pulseGlow {
    0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.15; }
    50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.25; }
    100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.15; }
  }
  @keyframes bounceCake {
    0% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
    100% { transform: translateY(0); }
  }
  .birthday-popup-card {
    transition: all 0.3s ease;
  }
  body.light-theme .birthday-popup-card {
    background: #FFFFFF !important;
    border-color: rgba(0,0,0,0.1) !important;
    box-shadow: 0 15px 40px rgba(0,0,0,0.15) !important;
  }
  body.light-theme #btn-mute-celebration,
  body.light-theme #btn-close-celebration {
    background: rgba(0,0,0,0.04) !important;
    border-color: rgba(0,0,0,0.08) !important;
    color: var(--text-secondary) !important;
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

let audioCtx = null;
let currentOscillators = [];
let isMuted = false;

function playBirthdayTune() {
  if (isMuted) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    
    // Notes of Happy Birthday tune snippet (C4 C4 D4 C4 F4 E4)
    const notes = [
      { note: 261.63, duration: 0.3 }, // C4
      { note: 261.63, duration: 0.1 }, // C4
      { note: 293.66, duration: 0.4 }, // D4
      { note: 261.63, duration: 0.4 }, // C4
      { note: 349.23, duration: 0.4 }, // F4
      { note: 329.63, duration: 0.6 }  // E4
    ];
    
    let time = audioCtx.currentTime;
    
    notes.forEach(item => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.note, time);
      
      gainNode.gain.setValueAtTime(0.08, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + item.duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(time);
      osc.stop(time + item.duration);
      
      currentOscillators.push(osc);
      time += item.duration + 0.05;
    });
  } catch (e) {
    console.warn("Web Audio API disabled or blocked:", e);
  }
}

function stopBirthdayTune() {
  if (audioCtx) {
    try {
      currentOscillators.forEach(osc => osc.disconnect());
      audioCtx.close();
    } catch(e) {}
    audioCtx = null;
    currentOscillators = [];
  }
}

function initCelebrationCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  let animationFrame;
  let active = true;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Colors
  const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#eab308', '#f97316', '#ef4444'];
  const emojisList = ['🎂', '🎁', '🎉', '🥳', '✨', '🎈'];

  // Particles
  const confetti = [];
  const fireworks = [];
  const balloons = [];
  const emojis = [];

  // Init Confetti
  for (let i = 0; i < 80; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 2 + 2,
      tilt: Math.random() * 10 - 5,
      tiltAngle: Math.random() * Math.PI * 2,
      tiltAngleSpeed: Math.random() * 0.05 + 0.02
    });
  }

  // Init Balloons
  for (let i = 0; i < 6; i++) {
    balloons.push({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 300 + 50,
      size: Math.random() * 15 + 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 1.2 + 0.8,
      sway: Math.random() * 20 + 10,
      swaySpeed: Math.random() * 0.02 + 0.01,
      swayOffset: Math.random() * Math.PI * 2
    });
  }

  // Init Emojis
  for (let i = 0; i < 8; i++) {
    emojis.push({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 300 + 50,
      size: Math.random() * 10 + 20,
      text: emojisList[Math.floor(Math.random() * emojisList.length)],
      speedY: Math.random() * 1.5 + 1.0,
      alpha: Math.random() * 0.4 + 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: Math.random() * 0.04 - 0.02
    });
  }

  // Spawns a firework explosion
  function spawnFireworkBurst() {
    if (!active) return;
    const w = canvas.width || window.innerWidth || 800;
    const h = canvas.height || window.innerHeight || 600;
    const cx = Math.random() * (w - 200) + 100;
    const cy = Math.random() * (h * 0.5) + 100;
    const burstColor = colors[Math.floor(Math.random() * colors.length)];
    const sparksCount = Math.floor(Math.random() * 40) + 50; // 50 to 90 sparks
    
    const sparks = [];
    for (let i = 0; i < sparksCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 3; // 3 to 10 speed
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: burstColor,
        alpha: 1.0,
        decay: Math.random() * 0.012 + 0.008, // slower decay for longer trails
        size: Math.random() * 2.5 + 2.0 // larger sparks (2.0 to 4.5px radius)
      });
    }
    fireworks.push(sparks);
  }

  // Set interval to spawn fireworks
  const fwInterval = setInterval(spawnFireworkBurst, 700); // spawn every 700ms for more action
  spawnFireworkBurst();

  function draw() {
    if (!active) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Confetti
    confetti.forEach(p => {
      p.y += p.speedY;
      p.tiltAngle += p.tiltAngleSpeed;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = p.size;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.size / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.size / 2);
      ctx.stroke();
      ctx.restore();

      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });

    // 2. Draw Balloons
    balloons.forEach(b => {
      b.y -= b.speedY;
      b.swayOffset += b.swaySpeed;
      const curX = b.x + Math.sin(b.swayOffset) * b.sway;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(curX, b.y, b.size * 0.75, b.size, 0, 0, 2 * Math.PI);
      ctx.fillStyle = b.color;
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(curX, b.y + b.size);
      ctx.lineTo(curX - 4, b.y + b.size + 6);
      ctx.lineTo(curX + 4, b.y + b.size + 6);
      ctx.closePath();
      ctx.fillStyle = b.color;
      ctx.fill();

      // String
      ctx.beginPath();
      ctx.moveTo(curX, b.y + b.size + 6);
      ctx.bezierCurveTo(curX - 5, b.y + b.size + 15, curX + 5, b.y + b.size + 22, curX, b.y + b.size + 35);
      ctx.strokeStyle = document.body.classList.contains('light-theme') ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      if (b.y < -b.size * 2) {
        b.y = canvas.height + 50;
        b.x = Math.random() * canvas.width;
        b.color = colors[Math.floor(Math.random() * colors.length)];
      }
    });

    // 3. Draw Emojis
    emojis.forEach(e => {
      e.y -= e.speedY;
      e.rotation += e.rotationSpeed;

      ctx.save();
      ctx.globalAlpha = e.alpha;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rotation);
      ctx.font = `${e.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.text, 0, 0);
      ctx.restore();

      if (e.y < -50) {
        e.y = canvas.height + 50;
        e.x = Math.random() * canvas.width;
        e.text = emojisList[Math.floor(Math.random() * emojisList.length)];
      }
    });

    // 4. Draw Fireworks
    for (let fIdx = fireworks.length - 1; fIdx >= 0; fIdx--) {
      const sparks = fireworks[fIdx];
      let activeSparks = 0;
      
      sparks.forEach(s => {
        s.vx *= 0.98; // air resistance
        s.vy *= 0.98; // air resistance
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.08; // gravity
        s.alpha -= s.decay;
        
        if (s.alpha > 0) {
          activeSparks++;
          ctx.save();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, 2 * Math.PI);
          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.alpha;
          ctx.fill();
          ctx.restore();
        }
      });
      
      if (activeSparks === 0) {
        fireworks.splice(fIdx, 1);
      }
    }

    animationFrame = requestAnimationFrame(draw);
  }

  draw();

  return () => {
    active = false;
    cancelAnimationFrame(animationFrame);
    clearInterval(fwInterval);
    window.removeEventListener('resize', resizeCanvas);
  };
}

export function triggerBirthdayCelebration(user) {
  // Safe session check to prevent multiple triggers in the same tab session
  const sessionKey = `birthday_celebrated_${user.id}`;
  if (sessionStorage.getItem(sessionKey) === 'true') return;
  sessionStorage.setItem(sessionKey, 'true');

  const overlay = document.createElement('div');
  overlay.id = 'birthday-celebration-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(12, 3, 4, 0.7); backdrop-filter: blur(8px);
    display: flex; justify-content: center; align-items: center;
    z-index: 99999; overflow: hidden;
  `;

  overlay.innerHTML = `
    <canvas id="celebration-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 1;"></canvas>
    
    <div class="card-panel birthday-popup-card" style="
      position: relative; z-index: 2; width: 90%; max-width: 440px; padding: 32px 24px;
      background: var(--bg-surface); border: 2px solid var(--primary);
      border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.5), 0 0 20px rgba(137,32,27,0.3);
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 16px; pointer-events: auto;
      animation: birthdayPopupOpen 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    ">
      <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
        <button id="btn-mute-celebration" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 11px; padding: 4px 8px; display: flex; align-items: center; gap: 4px; font-weight: 600;">
          🔊 Mute
        </button>
        <button id="btn-close-celebration" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 14px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
          ✕
        </button>
      </div>

      <!-- Pulse Cake Emoji Container -->
      <div style="position: relative; margin-top: 10px;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, rgba(137,32,27,0.4) 100%); opacity: 0.15; animation: pulseGlow 2s infinite ease-in-out;"></div>
        <div style="font-size: 52px; z-index: 2; position: relative; animation: bounceCake 2.5s infinite ease-in-out;">🎂</div>
      </div>
      
      <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 3px solid var(--primary); box-shadow: 0 0 15px rgba(137,32,27,0.4); flex-shrink: 0; margin-top: 6px;">
        ${user.photo ? `
          <img src="${user.photo}" style="width: 100%; height: 100%; object-fit: cover;">
        ` : `
          <div style="width: 100%; height: 100%; background: linear-gradient(135deg, var(--primary) 0%, rgba(137,32,27,0.3) 100%); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800">
            ${user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        `}
      </div>

      <div style="margin-top: 4px;">
        <h3 style="margin: 0; font-size: 19px; font-weight: 800; color: var(--text-primary);">Happy Birthday, ${Utils.escape(user.name)}! 🎉</h3>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
          Wishing you a wonderful day filled with joy, prosperity, and memorable celebrations! Thank you for your dedication and for being a key member of our organization. 🥳🎈✨
        </p>
      </div>

      <button id="btn-birthday-continue" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 13.5px; border-radius: 10px; margin-top: 10px; background: var(--primary); color: #ffffff; border: none; cursor: pointer;">
        Thank You!
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Play Sound
  playBirthdayTune();

  // Mute toggle
  const muteBtn = overlay.querySelector('#btn-mute-celebration');
  muteBtn.onclick = () => {
    isMuted = !isMuted;
    if (isMuted) {
      stopBirthdayTune();
      muteBtn.textContent = '🔇 Unmute';
    } else {
      muteBtn.textContent = '🔊 Mute';
      playBirthdayTune();
    }
  };

  // Close helpers
  let destroyCanvas = null;
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    stopBirthdayTune();
    if (destroyCanvas) destroyCanvas();
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  overlay.querySelector('#btn-close-celebration').onclick = cleanup;
  overlay.querySelector('#btn-birthday-continue').onclick = cleanup;
  overlay.onclick = (e) => {
    if (e.target === overlay) cleanup();
  };

  // Auto-close after 12 seconds
  setTimeout(cleanup, 12000);

  // Canvas celebration initialization
  const canvas = overlay.querySelector('#celebration-canvas');
  destroyCanvas = initCelebrationCanvas(canvas);
}
