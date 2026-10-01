const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '../seed.json');

console.log('Loading seed.json...');
const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));

const users = seed.users || [];
const logs = seed.attendanceLogs || [];
const schedules = seed.schedules || [];

// Device serial to location / name mapping
const deviceMap = {
  'GED7241901313': { name: 'SURYA OMAXE', location: 'Delhi Head Office', branch: 'Delhi Head Office' },
  'CJOU232660306': { name: 'Ashok Vihar_Extra', location: 'Noida sector 61', branch: 'Noida Branch' },
  'GED7254501292': { name: 'Raagwaas Chattarpur', location: 'Chattarpur Office', branch: 'Chattarpur Branch' },
  '0056120200363': { name: 'WH-1340-close', location: 'WH-1340-close', branch: 'WH-1340-close' },
  'CEZF192660043': { name: 'Siyonee', location: 'Siyonee', branch: 'Siyonee' },
  'GED7242602598': { name: 'RETAIL', location: 'RETAIL', branch: 'RETAIL' },
  'GED7241900691': { name: 'PITAM PURA', location: 'PITAM PURA', branch: 'PITAM PURA' },
  'CGKK230961662': { name: 'ASHOK VIHAR', location: 'ASHOK VIHAR', branch: 'ASHOK VIHAR' },
  'CJOU232660338': { name: 'HS Office', location: 'HS Office', branch: 'HS Office' },
  'CJOU232660943': { name: 'HS Office', location: 'HS Office', branch: 'HS Office' },
  'GED7253700398': { name: 'WH-1340', location: 'WH-1340', branch: 'WH-1340' },
  'GED7261303265': { name: 'Surya Gurugram', location: 'Surya Gurugram', branch: 'Surya Gurugram' },
  'CEZF192660067': { name: 'PUNJABI BAGH', location: 'PUNJABI BAGH', branch: 'PUNJABI BAGH' },
  'CEZF192660044': { name: 'GT KARNAL SITE', location: 'GT KARNAL SITE', branch: 'GT KARNAL SITE' }
};

function getLocalDateTimeParts(isoStr) {
  const date = new Date(isoStr);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
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
    date: `${result.year}-${result.month}-${result.day}`,
    time: `${result.hour}:${result.minute}:${result.second}`
  };
}

function findLocalEmployee(bioId) {
  const target = String(bioId || '').trim().toLowerCase();
  const targetDigits = target.replace(/\D/g, '');

  // 1. Tier 1: exact biometricUserId / biometricId
  let emp = users.find(u => {
    if (!u) return false;
    if (u.biometricUserId && String(u.biometricUserId).trim().toLowerCase() === target) return true;
    if (u.biometricId && String(u.biometricId).trim().toLowerCase() === target) return true;
    return false;
  });
  if (emp) return emp;

  // 2. Tier 2: direct primary ID
  emp = users.find(u => {
    if (!u) return false;
    if (u.employeeId && String(u.employeeId).trim().toLowerCase() === target) return true;
    if (u.id && (String(u.id).trim().toLowerCase() === target || String(u.id).trim().toLowerCase() === `usr_bio_${target}`)) return true;
    if (u.username && (String(u.username).trim().toLowerCase() === target || String(u.username).trim().toLowerCase() === `bio_${target}`)) return true;
    return false;
  });
  if (emp) return emp;

  // 3. Tier 3: exact numeric digits
  if (targetDigits) {
    const targetNum = parseInt(targetDigits, 10);
    emp = users.find(u => {
      if (!u) return false;
      const uEmpDigits = String(u.employeeId || '').replace(/\D/g, '');
      const uBioDigits = String(u.biometricUserId || u.biometricId || '').replace(/\D/g, '');
      if (uEmpDigits && parseInt(uEmpDigits, 10) === targetNum) return true;
      if (uBioDigits && parseInt(uBioDigits, 10) === targetNum) return true;
      if ((uEmpDigits && uEmpDigits === targetDigits) || (uBioDigits && uBioDigits === targetDigits)) return true;
      return false;
    });
    if (emp) return emp;
  }

  // 4. Auto-register if completely missing
  const newEmp = {
    _id: 'usr_bio_' + String(bioId).trim(),
    id: 'usr_bio_' + String(bioId).trim(),
    employeeId: String(bioId).trim(),
    biometricUserId: String(bioId).trim(),
    biometricId: String(bioId).trim(),
    name: 'Employee ' + bioId,
    username: 'bio_' + String(bioId).trim(),
    role: 'employee',
    status: 'Active',
    scheduleId: '',
    scheduleIds: [],
    shiftLocations: {},
    preferredLocation: '',
    createdAt: new Date().toISOString()
  };
  users.push(newEmp);
  return newEmp;
}

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

    if (inMins > startMins + grace) {
      status = 'Late';
    }
    if (inMins >= startMins + halfDayLimit) {
      status = 'Half Day';
    }
  }

  if (checkOutTime && shiftObj && shiftObj.startTime && shiftObj.endTime) {
    const [outH, outM] = checkOutTime.split(':').map(Number);
    const outMins = (outH || 0) * 60 + (outM || 0);
    let totalWorkMins = outMins - inMins;
    if (totalWorkMins < 0) totalWorkMins += 24 * 60;

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

// 1. Identify all bad logs
const badLogIndices = new Set();
const allPunchesToReassign = [];

logs.forEach((l, idx) => {
  const punches = l.allPunchIds || [];
  const bioIds = new Set();
  punches.forEach(p => {
    const parts = p.split('_');
    if (parts.length >= 2) bioIds.add(parts[1]);
  });

  let isBad = false;
  if (l.userId === 'usr' || l.date === 'bio' || l.id === 'BIO_usr_bio') {
    isBad = true;
  }
  if (bioIds.size > 1) {
    isBad = true;
  }
  if (l.checkInPunchId) {
    const pBio = l.checkInPunchId.split('_')[1];
    const u = users.find(x => x.id === l.userId);
    const uBio = u ? (u.biometricUserId || u.biometricId) : null;
    const uBioDigits = String(uBio || '').replace(/\D/g, '');
    const pBioDigits = String(pBio || '').replace(/\D/g, '');
    if (uBioDigits && pBioDigits && uBioDigits !== pBioDigits) {
      isBad = true;
    }
  }

  if (isBad) {
    badLogIndices.add(idx);
    punches.forEach(p => allPunchesToReassign.push(p));
  }
});

console.log(`Found ${badLogIndices.size} corrupted/cross-punched logs.`);
console.log(`Extracted ${allPunchesToReassign.length} punches to redistribute properly.`);

// Deduplicate extracted punches
const uniquePunches = Array.from(new Set(allPunchesToReassign));

// Remove bad logs from attendanceLogs (in reverse index order)
const sortedIndices = Array.from(badLogIndices).sort((a, b) => b - a);
sortedIndices.forEach(idx => {
  logs.splice(idx, 1);
});

console.log(`Remaining logs after removing bad entries: ${logs.length}`);

// Group punches by real employee and date
const punchGroups = new Map(); // key: `${empId}_${date}` -> array of punch objects

uniquePunches.forEach(pId => {
  const parts = pId.split('_');
  if (parts.length < 3) return;
  const devSerial = parts[0];
  const bioId = parts[1];
  const isoTime = parts.slice(2).join('_');

  const emp = findLocalEmployee(bioId);
  const local = getLocalDateTimeParts(isoTime);
  const key = `${emp.id}###${local.date}`;

  if (!punchGroups.has(key)) {
    punchGroups.set(key, []);
  }

  punchGroups.get(key).push({
    punchId: pId,
    devSerial,
    bioId,
    isoTime,
    date: local.date,
    time: local.time,
    timeMs: new Date(isoTime).getTime()
  });
});

console.log(`Grouped punches into ${punchGroups.size} (employee, date) buckets.`);

// Reintegrate into attendanceLogs
let updatedCount = 0;
let createdCount = 0;

for (const [key, groupPunches] of punchGroups.entries()) {
  const [empId, date] = key.split('###');
  const emp = users.find(u => u.id === empId);

  // Check if an existing log exists for this employee and date
  let log = logs.find(l => l.userId === empId && l.date === date);

  let existingPunches = [];
  if (log && Array.isArray(log.allPunchIds)) {
    existingPunches = log.allPunchIds.map(pId => {
      const parts = pId.split('_');
      const devSerial = parts[0];
      const bioId = parts[1];
      const isoTime = parts.slice(2).join('_');
      const local = getLocalDateTimeParts(isoTime);
      return {
        punchId: pId,
        devSerial,
        bioId,
        isoTime,
        date: local.date,
        time: local.time,
        timeMs: new Date(isoTime).getTime()
      };
    });
  }

  // Combine and sort by timestamp
  const combinedPunchMap = new Map();
  existingPunches.forEach(p => combinedPunchMap.set(p.punchId, p));
  groupPunches.forEach(p => combinedPunchMap.set(p.punchId, p));

  const allDayPunches = Array.from(combinedPunchMap.values()).sort((a, b) => a.timeMs - b.timeMs);
  if (allDayPunches.length === 0) continue;

  const firstPunch = allDayPunches[0];
  const lastPunch = allDayPunches[allDayPunches.length - 1];

  const devInfo = deviceMap[firstPunch.devSerial] || { name: 'RETAIL', location: 'RETAIL' };
  const lastDevInfo = deviceMap[lastPunch.devSerial] || devInfo;

  const shiftObj = (emp && emp.scheduleId) ? (schedules.find(s => String(s.id) === String(emp.scheduleId)) || null) : null;

  const checkIn = firstPunch.time;
  // If first and last punch are different and at least 1 minute apart, set checkOut
  const hasCheckout = (allDayPunches.length > 1 && (lastPunch.timeMs - firstPunch.timeMs >= 60000));
  const checkOut = hasCheckout ? lastPunch.time : '';

  const status = computeAttendanceStatus(checkIn, checkOut, shiftObj);

  if (log) {
    // Update existing log
    log.checkIn = checkIn;
    log.checkInPunchId = firstPunch.punchId;
    log.biometricPunchId = firstPunch.punchId;
    log.checkOut = checkOut;
    log.checkOutPunchId = hasCheckout ? lastPunch.punchId : null;
    log.allPunchIds = allDayPunches.map(p => p.punchId);
    log.status = status;
    log.biometricUserId = firstPunch.bioId;
    log.lastBiometricPunchAt = lastPunch.isoTime;
    log.biometricUsed = hasCheckout ? lastDevInfo.name : devInfo.name;
    log.biometricDeviceId = hasCheckout ? lastPunch.devSerial : firstPunch.devSerial;
    log.location = devInfo.location || 'RETAIL';
    log.updatedAt = new Date().toISOString();
    updatedCount++;
  } else {
    // Create new log
    const newLog = {
      id: `BIO_${empId}_${date}`,
      userId: empId,
      date: date,
      shiftId: (emp && emp.scheduleId) ? emp.scheduleId : '',
      checkIn: checkIn,
      checkOut: checkOut,
      checkInPunchId: firstPunch.punchId,
      checkOutPunchId: hasCheckout ? lastPunch.punchId : null,
      biometricPunchId: firstPunch.punchId,
      allPunchIds: allDayPunches.map(p => p.punchId),
      status: status,
      biometricUsed: hasCheckout ? lastDevInfo.name : devInfo.name,
      biometricDeviceId: hasCheckout ? lastPunch.devSerial : firstPunch.devSerial,
      biometricUserId: firstPunch.bioId,
      lastBiometricPunchAt: lastPunch.isoTime,
      location: devInfo.location || 'RETAIL',
      deviationFlag: false,
      justification: '',
      coords: '',
      distance: 0,
      facePhoto: '',
      latitude: null,
      longitude: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    logs.push(newLog);
    createdCount++;
  }
}

console.log(`Updated ${updatedCount} existing logs, created ${createdCount} restored logs.`);
console.log(`Total attendance logs now: ${logs.length}`);

// Verification
let remainingCrossPunches = 0;
let remainingMismatches = 0;

logs.forEach(l => {
  const punches = l.allPunchIds || [];
  const bioIds = new Set();
  punches.forEach(p => {
    const parts = p.split('_');
    if (parts.length >= 2) bioIds.add(parts[1]);
  });
  if (bioIds.size > 1) remainingCrossPunches++;

  if (l.checkInPunchId) {
    const pBio = l.checkInPunchId.split('_')[1];
    const u = users.find(x => x.id === l.userId);
    const uBio = u ? (u.biometricUserId || u.biometricId) : null;
    const uBioDigits = String(uBio || '').replace(/\D/g, '');
    const pBioDigits = String(pBio || '').replace(/\D/g, '');
    if (uBioDigits && pBioDigits && uBioDigits !== pBioDigits) {
      remainingMismatches++;
    }
  }
});

console.log(`Verification: Remaining cross-punched logs: ${remainingCrossPunches}`);
console.log(`Verification: Remaining user bioId mismatches: ${remainingMismatches}`);

// Save updated seed.json
fs.writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf8');
console.log('Saved repaired seed.json successfully!');
