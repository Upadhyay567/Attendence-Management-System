// scripts/repairOmaxeAndKarnalSeparation.js
// Strict separation and data decontamination between SURYA OMAXE and GT KARNAL SITE
const fs = require('fs');
const path = require('path');
const {
  User,
  BiometricDevice,
  AttendanceLog,
  connectMongoose,
  getUseLocalFileDB,
  LOCAL_DB_FILE
} = require('../src/server/config/db');

async function repair() {
  console.log('🚀 Starting Separation & Decontamination of SURYA OMAXE & GT KARNAL SITE...');
  
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    throw new Error(`Database file not found: ${LOCAL_DB_FILE}`);
  }

  const db = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
  const users = db.users || [];
  const logs = db.attendanceLogs || [];
  const devices = db.biometricDevices || [];
  let processedPunchIds = db.processedPunchIds || [];

  // 1. Update biometricDevices configuration
  console.log('📡 Updating biometricDevices for SURYA OMAXE & GT KARNAL SITE...');
  let omaxeDev = devices.find(d => d.serial === 'GED7241901313' || d.id === 'dev_wdms_ged7241901313');
  if (omaxeDev) {
    omaxeDev.name = 'SURYA OMAXE';
    omaxeDev.serial = 'GED7241901313';
    omaxeDev.ip = '192.168.1.8';
    omaxeDev.location = 'Surya Omaxe';
    omaxeDev.branch = 'Surya Omaxe';
    omaxeDev.status = 'Online';
    omaxeDev.enabled = true;
    omaxeDev.source = 'easywdms';
  } else {
    devices.push({
      id: 'dev_wdms_ged7241901313',
      name: 'SURYA OMAXE',
      serial: 'GED7241901313',
      ip: '192.168.1.8',
      port: 4370,
      location: 'Surya Omaxe',
      branch: 'Surya Omaxe',
      status: 'Online',
      enabled: true,
      isPrimary: false,
      source: 'easywdms',
      lastSyncAt: new Date().toISOString()
    });
  }

  let karnalDev = devices.find(d => d.serial === 'CEZF192660044' || d.id === 'dev_zk_main');
  if (karnalDev) {
    karnalDev.name = 'GT KARNAL SITE';
    karnalDev.serial = 'CEZF192660044';
    karnalDev.ip = '192.168.1.7';
    karnalDev.location = 'GT KARNAL SITE';
    karnalDev.branch = 'GT KARNAL SITE';
    karnalDev.status = 'Online';
    karnalDev.enabled = true;
    karnalDev.source = 'easywdms';
  }

  // 2. Identify genuine Surya Omaxe employees vs GT Karnal Site employees
  const omaxeStaffPins = new Set([
    '395', '491', '589', '615', '641', '656', '716', '723', '736', '752', '754', '797', 
    '878', '882', '902', '987', '988', '1004', '1014', '1017', '1018', '1041', '1064', 
    '1129', '1180', '1185', '1205', '1216', '1217', '1218', '1219', '1222', '1226', '1233', 
    '1235', '1246', '1247', '1250', '1263', '1272', '1273', '1276', '1277', '1281', '1282', 
    '1284', '1288', '1289', '1290', '1294', '1304', '1305', '1313', '3578', '5951', '40413', 
    'EMP1253'
  ]);

  // 3. Decontaminate attendance logs
  console.log('🧹 Purging phantom duplicate punches and fixing log locations...');
  let purgedPhantomPunchesCount = 0;
  let fixedKarnalLogsCount = 0;
  let fixedOmaxeLogsCount = 0;
  const removedPunchIdsSet = new Set();

  logs.forEach(log => {
    const pList = log.allPunchIds || [];
    if (!pList.length) return;

    // Build set of timestamps from CEZF punches
    const cezfTimes = new Set();
    pList.forEach(p => {
      if (p.startsWith('CEZF192660044_')) {
        cezfTimes.add(p.replace('CEZF192660044_', ''));
      }
    });

    // Detect phantom GED punches that match CEZF timestamps
    const cleanPunchIds = [];
    pList.forEach(p => {
      if (p.startsWith('GED7241901313_')) {
        const t = p.replace('GED7241901313_', '');
        if (cezfTimes.has(t)) {
          // This is a phantom duplicate punch!
          purgedPhantomPunchesCount++;
          removedPunchIdsSet.add(p);
          return;
        }
      }
      cleanPunchIds.push(p);
    });

    log.allPunchIds = cleanPunchIds;

    // Check if the log belongs to a GT Karnal punch or a Surya Omaxe punch
    const hasCezf = cleanPunchIds.some(p => p.startsWith('CEZF192660044_'));
    const hasGed = cleanPunchIds.some(p => p.startsWith('GED7241901313_'));

    if (hasCezf && !hasGed) {
      // Strictly GT KARNAL SITE
      if (log.biometricUsed === 'SURYA OMAXE' || log.location === 'Delhi Head Office' || log.location === 'Surya Omaxe') {
        log.biometricUsed = 'GT KARNAL SITE';
        log.biometricDeviceId = 'CEZF192660044';
        log.location = 'GT KARNAL SITE';
        fixedKarnalLogsCount++;
      }
      if (log.checkInPunchId && log.checkInPunchId.startsWith('GED7241901313_')) {
        log.checkInPunchId = log.checkInPunchId.replace('GED7241901313_', 'CEZF192660044_');
      }
      if (log.checkOutPunchId && log.checkOutPunchId.startsWith('GED7241901313_')) {
        log.checkOutPunchId = log.checkOutPunchId.replace('GED7241901313_', 'CEZF192660044_');
      }
      if (log.biometricPunchId && log.biometricPunchId.startsWith('GED7241901313_')) {
        log.biometricPunchId = log.biometricPunchId.replace('GED7241901313_', 'CEZF192660044_');
      }
    } else if (hasGed && !hasCezf) {
      // Strictly Surya Omaxe
      if (log.location === 'Delhi Head Office' || log.biometricUsed !== 'SURYA OMAXE') {
        log.biometricUsed = 'SURYA OMAXE';
        log.biometricDeviceId = 'GED7241901313';
        log.location = 'Surya Omaxe';
        fixedOmaxeLogsCount++;
      }
    }
  });

  // Remove phantom punch IDs from processedPunchIds
  if (removedPunchIdsSet.size > 0) {
    db.processedPunchIds = processedPunchIds.filter(pid => !removedPunchIdsSet.has(pid));
  }

  console.log(`✅ Purged ${purgedPhantomPunchesCount} phantom duplicate punch IDs.`);
  console.log(`✅ Fixed ${fixedKarnalLogsCount} GT Karnal Site attendance logs.`);
  console.log(`✅ Fixed ${fixedOmaxeLogsCount} Surya Omaxe attendance logs.`);

  // 4. Separate Users across locations
  console.log('👥 Separating users across Surya Omaxe and GT Karnal Site...');
  let omaxeUsersAssigned = 0;
  let karnalUsersAssigned = 0;

  users.forEach(user => {
    const pin = String(user.biometricUserId || user.employeeId || '').replace(/\D/g, '');
    const empId = String(user.employeeId || user.id || '').trim();

    if (omaxeStaffPins.has(pin) || omaxeStaffPins.has(empId)) {
      user.preferredLocation = 'Surya Omaxe';
      user.preferredLocations = ['Surya Omaxe'];
      if (user.shiftLocations && typeof user.shiftLocations === 'object') {
        Object.keys(user.shiftLocations).forEach(k => {
          user.shiftLocations[k] = 'Surya Omaxe';
        });
      }
      omaxeUsersAssigned++;
    } else if (user.preferredLocation === 'GT KARNAL SITE') {
      karnalUsersAssigned++;
    }
  });

  console.log(`✅ Assigned ${omaxeUsersAssigned} users to Surya Omaxe.`);
  console.log(`✅ Maintained ${karnalUsersAssigned} users at GT Karnal Site.`);

  // 5. Save database atomically
  const tmpFile = `${LOCAL_DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, LOCAL_DB_FILE);
  console.log('💾 Saved changes to seed.json successfully.');

  // Invalidate cache
  try {
    const { invalidateLocalDbCache } = require('../src/server/controllers/attendance.controller');
    invalidateLocalDbCache();
  } catch (_) {}

  // 6. Mirror to MongoDB if online
  const online = await connectMongoose();
  const useLocal = getUseLocalFileDB();
  if (online && !useLocal) {
    console.log('🔄 Mirroring updates to MongoDB...');
    for (const dev of db.biometricDevices) {
      await BiometricDevice.updateOne({ id: dev.id }, { $set: dev }, { upsert: true }).catch(() => {});
    }
    for (const u of users) {
      if (omaxeStaffPins.has(String(u.biometricUserId).replace(/\D/g, ''))) {
        await User.updateOne({ id: u.id }, { $set: { preferredLocation: 'Surya Omaxe', preferredLocations: ['Surya Omaxe'] } }).catch(() => {});
      }
    }
    console.log('✅ MongoDB mirror completed.');
  }

  console.log('🎉 Repair and separation completed successfully!');
}

repair().catch(err => {
  console.error('❌ Error during repair:', err);
  process.exit(1);
});
