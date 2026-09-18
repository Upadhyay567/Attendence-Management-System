// src/server/biometric/biometricSync.service.js

const fs = require('fs');
const path = require('path');

const {
  User,
  AttendanceLog,
  connectMongoose,
  getUseLocalFileDB,
  LOCAL_DB_FILE
} = require('../config/db');

const {
  DEVICE,
  getDeviceSnapshot
} = require('./zkDevice');

const {
  broadcastSSEEvent
} = require('../routes/events.routes');

const LOCAL_TIMEZONE =
  process.env.BIOMETRIC_TIMEZONE || 'Asia/Kolkata';

const LOCATION =
  process.env.BIOMETRIC_LOCATION || 'Office HQ';

const DEVICE_NAME =
  process.env.BIOMETRIC_DEVICE_NAME || 'ZKTeco K40 Pro';

let syncRunning = false;


/* =========================================================
   DATE / TIME HELPERS
========================================================= */

function getLocalDateTimeParts(date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      result[part.type] = part.value;
    }
  }

  return {
    date:
      `${result.year}-${result.month}-${result.day}`,

    time:
      `${result.hour}:${result.minute}:${result.second}`
  };
}


/* =========================================================
   NORMALIZE DEVICE USER
========================================================= */

function normalizeDeviceUser(user) {
  if (!user) return null;

  return {
    uid: user.uid,
    userId: String(
      user.userId ??
      user.userid ??
      user.deviceUserId ??
      ''
    ).trim(),

    name: String(user.name || '').trim(),

    role: user.role,

    cardno: user.cardno
  };
}


/* =========================================================
   NORMALIZE ATTENDANCE RECORD
========================================================= */

function normalizePunch(log) {
  if (!log) return null;

  const biometricUserId = String(
    log.deviceUserId ??
    log.userId ??
    log.userid ??
    ''
  ).trim();

  if (!biometricUserId) {
    return null;
  }

  const recordTime = new Date(log.recordTime);

  if (Number.isNaN(recordTime.getTime())) {
    return null;
  }

  return {
    userSn: log.userSn ?? null,

    biometricUserId,

    recordTime,

    ip: log.ip || DEVICE.ip
  };
}


/* =========================================================
   SAFE UNIQUE PUNCH ID
========================================================= */

function createPunchId(punch) {
  return [
    DEVICE.serial,
    punch.biometricUserId,
    punch.recordTime.toISOString()
  ].join('_');
}


/* =========================================================
   LOCAL DATABASE HELPERS
========================================================= */

function readLocalDatabase() {
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    throw new Error(
      `Local database file not found: ${LOCAL_DB_FILE}`
    );
  }

  const raw = fs.readFileSync(
    LOCAL_DB_FILE,
    'utf8'
  );

  return JSON.parse(raw);
}


function writeLocalDatabase(state) {
  const tempFile =
    `${LOCAL_DB_FILE}.biometric.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(state, null, 2),
    'utf8'
  );

  fs.renameSync(
    tempFile,
    LOCAL_DB_FILE
  );
}


/* =========================================================
   FIND HRMS USER
========================================================= */

function findLocalEmployee(users, biometricUserId, deviceUserName = '') {
  const target = String(biometricUserId || '').trim().toLowerCase();
  const targetName = String(deviceUserName || '').trim().toLowerCase();

  let employee = users.find(user => {
    if (!user) return false;

    // 1. Preferred mapping: biometricUserId
    if (
      user.biometricUserId &&
      String(user.biometricUserId).trim().toLowerCase() === target
    ) {
      return true;
    }

    // 2. Backward-compatible mappings
    if (
      user.employeeId &&
      String(user.employeeId).trim().toLowerCase() === target
    ) {
      return true;
    }

    if (
      user.id &&
      String(user.id).trim().toLowerCase() === target
    ) {
      return true;
    }

    if (
      user.username &&
      String(user.username).trim().toLowerCase() === target
    ) {
      return true;
    }

    // 3. Name matching fallback (e.g. K40 "Hemant" <-> HRMS "Hemant" or "Hemant upadhyay")
    if (targetName && user.name) {
      const uName = String(user.name).trim().toLowerCase();
      if (uName === targetName) return true;

      const firstUName = uName.split(' ')[0];
      const firstTargetName = targetName.split(' ')[0];
      if (firstUName && firstTargetName && firstUName === firstTargetName) return true;
    }

    return false;
  });

  // Auto-bind biometricUserId if found and not yet set
  if (employee) {
    if (!employee.biometricUserId || employee.biometricUserId !== String(biometricUserId).trim()) {
      employee.biometricUserId = String(biometricUserId).trim();
    }
    return employee;
  }

  // Auto-register biometric user if missing from HRMS list
  if (targetName && targetName !== 'admin') {
    const defaultSch = 'sch_q8jji9v';
    const newEmp = {
      _id: 'usr_bio_' + String(biometricUserId).trim(),
      id: 'usr_bio_' + String(biometricUserId).trim(),
      employeeId: String(biometricUserId).trim(),
      biometricUserId: String(biometricUserId).trim(),
      name: deviceUserName || ('Employee ' + biometricUserId),
      username: 'bio_' + String(biometricUserId).trim(),
      role: 'employee',
      status: 'Active',
      scheduleId: defaultSch,
      scheduleIds: [defaultSch],
      shiftLocations: { [defaultSch]: LOCATION },
      createdAt: new Date().toISOString()
    };
    users.push(newEmp);
    console.log(`✨ Auto-registered biometric user in HRMS: ${newEmp.name} (ID: ${newEmp.biometricUserId})`);
    return newEmp;
  }

  return null;
}


/**
 * MongoDB employee lookup.
 */
async function findMongoEmployee(biometricUserId, deviceUserName = '') {
  const target = String(biometricUserId || '').trim();
  const targetName = String(deviceUserName || '').trim();

  let employee = await User.findOne({
    $or: [
      { biometricUserId: target },
      { employeeId: target },
      { id: target },
      { username: target }
    ]
  }).lean();

  if (!employee && targetName) {
    const firstName = targetName.split(' ')[0];
    employee = await User.findOne({
      $or: [
        { name: new RegExp('^' + targetName, 'i') },
        { name: new RegExp('^' + firstName, 'i') }
      ]
    }).lean();
  }

  if (employee && !employee.biometricUserId) {
    await User.updateOne({ id: employee.id }, { $set: { biometricUserId: target } }).catch(() => {});
  }

  return employee;
}


/* =========================================================
   FIND EXISTING ATTENDANCE
========================================================= */

function findLocalAttendance(
  attendanceLogs,
  userId,
  date
) {
  return attendanceLogs.find(log =>
    String(log.userId) === String(userId) &&
    String(log.date) === String(date)
  );
}


async function findMongoAttendance(
  userId,
  date
) {
  return AttendanceLog.findOne({
    userId: String(userId),
    date: String(date)
  });
}


/* =========================================================
   CREATE ATTENDANCE ID
========================================================= */

function createAttendanceId(
  userId,
  date
) {
  return `BIO_${userId}_${date}`;
}


/* =========================================================
   PROCESS ONE LOCAL PUNCH
========================================================= */

function processLocalPunch(
  state,
  punch,
  deviceUserMap,
  result
) {
  const users = state.users || [];

  if (!Array.isArray(state.attendanceLogs)) {
    state.attendanceLogs = [];
  }

  const biometricUser =
    deviceUserMap.get(
      punch.biometricUserId
    );

  if (!biometricUser) {
    result.unmatched++;

    result.unmatchedUsers.push(
      punch.biometricUserId
    );

    return;
  }

  /*
   * Ignore K40 administrator account.
   */
  if (
    String(biometricUser.role) === '14' ||
    biometricUser.name.toLowerCase() === 'admin'
  ) {
    result.ignored++;

    return;
  }

  const employee =
    findLocalEmployee(
      users,
      punch.biometricUserId,
      biometricUser ? biometricUser.name : ''
    );

  if (!employee) {
    result.unmatched++;

    if (
      !result.unmatchedUsers.includes(
        punch.biometricUserId
      )
    ) {
      result.unmatchedUsers.push(
        punch.biometricUserId
      );
    }

    console.warn(
      `⚠️ No HRMS employee mapped to biometric ID ${punch.biometricUserId} (${biometricUser.name})`
    );

    return;
  }

  const localParts =
    getLocalDateTimeParts(
      punch.recordTime
    );

  const date = localParts.date;
  const time = localParts.time;

  const punchId =
    createPunchId(punch);

  /*
   * Duplicate protection.
   */
  const duplicate =
    state.attendanceLogs.some(
      log =>
        log.biometricPunchId === punchId
    );

  if (duplicate) {
    result.duplicates++;

    return;
  }

  let attendance =
    findLocalAttendance(
      state.attendanceLogs,
      employee.id,
      date
    );

  /*
   * FIRST PUNCH = CHECK IN
   */
  if (!attendance) {
    const schedules = state.schedules || [];
    const empShiftId = employee.scheduleId || '';
    const shift = schedules.find(s => String(s.id) === String(empShiftId));
    let status = 'On Time';
    if (shift && shift.startTime) {
      const [startHour, startMin] = shift.startTime.split(':').map(Number);
      const [nowHour, nowMin] = time.split(':').map(Number);
      const totalStartMins = startHour * 60 + startMin;
      const totalNowMins = nowHour * 60 + nowMin;
      if (totalNowMins > totalStartMins + (shift.gracePeriod || 15)) {
        status = 'Late';
      }
    }

    attendance = {
      id: createAttendanceId(
        employee.id,
        date
      ),

      userId: String(employee.id),

      date,

      shiftId:
        empShiftId,

      checkIn: time,

      checkOut: '',

      status: status,

      biometricUsed:
        DEVICE_NAME,

      biometricDeviceId:
        DEVICE.serial,

      biometricUserId:
        punch.biometricUserId,

      biometricPunchId:
        punchId,

      lastBiometricPunchAt:
        punch.recordTime.toISOString(),

      location:
        employee.preferredLocation ||
        LOCATION,

      deviationFlag: false,

      justification: '',

      coords: '',

      distance: 0,

      facePhoto: '',

      latitude: null,

      longitude: null,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    /*
     * Add newest record to beginning,
     * matching your existing local DB behavior.
     */
    state.attendanceLogs.unshift(
      attendance
    );

    if (!Array.isArray(state.activityLogs)) {
      state.activityLogs = [];
    }

    state.activityLogs.unshift({
      timestamp: new Date().toISOString(),
      action: 'BIOMETRIC_CHECKIN',
      userId: String(employee.id),
      userName: employee.name,
      userRole: employee.role || 'employee',
      details: {
        attendanceId: attendance.id,
        checkIn: time,
        status: status,
        device: DEVICE_NAME
      },
      ipAddress: '127.0.0.1'
    });

    result.created++;

    console.log(
      `🟢 BIOMETRIC CHECK-IN | ${employee.name} | ${date} ${time} | Status: ${status}`
    );

    return;
  }

  /*
   * SECOND OR LATER PUNCH = CHECK OUT
   *
   * The existing AttendanceLog schema has one
   * checkIn/checkOut pair, so we retain the
   * first punch as check-in and latest punch
   * as check-out.
   */
  if (attendance.checkIn) {
    const [inH, inM] = attendance.checkIn.split(':').map(Number);
    const [punchH, punchM] = time.split(':').map(Number);
    const inMins = (inH || 0) * 60 + (inM || 0);
    const punchMins = (punchH || 0) * 60 + (punchM || 0);

    if (punchMins < inMins) {
      attendance.checkOut = attendance.checkIn;
      attendance.checkIn = time;
    } else if (punchMins >= inMins + 30) {
      if (attendance.checkOut === time || attendance.biometricPunchId === punchId) {
        return;
      }
      attendance.checkOut = time;
    } else {
      return;
    }
  }

  attendance.status = 'Present';

  attendance.biometricUsed =
    DEVICE_NAME;

  attendance.biometricDeviceId =
    DEVICE.serial;

  attendance.biometricUserId =
    punch.biometricUserId;

  attendance.biometricPunchId =
    punchId;

  attendance.lastBiometricPunchAt =
    punch.recordTime.toISOString();

  attendance.updatedAt =
    new Date().toISOString();

  result.updated++;

  console.log(
    `🔵 BIOMETRIC CHECK-OUT | ${employee.name} | ${date} ${time}`
  );
}


/* =========================================================
   LOCAL DATABASE SYNC
========================================================= */

async function syncLocalDatabase(
  users,
  punches
) {
  const state =
    readLocalDatabase();

  if (!Array.isArray(state.users)) {
    state.users = [];
  }

  if (!Array.isArray(state.attendanceLogs)) {
    state.attendanceLogs = [];
  }

  const deviceUserMap =
    new Map();

  users.forEach(rawUser => {
    const user =
      normalizeDeviceUser(
        rawUser
      );

    if (
      user &&
      user.userId
    ) {
      deviceUserMap.set(
        user.userId,
        user
      );
    }
  });

  /*
   * Always process chronologically.
   */
  const sortedPunches =
    punches
      .map(normalizePunch)
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.recordTime -
          b.recordTime
      );

  const result = {
    mode: 'local',
    processed: 0,
    created: 0,
    updated: 0,
    duplicates: 0,
    unmatched: 0,
    ignored: 0,
    unmatchedUsers: []
  };

  for (const punch of sortedPunches) {
    result.processed++;

    processLocalPunch(
      state,
      punch,
      deviceUserMap,
      result
    );
  }

  /*
   * Keep attendance sorted newest first.
   */
  state.attendanceLogs.sort(
    (a, b) => {
      const aTime =
        `${a.date || ''} ${a.checkIn || ''}`;

      const bTime =
        `${b.date || ''} ${b.checkIn || ''}`;

      return bTime.localeCompare(
        aTime
      );
    }
  );

  /*
   * Store sync metadata.
   */
  state.biometricSync = {
    deviceIp: DEVICE.ip,

    deviceSerial:
      DEVICE.serial,

    lastSyncAt:
      new Date().toISOString(),

    lastLogCount:
      sortedPunches.length
  };

  writeLocalDatabase(
    state
  );

  return result;
}


/* =========================================================
   MONGODB DATABASE SYNC
========================================================= */

async function syncMongoDatabase(
  users,
  punches
) {
  const deviceUserMap =
    new Map();

  users.forEach(rawUser => {
    const user =
      normalizeDeviceUser(
        rawUser
      );

    if (
      user &&
      user.userId
    ) {
      deviceUserMap.set(
        user.userId,
        user
      );
    }
  });

  const sortedPunches =
    punches
      .map(normalizePunch)
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.recordTime -
          b.recordTime
      );

  const result = {
    mode: 'mongodb',
    processed: 0,
    created: 0,
    updated: 0,
    duplicates: 0,
    unmatched: 0,
    ignored: 0,
    unmatchedUsers: []
  };

  for (const punch of sortedPunches) {
    result.processed++;

    const biometricUser =
      deviceUserMap.get(
        punch.biometricUserId
      );

    if (!biometricUser) {
      result.unmatched++;
      continue;
    }

    if (
      String(biometricUser.role) === '14' ||
      biometricUser.name.toLowerCase() === 'admin'
    ) {
      result.ignored++;
      continue;
    }

    const employee =
      await findMongoEmployee(
        punch.biometricUserId,
        biometricUser ? biometricUser.name : ''
      );

    if (!employee) {
      result.unmatched++;

      if (
        !result.unmatchedUsers.includes(
          punch.biometricUserId
        )
      ) {
        result.unmatchedUsers.push(
          punch.biometricUserId
        );
      }

      continue;
    }

    const {
      date,
      time
    } =
      getLocalDateTimeParts(
        punch.recordTime
      );

    const punchId =
      createPunchId(punch);

    /*
     * Check duplicate.
     */
    const duplicate =
      await AttendanceLog.findOne({
        biometricPunchId:
          punchId
      }).lean();

    if (duplicate) {
      result.duplicates++;
      continue;
    }

    let attendance =
      await findMongoAttendance(
        employee.id,
        date
      );

    if (!attendance) {
      await AttendanceLog.create({
        id:
          createAttendanceId(
            employee.id,
            date
          ),

        userId:
          String(employee.id),

        date,

        shiftId:
          employee.scheduleId || '',

        checkIn:
          time,

        checkOut:
          '',

        status:
          'Present',

        biometricUsed:
          DEVICE_NAME,

        biometricDeviceId:
          DEVICE.serial,

        biometricUserId:
          punch.biometricUserId,

        biometricPunchId:
          punchId,

        lastBiometricPunchAt:
          punch.recordTime.toISOString(),

        location:
          employee.preferredLocation ||
          LOCATION
      });

      result.created++;

      continue;
    }

    if (attendance.checkIn) {
      const [inH, inM] = attendance.checkIn.split(':').map(Number);
      const [punchH, punchM] = time.split(':').map(Number);
      const inMins = (inH || 0) * 60 + (inM || 0);
      const punchMins = (punchH || 0) * 60 + (punchM || 0);

      if (punchMins < inMins) {
        attendance.checkOut = attendance.checkIn;
        attendance.checkIn = time;
      } else if (punchMins >= inMins + 30) {
        if (attendance.checkOut === time || attendance.biometricPunchId === punchId) {
          continue;
        }
        attendance.checkOut = time;
      } else {
        continue;
      }
    }

    attendance.status =
      'Present';

    attendance.biometricUsed =
      DEVICE_NAME;

    attendance.biometricDeviceId =
      DEVICE.serial;

    attendance.biometricUserId =
      punch.biometricUserId;

    attendance.biometricPunchId =
      punchId;

    attendance.lastBiometricPunchAt =
      punch.recordTime.toISOString();

    await attendance.save();

    result.updated++;
  }

  return result;
}


/* =========================================================
   PUBLIC SYNC FUNCTION
========================================================= */

async function syncBiometricAttendance() {
  if (syncRunning) {
    return {
      success: false,
      skipped: true,
      reason:
        'Biometric synchronization already running.'
    };
  }

  syncRunning = true;

  try {
    const snapshot =
      await getDeviceSnapshot();

    console.log(
      '🔄 Starting biometric synchronization...'
    );

    const users =
      snapshot.users || [];

    const logs =
      snapshot.logs || [];

    console.log(
      `📡 K40 returned ${users.length} users and ${logs.length} attendance records.`
    );

    /*
     * Try MongoDB first.
     *
     * If the application is in local mode,
     * write directly to seed.json.
     */
    const online =
      await connectMongoose();

    const useLocal =
      getUseLocalFileDB();

    let result;

    if (
      online &&
      !useLocal
    ) {
      result =
        await syncMongoDatabase(
          users,
          logs
        );
    } else {
      result =
        await syncLocalDatabase(
          users,
          logs
        );
    }

    /*
     * Notify existing HRMS dashboard ONLY if records were created or updated.
     */
    if (result && (result.created > 0 || result.updated > 0)) {
      broadcastSSEEvent(
        'db_updated',
        {
          type:
            'biometric_sync',

          device:
            DEVICE_NAME,

          deviceIp:
            DEVICE.ip,

          timestamp:
            Date.now(),

          result
        }
      );
    }

    console.log(
      '✅ Biometric synchronization complete:',
      result
    );

    return {
      success: true,
      device: {
        name: DEVICE_NAME,
        ip: DEVICE.ip,
        serial: DEVICE.serial
      },
      result
    };

  } catch (error) {
    const isOffline = error && (error.isOffline || (error.message && (error.message.includes('timeout') || error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT') || error.message.includes('ENETUNREACH'))));
    
    if (!isOffline) {
      console.warn(`⚠️ Biometric sync status: ${error.message || String(error)}`);
    }

    return {
      success: false,
      offline: true,
      error: error.message || String(error)
    };

  } finally {
    syncRunning = false;
  }
}


module.exports = {
  syncBiometricAttendance
};