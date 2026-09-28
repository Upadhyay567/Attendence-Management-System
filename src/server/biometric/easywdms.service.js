// src/server/biometric/easywdms.service.js
// Integration engine for ZKTeco easy WDMS / EasyTimePro Cloud Server (203.115.110.93:8081)

const http = require('http');
const fs = require('fs');
const {
  User,
  BiometricDevice,
  connectMongoose,
  getUseLocalFileDB,
  LOCAL_DB_FILE
} = require('../config/db');

const {
  ingestPunchesAndUsers,
  parseDeviceTimestamp
} = require('./biometricSync.service');

const { broadcastSSEEvent } = require('../routes/events.routes');

const WDMS_HOST = process.env.WDMS_HOST || '203.115.110.93';
const WDMS_PORT = parseInt(process.env.WDMS_PORT || '8081', 10);

// =====================================================
// ZKTECO EASY WDMS RC4 STREAM CIPHER & BASE64 ENCODING
// =====================================================

const base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64encode(str) {
  let out = "", i = 0, len = str.length;
  while (i < len) {
    let c1 = str.charCodeAt(i++) & 255;
    if (i === len) {
      out += base64EncodeChars.charAt(c1 >> 2) + base64EncodeChars.charAt((c1 & 3) << 4) + "==";
      break;
    }
    let c2 = str.charCodeAt(i++);
    if (i === len) {
      out += base64EncodeChars.charAt(c1 >> 2) + base64EncodeChars.charAt(((c1 & 3) << 4) | ((c2 & 240) >> 4)) + base64EncodeChars.charAt((c2 & 15) << 2) + "=";
      break;
    }
    let c3 = str.charCodeAt(i++);
    out += base64EncodeChars.charAt(c1 >> 2) + base64EncodeChars.charAt(((c1 & 3) << 4) | ((c2 & 240) >> 4)) + base64EncodeChars.charAt(((c2 & 15) << 2) | ((c3 & 192) >> 6)) + base64EncodeChars.charAt(c3 & 63);
  }
  return out;
}

function zk_encrypt(key, str) {
  let s = [], j = 0, x, res = "";
  for (let i = 0; i < 256; i++) { s[i] = i; }
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
  }
  let i = 0; j = 0;
  for (let y = 0; y < str.length; y++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
    res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
  }
  return res;
}

function zkEncrypt(data, key) {
  return base64encode(zk_encrypt(key, data));
}

let cachedCookie = null;
let cookieExpiresAt = 0;

function getInitialLoginPage() {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: WDMS_HOST,
      port: WDMS_PORT,
      path: '/login/',
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'] || [];
        let csrftoken = '';
        cookies.forEach(c => {
          const m = c.match(/csrftoken=([^;]+)/);
          if (m) csrftoken = m[1];
        });
        const match = data.match(/name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/i);
        const formCsrf = match ? match[1] : csrftoken;
        resolve({ formCsrf, csrftoken, cookies });
      });
    }).on('error', reject);
  });
}

/**
 * Authenticate against ZKTeco easy WDMS Web Portal using RC4 encryption
 */
async function authenticate(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required to authenticate with ZKTeco WDMS (203.115.110.93:8081)');
  }

  if (cachedCookie && Date.now() < cookieExpiresAt) {
    return cachedCookie;
  }

  const init = await getInitialLoginPage();
  const rawForm = `csrfmiddlewaretoken=${encodeURIComponent(init.formCsrf)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&template10=&login_type=pwd`;
  const encryptedData = zkEncrypt(rawForm, init.formCsrf);
  const postBody = `encrypt_data=${encodeURIComponent(encryptedData)}&csrfmiddlewaretoken=${encodeURIComponent(init.formCsrf)}`;
  const cookieHeader = init.cookies.map(c => c.split(';')[0]).join('; ');

  const res = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: WDMS_HOST,
      port: WDMS_PORT,
      path: '/login/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `http://${WDMS_HOST}:${WDMS_PORT}/login/`,
        'Cookie': cookieHeader,
        'Content-Length': Buffer.byteLength(postBody)
      },
      timeout: 15000
    }, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: r.statusCode, headers: r.headers, data, json });
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout connecting to WDMS login')); });
    req.on('error', reject);
    req.write(postBody);
    req.end();
  });

  if (res.statusCode === 200 && res.json?.ret === 0) {
    const setCookies = res.headers['set-cookie'] || [];
    let cookieMap = {};
    init.cookies.forEach(c => { const parts = c.split(';')[0].split('='); cookieMap[parts[0]] = parts.slice(1).join('='); });
    setCookies.forEach(c => { const parts = c.split(';')[0].split('='); cookieMap[parts[0]] = parts.slice(1).join('='); });
    cachedCookie = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    cookieExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
    console.log(`✅ [WDMS] Authenticated successfully with ZKTeco Cloud Server (${WDMS_HOST}:${WDMS_PORT})`);
    return cachedCookie;
  }

  const errMsg = res.json?.message || res.data || 'Invalid WDMS credentials';
  throw new Error(`WDMS Authentication failed (${res.statusCode}): ${errMsg}`);
}

function fetchWithCookie(path, cookieStr) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: WDMS_HOST,
      port: WDMS_PORT,
      path,
      headers: {
        'Cookie': cookieStr || cachedCookie,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 25000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, data, json });
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${path} from WDMS`)); });
    req.on('error', reject);
  });
}

/**
 * Fetch all registered biometric terminals/devices from the WDMS server
 */
async function fetchTerminals(cookieStr) {
  const cookie = cookieStr || cachedCookie;
  if (!cookie) throw new Error('Authentication required');

  const res = await fetchWithCookie('/iclock/api/terminals/?page=1&page_size=100', cookie);
  if (res.statusCode !== 200) {
    throw new Error(`Failed to fetch terminals (${res.statusCode}): ${res.data}`);
  }

  const terminals = Array.isArray(res.json?.data) ? res.json.data : (Array.isArray(res.json) ? res.json : []);
  console.log(`📡 [WDMS] Fetched ${terminals.length} terminals from ZKTeco Cloud Server`);

  // Update biometricDevices list in seed.json and MongoDB
  if (terminals.length > 0) {
    try {
      const db = fs.existsSync(LOCAL_DB_FILE) ? JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8')) : {};
      if (!Array.isArray(db.biometricDevices)) db.biometricDevices = [];

      terminals.forEach(term => {
        const sn = String(term.sn || term.terminal_sn || term.serial_number || '').trim();
        const alias = term.alias || term.terminal_name || term.area_name || `ZKTeco ${sn}`;
        const ip = term.ip_address || term.ip || '';
        const isChattarpur = alias.toLowerCase().includes('chattarpur') || ip === '192.168.0.105' || sn === 'GED7254501292';

        let existing = db.biometricDevices.find(d => d.serial === sn);
        if (!existing && isChattarpur) {
          existing = db.biometricDevices.find(d => d.id === 'dev_zk_chattarpur' || d.ip === '192.168.0.105');
        }
        if (!existing && (sn === 'CEZF192660044' || ip === '192.168.1.7')) {
          existing = db.biometricDevices.find(d => d.id === 'dev_zk_main' || d.serial === 'CEZF192660044');
        }

        const isOnline = term.state === 1 || term.is_online === true || term.is_online === 1;

        if (existing) {
          existing.serial = sn;
          existing.name = alias || existing.name;
          existing.status = isOnline ? 'Online' : 'Offline';
          existing.lastSyncAt = new Date().toISOString();
          if (ip) existing.ip = ip;
          existing.enrolledUsersCount = term.user_count || existing.enrolledUsersCount || 0;
          existing.totalPunchesCount = term.transaction_count || existing.totalPunchesCount || 0;
        } else {
          db.biometricDevices.push({
            id: `dev_wdms_${sn.toLowerCase()}`,
            name: alias,
            ip: ip || WDMS_HOST,
            port: 4370,
            serial: sn,
            location: isChattarpur ? 'Chattarpur' : (alias || 'Branch Office'),
            branch: isChattarpur ? 'Chattarpur Branch' : (alias || 'Remote Branch'),
            status: isOnline ? 'Online' : 'Offline',
            enabled: true,
            isPrimary: false,
            lastSyncAt: new Date().toISOString(),
            enrolledUsersCount: term.user_count || 0,
            totalPunchesCount: term.transaction_count || 0
          });
        }
      });

      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2), 'utf8');

      // Update MongoDB if connected
      const online = await connectMongoose();
      const useLocal = getUseLocalFileDB();
      if (online && !useLocal) {
        for (const dev of db.biometricDevices) {
          await BiometricDevice.updateOne({ id: dev.id }, { $set: dev }, { upsert: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('⚠️ [WDMS] Failed to save terminals to database:', e.message);
    }
  }

  return terminals;
}

/**
 * Fetch all employee records from the WDMS server (paginated)
 */
async function fetchEmployees(cookieStr) {
  const cookie = cookieStr || cachedCookie;
  if (!cookie) throw new Error('Authentication required');

  const employees = [];
  let page = 1;
  while (true) {
    const res = await fetchWithCookie(`/personnel/api/employees/?page=${page}&page_size=1000`, cookie);
    if (res.statusCode !== 200) {
      console.warn(`⚠️ [WDMS] Error fetching employees page ${page} (${res.statusCode})`);
      break;
    }
    const data = res.json?.data || res.json?.results || [];
    if (data.length === 0) break;
    employees.push(...data);
    if (!res.json?.next) break;
    page++;
  }

  console.log(`👤 [WDMS] Fetched ${employees.length} employees across ${page} page(s) from ZKTeco Cloud Server`);
  return employees;
}

/**
 * Fetch attendance transaction punch logs from the WDMS server
 */
async function fetchTransactions(cookieStr, query = {}) {
  const cookie = cookieStr || cachedCookie;
  if (!cookie) throw new Error('Authentication required');

  const logs = [];
  const maxPages = query.maxPages || 5; // default up to 5,000 punches
  let page = 1;

  while (page <= maxPages) {
    const q = new URLSearchParams();
    q.set('page_size', String(query.page_size || 1000));
    q.set('ordering', query.ordering || '-punch_time');
    q.set('page', String(page));
    if (query.start_time) q.set('start_time', query.start_time);
    if (query.end_time) q.set('end_time', query.end_time);

    const res = await fetchWithCookie(`/iclock/api/transactions/?${q.toString()}`, cookie);
    if (res.statusCode !== 200) {
      console.warn(`⚠️ [WDMS] Error fetching transactions page ${page} (${res.statusCode})`);
      break;
    }
    const data = res.json?.data || res.json?.results || [];
    if (data.length === 0) break;
    logs.push(...data);
    if (!res.json?.next) break;
    page++;
  }

  console.log(`📥 [WDMS] Fetched ${logs.length} punch records from ZKTeco Cloud Server`);
  return logs;
}

/**
 * Comprehensive Sync: Pulls terminals, employees, and attendance logs from 203.115.110.93:8081
 * and ingests them into the HRMS database
 */
async function syncFromWDMS(username, password) {
  const cookie = await authenticate(username, password);

  const terminals = await fetchTerminals(cookie).catch(err => {
    console.warn('⚠️ [WDMS] Terminals fetch warning:', err.message);
    return [];
  });

  const employees = await fetchEmployees(cookie).catch(err => {
    console.warn('⚠️ [WDMS] Employees fetch warning:', err.message);
    return [];
  });

  const transactions = await fetchTransactions(cookie, { maxPages: 5 }).catch(err => {
    console.warn('⚠️ [WDMS] Transactions fetch warning:', err.message);
    return [];
  });

  // Map terminal serials to names and locations
  const terminalMap = new Map();
  terminals.forEach(t => {
    const sn = String(t.sn || t.terminal_sn || '').trim().toUpperCase();
    if (sn) {
      terminalMap.set(sn, {
        name: t.alias || t.terminal_name || `ZKTeco ${sn}`,
        location: (t.alias || '').toLowerCase().includes('chattarpur') ? 'Chattarpur' : (t.alias || 'Office HQ')
      });
    }
  });

  // Normalize punches
  const normalizedPunches = [];
  transactions.forEach(tx => {
    const pin = String(tx.emp_code || tx.pin || tx.employee_id || '').trim();
    const punchTime = tx.punch_time || tx.punch_datetime || tx.timestamp;
    const sn = String(tx.terminal_sn || tx.sn || '').trim().toUpperCase();

    if (pin && punchTime) {
      const termInfo = terminalMap.get(sn) || {
        name: sn === 'GED7254501292' ? 'Raagwaas Chattarpur' : `ZKTeco (${sn})`,
        location: sn === 'GED7254501292' ? 'Chattarpur' : 'Office HQ'
      };

      normalizedPunches.push({
        biometricUserId: pin,
        recordTime: new Date(punchTime),
        deviceName: termInfo.name,
        deviceSerial: sn,
        location: termInfo.location
      });
    }
  });

  // Load existing HRMS users
  let dbUsers = [];
  if (fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const db = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
      dbUsers = Array.isArray(db.users) ? db.users : [];
    } catch (_) {}
  }

  // Merge WDMS employees into dbUsers if missing
  let newEmployeesAdded = 0;
  employees.forEach(emp => {
    const pin = String(emp.emp_code || emp.pin || '').trim();
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || `Employee ${pin}`;
    const exists = dbUsers.find(u => 
      u.biometricUserId === pin || u.employeeId === pin || u.id === `usr_bio_${pin}`
    );
    if (!exists && pin) {
      dbUsers.push({
        id: `usr_bio_${pin}`,
        employeeId: pin,
        biometricUserId: pin,
        biometricId: pin,
        name: fullName,
        username: `bio_${pin}`,
        role: 'employee',
        status: 'Active',
        scheduleId: 'sch_q8jji9v',
        scheduleIds: ['sch_q8jji9v'],
        shiftLocations: { sch_q8jji9v: 'Chattarpur' },
        preferredLocation: 'Chattarpur',
        department: emp.department?.dept_name || 'Operations'
      });
      newEmployeesAdded++;
    }
  });

  if (newEmployeesAdded > 0 && fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const db = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
      db.users = dbUsers;
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (_) {}
  }

  // Ingest via centralized punctuality and check-in/check-out anchoring engine
  const result = await ingestPunchesAndUsers(dbUsers, normalizedPunches, {
    name: 'ZKTeco WDMS Cloud (203.115.110.93)',
    serial: 'WDMS_CLOUD_203.115.110.93',
    location: 'Chattarpur',
    online: true
  });

  // Broadcast real-time SSE event to frontend
  broadcastSSEEvent('biometric_sync_complete', {
    source: 'easywdms',
    devices: terminals.length,
    employees: employees.length,
    punches: transactions.length,
    newUsers: newEmployeesAdded,
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    terminalsCount: terminals.length,
    employeesCount: employees.length,
    newEmployeesAdded,
    transactionsCount: transactions.length,
    ingestionResult: result
  };
}

module.exports = {
  authenticate,
  fetchTerminals,
  fetchEmployees,
  fetchTransactions,
  syncFromWDMS,
  WDMS_HOST,
  WDMS_PORT
};
