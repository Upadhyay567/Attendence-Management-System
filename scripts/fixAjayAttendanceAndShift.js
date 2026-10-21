const fs = require('fs');
const path = require('path');
const { User, AttendanceLog, Schedule, connectMongoose, LOCAL_DB_FILE } = require('../src/server/config/db');

async function fix() {
  await connectMongoose();
  console.log('🔄 Connecting to MongoDB to fix Ajay Tripathi attendance and shift configuration...');

  // 1. Find and update User
  const user = await User.findOne({
    $or: [
      { id: 'usr_bio_703' },
      { employeeId: '703' },
      { biometricUserId: '703' }
    ]
  });

  if (!user) {
    console.error('❌ User Ajay Tripathi (703) not found in MongoDB!');
  } else {
    console.log(`✅ Found User: ${user.name} (${user.id})`);
    user.role = 'employee';
    user.scheduleId = 'sch_q8jji9v';
    user.scheduleIds = ['sch_q8jji9v'];
    user.weeklyOff = ['Saturday', 'Sunday'];
    await user.save();
    console.log('✅ Updated User in MongoDB: scheduleId="sch_q8jji9v", weeklyOff=["Saturday", "Sunday"]');
  }

  // 2. Find and update AttendanceLog for 2026-10-06
  const log = await AttendanceLog.findOne({
    $or: [
      { userId: 'usr_bio_703' },
      { userId: '703' },
      { employeeId: '703' },
      { biometricUserId: '703' }
    ],
    date: '2026-10-06'
  });

  if (!log) {
    console.error('❌ Attendance log for 2026-10-06 not found in MongoDB!');
  } else {
    console.log(`✅ Found AttendanceLog: in=${log.checkIn}, out=${log.checkOut}, oldStatus=${log.status}`);
    log.status = 'Half Day';
    log.shiftId = 'sch_q8jji9v';
    await log.save();
    console.log('✅ Updated AttendanceLog in MongoDB: status="Half Day", shiftId="sch_q8jji9v"');
  }

  // 3. Update seed.json
  if (fs.existsSync(LOCAL_DB_FILE)) {
    console.log('🔄 Updating seed.json...');
    const seed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
    
    // Update user in seed.json
    if (Array.isArray(seed.users)) {
      const u = seed.users.find(x => x.id === 'usr_bio_703' || x.employeeId === '703' || x.biometricUserId === '703');
      if (u) {
        u.scheduleId = 'sch_q8jji9v';
        u.scheduleIds = ['sch_q8jji9v'];
        u.weeklyOff = ['Saturday', 'Sunday'];
        console.log('✅ Updated user in seed.json');
      }
    }

    // Update attendance log in seed.json
    if (Array.isArray(seed.attendanceLogs)) {
      const l = seed.attendanceLogs.find(x => 
        (x.userId === 'usr_bio_703' || x.employeeId === '703' || x.biometricUserId === '703') &&
        x.date === '2026-10-06'
      );
      if (l) {
        l.status = 'Half Day';
        l.shiftId = 'sch_q8jji9v';
        console.log('✅ Updated 2026-10-06 log in seed.json: status="Half Day"');
      }
    }

    // Write back atomically
    const tmp = `${LOCAL_DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(seed, null, 2), 'utf8');
    fs.renameSync(tmp, LOCAL_DB_FILE);
    console.log('✅ Saved seed.json successfully.');
  }

  console.log('🎉 Data correction complete!');
  process.exit(0);
}

fix().catch(err => {
  console.error('❌ Error during fix:', err);
  process.exit(1);
});
