const fs = require('fs');
const { authenticate, fetchTransactions } = require('../src/server/biometric/easywdms.service');

async function check() {
  const db = JSON.parse(fs.readFileSync('seed.json', 'utf8'));
  const logs = db.attendanceLogs.filter(l => l.date === '2026-10-20');
  
  const missingOut = logs.filter(l => l.checkIn && !l.checkOut);
  const missingIn = logs.filter(l => !l.checkIn && l.checkOut);

  console.log('--- 2026-10-20 Missed Punches in Local DB ---');
  console.log(`Total missing checkOut: ${missingOut.length}`);
  console.log(`Total missing checkIn: ${missingIn.length}`);

  const cookie = await authenticate();

  // Test 5 missing checkOut users on ZKTeco cloud
  console.log('\nChecking ZKTeco Cloud transactions for sample Missing Check-Out users:');
  for (const log of missingOut.slice(0, 5)) {
    const pin = log.biometricUserId || log.employeeId || log.userId.replace('usr_bio_', '');
    const punches = await fetchTransactions(cookie, {
      emp_code: pin,
      start_time: '2026-10-20 00:00:00',
      end_time: '2026-10-20 23:59:59',
      maxPages: 1,
      page_size: 100
    });
    console.log(`User ${log.employeeName} (${pin}): Local In='${log.checkIn}' Out='${log.checkOut}' | Cloud punches found: ${punches.length}`);
    punches.forEach(p => console.log(`   -> Cloud Punch: ${p.punch_time} on SN:${p.terminal_sn} (${p.terminal_alias}) state=${p.punch_state}`));
  }

  // Test missing checkIn users on ZKTeco cloud
  console.log('\nChecking ZKTeco Cloud transactions for Missing Check-In users:');
  for (const log of missingIn) {
    const pin = log.biometricUserId || log.employeeId || log.userId.replace('usr_bio_', '');
    const punches = await fetchTransactions(cookie, {
      emp_code: pin,
      start_time: '2026-10-20 00:00:00',
      end_time: '2026-10-20 23:59:59',
      maxPages: 1,
      page_size: 100
    });
    console.log(`User ${log.employeeName} (${pin}): Local In='${log.checkIn}' Out='${log.checkOut}' | Cloud punches found: ${punches.length}`);
    punches.forEach(p => console.log(`   -> Cloud Punch: ${p.punch_time} on SN:${p.terminal_sn} (${p.terminal_alias}) state=${p.punch_state}`));
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
