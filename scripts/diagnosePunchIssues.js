const { AttendanceLog, User, connectMongoose, LOCAL_DB_FILE } = require('../src/server/config/db');
const fs = require('fs');

async function analyze() {
  await connectMongoose();
  const today = '2026-10-21';
  const logsToday = await AttendanceLog.find({ date: today }).lean();
  console.log(`=== TODAY'S LOGS (${today}) ===`);
  console.log(`Total logs today: ${logsToday.length}`);
  
  let bothCount = 0;
  let inOnlyCount = 0;
  let outOnlyCount = 0;
  let neitherCount = 0;
  
  const inOnlySample = [];
  const outOnlySample = [];
  
  for (const l of logsToday) {
    const hasIn = Boolean(l.checkIn && l.checkIn.trim());
    const hasOut = Boolean(l.checkOut && l.checkOut.trim());
    
    if (hasIn && hasOut) bothCount++;
    else if (hasIn && !hasOut) {
      inOnlyCount++;
      if (inOnlySample.length < 5) inOnlySample.push({ 
        userId: l.userId, 
        name: l.employeeName, 
        in: l.checkIn, 
        out: l.checkOut, 
        punchCount: (l.allPunchIds || []).length, 
        punches: l.allPunchIds 
      });
    }
    else if (!hasIn && hasOut) {
      outOnlyCount++;
      if (outOnlySample.length < 5) outOnlySample.push({ 
        userId: l.userId, 
        name: l.employeeName, 
        in: l.checkIn, 
        out: l.checkOut, 
        punchCount: (l.allPunchIds || []).length, 
        punches: l.allPunchIds 
      });
    }
    else neitherCount++;
  }
  
  console.log('Today Stats:', { bothCount, inOnlyCount, outOnlyCount, neitherCount });
  console.log('Sample IN only (missing checkOut):', JSON.stringify(inOnlySample, null, 2));
  console.log('Sample OUT only (missing checkIn):', JSON.stringify(outOnlySample, null, 2));

  // Check historical: October 2026 logs overall
  const octLogs = await AttendanceLog.find({ date: { $regex: '^2026-10' } }).lean();
  let octBoth = 0, octInOnly = 0, octOutOnly = 0;
  const historicalOutOnly = [];
  const historicalInOnlyMultiPunch = [];

  for (const l of octLogs) {
    const hasIn = Boolean(l.checkIn && l.checkIn.trim());
    const hasOut = Boolean(l.checkOut && l.checkOut.trim());
    if (hasIn && hasOut) octBoth++;
    else if (hasIn && !hasOut) {
      octInOnly++;
      // Check if user actually had multiple punches on that day!
      if (Array.isArray(l.allPunchIds) && l.allPunchIds.length > 1) {
        if (historicalInOnlyMultiPunch.length < 5) {
          historicalInOnlyMultiPunch.push({ date: l.date, userId: l.userId, in: l.checkIn, out: l.checkOut, punches: l.allPunchIds });
        }
      }
    }
    else if (!hasIn && hasOut) {
      octOutOnly++;
      if (historicalOutOnly.length < 5) {
        historicalOutOnly.push({ date: l.date, userId: l.userId, in: l.checkIn, out: l.checkOut, punches: l.allPunchIds });
      }
    }
  }

  console.log('\n=== OCTOBER 2026 OVERALL ===');
  console.log({ total: octLogs.length, octBoth, octInOnly, octOutOnly });
  console.log('Logs with OUT but NO IN:', JSON.stringify(historicalOutOnly, null, 2));
  console.log('Logs with MULTIPLE PUNCHES but NO OUT:', JSON.stringify(historicalInOnlyMultiPunch, null, 2));

  // Let's check past completed days (e.g., yesterday 2026-10-20, 2026-10-19)
  const pastDays = ['2026-10-20', '2026-10-19', '2026-10-16', '2026-10-15'];
  console.log('\n=== PAST COMPLETED DAYS BREAKDOWN ===');
  for (const d of pastDays) {
    const dLogs = octLogs.filter(l => l.date === d);
    let b = 0, inOnly = 0, outOnly = 0;
    dLogs.forEach(l => {
      const hasIn = Boolean(l.checkIn && l.checkIn.trim());
      const hasOut = Boolean(l.checkOut && l.checkOut.trim());
      if (hasIn && hasOut) b++;
      else if (hasIn && !hasOut) inOnly++;
      else if (!hasIn && hasOut) outOnly++;
    });
    console.log(`Date ${d}: total=${dLogs.length}, both=${b}, inOnly=${inOnly}, outOnly=${outOnly}`);
  }

  process.exit(0);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
