// src/server/biometric/biometricScheduler.js

const {
  syncBiometricAttendance
} = require('./biometricSync.service');

const {
  syncFromWDMS
} = require('./easywdms.service');

let timer = null;
let running = false;

function startBiometricScheduler() {
  const enabled =
    String(
      process.env.BIOMETRIC_SYNC_ENABLED
    ).toLowerCase() === 'true';

  if (!enabled) {
    console.log(
      'ℹ️ Biometric automatic synchronization is disabled.'
    );
    return;
  }

  const interval =
    Number(
      process.env.BIOMETRIC_SYNC_INTERVAL ||
      15000
    );

  console.log(
    `🕒 Biometric scheduler enabled. Interval: ${interval}ms`
  );

  /*
   * Run once shortly after server starts.
   */
  setTimeout(
    async () => {
      await runSync();
    },
    2000
  );

  /*
   * Continue periodically.
   */
  timer = setInterval(
    runSync,
    interval
  );
}

let lastWdmsWarnTime = 0;

async function runSync() {
  if (running) {
    return;
  }

  running = true;

  try {
    const wdmsUser = process.env.WDMS_USER || 'admin';
    const wdmsPass = process.env.WDMS_PASS || 'Admin@123';

    // Run local ZKTeco K40 (192.168.1.7) and EasyWDMS cloud sync concurrently
    const [localRes, wdmsRes] = await Promise.allSettled([
      syncBiometricAttendance().catch(err => {
        if (!err?.message?.includes('timeout') && !err?.message?.includes('ECONNREFUSED')) {
          console.warn('⚠️ Local biometric sync notice:', err.message);
        }
        return { error: err.message };
      }),
      syncFromWDMS(wdmsUser, wdmsPass, { maxPages: 3, pageSize: 1000 }).catch(err => {
        const now = Date.now();
        if (now - lastWdmsWarnTime > 5 * 60 * 1000) {
          console.warn('⚠️ WDMS Cloud biometric sync warning (throttled):', err.message);
          lastWdmsWarnTime = now;
        }
        return { error: err.message };
      })
    ]);

    const localVal = localRes.status === 'fulfilled' ? localRes.value : null;
    const wdmsVal = wdmsRes.status === 'fulfilled' ? wdmsRes.value : null;

    const hadUpdates = (localVal?.result && (localVal.result.created > 0 || localVal.result.updated > 0)) ||
                       (wdmsVal?.ingestionResult && (wdmsVal.ingestionResult.created > 0 || wdmsVal.ingestionResult.updated > 0));

    if (hadUpdates) {
      try {
        const { broadcastSSEEvent } = require('../routes/events.routes');
        broadcastSSEEvent('db_updated', {
          type: 'biometric_sync',
          timestamp: Date.now(),
          local: localVal,
          wdms: wdmsVal
        });
      } catch (_) {}
    }

  } catch (error) {
    console.error(
      '❌ Scheduled biometric sync error:',
      error
    );
  } finally {
    running = false;
  }
}


function stopBiometricScheduler() {

  if (timer) {
    clearInterval(timer);

    timer = null;

    console.log(
      '🛑 Biometric scheduler stopped.'
    );
  }
}


async function triggerImmediateSync() {
  return await runSync();
}


module.exports = {
  startBiometricScheduler,
  stopBiometricScheduler,
  triggerImmediateSync
};