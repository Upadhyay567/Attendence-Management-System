const { findLocalEmployee, processLocalPunch } = require('../src/server/biometric/biometricSync.service');

describe('Biometric Identity Isolation & Collision Prevention', () => {
  let sampleUsers;

  beforeEach(() => {
    sampleUsers = [
      {
        id: 'usr_bio_1110',
        name: 'Rakesh',
        biometricUserId: '1110',
        employeeId: '1110',
        role: 'employee'
      },
      {
        id: 'usr_bio_5198',
        name: 'RAKESH',
        biometricUserId: '5198',
        employeeId: '5198',
        role: 'employee'
      },
      {
        id: 'usr_bio_565',
        name: 'RAKESH',
        biometricUserId: '565',
        employeeId: '565',
        role: 'employee'
      },
      {
        id: 'usr_bio_1101',
        name: 'Kajal',
        biometricUserId: '1101',
        employeeId: '1101',
        role: 'employee'
      },
      {
        id: 'usr_bio_1228',
        name: 'Kajal',
        biometricUserId: '1228',
        employeeId: '1228',
        role: 'employee'
      },
      {
        id: 'usr_manual_unassigned',
        name: 'Unique Candidate',
        biometricUserId: '',
        employeeId: 'EMP999',
        role: 'employee'
      }
    ];
  });

  test('Tier 1: Accurately identifies user 565 even if user 1110 is first in array with identical name "Rakesh"', () => {
    const matched = findLocalEmployee(sampleUsers, '565', 'RAKESH');
    expect(matched).toBeDefined();
    expect(matched.id).toBe('usr_bio_565');
    expect(matched.biometricUserId).toBe('565');
  });

  test('Tier 1: Accurately identifies user 5198 without falling back to user 1110', () => {
    const matched = findLocalEmployee(sampleUsers, '5198', 'RAKESH');
    expect(matched).toBeDefined();
    expect(matched.id).toBe('usr_bio_5198');
    expect(matched.biometricUserId).toBe('5198');
  });

  test('Tier 1: Accurately identifies user 1228 without falling back to user 1101', () => {
    const matched = findLocalEmployee(sampleUsers, '1228', 'Kajal');
    expect(matched).toBeDefined();
    expect(matched.id).toBe('usr_bio_1228');
    expect(matched.biometricUserId).toBe('1228');
  });

  test('Tier 4 Guard: New punch with unknown bioId "9999" and name "Rakesh" does NOT hijack user 1110, 5198, or 565', () => {
    const matched = findLocalEmployee(sampleUsers, '9999', 'RAKESH');
    // Because 1110, 5198, and 565 already have conflicting biometric IDs, none should be hijacked!
    // Instead, a clean new employee for 9999 should be auto-registered.
    expect(matched).toBeDefined();
    expect(matched.id).toBe('usr_bio_9999');
    expect(matched.biometricUserId).toBe('9999');
  });

  test('Tier 4 Valid Binding: Unassigned unique user binds to new biometric ID if name matches and bioId is empty', () => {
    const matched = findLocalEmployee(sampleUsers, '8888', 'Unique Candidate');
    expect(matched).toBeDefined();
    expect(matched.id).toBe('usr_manual_unassigned');
    expect(matched.biometricUserId).toBe('8888');
  });

  test('Punches from 565 and 5198 create isolated attendance logs and never cross-punch each other', () => {
    const state = {
      users: [...sampleUsers],
      attendanceLogs: [],
      processedPunchIds: [],
      schedules: [
        { id: 'sch_morning', name: 'General Shift', startTime: '09:00', endTime: '18:00' }
      ]
    };

    const punches = [
      {
        biometricUserId: '565',
        recordTime: new Date('2026-09-30T03:41:55.000Z'), // 09:11:55 IST
        deviceSerial: 'GED7242602598',
        deviceName: 'RETAIL'
      },
      {
        biometricUserId: '5198',
        recordTime: new Date('2026-09-30T03:38:22.000Z'), // 09:08:22 IST
        deviceSerial: 'GED7242602598',
        deviceName: 'RETAIL'
      },
      {
        biometricUserId: '565',
        recordTime: new Date('2026-09-30T14:55:19.000Z'), // 20:25:19 IST
        deviceSerial: 'GED7242602598',
        deviceName: 'RETAIL'
      },
      {
        biometricUserId: '5198',
        recordTime: new Date('2026-09-30T15:01:34.000Z'), // 20:31:34 IST
        deviceSerial: 'GED7242602598',
        deviceName: 'RETAIL'
      }
    ];

    const deviceUserMap = new Map();
    deviceUserMap.set('565', { userId: '565', name: 'RAKESH', role: '0' });
    deviceUserMap.set('5198', { userId: '5198', name: 'RAKESH', role: '0' });
    const result = { created: 0, updated: 0, duplicates: 0, unmatched: 0, unmatchedUsers: [] };

    punches.forEach(p => {
      processLocalPunch(state, p, deviceUserMap, result);
    });

    // User 1110 should have NO logs!
    const log1110 = state.attendanceLogs.find(l => l.userId === 'usr_bio_1110');
    expect(log1110).toBeUndefined();

    // User 565 should have check-in at 09:11:55 and check-out at 20:25:19
    const log565 = state.attendanceLogs.find(l => l.userId === 'usr_bio_565');
    expect(log565).toBeDefined();
    expect(log565.checkIn).toBe('09:11:55');
    expect(log565.checkOut).toBe('20:25:19');

    // User 5198 should have check-in at 09:08:22 and check-out at 20:31:34
    const log5198 = state.attendanceLogs.find(l => l.userId === 'usr_bio_5198');
    expect(log5198).toBeDefined();
    expect(log5198.checkIn).toBe('09:08:22');
    expect(log5198.checkOut).toBe('20:31:34');
  });
});
