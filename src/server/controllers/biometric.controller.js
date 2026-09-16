// src/server/controllers/biometric.controller.js
//
// This controller is kept for compatibility.
// The primary route logic now lives in
// src/server/routes/biometric.routes.js
//
// If this controller is called anywhere, it delegates
// to the shared zkDevice functions.

const {
  DEVICE,
  describeError,
  getDeviceInfo,
  getDeviceUsers,
  getAttendanceLogs,
  getDeviceSnapshot
} = require('../biometric/zkDevice');

const fs = require('fs');
const { LOCAL_DB_FILE } = require('../config/db');

// -------------------------------------------------------
// testDevice
// -------------------------------------------------------
async function testDevice(req, res) {
  try {
    const info = await getDeviceInfo();
    return res.json({
      success: true,
      device: {
        name:   DEVICE.name,
        ip:     DEVICE.ip,
        port:   DEVICE.port,
        serial: DEVICE.serial
      },
      info: info || {}
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      step:    'getInfo',
      message: err.message || describeError(err),
      ip:      DEVICE.ip,
      port:    DEVICE.port
    });
  }
}

// -------------------------------------------------------
// getUsers
// -------------------------------------------------------
async function getUsers(req, res) {
  try {
    const result = await getDeviceUsers();
    const users  = result?.data || [];
    return res.json({
      success: true,
      count:   users.length,
      data:    users
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      step:    'getUsers',
      message: err.message || describeError(err)
    });
  }
}

// -------------------------------------------------------
// getLogs
// -------------------------------------------------------
async function getLogs(req, res) {
  try {
    const result = await getAttendanceLogs();
    const logs   = result?.data || [];
    return res.json({
      success: true,
      count:   logs.length,
      data:    logs
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      step:    'getAttendances',
      message: err.message || describeError(err)
    });
  }
}

// -------------------------------------------------------
// syncAttendance (stub — full logic is in biometricSync.service.js)
// -------------------------------------------------------
async function syncAttendance(req, res) {
  return res.status(501).json({
    success: false,
    message: 'Use the biometric scheduler or POST /api/biometric/sync'
  });
}

// -------------------------------------------------------
// getBiometricDashboard
// -------------------------------------------------------
async function getBiometricDashboard(req, res) {
  try {
    const snapshot = await getDeviceSnapshot();

    const biometricUsers = Array.isArray(snapshot.users) ? snapshot.users : [];
    const logs           = Array.isArray(snapshot.logs)  ? snapshot.logs  : [];

    // Filter out K40 admin
    const employees = biometricUsers.filter(user =>
      String(user.role) !== '14' &&
      String(user.name || '').toLowerCase() !== 'admin'
    );

    // Read HRMS users
    let hrmsUsers = [];
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        const db  = JSON.parse(raw);
        hrmsUsers = Array.isArray(db.users) ? db.users : [];
      }
    } catch (_) {}

    const dashboardData = employees.map(user => {
      const biometricId = String(user.userId || '').trim();

      const hrmsUser = hrmsUsers.find(u => {
        if (!u) return false;
        if (u.biometricUserId != null && String(u.biometricUserId).trim() === biometricId) return true;
        if (u.id              != null && String(u.id).trim()              === biometricId) return true;
        if (u.employeeId      != null && String(u.employeeId).trim()      === biometricId) return true;
        return false;
      }) || null;

      const employeeLogs = logs
        .filter(log => String(log.deviceUserId || '').trim() === biometricId)
        .sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));

      const latestPunch = employeeLogs.length
        ? employeeLogs[employeeLogs.length - 1]
        : null;

      return {
        userId:       hrmsUser?.id != null ? String(hrmsUser.id) : biometricId,
        employeeId:   hrmsUser?.employeeId || biometricId,
        employeeName: hrmsUser?.name || user.name || 'Unknown',
        biometricId,
        biometricName: user.name || '',
        uid:           user.uid,
        totalPunches:  employeeLogs.length,
        latestPunch:   latestPunch ? latestPunch.recordTime : null,
        device:        DEVICE.name,
        deviceIp:      DEVICE.ip,
        devicePort:    DEVICE.port
      };
    });

    return res.json({
      success: true,
      device: {
        name:   DEVICE.name,
        ip:     DEVICE.ip,
        port:   DEVICE.port,
        connected: true
      },
      count: dashboardData.length,
      data:  dashboardData
    });

  } catch (error) {
    console.error('Biometric dashboard error:', error.message || error);
    return res.status(500).json({
      success: false,
      step:    error.step || 'TCP CONNECT',
      message: error.message || describeError(error),
      ip:      DEVICE.ip,
      port:    DEVICE.port
    });
  }
}

module.exports = {
  testDevice,
  getUsers,
  getLogs,
  syncAttendance,
  getBiometricDashboard
};