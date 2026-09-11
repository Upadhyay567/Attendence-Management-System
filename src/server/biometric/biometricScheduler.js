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
      30000
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
    5000
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
    console.log(
      '⏳ Previous biometric sync still running. Skipping.'
    );

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


module.exports = {
  startBiometricScheduler,
  stopBiometricScheduler
};