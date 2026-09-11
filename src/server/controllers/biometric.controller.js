// src/server/controllers/biometric.controller.js
// Biometric Controller for ZKTeco Device Integration

const {
  getDeviceInfo,
  getDeviceUsers,
  getAttendanceLogs,
  DEVICE
} = require('../biometric/zkDevice');

const {
  syncBiometricAttendance
} = require('../biometric/biometricSync.service');

/**
 * GET /api/biometric/test
 * Test connection to biometric hardware device
 */
async function testDevice(req, res) {
  try {
    const info = await getDeviceInfo();
    return res.json({
      success: true,
      connected: true,
      device: DEVICE,
      info
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      connected: false,
      device: DEVICE,
      message: 'Biometric hardware disconnected or unreachable',
      error: error.message
    });
  }
}

/**
 * GET /api/biometric/users
 * Retrieve users stored on biometric device
 */
async function getUsers(req, res) {
  try {
    const users = await getDeviceUsers();
    return res.json({
      success: true,
      count: Array.isArray(users) ? users.length : 0,
      users
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Unable to fetch biometric users',
      error: error.message,
      users: []
    });
  }
}

/**
 * GET /api/biometric/logs
 * Retrieve raw attendance logs from biometric device
 */
async function getLogs(req, res) {
  try {
    const logs = await getAttendanceLogs();
    return res.json({
      success: true,
      count: Array.isArray(logs) ? logs.length : 0,
      logs
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'Unable to fetch biometric logs',
      error: error.message,
      logs: []
    });
  }
}

/**
 * POST /api/biometric/sync
 * Manually trigger biometric attendance sync
 */
async function syncAttendance(req, res) {
  try {
    const result = await syncBiometricAttendance();
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Biometric sync error',
      error: error.message
    });
  }
}

module.exports = {
  testDevice,
  getUsers,
  getLogs,
  syncAttendance
};