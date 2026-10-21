// scripts/verifyPunchEnhancements.js
const { computeAttendanceStatus } = require('../src/server/biometric/biometricSync.service');
const assert = require('assert');

console.log('Testing computeAttendanceStatus enhancements...');

const standardShift = { startTime: '09:00', endTime: '17:00', gracePeriod: 15, halfDayLimit: 120 };

// 1. Both punches present on time
assert.strictEqual(computeAttendanceStatus('09:10', '17:05', standardShift, '2026-10-20'), 'On Time');

// 2. Both punches present, late arrival
assert.strictEqual(computeAttendanceStatus('09:30', '17:30', standardShift, '2026-10-20'), 'Late');

// 3. Both punches present, short work duration (< 4 hrs)
assert.strictEqual(computeAttendanceStatus('09:00', '12:00', standardShift, '2026-10-20'), 'Half Day');

// 4. Missing Check-Out on TODAY (currently on duty)
const todayStr = new Date().toISOString().split('T')[0];
assert.strictEqual(computeAttendanceStatus('09:10', '', standardShift, todayStr), 'On Time');
assert.strictEqual(computeAttendanceStatus('09:20', '', standardShift, todayStr), 'Late');

// 5. Missing Check-Out on PAST completed workday
assert.strictEqual(computeAttendanceStatus('09:10', '', standardShift, '2026-10-19'), 'Half Day');

// 6. Missing Check-In (only departure punch exists)
assert.strictEqual(computeAttendanceStatus('', '21:03:22', standardShift, '2026-10-20'), 'Half Day');
assert.strictEqual(computeAttendanceStatus('', '18:00:00', standardShift, todayStr), 'Half Day');

// 7. Neither punch exists
assert.strictEqual(computeAttendanceStatus('', '', standardShift, '2026-10-20'), 'Absent');

// 8. Backward compatibility when dateStr is omitted
assert.strictEqual(computeAttendanceStatus('09:10', '', standardShift), 'On Time');
assert.strictEqual(computeAttendanceStatus('09:20', '', standardShift), 'Late');
assert.strictEqual(computeAttendanceStatus('11:15', '', standardShift), 'Half Day');

console.log('✅ ALL computeAttendanceStatus assertions PASSED successfully!');
