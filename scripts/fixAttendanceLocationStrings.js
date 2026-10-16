const fs = require('fs');
const { User, BiometricDevice, AttendanceLog, connectMongoose, getUseLocalFileDB, LOCAL_DB_FILE } = require('../src/server/config/db');

async function fixLocations() {
  const db = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
  let updatedOmaxe = 0;
  let updatedKarnal = 0;

  (db.attendanceLogs || []).forEach(l => {
    // If punch was on GED7241901313 or SURYA OMAXE
    if (l.biometricDeviceId === 'GED7241901313' || l.biometricUsed === 'SURYA OMAXE') {
      l.location = 'Surya Omaxe';
      l.biometricUsed = 'SURYA OMAXE';
      l.biometricDeviceId = 'GED7241901313';
      updatedOmaxe++;
    }
    if (l.departureDeviceId === 'GED7241901313' || l.departureDevice === 'SURYA OMAXE') {
      l.departureLocation = 'Surya Omaxe';
      l.departureDevice = 'SURYA OMAXE';
      l.departureDeviceId = 'GED7241901313';
    }

    // If punch was on CEZF192660044 or GT KARNAL SITE
    if (l.biometricDeviceId === 'CEZF192660044' || l.biometricUsed === 'GT KARNAL SITE') {
      l.location = 'GT KARNAL SITE';
      l.biometricUsed = 'GT KARNAL SITE';
      l.biometricDeviceId = 'CEZF192660044';
      updatedKarnal++;
    }
    if (l.departureDeviceId === 'CEZF192660044' || l.departureDevice === 'GT KARNAL SITE') {
      l.departureLocation = 'GT KARNAL SITE';
      l.departureDevice = 'GT KARNAL SITE';
      l.departureDeviceId = 'CEZF192660044';
    }
  });

  console.log('Fixed Omaxe logs count:', updatedOmaxe);
  console.log('Fixed Karnal logs count:', updatedKarnal);

  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log('Saved to seed.json');

  const { invalidateLocalDbCache } = require('../src/server/controllers/attendance.controller');
  invalidateLocalDbCache();

  const online = await connectMongoose();
  const useLocal = getUseLocalFileDB();
  if (online && !useLocal) {
    console.log('Mirroring to MongoDB...');
    for (const dev of db.biometricDevices) {
      await BiometricDevice.updateOne({ id: dev.id }, { $set: dev }, { upsert: true }).catch(() => {});
    }
    console.log('Done MongoDB mirror.');
  }
}

fixLocations().catch(console.error);
