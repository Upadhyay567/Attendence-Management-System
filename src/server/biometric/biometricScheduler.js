// src/server/biometric/biometricScheduler.js

const {
  syncBiometricAttendance
} =
  require('./biometricSync.service');


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
      3000
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
    1000
  );

  /*
   * Continue periodically.
   */
  timer =
    setInterval(
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
    await syncBiometricAttendance();
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