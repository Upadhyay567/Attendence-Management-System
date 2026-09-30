// src/server/biometric/biometricSync.service.js

const fs = require('fs');
const path = require('path');

const {
  User,
  AttendanceLog,
  Schedule,
  connectMongoose,
  getUseLocalFileDB,
  LOCAL_DB_FILE
} = require('../config/db');

const zkDevice = require('./zkDevice');
const biometricMultiDevice = require('./biometricMultiDevice.service');

const DEVICE = zkDevice.DEVICE;
const getDeviceSnapshot = (...args) => zkDevice.getDeviceSnapshot(...args);
const getRegisteredDevices = (...args) => biometricMultiDevice.getRegisteredDevices(...args);
const withDeviceConfig = (...args) => biometricMultiDevice.withDeviceConfig(...args);
const replicateTemplatesAcrossDevices = (...args) => biometricMultiDevice.replicateTemplatesAcrossDevices(...args);
const getVaultUsers = (...args) => biometricMultiDevice.getVaultUsers(...args);
const isPortReachable = (...args) => biometricMultiDevice.isPortReachable(...args);

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
let syncStartedAt = 0;


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
      user.biometricUserId ??
      user.biometricId ??
      user.employeeId ??
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

function normalizePunch(log, deviceConfig = null) {
  if (!log) return null;

  const biometricUserId = String(
    log.biometricUserId ??
    log.deviceUserId ??
    log.userId ??
    log.userid ??
    ''
  ).trim();

  if (!biometricUserId) {
    return null;
  }

  const recordTime = log.recordTime instanceof Date ? log.recordTime : new Date(log.recordTime);

  if (Number.isNaN(recordTime.getTime())) {
    return null;
  }

  return {
    userSn: log.userSn ?? null,
    biometricUserId,
    recordTime,
    ip: log.ip || deviceConfig?.ip || DEVICE.ip,
    deviceName: log.deviceName || deviceConfig?.name || DEVICE_NAME,
    deviceSerial: log.deviceSerial || deviceConfig?.serial || DEVICE.serial,
    location: log.location || deviceConfig?.location || LOCATION
  };
}


/* =========================================================
   SAFE UNIQUE PUNCH ID
========================================================= */

function createPunchId(punch) {
  return [
    punch.deviceSerial || DEVICE.serial,
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
  try {
    if (state) {
      if (Array.isArray(state.activityLogs) && state.activityLogs.length > 500) {
        state.activityLogs = state.activityLogs.slice(0, 500);
      }
      if (Array.isArray(state.processedPunchIds) && state.processedPunchIds.length > 5000) {
        state.processedPunchIds = state.processedPunchIds.slice(-5000);
      }
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        fs.writeFileSync(
          LOCAL_DB_FILE,
          JSON.stringify(state, null, 2),
          'utf8'
        );
        break;
      } catch (writeErr) {
        if (attempt === 2) throw writeErr;
        const waitMs = 50 * (attempt + 1);
        const start = Date.now();
        while (Date.now() - start < waitMs) {}
      }
    }
    try {
      const { invalidateLocalDbCache } = require('../controllers/attendance.controller');
      invalidateLocalDbCache();
    } catch (_) {}
  } catch (err) {
    console.error('⚠️ Failed to write local database:', err.message);
  }
}


/* =========================================================
   FIND HRMS USER
========================================================= */

function findLocalEmployee(users, biometricUserId, deviceUserName = '') {
  const target = String(biometricUserId || '').trim().toLowerCase();
  const targetDigits = target.replace(/\D/g, '');
  const targetName = String(deviceUserName || '').trim().toLowerCase();

  let employee = users.find(user => {
    if (!user) return false;

    // 1. Preferred mapping: exact biometricUserId / biometricId
    if (
      user.biometricUserId &&
      String(user.biometricUserId).trim().toLowerCase() === target
    ) {
      return true;
    }

    if (
      user.biometricId &&
      String(user.biometricId).trim().toLowerCase() === target
    ) {
      return true;
    }

    // 2. Direct primary ID mappings
    if (
      user.employeeId &&
      String(user.employeeId).trim().toLowerCase() === target
    ) {
      return true;
    }

    if (
      user.id &&
      (String(user.id).trim().toLowerCase() === target ||
       String(user.id).trim().toLowerCase() === `usr_bio_${target}`)
    ) {
      return true;
    }

    if (
      user.username &&
      (String(user.username).trim().toLowerCase() === target ||
       String(user.username).trim().toLowerCase() === `bio_${target}`)
    ) {
      return true;
    }

    // 3. Exact Numeric ID matching (e.g. device "101" <-> HRMS "EMP101")
    if (targetDigits) {
      const targetNum = parseInt(targetDigits, 10);
      const userEmpDigits = String(user.employeeId || '').replace(/\D/g, '');
      const userBioDigits = String(user.biometricUserId || user.biometricId || '').replace(/\D/g, '');
      if (userEmpDigits && !isNaN(targetNum) && parseInt(userEmpDigits, 10) === targetNum) return true;
      if (userBioDigits && !isNaN(targetNum) && parseInt(userBioDigits, 10) === targetNum) return true;
      if ((userEmpDigits && userEmpDigits === targetDigits) || (userBioDigits && userBioDigits === targetDigits)) {
        return true;
      }
    }

    // 4. Exact Full Name matching ONLY (NEVER match first-name substring or generic 'employee ...' / 'admin')
    if (
      targetName &&
      targetName !== 'admin' &&
      !targetName.startsWith('employee ') &&
      user.name
    ) {
      const uName = String(user.name).trim().toLowerCase();
      if (uName === targetName) return true;
    }

    return false;
  });

  // Auto-bind biometricUserId ONLY IF the employee does not already have a different biometricUserId!
  if (employee) {
    if (!employee.biometricUserId) {
      employee.biometricUserId = String(biometricUserId).trim();
    }
    return employee;
  }

  // Auto-register biometric user if missing from HRMS list
  if (target) {
    const defaultSch = 'sch_q8jji9v';
    const cleanName = (targetName && targetName !== 'admin' && !targetName.startsWith('employee '))
      ? deviceUserName
      : ('Employee ' + biometricUserId);
    const newEmp = {
      _id: 'usr_bio_' + String(biometricUserId).trim(),
      id: 'usr_bio_' + String(biometricUserId).trim(),
      employeeId: String(biometricUserId).trim(),
      biometricUserId: String(biometricUserId).trim(),
      biometricId: String(biometricUserId).trim(),
      name: cleanName,
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
      { biometricId: target },
      { employeeId: target },
      { id: target },
      { id: `usr_bio_${target}` },
      { username: `bio_${target}` },
      { username: target }
    ]
  }).lean();

  if (!employee && targetName && targetName.toLowerCase() !== 'admin' && !targetName.toLowerCase().startsWith('employee ')) {
    employee = await User.findOne({
      name: new RegExp('^' + targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    }).lean();
  }

  if (!employee && target) {
    const defaultSch = 'sch_q8jji9v';
    const cleanName = (targetName && targetName.toLowerCase() !== 'admin' && !targetName.toLowerCase().startsWith('employee '))
      ? deviceUserName
      : ('Employee ' + target);
    try {
      const created = await User.create({
        id: 'usr_bio_' + target,
        employeeId: target,
        biometricUserId: target,
        biometricId: target,
        name: cleanName,
        username: 'bio_' + target,
        role: 'employee',
        status: 'Active',
        scheduleId: defaultSch,
        scheduleIds: [defaultSch],
        shiftLocations: { [defaultSch]: LOCATION }
      });
      employee = created.toObject ? created.toObject() : created;
      console.log(`✨ Auto-registered biometric user in MongoDB: ${employee.name} (ID: ${target})`);
    } catch (e) {
      employee = await User.findOne({ biometricUserId: target }).lean();
    }
  }

  if (employee && !employee.biometricUserId) {
    await User.updateOne({ id: employee.id }, { $set: { biometricUserId: target } }).catch(() => {});
  }

  return employee;
}


/* =========================================================
   RESOLVE SHIFT FOR PUNCH
========================================================= */

function resolveShiftForPunch(
  employee,
  punchRecordTime,
  date,
  schedules = [],
  existingLogs = []
) {
  let assignedIds = [];
  if (Array.isArray(employee.scheduleIds) && employee.scheduleIds.length > 0) {
    assignedIds = [...employee.scheduleIds];
  } else if (employee.scheduleId) {
    assignedIds = [employee.scheduleId];
  }

  const assignedSchedules = assignedIds
    .map(id => schedules.find(s => String(s.id) === String(id)))
    .filter(Boolean);

  if (assignedSchedules.length === 0) {
    return employee.scheduleId || '';
  }

  if (assignedSchedules.length === 1) {
    return assignedSchedules[0].id;
  }

  // 1. If there is an ACTIVE (open) session with checkIn but no checkOut, return that shift
  const openLog = existingLogs.find(
    l => String(l.userId) === String(employee.id) &&
         String(l.date) === String(date) &&
         l.checkIn && !l.checkOut
  );
  if (openLog && openLog.shiftId) {
    return String(openLog.shiftId);
  }

  // 2. Filter out shifts that are ALREADY completed today (both checkIn and checkOut exist)
  const completedShiftIds = existingLogs
    .filter(l => String(l.userId) === String(employee.id) && String(l.date) === String(date) && l.checkIn && l.checkOut)
    .map(l => String(l.shiftId));

  const uncompletedSchedules = assignedSchedules.filter(s => !completedShiftIds.includes(String(s.id)));
  const searchPool = uncompletedSchedules.length > 0 ? uncompletedSchedules : assignedSchedules;

  const punchHour = punchRecordTime.getHours();
  const punchMin = punchRecordTime.getMinutes();
  const punchMins = punchHour * 60 + punchMin;

  let bestShift = null;
  let minDistance = Infinity;

  for (const s of searchPool) {
    if (!s.startTime) continue;
    const [sH, sM] = s.startTime.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const dist = Math.abs(punchMins - startMins);
    if (dist < minDistance) {
      minDistance = dist;
      bestShift = s;
    }
  }

  return bestShift ? bestShift.id : (searchPool[0] ? searchPool[0].id : (employee.scheduleId || ''));
}


/* =========================================================
   FIND EXISTING ATTENDANCE
========================================================= */

function findLocalAttendance(
  attendanceLogs,
  userId,
  date,
  shiftId = null
) {
  return attendanceLogs.find(log => {
    if (String(log.userId) !== String(userId) || String(log.date) !== String(date)) {
      return false;
    }
    if (shiftId) {
      return String(log.shiftId) === String(shiftId);
    }
    return true;
  });
}


async function findMongoAttendance(
  userId,
  date,
  shiftId = null
) {
  const query = {
    userId: String(userId),
    date: String(date)
  };
  if (shiftId) {
    query.shiftId = String(shiftId);
  }
  return AttendanceLog.findOne(query);
}


/* =========================================================
   COMPUTE ATTENDANCE STATUS BASED ON CHECK-IN & SHIFT RULES
========================================================= */

function computeAttendanceStatus(checkInTime, checkOutTime, shiftObj) {
  if (!checkInTime) return 'Absent';

  const [inH, inM] = checkInTime.split(':').map(Number);
  const inMins = (inH || 0) * 60 + (inM || 0);

  let status = 'On Time';

  if (shiftObj && shiftObj.startTime) {
    const [startH, startM] = shiftObj.startTime.split(':').map(Number);
    const startMins = (startH || 0) * 60 + (startM || 0);
    const grace = shiftObj.gracePeriod !== undefined ? Number(shiftObj.gracePeriod) : 15;
    const halfDayLimit = shiftObj.halfDayLimit !== undefined ? Number(shiftObj.halfDayLimit) : 120;

    // Check-in punctuality relative to grace period
    if (inMins > startMins + grace) {
      status = 'Late';
    }
    // Check-in excessively late exceeding half-day limit cutoff
    if (inMins >= startMins + halfDayLimit) {
      status = 'Half Day';
    }
  }

  // If check-out is present, evaluate total work duration vs expected shift duration
  if (checkOutTime && shiftObj && shiftObj.startTime && shiftObj.endTime) {
    const [outH, outM] = checkOutTime.split(':').map(Number);
    const outMins = (outH || 0) * 60 + (outM || 0);
    let totalWorkMins = outMins - inMins;
    if (totalWorkMins < 0) totalWorkMins += 24 * 60; // overnight support

    const [schStartH, schStartM] = shiftObj.startTime.split(':').map(Number);
    const [schEndH, schEndM] = shiftObj.endTime.split(':').map(Number);
    let expectedWorkMins = (schEndH * 60 + (schEndM || 0)) - (schStartH * 60 + (schStartM || 0));
    if (expectedWorkMins < 0) expectedWorkMins += 24 * 60;

    const halfDayThreshold = expectedWorkMins > 0 ? (expectedWorkMins / 2) : 240;
    if (totalWorkMins < halfDayThreshold) {
      status = 'Half Day';
    }
  }

  return status;
}


/* =========================================================
   CREATE ATTENDANCE ID
========================================================= */

function createAttendanceId(
  userId,
  date,
  shiftId = ''
) {
  return shiftId ? `BIO_${userId}_${date}_${shiftId}` : `BIO_${userId}_${date}`;
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
  if (!Array.isArray(state.processedPunchIds)) {
    state.processedPunchIds = [];
  }

  let biometricUser =
    deviceUserMap.get(
      punch.biometricUserId
    );

  if (!biometricUser) {
    const existingEmp = findLocalEmployee(users, punch.biometricUserId);
    if (existingEmp) {
      biometricUser = {
        userId: String(punch.biometricUserId),
        name: existingEmp.name,
        role: existingEmp.role || '0'
      };
      deviceUserMap.set(String(punch.biometricUserId), biometricUser);
    } else {
      biometricUser = {
        userId: String(punch.biometricUserId),
        name: `Employee ${punch.biometricUserId}`,
        role: '0'
      };
      deviceUserMap.set(String(punch.biometricUserId), biometricUser);
    }
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
   * Duplicate protection:
   * A punch is already processed if recorded in global ledger or on any log.
   */
  const isAlreadyProcessed =
    state.processedPunchIds.includes(punchId) ||
    state.attendanceLogs.some(
      log =>
        log.biometricPunchId === punchId ||
        log.checkInPunchId === punchId ||
        log.checkOutPunchId === punchId ||
        (Array.isArray(log.allPunchIds) && log.allPunchIds.includes(punchId))
    );

  if (isAlreadyProcessed) {
    result.duplicates++;
    return;
  }

  const schedules = (Array.isArray(state.schedules) && state.schedules.length > 0)
    ? state.schedules
    : [
        { id: 'sch_q8jji9v', name: 'Morning Shift 900', startTime: '09:00', endTime: '17:00' },
        { id: 'sch_3ebecon', name: 'Afternoon shift', startTime: '14:00', endTime: '22:00' },
        { id: 'sch_bgpyqv3', name: 'Standard Day Shift', startTime: '09:00', endTime: '17:00' },
        { id: 'sch_mfl8wvv', name: 'General Shift', startTime: '09:00', endTime: '17:00' }
      ];

  const userLogsToday = state.attendanceLogs.filter(log =>
    String(log.userId) === String(employee.id) && String(log.date) === String(date)
  );

  const [punchH, punchM] = time.split(':').map(Number);
  const punchMins = (punchH || 0) * 60 + (punchM || 0);

  // Check if there is an active OPEN shift session today (checkIn present, no checkOut)
  const openLog = userLogsToday.find(log => log.checkIn && !log.checkOut);

  if (openLog) {
    const [inH, inM] = openLog.checkIn.split(':').map(Number);
    const inMins = (inH || 0) * 60 + (inM || 0);

    // If tap is within 1 minute of check-in, treat as accidental double-tap
    if (punchMins <= inMins + 1) {
      if (!Array.isArray(openLog.allPunchIds)) openLog.allPunchIds = [];
      openLog.allPunchIds.push(punchId);
      state.processedPunchIds.push(punchId);
      result.duplicates++;
      return;
    }

    // CHECK-OUT FOR THIS OPEN SHIFT
    const shiftObj = schedules.find(s => String(s.id) === String(openLog.shiftId));
    const evaluatedStatus = computeAttendanceStatus(openLog.checkIn, time, shiftObj);

    openLog.checkOut = time;
    openLog.checkOutPunchId = punchId;
    openLog.status = evaluatedStatus;
    openLog.biometricUsed = punch.deviceName || DEVICE_NAME;
    openLog.biometricDeviceId = punch.deviceSerial || DEVICE.serial;
    openLog.lastBiometricPunchAt = punch.recordTime.toISOString();
    openLog.updatedAt = new Date().toISOString();

    if (!Array.isArray(openLog.allPunchIds)) openLog.allPunchIds = [];
    openLog.allPunchIds.push(punchId);
    state.processedPunchIds.push(punchId);

    if (!Array.isArray(state.activityLogs)) state.activityLogs = [];
    state.activityLogs.unshift({
      timestamp: new Date().toISOString(),
      action: 'BIOMETRIC_CHECKOUT',
      userId: String(employee.id),
      userName: employee.name,
      userRole: employee.role || 'employee',
      details: {
        attendanceId: openLog.id,
        shiftId: openLog.shiftId,
        checkIn: openLog.checkIn,
        checkOut: time,
        status: evaluatedStatus,
        device: punch.deviceName || DEVICE_NAME
      },
      ipAddress: '127.0.0.1'
    });

    result.updated++;
    console.log(
      `🔵 BIOMETRIC CHECK-OUT | ${employee.name} | Shift: ${openLog.shiftId} | In: ${openLog.checkIn} -> Out: ${time} | Status: ${evaluatedStatus}`
    );
    return;
  }

  // NO open session. Check if target shift already has attendance today
  const targetShiftId = resolveShiftForPunch(
    employee,
    punch.recordTime,
    date,
    schedules,
    state.attendanceLogs
  );

  const existingForShift = userLogsToday.find(l => String(l.shiftId) === String(targetShiftId));
  if (existingForShift) {
    const [inH, inM] = (existingForShift.checkIn || '23:59').split(':').map(Number);
    const inMins = (inH || 0) * 60 + (inM || 0);
    const [outH, outM] = (existingForShift.checkOut || existingForShift.checkIn).split(':').map(Number);
    const outMins = (outH || 0) * 60 + (outM || 0);

    if (punchMins < inMins) {
      const shiftObj = schedules.find(s => String(s.id) === String(targetShiftId));
      existingForShift.checkIn = time;
      existingForShift.checkInPunchId = punchId;
      existingForShift.status = computeAttendanceStatus(time, existingForShift.checkOut || '', shiftObj);
      existingForShift.updatedAt = new Date().toISOString();
      if (!Array.isArray(existingForShift.allPunchIds)) existingForShift.allPunchIds = [];
      if (!existingForShift.allPunchIds.includes(punchId)) {
        existingForShift.allPunchIds.push(punchId);
      }
      state.processedPunchIds.push(punchId);
      result.updated++;
      return;
    } else if (punchMins > outMins) {
      const shiftObj = schedules.find(s => String(s.id) === String(targetShiftId));
      const evaluatedStatus = computeAttendanceStatus(existingForShift.checkIn, time, shiftObj);
      existingForShift.checkOut = time;
      existingForShift.checkOutPunchId = punchId;
      existingForShift.status = evaluatedStatus;
      existingForShift.lastBiometricPunchAt = punch.recordTime.toISOString();
      existingForShift.updatedAt = new Date().toISOString();
      if (!Array.isArray(existingForShift.allPunchIds)) existingForShift.allPunchIds = [];
      if (!existingForShift.allPunchIds.includes(punchId)) {
        existingForShift.allPunchIds.push(punchId);
      }
      state.processedPunchIds.push(punchId);
      result.updated++;
      return;
    } else {
      if (!Array.isArray(existingForShift.allPunchIds)) existingForShift.allPunchIds = [];
      if (!existingForShift.allPunchIds.includes(punchId)) {
        existingForShift.allPunchIds.push(punchId);
      }
      state.processedPunchIds.push(punchId);
      result.duplicates++;
      return;
    }
  }

  const shiftObj = schedules.find(s => String(s.id) === String(targetShiftId));
  const status = computeAttendanceStatus(time, '', shiftObj);

  const newLog = {
    id: createAttendanceId(
      employee.id,
      date,
      targetShiftId
    ),

    userId: String(employee.id),

    date,

    shiftId:
      targetShiftId,

    checkIn: time,

    checkOut: '',

    checkInPunchId: punchId,

    biometricPunchId: punchId,

    allPunchIds: [punchId],

    status: status,

    biometricUsed:
      punch.deviceName || DEVICE_NAME,

    biometricDeviceId:
      punch.deviceSerial || DEVICE.serial,

    biometricUserId:
      punch.biometricUserId,

    lastBiometricPunchAt:
      punch.recordTime.toISOString(),

    location:
      punch.location ||
      (employee.shiftLocations && employee.shiftLocations[targetShiftId]) ||
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

  state.attendanceLogs.unshift(
    newLog
  );
  state.processedPunchIds.push(punchId);

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
      attendanceId: newLog.id,
      shiftId: targetShiftId,
      checkIn: time,
      status: status,
      device: punch.deviceName || DEVICE_NAME
    },
    ipAddress: '127.0.0.1'
  });

  result.created++;
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
    deviceSerial: DEVICE.serial,
    lastSyncAt: new Date().toISOString(),
    lastLogCount: sortedPunches.length
  };

  const hasChanges = (result.created > 0 || result.updated > 0 || state.__changed || !state.biometricSync);
  delete state.__changed;
  if (hasChanges) {
    writeLocalDatabase(state);
    console.log(
      `✅ [Biometric Ingestion] Ingested ${result.processed} punches -> Created: ${result.created}, Updated: ${result.updated}, Duplicates: ${result.duplicates}`
    );
  }

  return result;
}


/* =========================================================
   MONGODB DATABASE SYNC
========================================================= */

async function syncMongoDatabase(
  users,
  punches
) {
  const online = await connectMongoose();
  const useLocal = getUseLocalFileDB();
  if (!online || useLocal) return { mode: 'mongodb', processed: 0, syncedLogs: 0 };

  const dbState = readLocalDatabase();
  const allLogs = Array.isArray(dbState.attendanceLogs) ? dbState.attendanceLogs : [];

  // Determine affected dates from punches
  const affectedDates = new Set();
  const todayStr = new Date().toISOString().split('T')[0];
  affectedDates.add(todayStr);

  if (Array.isArray(punches)) {
    punches.forEach(p => {
      if (p && p.recordTime) {
        const d = p.recordTime instanceof Date ? p.recordTime.toISOString().split('T')[0] : String(p.recordTime).split('T')[0];
        if (d) affectedDates.add(d);
      }
    });
  }

  // Filter logs for the affected dates to bulk upsert
  const logsToSync = allLogs.filter(l => l && l.date && affectedDates.has(l.date));

  if (logsToSync.length > 0) {
    const ops = logsToSync.map(l => ({
      updateOne: {
        filter: { id: l.id },
        update: { $set: l },
        upsert: true
      }
    }));

    const batchSize = 500;
    for (let i = 0; i < ops.length; i += batchSize) {
      const chunk = ops.slice(i, i + batchSize);
      await AttendanceLog.bulkWrite(chunk, { ordered: false }).catch(err => {
        console.warn('⚠️ AttendanceLog bulkWrite warning:', err.message);
      });
    }
  }

  // Also sync users if any
  if (Array.isArray(users) && users.length > 0) {
    const userOps = users.map(u => {
      const id = u.id || `usr_bio_${u.userId || u.employeeId || u.biometricUserId}`;
      return {
        updateOne: {
          filter: { id },
          update: { $set: u },
          upsert: true
        }
      };
    });

    const batchSize = 500;
    for (let i = 0; i < userOps.length; i += batchSize) {
      const chunk = userOps.slice(i, i + batchSize);
      await User.bulkWrite(chunk, { ordered: false }).catch(err => {
        console.warn('⚠️ User bulkWrite warning:', err.message);
      });
    }
  }

  return {
    mode: 'mongodb',
    processed: punches?.length || 0,
    syncedLogs: logsToSync.length
  };
}




/* =========================================================
   PUBLIC SYNC FUNCTION
========================================================= */

async function syncBiometricAttendance(options = {}) {
  const isManual = !!options.manual;

  const now = Date.now();
  if (syncRunning) {
    if (now - syncStartedAt > 45000) {
      console.warn('⚠️ Force clearing stale biometric sync lock (>45s)');
      syncRunning = false;
    } else {
      return {
        success: false,
        skipped: true,
        reason: 'Biometric synchronization already running.'
      };
    }
  }

  syncRunning = true;
  syncStartedAt = Date.now();

  try {
    let devices = [];
    try {
      devices = await getRegisteredDevices();
    } catch (_) {
      devices = [];
    }

    if (!devices || devices.length === 0) {
      devices = [{
        id: 'dev_k40_primary',
        name: DEVICE_NAME,
        ip: DEVICE.ip,
        port: DEVICE.port,
        serial: DEVICE.serial,
        location: LOCATION,
        enabled: true
      }];
    }

    let allRawPunches = [];
    let allRawUsers = [];
    const deviceStatuses = [];

    if (isManual) {
      console.log(`🔄 Starting multi-device biometric synchronization across ${devices.length} registered device(s)...`);
    }

    // Instant parallel reachability probe across all devices
    // Prevents offline machines or different subnets from freezing the sync loop
    const { resolveDeviceLocation, getActiveHost, WDMS_PORT } = require('./easywdms.service');
    const cloudHost = getActiveHost() || process.env.WDMS_HOST || '203.115.110.93';
    const cloudPort = WDMS_PORT || 8081;
    const isCloudOnline = await isPortReachable(cloudHost, cloudPort, 3000);

    const reachabilityResults = await Promise.all(
      devices.map(async (dev) => {
        if (!dev.enabled) return { id: dev.id, reachable: false, isWDMS: false };
        const meta = dev.serial ? resolveDeviceLocation(dev.serial, dev.name) : null;
        const isWDMS = dev.source === 'easywdms' || String(dev.id).startsWith('dev_wdms_') || Boolean(meta) || (dev.ip && !dev.ip.startsWith('192.168.1.7'));
        if (isWDMS) {
          return { id: dev.id, reachable: isCloudOnline, isWDMS: true };
        }
        return { id: dev.id, reachable: await isPortReachable(dev.ip, dev.port, 600), isWDMS: false };
      })
    );
    const reachableMap = new Map(reachabilityResults.map(r => [r.id, r]));

    for (const dev of devices) {
      if (!dev.enabled) continue;

      const reachInfo = reachableMap.get(dev.id) || { reachable: false, isWDMS: false };
      if (!reachInfo.reachable) {
        deviceStatuses.push({
          id: dev.id,
          name: dev.name,
          ip: dev.ip,
          online: false,
          usersCount: 0,
          logsCount: 0
        });
        continue;
      }

      if (reachInfo.isWDMS) {
        deviceStatuses.push({
          id: dev.id,
          name: dev.name,
          ip: dev.ip,
          online: true,
          usersCount: dev.enrolledUsersCount || 0,
          logsCount: dev.totalPunchesCount || 0
        });
        continue;
      }

      let devUsers = [];
      let devLogs = [];
      let isOnline = false;

      // Primary K40 connection (or same IP as env)
      if (dev.ip === DEVICE.ip) {
        try {
          const snapshot = await getDeviceSnapshot();
          devUsers = snapshot.users || [];
          devLogs = snapshot.logs || [];
          isOnline = true;
        } catch (err) {
          const isOffline = err && (err.isOffline || (err.message && (err.message.includes('timeout') || err.message.includes('ECONNREFUSED'))));
          if (!isOffline) {
            console.warn(`⚠️ Primary device ${dev.name} notice:`, err.message);
          }
        }
      } else {
        // Branch office / gate device connection
        try {
          const result = await withDeviceConfig(dev, async (zk) => {
            const usersRes = await zk.getUsers().catch(() => ({ data: [] }));
            const logsRes = await zk.getAttendances().catch(() => ({ data: [] }));
            return {
              users: usersRes?.data || [],
              logs: logsRes?.data || []
            };
          });
          devUsers = result.users || [];
          devLogs = result.logs || [];
          isOnline = true;
        } catch (err) {
          // Offline remote branch handled gracefully without failing the sync loop
        }
      }

      deviceStatuses.push({
        id: dev.id,
        name: dev.name,
        ip: dev.ip,
        online: isOnline,
        usersCount: devUsers.length,
        logsCount: devLogs.length
      });

      if (devUsers.length > 0) {
        allRawUsers.push(...devUsers);
      }

      if (devLogs.length > 0) {
        devLogs.forEach(l => {
          allRawPunches.push({
            ...l,
            _deviceConfig: dev
          });
        });
      }
    }

    // Map and normalize punches with their originating device context
    const normalizedPunches = allRawPunches.map(p => {
      return normalizePunch(p, p._deviceConfig || null);
    }).filter(Boolean);

    // Deduplicate users by userId
    const uniqueUserMap = new Map();
    allRawUsers.forEach(u => {
      const uId = String(u.userId ?? u.userid ?? u.deviceUserId ?? '').trim();
      if (uId && !uniqueUserMap.has(uId)) {
        uniqueUserMap.set(uId, u);
      }
    });
    const combinedUsers = Array.from(uniqueUserMap.values());

    if (isManual) {
      console.log(
        `📡 Aggregated ${combinedUsers.length} biometric users and ${normalizedPunches.length} punch records from ${deviceStatuses.filter(d => d.online).length} online devices.`
      );
    }

    /*
     * Try MongoDB first.
     * If the application is in local mode, write directly to seed.json.
     */
    const online = await connectMongoose();
    const useLocal = getUseLocalFileDB();

    let result = await syncLocalDatabase(
      combinedUsers,
      normalizedPunches
    );

    if (online && !useLocal) {
      syncMongoDatabase(combinedUsers, normalizedPunches).catch(err => {
        console.warn('⚠️ MongoDB background mirror notice:', err.message);
      });
    }

    /*
     * Notify existing HRMS dashboard if records were created or updated.
     */
    if (result && (result.created > 0 || result.updated > 0)) {
      broadcastSSEEvent(
        'db_updated',
        {
          type: 'biometric_sync',
          timestamp: Date.now(),
          devices: deviceStatuses,
          result
        }
      );
    }

    // Check if new users were detected on any device that are not yet in the vault
    if (combinedUsers.length > 0) {
      const vault = await getVaultUsers();
      const vaultUserIds = new Set(vault.map(v => String(v.biometricUserId).trim()));
      const hasNewUsers = combinedUsers.some(u => {
        const uId = String(u.userId ?? u.userid ?? u.deviceUserId ?? '').trim();
        return uId && !vaultUserIds.has(uId);
      });

      if (hasNewUsers) {
        console.log('🔄 New enrolled biometric user(s) detected, starting cross-branch template replication...');
        replicateTemplatesAcrossDevices().catch(err => {
          console.warn('⚠️ Auto-replication background task notice:', err.message);
        });
      }
    }

    if (result && (result.created > 0 || result.updated > 0)) {
      console.log(
        `✅ Biometric sync: ${result.created} new punches, ${result.updated} updated.`
      );
    } else if (isManual) {
      console.log(
        '✅ Biometric multi-device synchronization complete:',
        result
      );
    }

    return {
      success: true,
      devices: deviceStatuses,
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

/**
 * Direct ingestion helper for ADMS / Cloud Server push protocol.
 * Accepts normalized punch objects and user objects, commits them to MongoDB and/or seed.json,
 * and notifies connected dashboard clients via SSE.
 */
async function ingestPunchesAndUsers(users = [], punches = [], deviceMeta = {}) {
  const online = await connectMongoose();
  const useLocal = getUseLocalFileDB();

  let result = {
    processed: 0,
    created: 0,
    updated: 0,
    duplicates: 0,
    unmatched: 0,
    ignored: 0,
    unmatchedUsers: []
  };

  result = await syncLocalDatabase(users, punches);
  if (online && !useLocal) {
    syncMongoDatabase(users, punches).catch(err => {
      console.warn('⚠️ MongoDB background mirror notice:', err.message);
    });
  }

  if (result && (result.created > 0 || result.updated > 0)) {
    broadcastSSEEvent(
      'db_updated',
      {
        type: 'biometric_sync',
        timestamp: Date.now(),
        devices: deviceMeta ? [deviceMeta] : [],
        result
      }
    );
  }

  return result;
}


module.exports = {
  syncBiometricAttendance,
  computeAttendanceStatus,
  ingestPunchesAndUsers,
  syncLocalDatabase,
  syncMongoDatabase,
  normalizePunch,
  createPunchId,
  getLocalDateTimeParts
};