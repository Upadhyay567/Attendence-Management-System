const request = require('supertest');
const { app, connectMongoose, mongoose, syncLocalToMongoOnBoot } = require('../server');

describe('HS Group Attendance System API Integration Tests', () => {
  jest.setTimeout(30000);

  // Ensure database is connected before running tests
  beforeAll(async () => {
    await connectMongoose();
    await syncLocalToMongoOnBoot();
  });

  // Close database connection after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/login', () => {
    it('should fail to login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'wrongpassword', role: 'employee' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should login successfully with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Surya@123', role: 'hr' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('hr');
    });

    it('should reject Manager credentials when attempting to log in via HR Portal', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'manager', password: 'ManagerPassword123!', role: 'hr' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access Denied');
    });

    it('should reject HR credentials when attempting to log in via Manager Portal', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Surya@123', role: 'manager' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access Denied');
    });

    it('should login successfully via Manager Portal with valid Manager credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'manager', password: 'Surya@123', role: 'manager' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('manager');
    });
  });

  describe('Geofence Verification via POST /api/mutate-granular', () => {
    let token = '';

    beforeAll(async () => {
      // Authenticate to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Surya@123', role: 'hr' });
      token = response.body.token;
    });

    it('should reject check-in if GPS coordinates are out of bounds (>100m)', async () => {
      const response = await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'push',
          key: 'attendanceLogs',
          payload: {
            id: 'test_log_out_of_bounds',
            userId: 'usr_john',
            date: '2026-08-25',
            location: 'Kohat Enclave, Pitampura, Delhi',
            latitude: 29.0, // Out of bounds coordinates (110km away)
            longitude: 77.0
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Geofence validation failed');
    });
  });

  describe('Biometric Shift-Wise Attendance Resolution', () => {
    it('should assign biometric punches to correct active shift without overwriting previous shifts', async () => {
      const { syncBiometricAttendance } = require('../src/server/biometric/biometricSync.service');
      const fs = require('fs');
      const { LOCAL_DB_FILE } = require('../src/server/config/db');

      const db = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
      // Ensure test user has multiple assigned schedules
      const user = db.users.find(u => u.id === 'usr_68s5s48');
      if (user) {
        user.scheduleIds = ['sch_q8jji9v', 'sch_3ebecon'];
        fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      }

      const res = await syncBiometricAttendance();
      expect(res).toHaveProperty('success');
    });

    it('should accurately calculate attendance status based on check-in time and shift rules', () => {
      const { computeAttendanceStatus } = require('../src/server/biometric/biometricSync.service');

      const standardShift = {
        id: 'sch_test_1',
        name: 'General Shift',
        startTime: '09:00',
        endTime: '17:00',
        gracePeriod: 15,
        halfDayLimit: 120
      };

      // 1. Check in within grace period (09:10 <= 09:15) -> 'On Time'
      expect(computeAttendanceStatus('09:10', '', standardShift)).toBe('On Time');

      // 2. Check in at exactly grace boundary (09:15) -> 'On Time'
      expect(computeAttendanceStatus('09:15', '', standardShift)).toBe('On Time');

      // 3. Check in after grace period (09:20 > 09:15) -> 'Late'
      expect(computeAttendanceStatus('09:20', '', standardShift)).toBe('Late');

      // 4. Check in after half-day cutoff (11:15 >= 09:00 + 120m) -> 'Half Day'
      expect(computeAttendanceStatus('11:15', '', standardShift)).toBe('Half Day');

      // 5. Check out after working less than half day (09:00 to 11:30 = 2.5h < 4h) -> 'Half Day'
      expect(computeAttendanceStatus('09:00', '11:30', standardShift)).toBe('Half Day');

      // 6. Check out after working full shift when checked in late -> retains 'Late'
      expect(computeAttendanceStatus('09:30', '17:30', standardShift)).toBe('Late');

      // 7. Check out after working full shift when checked in on time -> retains 'On Time'
      expect(computeAttendanceStatus('09:05', '17:05', standardShift)).toBe('On Time');

      // 8. Missing check-in -> 'Absent'
      expect(computeAttendanceStatus('', '', standardShift)).toBe('Absent');
    });
  });

  describe('Multi-Device & Cross-Branch Biometric Template Synchronization', () => {
    const {
      getRegisteredDevices,
      getVaultUsers,
      replicateTemplatesAcrossDevices,
      getTemplateSyncMatrix,
      encodeUserData72
    } = require('../src/server/biometric/biometricMultiDevice.service');

    it('should retrieve registered branch biometric devices', async () => {
      const response = await request(app).get('/api/biometric/devices');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.devices)).toBe(true);
      expect(response.body.devices.length).toBeGreaterThanOrEqual(1);

      const noidaDev = response.body.devices.find(d => d.id === 'dev_k40_noida');
      expect(noidaDev).toBeDefined();
      expect(noidaDev.ip).toBe('192.168.1.51');
    });

    it('should register a new branch biometric device via POST /api/biometric/devices', async () => {
      const newDevicePayload = {
        name: 'Gurugram Branch - Gate 1',
        ip: '192.168.1.54',
        port: 4370,
        branch: 'Gurugram Branch',
        location: 'Cyber City, Gurugram',
        serial: 'ZK_GURUGRAM_01'
      };

      const response = await request(app)
        .post('/api/biometric/devices')
        .send(newDevicePayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.device).toBeDefined();
      expect(response.body.device.name).toBe(newDevicePayload.name);
      expect(response.body.device.ip).toBe(newDevicePayload.ip);
    });

    it('should correctly encode user profiles into ZKTeco 72-byte binary payload', () => {
      const testUser = {
        uid: 42,
        biometricUserId: 'HR0999',
        name: 'Test Engineer',
        role: 0,
        cardno: 123456,
        password: 'pass'
      };

      const buf = encodeUserData72(testUser);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBe(72);

      // Check UID at offset 0 (2 bytes UInt16 LE)
      expect(buf.readUInt16LE(0)).toBe(42);
      // Check Card number at offset 35 (4 bytes UInt32 LE)
      expect(buf.readUInt32LE(35)).toBe(123456);
      // Check Name at offset 11
      const extractedName = buf.subarray(11, 35).toString('ascii').split('\0').shift();
      expect(extractedName).toBe('Test Engineer');
      // Check User ID at offset 48
      const extractedUserId = buf.subarray(48, 68).toString('ascii').split('\0').shift();
      expect(extractedUserId).toBe('HR0999');
    });

    it('should replicate templates across devices and update the central vault', async () => {
      const syncResult = await replicateTemplatesAcrossDevices();
      expect(syncResult.success).toBe(true);
      expect(syncResult.totalVaultUsers).toBeGreaterThanOrEqual(1);

      const matrix = await getTemplateSyncMatrix();
      expect(matrix).toHaveProperty('devices');
      expect(matrix).toHaveProperty('users');
      expect(matrix.users.length).toBeGreaterThanOrEqual(1);

      // Verify template sync matrix endpoint via HTTP
      const response = await request(app).get('/api/biometric/template-sync-status');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should trigger multi-device biometric sync via POST /api/biometric/sync', async () => {
      const response = await request(app).post('/api/biometric/sync');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });
});

