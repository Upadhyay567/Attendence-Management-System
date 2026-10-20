const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Parse provided CSV
const csvPath = path.join(__dirname, '..', 'scratch', 'provided_staff_records.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

function parseCSV(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const records = [];
  for (let line of lines) {
    if (line.startsWith('Emp Code,Name')) continue;
    const parts = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { parts.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    parts.push(cur.trim());
    if (parts.length >= 2) {
      records.push({
        empCode: parts[0],
        name: parts[1],
        department: parts[2] || 'Department',
        worksites: parts[3] || '',
        lastPunchTime: parts[4] || ''
      });
    }
  }
  return records;
}

const provided = parseCSV(csvContent);
console.log(`Loaded ${provided.length} provided records.`);

let users = seed.users || [];
const logs = seed.attendanceLogs || [];

// 1. Identify E-pairs (e.g. 5428 <-> E5428)
const ePairs = ['5428','5429','5430','5431','5432','5433','5434','5435','5437','5438','5439','5440'];
const ePairMap = new Map();

ePairs.forEach(num => {
  const eCode = 'E' + num;
  const provE = provided.find(p => p.empCode === eCode);
  if (provE) {
    ePairMap.set(num, {
      realName: provE.name,
      eCode: eCode,
      worksites: provE.worksites,
      department: provE.department
    });
  }
});

// Map of userId / employeeId -> new verified name (for updating attendance logs)
const userRenames = new Map();

// 2. Consolidate E-pairs into the active numeric account (which holds all punches)
ePairs.forEach(num => {
  const info = ePairMap.get(num);
  if (!info) return;

  const numUser = users.find(u => u.biometricUserId === num || u.employeeId === num || u.id === `usr_bio_${num}`);
  const eUser = users.find(u => u.id === `usr_bio_E${num}` || u.employeeId === `E${num}`);

  if (numUser) {
    const oldName = numUser.name;
    numUser.name = info.realName;
    numUser.employeeId = info.eCode;
    numUser.biometricUserId = num;
    numUser.biometricId = num;
    if (info.worksites) {
      const sites = info.worksites.split(',').map(s => s.trim()).filter(Boolean);
      numUser.preferredLocations = sites;
      if (!numUser.preferredLocation || numUser.preferredLocation === 'Delhi Head Office') {
        numUser.preferredLocation = sites[0];
      }
    }
    numUser._search = `${info.realName.toLowerCase()} ${info.eCode.toLowerCase()} ${num} ${numUser.department || ''}`.trim();
    userRenames.set(numUser.id, info.realName);
    userRenames.set(num, info.realName);
    userRenames.set(info.eCode, info.realName);

    console.log(`🔗 Consolidated PIN ${num}: "${oldName}" -> "${info.realName}" (Emp ID: ${info.eCode}, Bio ID: ${num})`);
  }

  // Remove the redundant empty E-user clone
  if (eUser && numUser && eUser.id !== numUser.id) {
    users = users.filter(u => u.id !== eUser.id);
    console.log(`   Removed redundant clone account: ${eUser.id}`);
  }
});

// 3. Update all placeholder names and refined names from provided file
provided.forEach(p => {
  const code = p.empCode;
  const numCode = code.replace(/\D/g, '');
  if (code.startsWith('E') && ePairMap.has(numCode)) return;

  let user = users.find(u => {
    const uEmp = String(u.employeeId || '');
    const uBio = String(u.biometricUserId || '');
    if (uEmp === code || uBio === code) return true;
    if (uEmp.replace(/^0+/, '') === code.replace(/^0+/, '')) return true;
    if (uBio.replace(/^0+/, '') === code.replace(/^0+/, '')) return true;
    return false;
  });

  if (!user && numCode) {
    user = users.find(u => {
      const uEmp = String(u.employeeId || '');
      const uBio = String(u.biometricUserId || '');
      return uEmp === numCode || uBio === numCode;
    });
  }

  if (user) {
    const oldName = user.name || '';
    const newName = p.name.trim();

    // Only update if provided name is real and different
    if (newName && oldName !== newName && !/^Employee\s+\d+$/i.test(newName)) {
      user.name = newName;
      user._search = `${newName.toLowerCase()} ${user.employeeId || ''} ${user.department || ''}`.trim();
      userRenames.set(user.id, newName);
      if (user.employeeId) userRenames.set(user.employeeId, newName);
      if (user.biometricUserId) userRenames.set(user.biometricUserId, newName);
      console.log(`✏️ Renamed user [${code}]: "${oldName}" -> "${newName}"`);
    }

    // Update worksites if present
    if (p.worksites) {
      const sites = p.worksites.split(',').map(s => s.trim()).filter(Boolean);
      if (sites.length > 0) {
        user.preferredLocations = sites;
        if (!user.preferredLocation || user.preferredLocation === 'Delhi Head Office' || user.preferredLocation === '') {
          user.preferredLocation = sites[0];
        }
      }
    }
  }
});

// 4. Ensure 30191 Admin is registered in users
const admin30191 = users.find(u => u.employeeId === '30191' || u.biometricUserId === '30191');
if (!admin30191) {
  users.push({
    id: 'usr_bio_30191',
    employeeId: '30191',
    biometricUserId: '30191',
    biometricId: '30191',
    name: 'Admin',
    username: 'bio_30191',
    role: 'admin',
    status: 'Active',
    scheduleId: '',
    scheduleIds: [],
    shiftLocations: {},
    preferredLocation: 'HS Office',
    preferredLocations: [
      'WH-1340', 'RETAIL', 'HS Office', 'Siyonee', 'ASHOK VIHAR',
      'PUNJABI BAGH', 'GT KARNAL SITE', 'Ashok Vihar Extra', 'SURYA OMAXE',
      'Branch Area 12', 'Branch Area 13', 'PITAM PURA', 'Raagwaas Chattarpur', 'Surya Gurugram'
    ],
    department: 'Operations',
    gender: 'Male',
    _search: 'admin 30191 operations'
  });
  console.log('✅ Added missing user 30191 Admin to users directory.');
}

// 5. Update attendance logs with new employee names
let logsUpdated = 0;
logs.forEach(log => {
  const matchName = userRenames.get(log.userId) || 
                    userRenames.get(log.employeeId) || 
                    userRenames.get(log.biometricPunchId?.split('_')[0]);

  if (matchName && log.employeeName !== matchName) {
    log.employeeName = matchName;
    logsUpdated++;
  }
});
console.log(`📊 Updated employee names in ${logsUpdated} attendance log records.`);

// 6. Save seed.json
seed.users = users;
seed.attendanceLogs = logs;

let saved = false;
for (let i = 0; i < 10; i++) {
  try {
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), 'utf8');
    saved = true;
    break;
  } catch (e) {
    const start = Date.now();
    while (Date.now() - start < 300) {}
  }
}
if (saved) {
  try {
    const tmp = `${seedPath}.tmp.1792395739514`;
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  } catch (_) {}
  console.log(`\n🎉 Staff records successfully reconciled and persisted to seed.json!`);
  console.log(`Total users in HRMS directory now: ${seed.users.length}`);
} else {
  console.error('❌ Failed to save seed.json after 10 attempts');
}
