// src/server/biometric/zkDevice.js
// ZKTeco K40 Pro TCP communication layer

const ZKLib = require('node-zklib');

const DEVICE = {
  name: process.env.BIOMETRIC_DEVICE_NAME || 'ZKTeco K40 Pro',
  ip: process.env.BIOMETRIC_DEVICE_IP || '192.168.1.51',
  port: Number(process.env.BIOMETRIC_DEVICE_PORT || 4370),

  // node-zklib connection settings
  timeout: Number(process.env.BIOMETRIC_DEVICE_TIMEOUT || 10000),
  inport: Number(process.env.BIOMETRIC_DEVICE_INPORT || 5200),

  // K40 Pro Comm Key = 0
  commCode: Number(process.env.BIOMETRIC_COMM_KEY || 0),

  serial:
    process.env.BIOMETRIC_DEVICE_SERIAL || 'CJOU232660306'
};

/**
 * Create a new ZKTeco connection.
 */
async function createDeviceConnection() {
  const zk = new ZKLib(
    DEVICE.ip,
    DEVICE.port,
    DEVICE.timeout,
    DEVICE.inport,
    DEVICE.commCode,
    'tcp'
  );

  await zk.createSocket();

  console.log(
    `✅ Biometric device connected: ${DEVICE.name} ${DEVICE.ip}:${DEVICE.port}`
  );

  return zk;
}

/**
 * Execute an operation and always disconnect.
 */
async function withDevice(callback) {
  let zk = null;

  try {
    zk = await createDeviceConnection();

    return await callback(zk);
  } catch (error) {
    console.error(
      `❌ Biometric device error (${DEVICE.ip}:${DEVICE.port}):`,
      error
    );

    throw error;
  } finally {
    if (zk) {
      try {
        await zk.disconnect();
      } catch (_) {
        // Ignore disconnect errors
      }
    }
  }
}

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
 */
async function getDeviceUsers() {
  return withDevice(async (zk) => {
    return await zk.getUsers();
  });
}

/**
 * Get all attendance transactions.
 */
async function getAttendanceLogs() {
  return withDevice(async (zk) => {
    return await zk.getAttendances();
  });
}

/**
 * Get both users and attendance logs in one operation.
 *
 * This avoids opening two independent connections.
 */
async function getDeviceSnapshot() {
  return withDevice(async (zk) => {
    const [users, attendance] = await Promise.all([
      zk.getUsers(),
      zk.getAttendances()
    ]);

    return {
      users: users?.data || [],
      logs: attendance?.data || []
    };
  });
}

module.exports = {
  DEVICE,
  createDeviceConnection,
  withDevice,
  getDeviceInfo,
  getDeviceUsers,
  getAttendanceLogs,
  getDeviceSnapshot
};