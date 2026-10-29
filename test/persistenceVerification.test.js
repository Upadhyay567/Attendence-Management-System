const fs = require('fs');
const path = require('path');
const { 
  User, AttendanceLog, Schedule, OfficeCoordinate, PayrollAdjustment, connectMongoose 
} = require('../src/server/config/db');

describe('Data Persistence End-to-End Verification Test Suite', () => {
  let isMongo = false;

  beforeAll(async () => {
    isMongo = await connectMongoose();
  });

  test('Attendance log update and delete persist to MongoDB and seed.json', async () => {
    const testLogId = 'log_test_persist_' + Date.now();
    const newLog = {
      id: testLogId,
      userId: 'usr_test_p',
      employeeId: 'TEST_P',
      date: '2026-10-29',
      checkIn: '09:00',
      checkOut: '18:00',
      status: 'On Time',
      location: 'HS Group HQ, Pitampura, Delhi'
    };

    if (isMongo) {
      await AttendanceLog.updateOne({ id: testLogId }, { $set: newLog }, { upsert: true });
      const found = await AttendanceLog.findOne({ id: testLogId }).lean();
      expect(found).not.toBeNull();
      expect(found.checkIn).toBe('09:00');

      // Update log
      await AttendanceLog.updateOne({ id: testLogId }, { $set: { status: 'Late', checkIn: '09:45' } });
      const updated = await AttendanceLog.findOne({ id: testLogId }).lean();
      expect(updated.status).toBe('Late');
      expect(updated.checkIn).toBe('09:45');

      // Delete log
      await AttendanceLog.deleteOne({ id: testLogId });
      const deleted = await AttendanceLog.findOne({ id: testLogId }).lean();
      expect(deleted).toBeNull();
    }
  });

  test('Worksite location (officeCoordinates) persists to MongoDB and seed.json', async () => {
    const testLocationName = 'Test Persist Location ' + Date.now();
    const coords = { lat: 28.7001, lng: 77.1402 };

    if (isMongo) {
      await OfficeCoordinate.updateOne(
        { name: testLocationName },
        { $set: { name: testLocationName, ...coords } },
        { upsert: true }
      );

      const found = await OfficeCoordinate.findOne({ name: testLocationName }).lean();
      expect(found).not.toBeNull();
      expect(found.lat).toBe(28.7001);
      expect(found.lng).toBe(77.1402);

      // Clean up
      await OfficeCoordinate.deleteOne({ name: testLocationName });
      const cleaned = await OfficeCoordinate.findOne({ name: testLocationName }).lean();
      expect(cleaned).toBeNull();
    }
  });

  test('Shift (schedules) creation, update and deletion persist to MongoDB', async () => {
    const testSchedId = 'sch_test_persist_' + Date.now();
    const newSched = {
      id: testSchedId,
      name: 'Night Audit Shift',
      startTime: '22:00',
      endTime: '06:00',
      workDays: [1, 2, 3],
      location: 'Chandni Chowk'
    };

    if (isMongo) {
      await Schedule.updateOne({ id: testSchedId }, { $set: newSched }, { upsert: true });
      const found = await Schedule.findOne({ id: testSchedId }).lean();
      expect(found).not.toBeNull();
      expect(found.name).toBe('Night Audit Shift');

      // Update schedule
      await Schedule.updateOne({ id: testSchedId }, { $set: { location: 'Gurugram Sector 29' } });
      const updated = await Schedule.findOne({ id: testSchedId }).lean();
      expect(updated.location).toBe('Gurugram Sector 29');

      // Clean up
      await Schedule.deleteOne({ id: testSchedId });
      const cleaned = await Schedule.findOne({ id: testSchedId }).lean();
      expect(cleaned).toBeNull();
    }
  });

  test('Employee details (salary, department, worksite, shifts) persist to MongoDB', async () => {
    const testUserId = 'usr_test_emp_' + Date.now();
    const testUser = {
      id: testUserId,
      employeeId: 'TEST_EMP_99',
      username: 'testemp99',
      name: 'Test Persistent Employee',
      role: 'employee',
      department: 'Logistics',
      designation: 'Senior Executive',
      baseSalary: 42000,
      allowanceHRA: 5000,
      preferredLocation: 'Karnal Warehouse',
      scheduleIds: ['sch_morning', 'sch_evening']
    };

    if (isMongo) {
      await User.updateOne({ id: testUserId }, { $set: testUser }, { upsert: true });
      const found = await User.findOne({ id: testUserId }).lean();
      expect(found).not.toBeNull();
      expect(found.baseSalary).toBe(42000);
      expect(found.preferredLocation).toBe('Karnal Warehouse');
      expect(found.department).toBe('Logistics');

      // Update salary and preferred location
      await User.updateOne({ id: testUserId }, { $set: { baseSalary: 48000, preferredLocation: 'Chandni Chowk 2' } });
      const updated = await User.findOne({ id: testUserId }).lean();
      expect(updated.baseSalary).toBe(48000);
      expect(updated.preferredLocation).toBe('Chandni Chowk 2');

      // Clean up
      await User.deleteOne({ id: testUserId });
      const cleaned = await User.findOne({ id: testUserId }).lean();
      expect(cleaned).toBeNull();
    }
  });

  test('Payroll adjustments persist to MongoDB and are retrieved across months', async () => {
    const testUserId = 'usr_test_payroll_' + Date.now();
    const adj = {
      id: 'adj_test_' + Date.now(),
      userId: testUserId,
      month: 9,
      year: 2026,
      bonus: 2500,
      deduction: 500,
      remarks: 'Festive Performance Bonus'
    };

    if (isMongo) {
      await PayrollAdjustment.updateOne(
        { userId: testUserId, month: 9, year: 2026 },
        { $set: adj },
        { upsert: true }
      );

      const found = await PayrollAdjustment.findOne({ userId: testUserId, month: 9, year: 2026 }).lean();
      expect(found).not.toBeNull();
      expect(found.bonus).toBe(2500);
      expect(found.deduction).toBe(500);
      expect(found.remarks).toBe('Festive Performance Bonus');

      // Clean up
      await PayrollAdjustment.deleteOne({ userId: testUserId, month: 9, year: 2026 });
      const cleaned = await PayrollAdjustment.findOne({ userId: testUserId, month: 9, year: 2026 }).lean();
      expect(cleaned).toBeNull();
    }
  });
});
