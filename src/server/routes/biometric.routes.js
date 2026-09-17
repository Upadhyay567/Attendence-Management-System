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

  console.log('==========================================');
  console.log('📡 BIOMETRIC DASHBOARD REQUEST');
  console.log('==========================================');

  try {

    // -------------------------------------------------
    // 1. ONE connection — sequential commands
    // -------------------------------------------------

    let biometricUsers = [];
    let biometricLogs  = [];
    let isConnected = true;

    try {
      const snapshot = await getDeviceSnapshot();
      biometricUsers = Array.isArray(snapshot.users) ? snapshot.users : [];
      biometricLogs  = Array.isArray(snapshot.logs)  ? snapshot.logs  : [];
    } catch (err) {
      console.log(`ℹ️ K40 hardware offline (${DEVICE.ip}:${DEVICE.port}) during dashboard request — operating in local database mode.`);
      isConnected = false;

      // Read synced attendance and users from local database file
      try {
        if (fs.existsSync(LOCAL_DB_FILE)) {
          const rawDb = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
          const dbState = JSON.parse(rawDb);
          const rawLogs = Array.isArray(dbState.attendanceLogs) ? dbState.attendanceLogs : [];
          const rawUsers = Array.isArray(dbState.users) ? dbState.users : [];

          biometricLogs = rawLogs.map(l => ({
            userSn: l.id,
            deviceUserId: l.biometricUserId || l.userId,
            recordTime: l.lastBiometricPunchAt || (l.date && l.checkIn ? `${l.date}T${l.checkIn}:00.000Z` : new Date().toISOString()),
            ip: l.biometricDeviceId || DEVICE.ip
          }));

          biometricUsers = rawUsers.map((u, index) => ({
            uid: index + 1,
            role: 0,
            name: u.name,
            userId: u.biometricUserId || u.employeeId || u.id
          }));
        }
      } catch (localErr) {
        console.warn('⚠️ Local DB fallback read warning:', localErr.message);
      }
    }

    console.log(`👥 K40 users: ${biometricUsers.length}`);
    console.log(`📝 K40 logs : ${biometricLogs.length}`);


    // -------------------------------------------------
    // 2. Filter out K40 administrator account
    // -------------------------------------------------

    const employees = biometricUsers.filter(user => {
      if (!user) return false;
      if (String(user.role) === '14') return false;
      if (String(user.name || '').trim().toLowerCase() === 'admin') return false;
      return true;
    });


    // -------------------------------------------------
    // 3. Read HRMS users (from seed.json / local DB)
    // -------------------------------------------------

    const hrmsUsers = readHrmsUsers();

    console.log(`👨‍💼 HRMS users: ${hrmsUsers.length}`);


    // -------------------------------------------------
    // 4. Build dashboard records
    // -------------------------------------------------

    const dashboard = employees.map(deviceUser => {

      // The K40 userId is the biometric identifier
      const biometricId = String(deviceUser.userId || '').trim();

      // Find the matching HRMS employee (may be null)
      const hrmsUser = findHrmsUser(hrmsUsers, biometricId);

      // All punches for this biometric ID, sorted ascending
      const punches = biometricLogs
        .filter(log =>
          String(log.deviceUserId || '').trim() === biometricId
        )
        .sort(
          (a, b) =>
            new Date(a.recordTime) - new Date(b.recordTime)
        );

      const latestPunch = punches.length > 0
        ? punches[punches.length - 1]
        : null;

      // Determine today's check-in and check-out
      const today = new Date().toISOString().split('T')[0];

      const todayPunches = punches.filter(p => {
        const d = p.recordTime
          ? p.recordTime.toString().split('T')[0]
          : '';
        return d === today;
      });

      const todayCheckIn = todayPunches.length > 0
        ? todayPunches[0].recordTime
        : null;

      const todayCheckOut = todayPunches.length > 1
        ? todayPunches[todayPunches.length - 1].recordTime
        : null;

      return {
        // HRMS identity (falls back to biometric data when unmatched)
        userId:       hrmsUser?.id != null ? String(hrmsUser.id) : biometricId,
        employeeId:   hrmsUser?.employeeId || biometricId,
        employeeName: hrmsUser?.name || deviceUser.name || 'Unknown',

        // Biometric identity
        biometricId,
        biometricName: deviceUser.name || '',
        uid:           deviceUser.uid,

        // Device
        device:     DEVICE.name,
        deviceIp:   DEVICE.ip,
        devicePort: DEVICE.port,

        // Attendance summary
        totalPunches:  punches.length,
        latestPunch:   latestPunch ? latestPunch.recordTime : null,
        latestPunchIp: latestPunch?.ip || DEVICE.ip,

        // Today
        todayCheckIn,
        todayCheckOut,
        todayAttendance: todayPunches.length > 0 ? 'Present' : 'No Punch',

        // Full punch log
        punches
      };
    });


    // -------------------------------------------------
    // 5. Return response
    // -------------------------------------------------

    console.log(`✅ Dashboard records: ${dashboard.length}`);
    console.log('==========================================');

    return res.json({
      success: true,
      device: {
        name:      DEVICE.name,
        ip:        DEVICE.ip,
        port:      DEVICE.port,
        serial:    DEVICE.serial,
        connected: isConnected
      },
      counts: {
        biometricUsers:   biometricUsers.length,
        employees:        employees.length,
        biometricLogs:    biometricLogs.length,
        dashboardRecords: dashboard.length
      },
      data: dashboard
    });


  } catch (error) {

    console.error('==========================================');
    console.error('❌ BIOMETRIC DASHBOARD ERROR');
    console.error('==========================================');
    console.error('Step    :', error.step    || 'unknown');
    console.error('Message :', error.message || String(error));
    console.error('Stack   :', error.stack);

    const step    = error.step    || 'unknown';
    const message = error.message || describeError(error);

    return res.status(500).json({
      success: false,
      step,
      message,
      command: error.command || step,
      ip:      error.ip      || DEVICE.ip,
      port:    error.port    || DEVICE.port,
      device:  `${DEVICE.ip}:${DEVICE.port}`
    });
  }
});


module.exports = router;