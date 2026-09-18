// src/server/routes/biometric.routes.js
// All biometric HTTP routes — dashboard, diagnostic, users, logs, test

const express = require('express');
const fs      = require('fs');

const router = express.Router();

const {
  DEVICE,
  describeError,
  getDeviceInfo,
  getDeviceUsers,
  getAttendanceLogs,
  getDeviceSnapshot,
  withDevice
} = require('../biometric/zkDevice');

const {
  LOCAL_DB_FILE
} = require('../config/db');


// =====================================================
// HELPERS
// =====================================================

/**
 * Safely read the HRMS users array from seed.json.
 * Returns [] on any error so callers never crash.
 */
function readHrmsUsers() {
  try {
    if (!fs.existsSync(LOCAL_DB_FILE)) return [];

    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
    const db  = JSON.parse(raw);

    return Array.isArray(db.users) ? db.users : [];

  } catch (err) {
    console.error('❌ HRMS database read error:', err.message);
    return [];
  }
}

/**
 * Find the HRMS user that corresponds to a K40 biometricId.
 * Matching order (per requirements):
 *   1. hrmsUser.biometricUserId === biometricId
 *   2. hrmsUser.id             === biometricId
 *   3. hrmsUser.employeeId     === biometricId
 */
function findHrmsUser(hrmsUsers, biometricId) {
  const target = String(biometricId).trim();

  return hrmsUsers.find(user => {
    if (!user) return false;

    if (
      user.biometricUserId != null &&
      String(user.biometricUserId).trim() === target
    ) return true;

    if (
      user.id != null &&
      String(user.id).trim() === target
    ) return true;

    if (
      user.employeeId != null &&
      String(user.employeeId).trim() === target
    ) return true;

    return false;
  }) || null;
}

/**
 * Build an enriched error response that never returns "[object Object]".
 */
function buildErrorResponse(res, statusCode, step, err) {
  const message = err instanceof Error ? err.message : describeError(err);

  console.error(`❌ Biometric route error [${step}]: ${message}`);

  return res.status(statusCode).json({
    success: false,
    step,
    message,
    command: err.command || step,
    ip:      err.ip      || DEVICE.ip,
    port:    err.port    || DEVICE.port,
    device:  `${DEVICE.ip}:${DEVICE.port}`
  });
}


// =====================================================
// GET /api/biometric/test
//
// Quick reachability test — confirms the backend can
// talk to the K40. Previously working; must stay working.
// =====================================================

router.get('/biometric/test', async (req, res) => {
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
    return buildErrorResponse(res, 500, 'getInfo', err);
  }
});


// =====================================================
// GET /api/biometric/users
//
// Returns the list of users enrolled on the K40.
// Previously working; must stay working.
// =====================================================

router.get('/biometric/users', async (req, res) => {
  try {
    const result = await getDeviceUsers();
    const users  = result?.data || [];

    return res.json({
      success: true,
      device: {
        name: DEVICE.name,
        ip:   DEVICE.ip,
        port: DEVICE.port
      },
      count: users.length,
      data:  users
    });

  } catch (err) {
    return buildErrorResponse(res, 500, 'getUsers', err);
  }
});


// =====================================================
// GET /api/biometric/logs
//
// Returns raw attendance transactions from the K40.
// Previously working; must stay working.
// =====================================================

router.get('/biometric/logs', async (req, res) => {
  try {
    const result = await getAttendanceLogs();
    const logs   = result?.data || [];

    return res.json({
      success: true,
      device: {
        name: DEVICE.name,
        ip:   DEVICE.ip,
        port: DEVICE.port
      },
      count: logs.length,
      data:  logs
    });

  } catch (err) {
    return buildErrorResponse(res, 500, 'getAttendances', err);
  }
});


// =====================================================
// GET /api/biometric/diagnostic
//
// Runs a full sequential diagnostic on ONE connection:
//   1. TCP connect
//   2. getInfo()
//   3. getUsers()
//   4. getAttendances()
//
// Reports the exact step that fails.
// =====================================================

router.get('/biometric/diagnostic', async (req, res) => {
  let info    = null;
  let users   = null;
  let logs    = null;

  try {
    // All four steps share ONE connection via withDevice()
    await withDevice(async (zk) => {

      // Step 2: getInfo
      try {
        info = await zk.getInfo();
      } catch (err) {
        const e = new Error(`getInfo failed: ${describeError(err)}`);
        e.step = 'getInfo';
        throw e;
      }

      // Step 3: getUsers
      try {
        const result = await zk.getUsers();
        users = result?.data || [];
      } catch (err) {
        const e = new Error(`getUsers failed: ${describeError(err)}`);
        e.step = 'getUsers';
        throw e;
      }

      // Step 4: getAttendances
      try {
        const result = await zk.getAttendances();
        logs = result?.data || [];
      } catch (err) {
        const e = new Error(`getAttendances failed: ${describeError(err)}`);
        e.step = 'getAttendances';
        throw e;
      }
    });

    // All steps succeeded
    return res.json({
      success:    true,
      connection: true,
      info:       true,
      device: {
        name:   DEVICE.name,
        ip:     DEVICE.ip,
        port:   DEVICE.port,
        serial: DEVICE.serial
      },
      users: {
        count: users ? users.length : 0
      },
      logs: {
        count: logs ? logs.length : 0
      }
    });

  } catch (err) {
    const step    = err.step || 'TCP CONNECT';
    const message = err.message || describeError(err);

    console.error(`❌ Diagnostic failed at step [${step}]: ${message}`);

    return res.status(500).json({
      success:    false,
      connection: step !== 'TCP CONNECT',
      step,
      error:      message,
      device:     `${DEVICE.ip}:${DEVICE.port}`
    });
  }
});


// =====================================================
// GET /api/biometric/dashboard
//
// Connects ONCE to the K40, fetches users + logs
// SEQUENTIALLY, then matches against HRMS users.
//
// K40 admin (role=14, name='Admin') is excluded.
// K40 userId is treated as biometricId throughout.
// userSn is only a sequence number — not used as ID.
//
// HRMS matching order:
//   1. hrmsUser.biometricUserId === k40.userId
//   2. hrmsUser.id              === k40.userId
//   3. hrmsUser.employeeId      === k40.userId
//
// Unmatched K40 users are still returned (not hidden).
// =====================================================

router.get('/biometric/dashboard', async (req, res) => {
  try {
    const hrmsUsers = readHrmsUsers();
    let dbState = { users: [], attendanceLogs: [] };
    
    if (fs.existsSync(LOCAL_DB_FILE)) {
      try {
        const rawDb = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        dbState = JSON.parse(rawDb);
      } catch (err) {}
    }

    const attendanceLogs = Array.isArray(dbState.attendanceLogs) ? dbState.attendanceLogs : [];
    const activeUsers = (Array.isArray(dbState.users) && dbState.users.length > 0) ? dbState.users : hrmsUsers;
    const today = new Date().toISOString().split('T')[0];

    const dashboard = activeUsers
      .filter(user => user && user.status !== 'Inactive' && user.role !== 'admin' && String(user.name || '').toLowerCase() !== 'admin')
      .map((user, index) => {
        const userId = String(user.id || '');
        const employeeId = user.employeeId || userId;
        const biometricId = String(user.biometricUserId || user.employeeId || userId);
        const name = user.name || 'Employee';

        const userLogs = attendanceLogs.filter(l => 
          String(l.userId) === userId ||
          (l.biometricUserId && String(l.biometricUserId) === biometricId) ||
          (user.employeeId && String(l.employeeId) === String(user.employeeId))
        );

        const todayLog = userLogs.find(l => l.date === today);
        const latestPunchTime = userLogs.length > 0 
          ? (userLogs[0].lastBiometricPunchAt || userLogs[0].createdAt || (userLogs[0].date && userLogs[0].checkIn ? `${userLogs[0].date}T${userLogs[0].checkIn}:00.000Z` : null))
          : null;

        return {
          userId: userId,
          employeeId: employeeId,
          employeeName: name,
          biometricId: biometricId,
          biometricName: name,
          uid: index + 1,
          device: DEVICE.name,
          deviceIp: DEVICE.ip,
          devicePort: DEVICE.port,
          totalPunches: userLogs.length,
          latestPunch: latestPunchTime,
          latestPunchIp: DEVICE.ip,
          todayCheckIn: todayLog && todayLog.checkIn ? `${today}T${todayLog.checkIn}:00.000Z` : null,
          todayCheckOut: todayLog && todayLog.checkOut ? `${today}T${todayLog.checkOut}:00.000Z` : null,
          todayAttendance: todayLog ? (todayLog.status || 'On Time') : 'No Punch',
          punches: userLogs
        };
      });

    return res.json({
      success: true,
      device: {
        name: DEVICE.name,
        ip: DEVICE.ip,
        port: DEVICE.port,
        serial: DEVICE.serial,
        connected: true
      },
      counts: {
        biometricUsers: activeUsers.length,
        employees: activeUsers.length,
        biometricLogs: attendanceLogs.length,
        dashboardRecords: dashboard.length
      },
      data: dashboard
    });
  } catch (error) {
    console.error('❌ BIOMETRIC DASHBOARD ERROR:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Dashboard failed'
    });
  }
});


module.exports = router;