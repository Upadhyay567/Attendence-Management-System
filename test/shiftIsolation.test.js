// test/shiftIsolation.test.js
const fs = require('fs');
const path = require('path');

describe('Shift Schedule Isolation & Active Shift Sequencing', () => {
  let DB;
  const originalSeedPath = path.join(__dirname, '..', 'seed.json');
  let originalSeedData;

  beforeAll(() => {
    originalSeedData = fs.readFileSync(originalSeedPath, 'utf8');
    const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
    const mod = { exports: {} };
    const wrapped = code.replace(/export\s+const\s+DB\s+=/g, 'const DB =').concat('\nmodule.exports = { DB };');
    const fn = new Function('module', 'exports', 'require', wrapped);
    fn(mod, mod.exports, require);
    DB = mod.exports.DB;
    DB.save = () => Promise.resolve();
  });

  afterAll(() => {
    fs.writeFileSync(originalSeedPath, originalSeedData);
  });

  test('Strict shift isolation: getTodayLog must not leak logs across different shift IDs', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const testUser = {
      id: 'test_multi_shift_user',
      name: 'Multi Shift Employee',
      role: 'employee',
      scheduleIds: ['shift_morning', 'shift_afternoon'],
      scheduleId: 'shift_morning'
    };

    DB.data.users = DB.data.users || [];
    DB.data.users.push(testUser);

    DB.data.schedules = DB.data.schedules || [];
    DB.data.schedules.push({ id: 'shift_morning', name: 'Morning Shift', startTime: '09:00', endTime: '13:00' });
    DB.data.schedules.push({ id: 'shift_afternoon', name: 'Afternoon Shift', startTime: '14:00', endTime: '18:00' });

    // Morning shift has completed checkout
    DB.data.attendanceLogs = DB.data.attendanceLogs || [];
    DB.data.attendanceLogs.unshift({
      id: `log_${testUser.id}_${todayStr}_shift_morning`,
      userId: testUser.id,
      date: todayStr,
      shiftId: 'shift_morning',
      checkIn: '09:05',
      checkOut: '12:17',
      status: 'Half Day'
    });

    // 1. Query for Morning Shift
    const morningLog = DB.getTodayLog(testUser.id, 'shift_morning');
    expect(morningLog).not.toBeNull();
    expect(morningLog.shiftId).toBe('shift_morning');
    expect(morningLog.checkIn).toBe('09:05');
    expect(morningLog.checkOut).toBe('12:17');

    // 2. Query for Afternoon Shift (MUST NOT return Morning Shift log!)
    const afternoonLog = DB.getTodayLog(testUser.id, 'shift_afternoon');
    expect(afternoonLog).toBeNull();
  });

  test('Check-In creates fresh log for new shift without altering previous shift log', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const userId = 'test_multi_shift_user';

    // Check in to Afternoon Shift
    const afternoonLog = DB.checkIn(userId, 'none', 'Test Worksite A', false, '', '', 0, null, '14:02', 'shift_afternoon');
    expect(afternoonLog).not.toBeNull();
    expect(afternoonLog.shiftId).toBe('shift_afternoon');
    expect(afternoonLog.checkIn).toBe('14:02');
    expect(afternoonLog.checkOut).toBeNull();

    // Verify Morning Shift log is still completely intact with its own checkout
    const morningLog = DB.getTodayLog(userId, 'shift_morning');
    expect(morningLog.shiftId).toBe('shift_morning');
    expect(morningLog.checkOut).toBe('12:17');

    // Check out of Afternoon Shift
    DB.checkOut(userId, 'none', null, 'shift_afternoon');
    const afternoonCompleted = DB.getTodayLog(userId, 'shift_afternoon');
    expect(afternoonCompleted.checkOut).not.toBeNull();
    expect(afternoonCompleted.checkOut).not.toBe('12:17');
  });

  test('Check-In button restriction: Shift 2 is blocked while Shift 1 is active, and unlocks after Shift 1 completes', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const testUser = {
      id: 'test_sequencing_user',
      name: 'Sequence Test Employee',
      role: 'employee',
      scheduleIds: ['seq_shift_1', 'seq_shift_2'],
      scheduleId: 'seq_shift_1'
    };

    DB.data.users.push(testUser);
    DB.data.schedules.push({ id: 'seq_shift_1', name: 'Shift One', startTime: '09:00', endTime: '13:00' });
    DB.data.schedules.push({ id: 'seq_shift_2', name: 'Shift Two', startTime: '14:00', endTime: '18:00' });

    // Extract getCheckInTimeStatus from js/app.js
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    const match = appCode.match(/function getCheckInTimeStatus\([\s\S]*?\n\}/);
    expect(match).not.toBeNull();
    const getCheckInTimeStatus = new Function('DB', 'user', 'targetShiftId', `${match[0]}; return getCheckInTimeStatus(user, targetShiftId);`).bind(null, DB);

    // Scenario A: Shift 1 has not started yet. Shift 2 must be blocked with PreviousShiftIncomplete!
    const statusBeforeShift1 = getCheckInTimeStatus(testUser, 'seq_shift_2');
    expect(statusBeforeShift1.allowed).toBe(false);
    expect(statusBeforeShift1.type).toBe('PreviousShiftIncomplete');
    expect(statusBeforeShift1.activeShiftName).toBe('Shift One');

    // Scenario B: Shift 1 is currently clocked in. Shift 2 must be blocked with OtherShiftActive!
    DB.data.attendanceLogs.unshift({
      id: `log_${testUser.id}_${todayStr}_seq_shift_1`,
      userId: testUser.id,
      date: todayStr,
      shiftId: 'seq_shift_1',
      checkIn: '09:02',
      checkOut: null
    });

    const statusWhileShift1Active = getCheckInTimeStatus(testUser, 'seq_shift_2');
    expect(statusWhileShift1Active.allowed).toBe(false);
    expect(statusWhileShift1Active.type).toBe('OtherShiftActive');
    expect(statusWhileShift1Active.activeShiftName).toBe('Shift One');

    // Scenario C: Shift 1 checks out. Shift 2 must now be unlocked (not blocked by Shift 1)!
    const shift1Log = DB.getTodayLog(testUser.id, 'seq_shift_1');
    shift1Log.checkOut = '12:30';

    const statusAfterShift1Checkout = getCheckInTimeStatus(testUser, 'seq_shift_2');
    // Shift 2 is no longer blocked by Shift 1 (it may only be TooEarly if testing outside shift hours, but not blocked by other shift)
    expect(statusAfterShift1Checkout.type).not.toBe('OtherShiftActive');
    expect(statusAfterShift1Checkout.type).not.toBe('PreviousShiftIncomplete');
  });

  test('Unassigned employees must never default to schedules[0] ("new shift")', () => {
    // 1. DB.getSchedule must return null when ID is falsy or not found
    expect(DB.getSchedule(null)).toBeNull();
    expect(DB.getSchedule('')).toBeNull();
    expect(DB.getSchedule(undefined)).toBeNull();
    expect(DB.getSchedule('non_existent_id_9999')).toBeNull();

    // 2. An unassigned employee (like Hemant)
    const unassignedUser = {
      id: 'usr_unassigned_emp',
      name: 'Unassigned Staff',
      role: 'employee',
      scheduleIds: [],
      scheduleId: ''
    };
    DB.data.users.push(unassignedUser);

    const todayStr = new Date().toISOString().split('T')[0];
    const resolved = DB.resolveUserShiftForDate(unassignedUser, todayStr);
    expect(resolved.scheduleId).toBeNull();
    expect(resolved.schedule).toBeNull();

    // 3. Extract getAttendanceStatusForDate from js/app.js
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
    const match = appCode.match(/function getAttendanceStatusForDate\([\s\S]*?\n\}/);
    expect(match).not.toBeNull();
    const getAttendanceStatusForDate = new Function('DB', 'userId', 'dateStr', `${match[0]}; return getAttendanceStatusForDate(userId, dateStr);`).bind(null, DB);

    // Without logs, status must be 'No Shift' with transparent color (no red Absent dot)
    const pastDate = '2026-09-01';
    const statusResult = getAttendanceStatusForDate(unassignedUser.id, pastDate);
    expect(statusResult.status).toBe('No Shift');
    expect(statusResult.color).toBe('transparent');
    expect(statusResult.schedule).toBeNull();

    // 4. In absent modal resolution:
    const userShifts = (Array.isArray(unassignedUser.scheduleIds) && unassignedUser.scheduleIds.length > 0)
      ? unassignedUser.scheduleIds.map(id => DB.getSchedule(id)).filter(Boolean)
      : (unassignedUser.scheduleId ? [DB.getSchedule(unassignedUser.scheduleId)].filter(Boolean) : []);
    const shiftName = userShifts.length > 0 ? userShifts.map(s => s.name).join(', ') : 'Not Assigned';
    expect(shiftName).toBe('Not Assigned');
  });
});
