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

const { broadcastSSEEvent } = require('../routes/events.routes');

let activeHost = process.env.WDMS_HOST || '203.115.110.93';
const WDMS_PORT = parseInt(process.env.WDMS_PORT || '8081', 10);

function getCandidateHosts() {
  const hosts = [];
  if (process.env.WDMS_HOST) hosts.push(process.env.WDMS_HOST);
  if (process.env.WDMS_HOST_ALT) hosts.push(process.env.WDMS_HOST_ALT);
  hosts.push('203.115.110.93');
  hosts.push('203.115.101.226');
  return [...new Set(hosts.filter(Boolean))];
}

function getActiveHost() {
  return activeHost;
}

// Canonical hardware terminal mapping across all branches
function resolveDeviceLocation(sn, alias) {
  const cleanSn = String(sn || '').trim().toUpperCase();
  const cleanAlias = String(alias || '').trim();

  const map = {
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

  if (map[cleanSn]) return map[cleanSn];

  // Alias aliases for WH-130 / WH-1340
  if (/^wh-?130$/i.test(cleanAlias) || /^wh-?130$/i.test(cleanSn)) {
    return { name: 'WH-1340', location: 'WH-1340', branch: 'WH-1340' };
  }

  return {
    name: cleanAlias || `ZKTeco ${cleanSn}`,
    location: cleanAlias || 'Branch Office',
    branch: cleanAlias || 'Branch Office'
  };
}

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

function getInitialLoginPage(host) {
  const targetHost = host || activeHost;
  return new Promise((resolve, reject) => {
    http.get({
      hostname: targetHost,
      port: WDMS_PORT,
      path: '/login/',
      timeout: 8000
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
 * Automatically fails over between candidate hosts (203.115.110.93 and 203.115.101.226)
 */
async function authenticate(username, password, forceRefresh = false) {
  const user = username || process.env.WDMS_USER || 'admin';
  const pass = password || process.env.WDMS_PASS || 'Hs@20267';

  if (!user || !pass) {
    throw new Error('Username and password are required to authenticate with ZKTeco WDMS');
  }

  if (!forceRefresh && cachedCookie && Date.now() < cookieExpiresAt) {
    return cachedCookie;
  }

  const candidateHosts = getCandidateHosts();
  let lastError = null;

  for (const host of candidateHosts) {
    try {
      const init = await getInitialLoginPage(host);
      const rawForm = `csrfmiddlewaretoken=${encodeURIComponent(init.formCsrf)}&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&template10=&login_type=pwd`;
      const encryptedData = zkEncrypt(rawForm, init.formCsrf);
      const postBody = `encrypt_data=${encodeURIComponent(encryptedData)}&csrfmiddlewaretoken=${encodeURIComponent(init.formCsrf)}`;
      const cookieHeader = init.cookies.map(c => c.split(';')[0]).join('; ');

      const res = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: host,
          port: WDMS_PORT,
          path: '/login/',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `http://${host}:${WDMS_PORT}/login/`,
            'Cookie': cookieHeader,
            'Content-Length': Buffer.byteLength(postBody)
          },
          timeout: 10000
        }, r => {
          let data = '';
          r.on('data', c => data += c);
          r.on('end', () => {
            let json = null;
            try { json = JSON.parse(data); } catch (_) {}
            resolve({ statusCode: r.statusCode, headers: r.headers, data, json });
          });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout connecting to WDMS login on ${host}`)); });
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
        cookieExpiresAt = Date.now() + 15 * 60 * 1000;
        activeHost = host;
        console.log(`✅ [WDMS] Authenticated successfully with ZKTeco Cloud Server (${activeHost}:${WDMS_PORT})`);
        return cachedCookie;
      }

      lastError = new Error(`WDMS login failed on ${host}: ${res.json?.message || res.data || 'Wrong credentials'}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All WDMS candidate hosts failed authentication');
}

async function fetchWithCookie(path, cookieStr, retryCount = 0) {
  let currentCookie = cookieStr || cachedCookie;
  if (!currentCookie) {
    currentCookie = await authenticate();
  }

  const result = await new Promise((resolve, reject) => {
    const req = http.get({
      hostname: activeHost,
      port: WDMS_PORT,
      path,
      headers: {
        'Cookie': currentCookie,
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
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout fetching ${path} from WDMS (${activeHost})`)); });
    req.on('error', reject);
  });

  if ((result.statusCode === 401 || result.statusCode === 403) && retryCount === 0) {
    cachedCookie = null;
    cookieExpiresAt = 0;
    try {
      const refreshedCookie = await authenticate(undefined, undefined, true);
      return await fetchWithCookie(path, refreshedCookie, 1);
    } catch (authErr) {
      console.warn('⚠️ [WDMS] Re-authentication failed after 401:', authErr.message);
    }
  }

  return result;
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
  console.log(`📡 [WDMS] Fetched ${terminals.length} terminals from ZKTeco Cloud Server (${activeHost})`);

  // Update biometricDevices list in seed.json and MongoDB
  if (terminals.length > 0) {
    try {
      const db = fs.existsSync(LOCAL_DB_FILE) ? JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8')) : {};
      if (!Array.isArray(db.biometricDevices)) db.biometricDevices = [];

      terminals.forEach(term => {
        const sn = String(term.sn || term.terminal_sn || term.serial_number || '').trim().toUpperCase();
        const ip = term.ip_address || term.ip || '';
        const meta = resolveDeviceLocation(sn, term.alias || term.terminal_name);

        let existing = db.biometricDevices.find(d => String(d.serial || '').trim().toUpperCase() === sn);
        if (!existing && (sn === 'CEZF192660044' || ip === '192.168.1.7')) {
          existing = db.biometricDevices.find(d => d.id === 'dev_zk_main' || d.serial === 'CEZF192660044');
        }

        const isOnline = term.state === 1 || term.is_online === true || term.is_online === 1;

        if (existing) {
          existing.serial = sn;
          existing.name = meta.name;
          existing.location = meta.location;
          existing.branch = meta.branch;
          existing.status = isOnline ? 'Online' : 'Offline';
          existing.lastSyncAt = new Date().toISOString();
          existing.source = 'easywdms';
          if (ip) existing.ip = ip;
          existing.enrolledUsersCount = term.user_count || existing.enrolledUsersCount || 0;
          existing.totalPunchesCount = term.transaction_count || existing.totalPunchesCount || 0;
        } else {
          db.biometricDevices.push({
            id: `dev_wdms_${sn.toLowerCase()}`,
            name: meta.name,
            ip: ip || activeHost,
            port: 4370,
            serial: sn,
            location: meta.location,
            branch: meta.branch,
            status: isOnline ? 'Online' : 'Offline',
            enabled: true,
            isPrimary: false,
            lastSyncAt: new Date().toISOString(),
            source: 'easywdms',
            enrolledUsersCount: term.user_count || 0,
            totalPunchesCount: term.transaction_count || 0
          });
        }
      });

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
          break;
        } catch (writeErr) {
          if (attempt === 2) console.warn('⚠️ [WDMS] Failed to save terminals to database after retries:', writeErr.message);
          const waitMs = 50 * (attempt + 1);
          const start = Date.now();
          while (Date.now() - start < waitMs) {}
        }
      }

      // Update MongoDB if connected
      const online = await connectMongoose();
      const useLocal = getUseLocalFileDB();
      if (online && !useLocal) {
        for (const dev of db.biometricDevices) {
          await BiometricDevice.updateOne({ id: dev.id }, { $set: dev }, { upsert: true }).catch(() => {});
        }
      }

      broadcastSSEEvent('biometric_devices_updated', { type: 'biometric', action: 'devices', timestamp: Date.now() });
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
/**
 * Comprehensive Sync: Pulls terminals, employees, and attendance logs from ZKTeco easy WDMS Cloud Server
 * and ingests them into the HRMS database
 */
async function syncFromWDMS(username, password, options = {}) {
  const user = username || process.env.WDMS_USER || 'admin';
  const pass = password || process.env.WDMS_PASS || 'Hs@20267';
  const maxPages = options.maxPages || 3;

  const cookie = await authenticate(user, pass);

  const terminals = await fetchTerminals(cookie).catch(err => {
    console.warn('⚠️ [WDMS] Terminals fetch warning:', err.message);
    return [];
  });

  const employees = await fetchEmployees(cookie).catch(err => {
    console.warn('⚠️ [WDMS] Employees fetch warning:', err.message);
    return [];
  });

  const transactions = await fetchTransactions(cookie, { maxPages }).catch(err => {
    console.warn('⚠️ [WDMS] Transactions fetch warning:', err.message);
    return [];
  });

  // Map terminal serials to names and locations
  const terminalMap = new Map();
  terminals.forEach(t => {
    const sn = String(t.sn || t.terminal_sn || '').trim().toUpperCase();
    if (sn) {
      terminalMap.set(sn, resolveDeviceLocation(sn, t.alias || t.terminal_name));
    }
  });

  // Normalize punches
  const normalizedPunches = [];
  transactions.forEach(tx => {
    const pin = String(tx.emp_code || tx.pin || tx.employee_id || '').trim();
    const punchTime = tx.punch_time || tx.punch_datetime || tx.timestamp;
    const sn = String(tx.terminal_sn || tx.sn || '').trim().toUpperCase();

    if (pin && punchTime) {
      const termInfo = terminalMap.get(sn) || resolveDeviceLocation(sn, tx.terminal_alias || `ZKTeco (${sn})`);

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
        scheduleId: '',
        scheduleIds: [],
        shiftLocations: {},
        preferredLocation: '',
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
  const { ingestPunchesAndUsers } = require('./biometricSync.service');
  const result = await ingestPunchesAndUsers(dbUsers, normalizedPunches, {
    name: `ZKTeco WDMS Cloud (${activeHost})`,
    serial: `WDMS_CLOUD_${activeHost}`,
    location: 'Delhi Head Office',
    online: true
  });

  // Broadcast real-time SSE events to frontend dashboards
  broadcastSSEEvent('biometric_sync_complete', {
    source: 'easywdms',
    host: activeHost,
    devices: terminals.length,
    employees: employees.length,
    punches: transactions.length,
    newUsers: newEmployeesAdded,
    timestamp: new Date().toISOString()
  });

  if (result && (result.created > 0 || result.updated > 0)) {
    broadcastSSEEvent('db_updated', {
      type: 'biometric_sync',
      source: 'easywdms',
      timestamp: Date.now(),
      result
    });
  }

  return {
    success: true,
    host: activeHost,
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
  getActiveHost,
  getCandidateHosts,
  resolveDeviceLocation,
  WDMS_PORT
};
