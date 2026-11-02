const request = require('supertest');
const app = require('../src/server/app');
const { connectMongoose, mongoose, User, AttendanceLog } = require('../src/server/config/db');

describe('Attendance State and Absence Bug Fix Test Suite', () => {
  beforeAll(async () => {
    await connectMongoose();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('GET /api/db-state returns 200 OK and valid attendance dataset (not 500)', async () => {
    const res = await request(app)
      .get('/api/db-state')
      .expect(200);

    expect(res.body).toBeDefined();
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.attendanceLogs)).toBe(true);
    expect(res.body.attendanceLogs.length).toBeGreaterThan(0);

    // Verify recent logs exist so employees are not falsely shown absent till date
    const octLogs = res.body.attendanceLogs.filter(l => l.date && l.date.startsWith('2026-10'));
    expect(octLogs.length).toBeGreaterThan(100);

    // Verify today's attendance logs (2026-10-29) exist
    const todayLogs = res.body.attendanceLogs.filter(l => l.date === '2026-10-29');
    expect(todayLogs.length).toBeGreaterThan(0);

    const firstLog = todayLogs[0];
    expect(firstLog.userId).toBeDefined();
    expect(firstLog.date).toBe('2026-10-29');
  }, 60000);

  test('handleGranularMutation persists officeCoordinates without throwing key error', async () => {
    const res = await request(app)
      .post('/api/mutate-granular')
      .send({
        type: 'set',
        key: 'officeCoordinates',
        payload: {
          'Test Works Office': { lat: 28.6139, lng: 77.2090 }
        }
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  }, 10000);

  test('handleGranularMutation persists payrollAdjustments without throwing key error', async () => {
    const res = await request(app)
      .post('/api/mutate-granular')
      .send({
        type: 'update',
        key: 'payrollAdjustments',
        payload: {
          userId: 'usr_test_adj_fixed',
          month: 9,
          year: 2026,
          bonus: 1200,
          deduction: 200,
          remarks: 'Performance incentive'
        }
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  }, 10000);
});
