// src/server/biometric/adms.service.js
// ZKTeco ADMS (Automatic Data Master Server) / iClock Cloud Server Push Protocol Engine

const fs = require('fs');
const path = require('path');
const {
  User,
  BiometricDevice,
  BiometricVault,
  connectMongoose,
  getUseLocalFileDB,
  LOCAL_DB_FILE
} = require('../config/db');

const {
  ingestPunchesAndUsers,
  getLocalDateTimeParts
} = require('./biometricSync.service');

const { broadcastSSEEvent } = require('../routes/events.routes');

// =====================================================
// IN-MEMORY COMMAND QUEUES & DEVICE TRACKING
// =====================================================
const _commandQueues = new Map(); // SN -> Array<{ id, command, createdAt }>
const _activeDevices = new Map(); // SN -> { lastSeen, ip, model, firmware, ... }
let _cmdCounter = 100;

function getDeviceQueue(sn) {
  const key = String(sn || '').trim().toUpperCase();
  if (!_commandQueues.has(key)) {
    _commandQueues.set(key, []);
  }
  return _commandQueues.get(key);
}

function queueCommand(sn, commandString) {
  const key = String(sn || '').trim().toUpperCase();
  const queue = getDeviceQueue(key);
  const cmdId = ++_cmdCounter;
  const cmdObj = {
    id: cmdId,
    command: commandString,
    createdAt: new Date().toISOString()
  };
  queue.push(cmdObj);
  console.log(`📤 [ADMS] Queued command for ${key}: C:${cmdId}:${commandString}`);
  return cmdObj;
}

// Helper to safely parse ZKTeco timestamp 'YYYY-MM-DD HH:MM:SS'
function parseDeviceTimestamp(dateStr) {
  if (!dateStr) return new Date();
  const parts = String(dateStr).trim().split(/[\sT]+/);
  if (parts.length >= 2) {
    const [y, m, d] = parts[0].split('-').map(Number);
    const [h, min, s] = parts[1].split(':').map(Number);
    if (y && m && d) {
      return new Date(y, m - 1, d, h || 0, min || 0, s || 0);
    }
  }
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

// =====================================================
// LOCAL DB HELPERS (seed.json)
// =====================================================
function readLocalDB() {
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    return { users: [], attendanceLogs: [], biometricDevices: [], biometricVault: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
  } catch (err) {
    console.error('❌ Error reading LOCAL_DB_FILE in adms.service:', err.message);
    return { users: [], attendanceLogs: [], biometricDevices: [], biometricVault: [] };
  }
}

function writeLocalDB(state) {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Error writing LOCAL_DB_FILE in adms.service:', err.message);
  }
}

// =====================================================
// DEVICE REGISTRY & HEARTBEAT TRACKING
// =====================================================
async function trackDeviceHeartbeat(sn, clientIp, query = {}) {
  if (!sn) return null;
  const cleanSn = String(sn).trim().toUpperCase();
  const now = new Date().toISOString();

  const isFirstConnection = !_activeDevices.has(cleanSn);

  _activeDevices.set(cleanSn, {
    sn: cleanSn,
    ip: clientIp,
    lastSeen: now,
    pushver: query.pushver || '3.1.1',
    language: query.language || '69',
    deviceType: query.devicetype || 'ZKTeco Push'
  });

  // Update biometricDevices list in seed.json and MongoDB
  try {
    const db = readLocalDB();
    if (!Array.isArray(db.biometricDevices)) {
      db.biometricDevices = [];
    }

    // Match by serial or find the Chattarpur branch entry if serial was not yet set
    let dev = db.biometricDevices.find(d => 
      (d.serial && String(d.serial).trim().toUpperCase() === cleanSn) ||
      (d.id === 'dev_zk_chattarpur') ||
      (d.ip === clientIp)
    );

    if (dev) {
      dev.serial = cleanSn;
      dev.status = 'Online';
      dev.lastSyncAt = now;
      if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
        dev.ip = clientIp;
      }
    } else {
      // Auto-register newly discovered ADMS device
      dev = {
        id: `dev_adms_${cleanSn.toLowerCase()}`,
        name: `ZKTeco ADMS (${cleanSn})`,
        ip: clientIp,
        port: 4370,
        serial: cleanSn,
        location: 'Chattarpur',
        branch: 'Chattarpur Branch',
        status: 'Online',
        enabled: true,
        isPrimary: false,
        lastSyncAt: now,
        enrolledUsersCount: 0,
        totalPunchesCount: 0
      };
      db.biometricDevices.push(dev);
      console.log(`✨ [ADMS] Auto-registered new cloud push device: ${dev.name} [SN: ${cleanSn}]`);
    }

    writeLocalDB(db);

    // Sync to MongoDB if connected
    const online = await connectMongoose();
    const useLocal = getUseLocalFileDB();
    if (online && !useLocal && dev) {
      await BiometricDevice.updateOne(
        { $or: [{ serial: cleanSn }, { id: dev.id }] },
        { $set: dev },
        { upsert: true }
      ).catch(() => {});
    }

    // If first time connecting in this server session, queue initial sync commands
    if (isFirstConnection) {
      const q = getDeviceQueue(cleanSn);
      if (q.length === 0) {
        console.log(`🚀 [ADMS] First contact from ${cleanSn} (${dev.name}). Queuing auto-discovery commands...`);
        queueCommand(cleanSn, 'INFO');
        queueCommand(cleanSn, 'DATA QUERY USERINFO');
        queueCommand(cleanSn, 'DATA QUERY ATTLOG');
      }
    }

    return dev;
  } catch (err) {
    console.warn('⚠️ [ADMS] trackDeviceHeartbeat error:', err.message);
    return null;
  }
}

// =====================================================
// 1. HANDSHAKE (GET /iclock/cdata)
// =====================================================
async function handleHandshake(sn, clientIp, query = {}) {
  const cleanSn = String(sn || query.SN || '').trim().toUpperCase();
  await trackDeviceHeartbeat(cleanSn, clientIp, query);

  console.log(`🤝 [ADMS Handshake] Device connected: SN=${cleanSn} | IP=${clientIp} | PushVer=${query.pushver || 'N/A'}`);

  // Standard ZKTeco ADMS response protocol
  // TransInterval=1 tells device to upload attendance logs every 1 minute
  // Realtime=1 tells device to push punches instantly when an employee punches
  // TimeZone=330 represents India Standard Time (+05:30 = 330 minutes)
  const responseText = [
    `GET OPTION FROM: ${cleanSn}`,
    `Stamp=9999`,
    `OpStamp=0`,
    `PhotoStamp=0`,
    `ErrorDelay=60`,
    `Delay=30`,
    `TransTimes=00:00;14:05`,
    `TransInterval=1`,
    `TransFlag=1111000000`,
    `TimeZone=330`,
    `Realtime=1`,
    `Encrypt=0`,
    `ServerVersion=3.1.1`
  ].join('\r\n');

  return responseText;
}

// =====================================================
// 2. ATTENDANCE LOG INGESTION (POST /iclock/cdata?table=ATTLOG)
// =====================================================
async function handleAttLog(sn, clientIp, rawBody = '', query = {}) {
  const cleanSn = String(sn || query.SN || '').trim().toUpperCase();
  const device = await trackDeviceHeartbeat(cleanSn, clientIp, query);

  const deviceName = device?.name || 'Chattarpur Branch - ZKTeco (Gate 1)';
  const location = device?.location || 'Chattarpur';

  const bodyText = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString('utf8') : '');
  const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  console.log(`📥 [ADMS ATTLOG] Received ${lines.length} log lines from SN=${cleanSn} (${deviceName})`);

  if (lines.length === 0) {
    return 'OK: 0';
  }

  const rawPunches = [];

  for (const line of lines) {
    // Typical ATTLOG format:
    // <PIN>\t<YYYY-MM-DD HH:MM:SS>\t<Status>\t<VerifyType>\t<WorkCode>...
    // Or space-delimited fallback
    let tokens = line.split('\t');
    if (tokens.length < 2) {
      tokens = line.split(/\s{2,}/);
    }
    if (tokens.length < 2) {
      // Single space split fallback
      const m = line.match(/^(\S+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})(.*)$/);
      if (m) {
        tokens = [m[1], m[2], ...(m[3].trim().split(/\s+/))];
      }
    }

    if (tokens.length >= 2) {
      const pin = String(tokens[0]).trim();
      const timeStr = String(tokens[1]).trim();
      const recordTime = parseDeviceTimestamp(timeStr);

      if (pin && !Number.isNaN(recordTime.getTime())) {
        rawPunches.push({
          biometricUserId: pin,
          recordTime,
          ip: clientIp || device?.ip || '192.168.0.105',
          deviceName,
          deviceSerial: cleanSn,
          location
        });
      }
    }
  }

  if (rawPunches.length === 0) {
    return 'OK: 0';
  }

  // Load existing users from local DB to map employee names and enroll auto-users
  const db = readLocalDB();
  const users = (Array.isArray(db.users) ? db.users : []).map(u => ({
    ...u,
    userId: String(u.biometricUserId || u.biometricId || u.employeeId || u.id || '').trim(),
    name: u.name
  }));

  // Pass to centralized multi-punch anchoring ingestion engine
  const result = await ingestPunchesAndUsers(users, rawPunches, {
    name: deviceName,
    serial: cleanSn,
    ip: clientIp,
    location,
    online: true
  });

  // Update total punch count on device record in fresh state
  const freshDb = readLocalDB();
  const freshDev = (freshDb.biometricDevices || []).find(d => 
    (d.serial && String(d.serial).trim().toUpperCase() === cleanSn) ||
    (d.id === 'dev_zk_chattarpur') ||
    (d.ip === clientIp)
  );
  if (freshDev) {
    freshDev.totalPunchesCount = (freshDev.totalPunchesCount || 0) + (result?.created || 0);
    freshDev.lastSyncAt = new Date().toISOString();
    writeLocalDB(freshDb);
  }

  console.log(`✅ [ADMS ATTLOG] Processed ${rawPunches.length} punches from ${deviceName}: Created=${result.created}, Updated=${result.updated}, Duplicates=${result.duplicates}`);

  return `OK: ${rawPunches.length}`;
}

// =====================================================
// 3. USER ENROLLMENT INGESTION (POST /iclock/cdata?table=USER)
// =====================================================
async function handleUserUpload(sn, clientIp, rawBody = '', query = {}) {
  const cleanSn = String(sn || query.SN || '').trim().toUpperCase();
  const device = await trackDeviceHeartbeat(cleanSn, clientIp, query);

  const deviceLocation = device?.location || 'Chattarpur';
  const bodyText = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString('utf8') : '');
  const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  console.log(`👤 [ADMS USER] Received ${lines.length} user records from SN=${cleanSn}`);

  if (lines.length === 0) {
    return 'OK: 0';
  }

  const db = readLocalDB();
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.biometricVault)) db.biometricVault = [];

  let enrolledCount = 0;

  for (const line of lines) {
    // Format A: Key-value pairs (PIN=101\tName=Rahul\tPri=0\tCard=...)
    // Format B: Tab-delimited (101\tRahul\t0\t...\tCard)
    let pin = '';
    let name = '';
    let privilege = '0';
    let card = '';

    if (line.includes('PIN=') || line.includes('Name=')) {
      const parts = line.split('\t');
      for (const p of parts) {
        const [k, v] = p.split('=');
        if (!k) continue;
        const key = k.trim().toUpperCase();
        const val = v ? v.trim() : '';
        if (key === 'PIN') pin = val;
        else if (key === 'NAME') name = val;
        else if (key === 'PRI') privilege = val;
        else if (key === 'CARD' || key === 'CARDNO') card = val;
      }
    } else {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        pin = parts[0].trim();
        name = parts[1].trim();
        privilege = parts[2] ? parts[2].trim() : '0';
        card = parts[parts.length - 1] ? parts[parts.length - 1].trim() : '';
      }
    }

    if (!pin) continue;

    // Check if user already exists in HRMS
    let existingUser = db.users.find(u => 
      (u.biometricUserId && String(u.biometricUserId).trim() === pin) ||
      (u.employeeId && String(u.employeeId).trim() === pin) ||
      (u.id && String(u.id).trim() === `usr_bio_${pin}`)
    );

    if (existingUser) {
      // Update details if missing
      if (!existingUser.biometricUserId) existingUser.biometricUserId = pin;
      if (!existingUser.name && name) existingUser.name = name;
    } else {
      // Create new employee linked to machine
      const newUserId = `usr_bio_${pin}`;
      const newUser = {
        _id: newUserId,
        id: newUserId,
        employeeId: pin,
        biometricUserId: pin,
        biometricId: pin,
        name: name || `Employee ${pin}`,
        username: `bio_${pin}`,
        role: privilege === '14' ? 'admin' : 'employee',
        status: 'Active',
        department: 'Operations',
        designation: 'Staff',
        scheduleId: '',
        scheduleIds: [],
        shiftLocations: {},
        preferredLocation: deviceLocation || '',
        preferredLocations: deviceLocation ? [deviceLocation] : [],
        createdAt: new Date().toISOString()
      };
      db.users.push(newUser);
      console.log(`✨ [ADMS USER] Auto-enrolled new employee: ${newUser.name} (PIN: ${pin}, Location: ${deviceLocation})`);
    }

    // Save in Biometric Vault for cross-branch sync
    const vaultIdx = db.biometricVault.findIndex(v => String(v.biometricUserId).trim() === pin);
    const vaultEntry = {
      biometricUserId: pin,
      name: name || `Employee ${pin}`,
      cardno: card,
      role: privilege,
      sourceDevice: cleanSn,
      updatedAt: new Date().toISOString()
    };
    if (vaultIdx >= 0) {
      db.biometricVault[vaultIdx] = { ...db.biometricVault[vaultIdx], ...vaultEntry };
    } else {
      db.biometricVault.push(vaultEntry);
    }

    enrolledCount++;
  }

  // Update enrolled count on device
  if (device) {
    device.enrolledUsersCount = enrolledCount;
    device.lastSyncAt = new Date().toISOString();
  }

  writeLocalDB(db);

  // Sync to MongoDB if connected
  const online = await connectMongoose();
  const useLocal = getUseLocalFileDB();
  if (online && !useLocal) {
    try {
      for (const u of db.users) {
        if (u.biometricUserId) {
          await User.updateOne(
            { $or: [{ biometricUserId: u.biometricUserId }, { id: u.id }] },
            { $set: u },
            { upsert: true }
          ).catch(() => {});
        }
      }
      for (const v of db.biometricVault) {
        await BiometricVault.updateOne(
          { biometricUserId: v.biometricUserId },
          { $set: v },
          { upsert: true }
        ).catch(() => {});
      }
    } catch (e) {
      console.warn('⚠️ [ADMS USER] MongoDB update warning:', e.message);
    }
  }

  // Notify frontend of updated user directory
  broadcastSSEEvent('db_updated', {
    type: 'adms_users_synced',
    timestamp: Date.now(),
    device: { serial: cleanSn, location: deviceLocation },
    enrolledCount
  });

  return `OK: ${enrolledCount}`;
}

// =====================================================
// 4. FINGERPRINT & BIODATA INGESTION (table=FINGERTMP)
// =====================================================
async function handleBioData(sn, clientIp, rawBody = '', query = {}) {
  const cleanSn = String(sn || query.SN || '').trim().toUpperCase();
  await trackDeviceHeartbeat(cleanSn, clientIp, query);

  const bodyText = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString('utf8') : '');
  const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  console.log(`🧬 [ADMS BIODATA] Received ${lines.length} template lines from SN=${cleanSn}`);

  const db = readLocalDB();
  if (!Array.isArray(db.biometricVault)) db.biometricVault = [];

  let count = 0;
  for (const line of lines) {
    let pin = '';
    let fingerId = 0;
    let template = '';

    const parts = line.split('\t');
    for (const p of parts) {
      const [k, v] = p.split('=');
      if (!k) continue;
      const key = k.trim().toUpperCase();
      const val = v ? v.trim() : '';
      if (key === 'PIN') pin = val;
      else if (key === 'FID') fingerId = parseInt(val, 10) || 0;
      else if (key === 'TMP') template = val;
    }

    if (pin && template) {
      const vIdx = db.biometricVault.findIndex(v => String(v.biometricUserId).trim() === pin);
      if (vIdx >= 0) {
        if (!Array.isArray(db.biometricVault[vIdx].fingers)) {
          db.biometricVault[vIdx].fingers = [];
        }
        const existingF = db.biometricVault[vIdx].fingers.find(f => f.fingerId === fingerId);
        if (existingF) {
          existingF.template = template;
        } else {
          db.biometricVault[vIdx].fingers.push({ fingerId, template });
        }
      }
      count++;
    }
  }

  if (count > 0) {
    writeLocalDB(db);
  }

  return `OK: ${count || lines.length || 1}`;
}

// =====================================================
// 5. COMMAND POLLING (GET /iclock/getrequest?SN=...)
// =====================================================
async function handleGetRequest(sn, clientIp, query = {}) {
  const cleanSn = String(sn || query.SN || '').trim().toUpperCase();
  await trackDeviceHeartbeat(cleanSn, clientIp, query);

  const queue = getDeviceQueue(cleanSn);

  if (queue.length > 0) {
    const cmd = queue.shift();
    console.log(`📤 [ADMS] Dispatching command to ${cleanSn}: C:${cmd.id}:${cmd.command}`);
    return `C:${cmd.id}:${cmd.command}`;
  }

  return 'OK';
}

// =====================================================
// 6. COMMAND EXECUTION RESULT (POST /iclock/devicecmd)
// =====================================================
async function handleDeviceCmd(sn, clientIp, rawBody = '', query = {}) {
  const cleanSn = String(sn || query.SN || '').trim().toUpperCase();
  await trackDeviceHeartbeat(cleanSn, clientIp, query);

  const bodyText = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString('utf8') : '');
  console.log(`📥 [ADMS CMD RESULT] from ${cleanSn}: ${bodyText.replace(/\r?\n/g, ' ')}`);

  return 'OK';
}

// =====================================================
// 7. DIAGNOSTICS & STATUS
// =====================================================
function getAdmsStatus() {
  const db = readLocalDB();
  const devices = Array.isArray(db.biometricDevices) ? db.biometricDevices : [];
  const chattarpurDev = devices.find(d => d.id === 'dev_zk_chattarpur' || d.location === 'Chattarpur');

  const activeList = Array.from(_activeDevices.values());

  return {
    success: true,
    protocol: 'ZKTeco ADMS / iClock HTTP Push',
    connectedDevicesCount: activeList.length,
    activeDevices: activeList,
    chattarpurDevice: chattarpurDev || null,
    pendingCommands: Array.from(_commandQueues.entries()).map(([sn, cmds]) => ({
      sn,
      count: cmds.length,
      next: cmds[0] || null
    }))
  };
}

module.exports = {
  handleHandshake,
  handleAttLog,
  handleUserUpload,
  handleBioData,
  handleGetRequest,
  handleDeviceCmd,
  trackDeviceHeartbeat,
  queueCommand,
  getAdmsStatus,
  parseDeviceTimestamp
};
