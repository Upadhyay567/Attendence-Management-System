import { Utils } from './utils.js';

// Inject styles dynamically on load
const styles = `
  @keyframes floatUp {
    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
    10% { opacity: 0.8; }
    90% { opacity: 0.8; }
    100% { transform: translateY(-20vh) rotate(360deg); opacity: 0; }
  }
  @keyframes fireworks {
    0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
  }
  @keyframes slideInUp {
    0% { transform: translateY(50px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
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
      
      gainNode.gain.setValueAtTime(0.12, time);
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

function initConfetti(canvas) {
  const ctx = canvas.getContext('2d');
  let animationFrame;
  
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#eab308', '#f97316', '#ef4444'];
  const particles = [];
  
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 6 + 3,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.06 + 0.02,
      tiltAngle: 0
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();

      if (p.y > canvas.height) {
        p.x = Math.random() * canvas.width;
        p.y = -20;
        p.tilt = Math.random() * 10 - 5;
      }
    });

    animationFrame = requestAnimationFrame(draw);
  }

  draw();

  return () => {
    cancelAnimationFrame(animationFrame);
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
    pointer-events: none; z-index: 99999; overflow: hidden;
  `;

  overlay.innerHTML = `
    <canvas id="confetti-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></canvas>
    <div id="fireworks-container" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>
    <div id="floating-items-container" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>

    <div class="card-panel" style="position:absolute; bottom:30px; right:30px; width:340px; padding:20px; border:2px solid var(--primary); background:var(--bg-surface); backdrop-filter:blur(20px); border-radius:var(--radius-md); box-shadow:var(--shadow-lg), var(--shadow-glow); pointer-events:auto; animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px;">
      <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
        <button id="btn-mute-celebration" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px">
          🔊 Mute
        </button>
        <button id="btn-close-celebration" style="background:none; border:none; color:var(--text-muted); font-size:18px; cursor:pointer; font-weight:bold;">
          &times;
        </button>
      </div>
      
      <div style="width:72px; height:72px; border-radius:50%; overflow:hidden; border:3px solid var(--primary); box-shadow: 0 0 10px rgba(var(--primary-rgb),0.3); flex-shrink:0;">
        ${user.photo ? `
          <img src="${user.photo}" style="width:100%; height:100%; object-fit:cover;">
        ` : `
          <div style="width:100%; height:100%; background:linear-gradient(135deg, var(--primary) 0%, rgba(137,32,27,0.3) 100%); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800">
            ${user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        `}
      </div>

      <div>
        <h3 style="margin:0; font-size:15px; font-weight:800; color:var(--text-primary)">Happy Birthday, ${Utils.escape(user.name)}! 🎉</h3>
        <p style="margin:6px 0 0 0; font-size:11.5px; color:var(--text-secondary); line-height:1.45">
          Wishing you a wonderful day filled with joy and celebration! Thank you for being a valued member of the HS Group team. 🎂🎁
        </p>
      </div>
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

  // Close helper
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    stopBirthdayTune();
    if (destroyConfetti) destroyConfetti();
    clearInterval(fwInterval);
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  overlay.querySelector('#btn-close-celebration').onclick = cleanup;

  // Auto-close after 9 seconds
  setTimeout(cleanup, 9000);

  // Confetti particles
  const canvas = overlay.querySelector('#confetti-canvas');
  const destroyConfetti = initConfetti(canvas);

  // Background floating items
  const floatContainer = overlay.querySelector('#floating-items-container');
  const floatItems = ['🎈', '🎂', '🎁', '✨', '🎉'];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.textContent = floatItems[Math.floor(Math.random() * floatItems.length)];
    el.style.cssText = `
      position: absolute; bottom: -50px; left: ${Math.random() * 100}vw;
      font-size: ${Math.random() * 20 + 20}px; pointer-events: none; opacity: 0;
      animation: floatUp ${Math.random() * 4 + 6}s linear infinite;
      animation-delay: ${Math.random() * 3}s;
    `;
    floatContainer.appendChild(el);
  }

  // Fireworks Sparkles
  const fwContainer = overlay.querySelector('#fireworks-container');
  function createFirework() {
    if (cleanedUp) return;
    const fw = document.createElement('div');
    const x = Math.random() * 100;
    const y = Math.random() * 60;
    const size = Math.random() * 80 + 80;
    fw.style.cssText = `
      position: absolute; left: ${x}vw; top: ${y}vh;
      width: ${size}px; height: ${size}px; border-radius: 50%;
      border: 1.5px dashed rgba(var(--primary-rgb), 0.35);
      background: radial-gradient(circle, rgba(var(--primary-rgb), 0.12) 0%, transparent 70%);
      transform: translate(-50%, -50%) scale(0.1); opacity: 0;
      animation: fireworks 1.4s ease-out forwards; pointer-events: none;
    `;
    fwContainer.appendChild(fw);
    setTimeout(() => fw.remove(), 1500);
  }

  const fwInterval = setInterval(createFirework, 1500);
  createFirework();
}
