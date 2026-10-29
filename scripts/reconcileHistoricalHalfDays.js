const fs = require('fs');
const path = require('path');

const seedPath = path.resolve(__dirname, '..', 'seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// 1. Configure base salaries for target employees from Image 2
const employeeSalaries = {
  '1128': 30000, // Vipin Chandra
  '1157': 47000, // Nitesh Sharma
  '3010': 28000, // Deepak
  '882': 30000,  // Gaurav Kumar
  '660': 32000,  // MANAV
  '641': 26000,  // SHANU
  '1188': 28000, // Shyamal
  '1345': 25000, // Sonu Nishad
  '835': 30000   // Sumit
};

let userSalaryUpdated = 0;
seed.users.forEach(u => {
  const empId = u.employeeId || (u.id.startsWith('usr_bio_') ? u.id.replace('usr_bio_', '') : '');
  if (employeeSalaries[empId]) {
    if (!u.baseSalary || u.baseSalary === 0) {
      u.baseSalary = employeeSalaries[empId];
      userSalaryUpdated++;
    }
  }
});

console.log(`Configured base salaries for ${userSalaryUpdated} employee(s).`);

// 2. Map schedules
const schedulesMap = new Map();
seed.schedules.forEach(s => {
  if (s.halfDayLimit === undefined || s.halfDayLimit === 120) {
    s.halfDayLimit = 200;
  }
  schedulesMap.set(s.id, s);
});

const defaultSched = seed.schedules[0] || {
  startTime: '09:00',
  endTime: '18:00',
  gracePeriod: 15,
  halfDayLimit: 200,
  workDays: [1, 2, 3, 4, 5]
};

// 3. User map for schedule fallback
const usersMap = new Map(seed.users.map(u => [u.id, u]));

// 4. Today string for past date evaluation
const todayStr = new Date().toISOString().substring(0, 10);

let upgradedToHalfDay = 0;
let preservedHalfDays = 0;

seed.attendanceLogs.forEach(log => {
  // RULE: Preserve existing Half Day records unconditionally!
  if (log.status === 'Half Day') {
    preservedHalfDays++;
    return;
  }

  const user = usersMap.get(log.userId);
  const schedId = log.shiftId || (user && user.scheduleId);
  const sched = (schedId && schedulesMap.get(schedId)) || defaultSched;

  const halfDayLimit = (sched.halfDayLimit !== undefined && sched.halfDayLimit !== 120) ? Number(sched.halfDayLimit) : 200;
  const grace = sched.gracePeriod !== undefined ? Number(sched.gracePeriod) : 15;
  const [startH, startM] = (sched.startTime || '09:00').split(':').map(Number);
  const startMins = startH * 60 + (startM || 0);
  const [endH, endM] = (sched.endTime || '18:00').split(':').map(Number);
  const endMins = endH * 60 + (endM || 0);

  const isPast = log.date < todayStr;
  let isHalf = false;

  if (!log.checkIn && !log.checkOut) {
    log.status = 'Absent';
    return;
  }
  
  if (!log.checkIn && log.checkOut) {
    isHalf = true;
  } else if (log.checkIn && !log.checkOut && isPast) {
    isHalf = true;
  } else if (log.checkIn && log.checkOut) {
    const [inH, inM] = log.checkIn.split(':').map(Number);
    const [outH, outM] = log.checkOut.split(':').map(Number);
    const inMins = inH * 60 + inM;
    const outMins = outH * 60 + outM;
    let workMins = outMins - inMins;
    if (workMins < 0) workMins += 24 * 60;

    // A. Late arrival >= 200 mins
    if (inMins >= startMins + halfDayLimit) {
      isHalf = true;
    }

    // B. Early departure >= 200 mins
    if (endMins - outMins >= halfDayLimit) {
      isHalf = true;
    }

    // C. Short working duration < 240 mins (4 hours)
    const expectedMins = endMins > startMins ? (endMins - startMins) : 8 * 60;
    const halfDayThreshold = expectedMins > 0 ? (expectedMins / 2) : 240;
    if (workMins < halfDayThreshold || workMins < 240) {
      isHalf = true;
    }
  }

  if (isHalf) {
    log.status = 'Half Day';
    upgradedToHalfDay++;
  }
});

console.log(`Reconciliation Complete:`);
console.log(`- Total logs evaluated: ${seed.attendanceLogs.length}`);
console.log(`- Preserved existing Half-Days: ${preservedHalfDays}`);
console.log(`- Upgraded to Half-Day (200m rule / short duration / single punch): ${upgradedToHalfDay}`);

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2), 'utf8');
console.log('Successfully saved updated seed.json');
