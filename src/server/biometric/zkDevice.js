// src/server/biometric/zkDevice.js
// ZKTeco K40 Pro TCP communication layer

const ZKLib = require('node-zklib');

// =====================================================
// DEVICE CONFIGURATION
// Reads from .env — do NOT hard-code these values.
// =====================================================

const net = require('net');
const { execSync } = require('child_process');

const DEVICE = {
  name: process.env.BIOMETRIC_DEVICE_NAME || 'ZKTeco K40 Pro',
  get ip() {
    return process.env.BIOMETRIC_DEVICE_IP || '192.168.1.51';
  },
  set ip(val) {
    process.env.BIOMETRIC_DEVICE_IP = val;
  },
  port: Number(process.env.BIOMETRIC_DEVICE_PORT || 4370),
  timeout: Number(process.env.BIOMETRIC_DEVICE_TIMEOUT || 10000),
  inport: Number(process.env.BIOMETRIC_DEVICE_INPORT || 5200),
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
 * Without this, Node crashes on uncaught ECONNRESET / ETIMEDOUT events.
 */
function suppressSocketErrors(zk) {
  if (!zk) return;
  const tcp = zk.zklibTcp || zk.zklibtcp;
  const udp = zk.zklibUdp || zk.zklibudp;

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

  const tcp = zk.zklibTcp || zk.zklibtcp;
  const udp = zk.zklibUdp || zk.zklibudp;

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

  const parts = [];

  if (err.err) {
    if (typeof err.err === 'string') {
      parts.push(err.err);
    } else if (err.err.message) {
      parts.push(err.err.message);
    } else if (err.err.code) {
      parts.push(`Code: ${err.err.code}`);
    } else {
      try {
        const str = JSON.stringify(err.err);
        if (str && str !== '{}') parts.push(str);
      } catch (_) {}
    }
  }

  if (err.message && !parts.includes(err.message)) {
    parts.push(err.message);
  }

  if (err.command) parts.push(`command=${err.command}`);
  if (err.ip)      parts.push(`ip=${err.ip}`);

  const result = parts.filter(Boolean).join(' | ');

  if (!result || result === '{}' || result === '[object Object]') {
    return err.command ? `Device command ${err.command} failed` : 'Connection timeout / device offline';
  }

  return result;
}


// =====================================================
// CREATE DEVICE CONNECTION — strict IP targeting
// =====================================================

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const CONNECT_TIMEOUT_MS = 3500;

let lastLoggedOffline = false;

async function trySingleConnection(ip, protocol = 'tcp') {
  let zk = new ZKLib(
    ip,
    DEVICE.port,
    CONNECT_TIMEOUT_MS,
    DEVICE.inport,
    DEVICE.commCode,
    protocol
  );

  suppressSocketErrors(zk);

  let timeoutTimer = null;
  await Promise.race([
    zk.createSocket().then(() => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      zk.connectionType = protocol;
      suppressSocketErrors(zk);
      return zk;
    }),
    new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        const sockObj = protocol === 'tcp' ? (zk.zklibTcp && zk.zklibTcp.socket) : (zk.zklibUdp && zk.zklibUdp.socket);
        if (sockObj) {
          try { sockObj.destroy(); } catch (_) {}
        }
        reject(new Error(`${protocol.toUpperCase()} connect timeout after ${CONNECT_TIMEOUT_MS}ms`));
      }, CONNECT_TIMEOUT_MS);
    })
  ]);

  zk.connectionType = protocol;
  suppressSocketErrors(zk);
  return zk;
}

function isPortReachable(ip, port, timeoutMs = 600) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let isSettled = false;
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isSettled = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('error', () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, ip);
  });
}

async function createDeviceConnection() {
  let lastError = null;
  const targetIp = DEVICE.ip || '192.168.1.51';

  // Fast LAN probe to avoid long blocking connection delays when hardware is offline
  const reachable = await isPortReachable(targetIp, DEVICE.port, 600);
  if (!reachable) {
    const richErr = new Error(`K40 hardware offline (${targetIp}:${DEVICE.port})`);
    richErr.step = 'CONNECT';
    richErr.command = 'CONNECT';
    richErr.ip = targetIp;
    richErr.port = DEVICE.port;
    richErr.isOffline = true;
    throw richErr;
  }

  for (const proto of ['tcp', 'udp']) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) await sleep(RETRY_DELAY_MS);
        const zk = await trySingleConnection(targetIp, proto);

        if (lastLoggedOffline) {
          console.log(`✅ K40 re-connected: ${DEVICE.name} @ ${targetIp}:${DEVICE.port} (${proto.toUpperCase()})`);
          lastLoggedOffline = false;
        }
        return zk;

      } catch (err) {
        lastError = err;
      }
    }
  }

  // All attempts exhausted — throw descriptive offline error
  const detail = describeError(lastError);

  const richErr = new Error(
    `K40 connection failed: ${detail}`
  );
  richErr.step      = 'CONNECT';
  richErr.command   = 'CONNECT';
  richErr.ip        = targetIp;
  richErr.port      = DEVICE.port;
  richErr.isOffline = true;
  richErr.original  = lastError;

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
      if (error && error.isOffline) {
        if (!lastLoggedOffline) {
          console.log(`ℹ️ Biometric hardware (${DEVICE.ip}:${DEVICE.port}) is offline — operating in local database mode.`);
          lastLoggedOffline = true;
        }
      } else {
        console.warn(`⚠️ K40 device status (${DEVICE.ip}:${DEVICE.port}): ${error.message || String(error)}`);
      }
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
    console.log('📡 [K40] Fetching users sequentially...');
    const usersResult = await zk.getUsers();
    const users = usersResult?.data || [];
    console.log(`👥 [K40] Users received: ${users.length}`);

    console.log('📡 [K40] Fetching attendance logs sequentially...');
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