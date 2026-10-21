const { AttendanceLog, User, Schedule, connectMongoose } = require('../src/server/config/db');
const fs = require('fs');
const path = require('path');

async function run() {
  await connectMongoose();
  
  console.log('=== CHECKING ALL LOGS FOR AJAY TRIPATHI / 703 ON 2026-10-06 ===');
  const mongoLogs = await AttendanceLog.find({
    $or: [
      { userId: 'usr_bio_703' },
      { userId: '703' },
      { employeeId: '703' },
      { biometricUserId: '703' }
    ],
    date: '2026-10-06'
  }).lean();
  console.log('MongoDB logs on 2026-10-06 count:', mongoLogs.length);
  console.log(JSON.stringify(mongoLogs, null, 2));

  // Check seed.json logs
  const seedPath = path.join(__dirname, '..', 'seed.json');
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const seedLogs = (seed.attendanceLogs || []).filter(l => 
      (l.userId === 'usr_bio_703' || l.userId === '703' || l.employeeId === '703' || l.biometricUserId === '703') &&
      l.date === '2026-10-06'
    );
    console.log('Seed.json logs on 2026-10-06 count:', seedLogs.length);
    console.log(JSON.stringify(seedLogs, null, 2));
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
