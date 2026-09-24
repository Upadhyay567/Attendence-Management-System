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

const {
  getRegisteredDevices,
  getVaultUsers,
  testDeviceConnectivity,
  replicateTemplatesAcrossDevices,
  getTemplateSyncMatrix,
  addBiometricDevice,
  updateBiometricDevice,
  deleteBiometricDevice
} = require('../biometric/biometricMultiDevice.service');

const {
  syncBiometricAttendance
} = require('../biometric/biometricSync.service');


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
function findHrmsUser(hrmsUsers, biometricId, biometricName = '') {
  const target = String(biometricId).trim();
  const targetDigits = target.replace(/\D/g, '');
  const targetName = String(biometricName || '').trim().toLowerCase();

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

    if (targetDigits) {
      const empDigits = String(user.employeeId || '').replace(/\D/g, '');
      const bioDigits = String(user.biometricUserId || user.biometricId || '').replace(/\D/g, '');
      if ((empDigits && empDigits === targetDigits) || (bioDigits && bioDigits === targetDigits)) return true;
    }

    if (targetName && user.name) {
      const uName = String(user.name).trim().toLowerCase();
      if (uName === targetName) return true;
      const firstUName = uName.split(' ')[0];
      const firstTargetName = targetName.split(' ')[0];
      if (firstUName && firstTargetName && firstUName === firstTargetName) return true;
    }

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
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        const db = JSON.parse(raw);
        const allUsers = Array.isArray(db.users) ? db.users : [];
        const bioUsers = allUsers.filter(u => u && (u.biometricUserId || u.biometricId || u.employeeId));
        return res.json({
          success: true,
          offline: true,
          source: 'local_database',
          device: {
            name: DEVICE.name,
            ip:   DEVICE.ip,
            port: DEVICE.port
          },
          count: bioUsers.length,
          data:  bioUsers
        });
      }
    } catch (_) {}
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
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
        const db = JSON.parse(raw);
        const logs = Array.isArray(db.attendanceLogs) ? db.attendanceLogs : [];
        return res.json({
          success: true,
          offline: true,
          source: 'local_database',
          device: {
            name: DEVICE.name,
            ip:   DEVICE.ip,
            port: DEVICE.port
          },
          count: logs.length,
          data:  logs
        });
      }
    } catch (_) {}
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
      .filter(user => user && user.status !== 'Inactive')
      .map((user, index) => {
        const userId = String(user.id || '');
        const employeeId = user.employeeId || userId;
        const biometricId = String(user.biometricUserId || user.biometricId || user.employeeId || userId);
        const name = user.name || 'Employee';

        const userDigits = String(user.employeeId || user.biometricUserId || '').replace(/\D/g, '');
        const userLogs = attendanceLogs.filter(l => {
          if (String(l.userId) === userId) return true;
          if (l.biometricUserId && String(l.biometricUserId) === biometricId) return true;
          if (user.employeeId && String(l.employeeId) === String(user.employeeId)) return true;
          if (user.biometricUserId && String(l.biometricUserId) === String(user.biometricUserId)) return true;
          if (user.biometricId && String(l.biometricId || l.biometricUserId) === String(user.biometricId)) return true;
          const logDigits = String(l.biometricUserId || l.employeeId || '').replace(/\D/g, '');
          if (userDigits && logDigits && userDigits === logDigits) return true;
          return false;
        });

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

// =====================================================
// MULTI-DEVICE & CROSS-BRANCH TEMPLATE REPLICATION APIS
// =====================================================

// GET /api/biometric/devices - List all registered biometric devices
router.get('/biometric/devices', async (req, res) => {
  try {
    const devices = await getRegisteredDevices();
    return res.json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch biometric devices'
    });
  }
});

// POST /api/biometric/devices - Register a new branch / gate device
router.post('/biometric/devices', async (req, res) => {
  try {
    const { name, ip, port, serial, location, branch, enabled, isPrimary } = req.body;
    if (!name || !ip) {
      return res.status(400).json({
        success: false,
        message: 'Device name and IP address are required.'
      });
    }

    const device = await addBiometricDevice({
      name,
      ip,
      port: port ? Number(port) : 4370,
      serial,
      location,
      branch,
      enabled: enabled !== false,
      isPrimary: isPrimary === true
    });

    return res.json({
      success: true,
      message: `Device '${device.name}' added successfully and queued for template replication.`,
      device
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to add biometric device'
    });
  }
});

// PUT /api/biometric/devices/:id - Update existing biometric device
router.put('/biometric/devices/:id', async (req, res) => {
  try {
    const updated = await updateBiometricDevice(req.params.id, req.body);
    return res.json({
      success: true,
      message: `Device '${updated.name}' updated successfully.`,
      device: updated
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update device'
    });
  }
});

// DELETE /api/biometric/devices/:id - Remove biometric device
router.delete('/biometric/devices/:id', async (req, res) => {
  try {
    const result = await deleteBiometricDevice(req.params.id);
    return res.json({
      success: true,
      message: 'Device removed successfully.',
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete device'
    });
  }
});

// POST /api/biometric/devices/:id/test - Test connection to specific device
router.post('/biometric/devices/:id/test', async (req, res) => {
  try {
    const devices = await getRegisteredDevices();
    const device = devices.find(d => d.id === req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: `Device with ID '${req.params.id}' not found.`
      });
    }

    const result = await testDeviceConnectivity(device);
    return res.json({
      success: result.success,
      device: {
        id: device.id,
        name: device.name,
        ip: device.ip,
        port: device.port
      },
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Test connection error'
    });
  }
});

// POST /api/biometric/sync-templates - Trigger template replication across all branch devices
router.post('/biometric/sync-templates', async (req, res) => {
  try {
    const result = await replicateTemplatesAcrossDevices({ force: true });
    return res.json({
      success: true,
      message: `Templates successfully synchronized: ${result.replicatedCount} user template(s) replicated across branches.`,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to synchronize biometric templates'
    });
  }
});

// GET /api/biometric/template-sync-status - View replication matrix and vault status
router.get('/biometric/template-sync-status', async (req, res) => {
  try {
    const matrix = await getTemplateSyncMatrix();
    return res.json({
      success: true,
      ...matrix
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to get template sync status'
    });
  }
});

// POST /api/biometric/sync - Trigger immediate multi-device attendance sync
router.post('/biometric/sync', async (req, res) => {
  try {
    const syncRes = await syncBiometricAttendance();
    return res.json({
      success: true,
      ...syncRes
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Sync failed'
    });
  }
});


module.exports = router;