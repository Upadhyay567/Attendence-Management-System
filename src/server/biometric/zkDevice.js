// src/server/biometric/zkDevice.js
// ZKTeco K40 Pro TCP communication layer

const ZKLib = require('node-zklib');

// =====================================================
// DEVICE CONFIGURATION
// Reads from .env — do NOT hard-code these values.
// =====================================================

const DEVICE = {
  name:    process.env.BIOMETRIC_DEVICE_NAME   || 'ZKTeco K40 Pro',
  ip:      process.env.BIOMETRIC_DEVICE_IP     || '192.168.1.51',
  port:    Number(process.env.BIOMETRIC_DEVICE_PORT    || 4370),
  timeout: Number(process.env.BIOMETRIC_DEVICE_TIMEOUT || 10000),
  inport:  Number(process.env.BIOMETRIC_DEVICE_INPORT  || 5200),

  // K40 Pro Comm Key — must remain 0
  commCode: Number(process.env.BIOMETRIC_COMM_KEY || 0),

  serial: process.env.BIOMETRIC_DEVICE_SERIAL || 'CJOU232660306'
};

// =====================================================
// GLOBAL CONNECTION QUEUE
//
// The K40 Pro cannot handle concurrent TCP sessions.
// All operations are queued sequentially so that only ONE
// active connection exists at any time.
// =====================================================

let _deviceQueue = Promise.resolve();



// =====================================================
// HELPERS
// =====================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Silently suppress any stray socket errors on the
 * internal TCP/UDP socket objects created by node-zklib.
 * Without this, Node crashes on uncaught ECONNRESET events.
 */
function suppressSocketErrors(zk) {
  if (!zk) return;
  const tcp = zk.zklibtcp || zk.zklibTcp;
  const udp = zk.zklibudp || zk.zklibUdp;

  try {
    if (tcp && tcp.socket) {
      tcp.socket.on('error', () => {});
    }
  } catch (_) {}

  try {
    if (udp && udp.socket) {
      udp.socket.on('error', () => {});
    }
  } catch (_) {}
}

/**
 * Force-close any lingering sockets on a ZKLib instance.
 */
async function forceDisconnect(zk) {
  if (!zk) return;
  suppressSocketErrors(zk);
  try { await zk.disconnect(); } catch (_) {}

  const tcp = zk.zklibtcp || zk.zklibTcp;
  const udp = zk.zklibudp || zk.zklibUdp;

  try {
    if (tcp && tcp.socket) {
      tcp.socket.destroy();
      tcp.socket = null;
    }
  } catch (_) {}

  try {
    if (udp && udp.socket) {
      udp.socket.destroy();
      udp.socket = null;
    }
  } catch (_) {}
}


// =====================================================
// SERIALIZE THE SDK ERROR
//
// node-zklib throws ZKError objects that serialize
// to "{}" with JSON.stringify() — convert to plain text.
// =====================================================

function describeError(err) {
  if (!err) return 'Unknown error';

  // ZKError objects have err, command, ip fields
  const parts = [];

  if (err.err) {
    parts.push(
      err.err.message || String(err.err)
    );
  } else if (err.message) {
    parts.push(err.message);
  } else {
    parts.push(String(err));
  }

  if (err.command) parts.push(`command=${err.command}`);
  if (err.ip)      parts.push(`ip=${err.ip}`);

  return parts.join(' | ') || String(err);
}


// =====================================================
// CREATE DEVICE CONNECTION — with retry logic
//
// Attempts up to MAX_ATTEMPTS times with a short delay
// between each attempt. Ensures any partially-opened
// socket from a failed attempt is destroyed before
// the next attempt.
//
// NOTE: node-zklib v1.3.0 ZKLib constructor signature:
//   new ZKLib(ip, port, timeout, inport)
// The library itself decides TCP vs UDP inside
// createSocket(). The extra commCode / 'tcp' args in
// the old code were silently ignored.
// =====================================================

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 750;

async function createDeviceConnection() {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let zk = null;

    try {
      // node-zklib v1.3.0 takes 4 args: ip, port, timeout, inport
      zk = new ZKLib(
        DEVICE.ip,
        DEVICE.port,
        DEVICE.timeout,
        DEVICE.inport
      );

      suppressSocketErrors(zk);

      // Add connection timeout race guard
      await Promise.race([
        zk.createSocket().then(() => {
          suppressSocketErrors(zk);
          return zk;
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`TCP connect timeout after ${DEVICE.timeout}ms`)),
            DEVICE.timeout || 8000
          )
        )
      ]);

      console.log(
        `✅ K40 connected: ${DEVICE.name} @ ${DEVICE.ip}:${DEVICE.port}` +
        (attempt > 1 ? ` (attempt ${attempt})` : '')
      );

      return zk;

    } catch (err) {
      lastError = err;

      console.warn(
        `⚠️  K40 connection attempt ${attempt}/${MAX_ATTEMPTS} failed: ${describeError(err)}`
      );

      // Destroy the partial socket before retrying
      if (zk) {
        await forceDisconnect(zk);
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  // All attempts exhausted — throw a descriptive error
  const detail = describeError(lastError);

  const richErr = new Error(
    `K40 connection failed after ${MAX_ATTEMPTS} attempts: ${detail}`
  );
  richErr.step    = 'TCP CONNECT';
  richErr.command = 'TCP CONNECT';
  richErr.ip      = DEVICE.ip;
  richErr.port    = DEVICE.port;
  richErr.original = lastError;

  throw richErr;
}


// =====================================================
// WITH DEVICE — single-connection wrapper with queue
//
// Chains onto _deviceQueue to guarantee that only ONE
// active connection to the K40 exists at any time.
// Commands inside the callback MUST be sequential.
// =====================================================

async function withDevice(callback) {
  const execute = async () => {
    let zk = null;

    try {
      zk = await createDeviceConnection();
      return await callback(zk);

    } catch (error) {
      console.error(
        `❌ K40 operation error (${DEVICE.ip}:${DEVICE.port}): ${describeError(error)}`
      );
      throw error;

    } finally {
      if (zk) {
        await forceDisconnect(zk);
      }
    }
  };

  const currentOp = _deviceQueue.then(execute, execute);
  _deviceQueue = currentOp.catch(() => {});
  return currentOp;
}


// =====================================================
// PUBLIC API — existing functions kept intact
// =====================================================

/**
 * Get device information.
 */
async function getDeviceInfo() {
  return withDevice(async (zk) => {
    return await zk.getInfo();
  });
}

/**
 * Get all users stored in the K40.
 * Returns the full SDK result object.
 */
async function getDeviceUsers() {
  return withDevice(async (zk) => {
    return await zk.getUsers();
  });
}

/**
 * Get all attendance transactions.
 * Returns the full SDK result object.
 */
async function getAttendanceLogs() {
  return withDevice(async (zk) => {
    return await zk.getAttendances();
  });
}

/**
 * Get both users and attendance logs using ONE K40 connection.
 *
 * IMPORTANT: Commands are executed SEQUENTIALLY.
 * Do NOT use Promise.all() here — the K40 does not
 * reliably handle concurrent requests on one socket.
 */
async function getDeviceSnapshot() {
  return withDevice(async (zk) => {

    console.log('📡 [K40] Fetching users...');
    const usersResult = await zk.getUsers();
    const users = usersResult?.data || [];
    console.log(`👥 [K40] Users received: ${users.length}`);

    console.log('📡 [K40] Fetching attendance logs...');
    const attendanceResult = await zk.getAttendances();
    const logs = attendanceResult?.data || [];
    console.log(`📝 [K40] Attendance logs received: ${logs.length}`);

    return { users, logs };
  });
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  DEVICE,
  describeError,
  createDeviceConnection,
  withDevice,
  getDeviceInfo,
  getDeviceUsers,
  getAttendanceLogs,
  getDeviceSnapshot
};