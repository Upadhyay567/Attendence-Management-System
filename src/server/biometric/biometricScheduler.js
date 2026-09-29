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
      60000
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

async function runSync() {
  if (running) {
    return;
  }

  running = true;

  try {
    // 1. Sync from local K40 / primary device (SURYA OMAXE @ 192.168.1.7:4370)
    await syncBiometricAttendance().catch(err => {
      if (!err?.message?.includes('timeout') && !err?.message?.includes('ECONNREFUSED')) {
        console.warn('⚠️ Local biometric sync notice:', err.message);
      }
    });

    // 2. Sync from ZKTeco Easy WDMS Cloud Server (All 11 branch locations)
    const wdmsUser = process.env.WDMS_USER || 'admin';
    const wdmsPass = process.env.WDMS_PASS || 'Hs@20267';
    await syncFromWDMS(wdmsUser, wdmsPass, { maxPages: 2 }).catch(err => {
      console.warn('⚠️ WDMS Cloud biometric sync warning:', err.message);
    });
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