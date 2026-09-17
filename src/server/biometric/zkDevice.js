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
    return process.env.BIOMETRIC_DEVICE_IP || '192.168.1.7';
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
// CREATE DEVICE CONNECTION — with retry logic & auto-discovery
// =====================================================

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const CONNECT_TIMEOUT_MS = 2500; // 2.5s per attempt for fast responsiveness

let lastLoggedOffline = false;

function checkPort4370(ip, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(DEVICE.port, ip);
  });
}

/**
 * Scan system ARP table for active ZKTeco MAC addresses (vendor prefix 10-ff-e0).
 */
function getArpZkTecoIps() {
  try {
    const arpOut = execSync('arp -a', { encoding: 'utf8' });
    const ips = [];
    const lines = arpOut.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('10-ff-e0')) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] && parts[0].startsWith('192.168.')) {
          ips.push(parts[0]);
        }
      }
    }
    return ips;
  } catch (_) {
    return [];
  }
}

async function autoDiscoverZkIp() {
  const currentIp = DEVICE.ip;
  if (currentIp && await checkPort4370(currentIp, 400)) {
    return currentIp;
  }

  // 1. Try ARP table match for 10-ff-e0 ZKTeco MAC vendor prefix
  const arpIps = getArpZkTecoIps();
  for (const ip of arpIps) {
    if (await checkPort4370(ip, 400)) {
      console.log(`🔍 [ZKTeco] Found active device via ARP at IP: ${ip}`);
      DEVICE.ip = ip;
      return ip;
    }
  }

  // 2. Fast parallel scan 192.168.1.1 to 254 for open port 4370
  const base = currentIp.includes('.') ? currentIp.substring(0, currentIp.lastIndexOf('.') + 1) : '192.168.1.';
  const promises = [];
  for (let i = 1; i < 255; i++) {
    const target = base + i;
    promises.push(checkPort4370(target, 400).then(ok => ok ? target : null));
  }

  const results = await Promise.all(promises);
  const foundIp = results.find(x => x !== null);
  if (foundIp) {
    console.log(`🔍 [ZKTeco] Auto-discovered hardware at IP: ${foundIp}:${DEVICE.port}`);
    DEVICE.ip = foundIp;
    return foundIp;
  }

  return currentIp;
}

async function trySingleConnection(ip) {
  let zk = new ZKLib(
    ip,
    DEVICE.port,
    CONNECT_TIMEOUT_MS,
    DEVICE.inport,
    DEVICE.commCode,
    'tcp'
  );

  suppressSocketErrors(zk);

  let timeoutTimer = null;
  await Promise.race([
    zk.createSocket().then(() => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      // Strictly enforce TCP connection type — K40 Pro is TCP only
      zk.connectionType = 'tcp';
      suppressSocketErrors(zk);
      return zk;
    }),
    new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => {
        if (zk && zk.zklibTcp && zk.zklibTcp.socket) {
          try { zk.zklibTcp.socket.destroy(); } catch (_) {}
        }
        reject(new Error(`TCP connect timeout after ${CONNECT_TIMEOUT_MS}ms`));
      }, CONNECT_TIMEOUT_MS);
    })
  ]);

  // Ensure TCP connection mode is active
  zk.connectionType = 'tcp';
  suppressSocketErrors(zk);
  return zk;
}

async function createDeviceConnection() {
  let lastError = null;

  // 1. Try currently configured IP
  try {
    const zk = await trySingleConnection(DEVICE.ip);
    if (lastLoggedOffline) {
      console.log(`✅ K40 re-connected: ${DEVICE.name} @ ${DEVICE.ip}:${DEVICE.port}`);
      lastLoggedOffline = false;
    }
    return zk;
  } catch (err) {
    lastError = err;
  }

  // 2. If configured IP failed, auto-discover active ZK device IP on local network
  const discoveredIp = await autoDiscoverZkIp();
  if (discoveredIp && discoveredIp !== DEVICE.ip) {
    try {
      const zk = await trySingleConnection(discoveredIp);
      if (lastLoggedOffline) {
        console.log(`✅ K40 re-connected: ${DEVICE.name} @ ${discoveredIp}:${DEVICE.port}`);
        lastLoggedOffline = false;
      }
      return zk;
    } catch (err) {
      lastError = err;
    }
  }

  // 3. Retry on target IP
  for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await sleep(RETRY_DELAY_MS);
      const zk = await trySingleConnection(DEVICE.ip);
      if (lastLoggedOffline) {
        console.log(`✅ K40 re-connected: ${DEVICE.name} @ ${DEVICE.ip}:${DEVICE.port}`);
        lastLoggedOffline = false;
      }
      return zk;
    } catch (err) {
      lastError = err;
    }
  }

  // All attempts exhausted — throw descriptive offline error
  const detail = describeError(lastError);

  const richErr = new Error(
    `K40 connection failed: ${detail}`
  );
  richErr.step      = 'TCP CONNECT';
  richErr.command   = 'TCP CONNECT';
  richErr.ip        = DEVICE.ip;
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