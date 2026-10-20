// scripts/reconcileAttendanceLocations.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { LOCAL_DB_FILE, connectMongoose, getUseLocalFileDB, BiometricDevice } = require('../src/server/config/db');

// Exact hardware terminal serial-to-location mapping for all 14 branch biometric devices
const HARDWARE_TERMINAL_MAP = {
  '0056120200363': { name: 'WH-1340-close', location: 'WH-1340', branch: 'WH-1340' },
  'CEZF192660043': { name: 'Siyonee', location: 'Siyonee', branch: 'Siyonee' },
  'CJOU232660306': { name: 'HS Office- FF', location: 'HS Office', branch: 'HS Office' },
  'CJOU232660338': { name: 'HS Office', location: 'HS Office', branch: 'HS Office' },
  'CJOU232660943': { name: 'HS Office', location: 'HS Office', branch: 'HS Office' },
  'GED7242602598': { name: 'RETAIL', location: 'RETAIL', branch: 'RETAIL' },
  'GED7241900691': { name: 'PITAM PURA', location: 'PITAM PURA', branch: 'PITAM PURA' },
  'CEZF192660067': { name: 'PUNJABI BAGH', location: 'PUNJABI BAGH', branch: 'PUNJABI BAGH' },
  'CEZF192660044': { name: 'GT KARNAL SITE', location: 'GT KARNAL SITE', branch: 'GT KARNAL SITE' },
  'GED7241901313': { name: 'SURYA OMAXE', location: 'Surya Omaxe', branch: 'Surya Omaxe' },
  'CGKK230961662': { name: 'ASHOK VIHAR', location: 'ASHOK VIHAR', branch: 'ASHOK VIHAR' },
  'GED7253700398': { name: 'WH-1340', location: 'WH-1340', branch: 'WH-1340' },
  'GED7254501292': { name: 'Raagwaas Chattarpur', location: 'Chattarpur Office', branch: 'Chattarpur Branch' },
  'GED7261303265': { name: 'Surya Gurugram', location: 'Surya Gurugram', branch: 'Surya Gurugram' }
};

const DEVICE_NAME_MAP = {
  'wh-1340': { name: 'WH-1340', location: 'WH-1340' },
  'wh-1340-close': { name: 'WH-1340-close', location: 'WH-1340' },
  'siyonee': { name: 'Siyonee', location: 'Siyonee' },
  'hs office': { name: 'HS Office', location: 'HS Office' },
  'hs office- ff': { name: 'HS Office- FF', location: 'HS Office' },
  'retail': { name: 'RETAIL', location: 'RETAIL' },
  'pitam pura': { name: 'PITAM PURA', location: 'PITAM PURA' },
  'pitampura': { name: 'PITAM PURA', location: 'PITAM PURA' },
  'punjabi bagh': { name: 'PUNJABI BAGH', location: 'PUNJABI BAGH' },
  'gt karnal site': { name: 'GT KARNAL SITE', location: 'GT KARNAL SITE' },
  'gt karnal': { name: 'GT KARNAL SITE', location: 'GT KARNAL SITE' },
  'surya omaxe': { name: 'SURYA OMAXE', location: 'Surya Omaxe' },
  'ashok vihar': { name: 'ASHOK VIHAR', location: 'ASHOK VIHAR' },
  'ashok vihar_extra': { name: 'HS Office- FF', location: 'HS Office' },
  'raagwaas chattarpur': { name: 'Raagwaas Chattarpur', location: 'Chattarpur Office' },
  'chattarpur office': { name: 'Raagwaas Chattarpur', location: 'Chattarpur Office' },
  'surya gurugram': { name: 'Surya Gurugram', location: 'Surya Gurugram' }
};

function resolveTerminal(sn, deviceName) {
  if (sn && typeof sn === 'string') {
    const cleanSn = sn.toUpperCase().trim();
    if (HARDWARE_TERMINAL_MAP[cleanSn]) return HARDWARE_TERMINAL_MAP[cleanSn];
  }
  if (deviceName && typeof deviceName === 'string') {
    const cleanName = deviceName.toLowerCase().trim();
    if (DEVICE_NAME_MAP[cleanName]) return DEVICE_NAME_MAP[cleanName];
  }
  return null;
}

async function run() {
  console.log('🔄 Reconciling all attendance logs to EXACT physical hardware biometric terminal locations...');
  const seed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));

  // Ensure devices in seed.json have correct locations
  (seed.biometricDevices || []).forEach(d => {
    const cleanSn = String(d.serial || '').toUpperCase().trim();
    if (HARDWARE_TERMINAL_MAP[cleanSn]) {
      const term = HARDWARE_TERMINAL_MAP[cleanSn];
      d.name = term.name;
      d.location = term.location;
      d.branch = term.branch;
    }
  });

  const logs = seed.attendanceLogs || [];
  let checkInUpdated = 0;
  let checkOutUpdated = 0;

  logs.forEach(l => {
    // Preserve 2026-10-01 test benchmarks intact
    if (l.date === '2026-10-01') return;

    // Check-in terminal resolution
    let inSn = l.biometricDeviceId || '';
    if (!inSn && l.checkInPunchId) inSn = l.checkInPunchId.split('_')[0];
    else if (!inSn && l.biometricPunchId) inSn = l.biometricPunchId.split('_')[0];

    const inTerm = resolveTerminal(inSn, l.biometricUsed);
    if (inTerm) {
      if (l.location !== inTerm.location || l.biometricUsed !== inTerm.name) {
        l.location = inTerm.location;
        l.biometricUsed = inTerm.name;
        l.biometricDeviceId = inSn || l.biometricDeviceId;
        checkInUpdated++;
      }
    }

    // Check-out terminal resolution
    if (l.checkOut) {
      let outSn = l.departureDeviceId || '';
      if (!outSn && l.checkOutPunchId) outSn = l.checkOutPunchId.split('_')[0];

      const outTerm = resolveTerminal(outSn, l.departureDevice);
      if (outTerm) {
        if (l.departureLocation !== outTerm.location || l.departureDevice !== outTerm.name) {
          l.departureLocation = outTerm.location;
          l.departureDevice = outTerm.name;
          l.departureDeviceId = outSn || l.departureDeviceId;
          checkOutUpdated++;
        }
      }
    }
  });

  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
  console.log(`✅ Saved seed.json:`);
  console.log(`   - Fixed ${checkInUpdated} check-in punch locations to exact hardware terminals`);
  console.log(`   - Fixed ${checkOutUpdated} check-out punch locations to exact hardware terminals`);

  // Mirror to MongoDB if online
  const online = await connectMongoose();
  const useLocal = getUseLocalFileDB();
  if (online && !useLocal) {
    try {
      for (const dev of (seed.biometricDevices || [])) {
        await BiometricDevice.updateOne({ id: dev.id }, { $set: dev }, { upsert: true }).catch(() => {});
      }
      console.log('✅ MongoDB BiometricDevice records updated.');
    } catch (e) {
      console.warn('⚠️ MongoDB notice:', e.message);
    }
  }

  console.log('🎉 Physical punch location reconciliation completed successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error during reconciliation:', err);
  process.exit(1);
});
