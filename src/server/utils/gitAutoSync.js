// src/server/utils/gitAutoSync.js - Automatic Git Commit & Push Service
const { exec } = require('child_process');
const path = require('path');

let _isGitSyncing = false;
let _lastGitSyncTime = 0;

/**
 * Automatically commits and pushes database & punch updates to GitHub.
 * @param {string} customMessage - Commit message prefix
 * @param {boolean} force - Bypass cooldown throttle
 */
function autoCommitAndPush(customMessage = 'chore(sync): automated biometric punch sync', force = false) {
  const enabled = String(process.env.AUTO_GIT_COMMIT ?? 'true').toLowerCase() !== 'false';
  if (!enabled) return;

  const now = Date.now();
  // Throttle auto-commits to at most once every 5 minutes unless forced
  if (!force && (now - _lastGitSyncTime < 5 * 60 * 1000)) {
    return;
  }
  if (_isGitSyncing) {
    return;
  }

  _isGitSyncing = true;
  _lastGitSyncTime = now;

  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  const commitMsg = `${customMessage} [${timeStr}]`;

  exec('git status --porcelain', { cwd: rootDir }, (err, stdout) => {
    if (err || !stdout || !stdout.trim()) {
      _isGitSyncing = false;
      return;
    }

    console.log('🔄 [Git Auto-Sync] Changes detected in repository, initiating automated commit & push...');
    const cmd = `git add seed.json server-config.json && git commit -m "${commitMsg.replace(/"/g, '\\"')}" && git push origin main`;

    exec(cmd, { cwd: rootDir }, (commitErr, pushStdout, pushStderr) => {
      _isGitSyncing = false;
      if (commitErr) {
        // Non-fatal notice: network temporary interruption or no remote credentials
        console.warn('⚠️ [Git Auto-Sync] Notice during background push:', commitErr.message || pushStderr);
      } else {
        console.log('✅ [Git Auto-Sync] Automatically committed & pushed latest updates to GitHub main branch.');
      }
    });
  });
}

module.exports = { autoCommitAndPush };
