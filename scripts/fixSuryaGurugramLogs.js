const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// 1. Surya Gurugram dedicated employees list
const gurugramEmpCodes = new Set([
  '1061', '1324', '1326', '1327', '1328', '1329', '1330', '1331', 
  '1332', '1333', '1334', '1336', '1337', '1338', '1339', '1347', 
  '1348', '1349', '1145', '1296', '1297', '1308', '1060', '1237'
]);

let usersUpdated = 0;
seed.users.forEach(u => {
  const code = String(u.biometricUserId || u.employeeId || '').replace(/\D/g, '');
  if (gurugramEmpCodes.has(code)) {
    if (u.preferredLocation !== 'Surya Gurugram') {
      u.preferredLocation = 'Surya Gurugram';
      if (!Array.isArray(u.preferredLocations)) u.preferredLocations = [];
      if (!u.preferredLocations.includes('Surya Gurugram')) {
        u.preferredLocations.unshift('Surya Gurugram');
      }
      usersUpdated++;
      console.log(`Updated user ${u.name} (${code}) preferredLocation -> 'Surya Gurugram'`);
    }
  }
});
console.log(`Total Surya Gurugram users updated: ${usersUpdated}`);

// 2. Fix attendance logs from terminal GED7261303265
let logsUpdated = 0;
(seed.attendanceLogs || []).forEach(l => {
  const isGurugramTerminal = l.biometricDeviceId === 'GED7261303265' || 
    (l.allPunchIds && l.allPunchIds.some(pid => pid.includes('GED7261303265'))) ||
    l.biometricUsed === 'Surya Gurugram';

  if (isGurugramTerminal) {
    if (l.location !== 'Surya Gurugram') {
      l.location = 'Surya Gurugram';
      l.biometricUsed = 'Surya Gurugram';
      logsUpdated++;
    }
  }
});
console.log(`Total attendance logs corrected to 'Surya Gurugram': ${logsUpdated}`);

// Save directly to seed.json with retries
let saved = false;
for (let i = 0; i < 10; i++) {
  try {
    fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), 'utf8');
    saved = true;
    break;
  } catch (e) {
    const start = Date.now();
    while (Date.now() - start < 200) {}
  }
}
if (saved) {
  console.log('✅ Successfully updated and saved seed.json!');
} else {
  console.error('❌ Failed to save seed.json');
}
