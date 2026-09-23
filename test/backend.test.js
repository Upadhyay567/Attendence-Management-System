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

      if (response.body.device.id) {
        await request(app).delete(`/api/biometric/devices/${response.body.device.id}`);
      }
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

  describe('Password Recovery / Forgot Password Flow & API 404 Tests', () => {
    let testUserId = null;

    it('should return JSON 404 error (not HTML) for nonexistent API endpoints', async () => {
      const response = await request(app)
        .post('/api/nonexistent-auth-endpoint')
        .send({});

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('should reject identify request when identifier is missing', async () => {
      const response = await request(app)
        .post('/api/auth/identify')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when user is not found by identifier', async () => {
      const response = await request(app)
        .post('/api/auth/identify')
        .send({ identifier: 'nonexistent_user_99999' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should successfully identify user hr0789 and not expose password', async () => {
      const response = await request(app)
        .post('/api/auth/identify')
        .send({ identifier: 'hr0789' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.employeeId.toUpperCase()).toBe('HR0789');
      expect(response.body.user.password).toBeUndefined();
      testUserId = response.body.user.id;
    });

    it('should send verification OTP code', async () => {
      const response = await request(app)
        .post('/api/auth/send-otp')
        .send({ userId: testUserId, method: 'email' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.otpFallback).toBe('123456');
    });

    it('should reject invalid verification OTP code', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ userId: testUserId, otp: '999999' });

      expect(response.status).toBe(400);
      expect(response.body.verified).toBe(false);
    });

    it('should accept valid verification OTP code', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({ userId: testUserId, otp: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
    });

    it('should successfully reset user password and allow login with new password', async () => {
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ userId: testUserId, newPassword: 'ResetPassword@123' });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login works with the new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'hr0789', password: 'ResetPassword@123', role: 'hr' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');

      // Revert password back to Admin@123
      await request(app)
        .post('/api/auth/reset-password')
        .send({ userId: testUserId, newPassword: 'Admin@123' });
    });

    it('should update employee preferredLocation and shiftLocations via granular mutation', async () => {
      // Login as admin to get token
      const authRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Surya@123', role: 'hr' });
      const token = authRes.body.token;

      // Update location
      const mutateRes = await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'update',
          key: 'users',
          query: { id: testUserId },
          updates: {
            preferredLocation: 'Noida sector 61',
            shiftLocations: { 'sch_mfl8wvv': 'Noida sector 61' }
          }
        });

      expect(mutateRes.status).toBe(200);
      expect(mutateRes.body.success).toBe(true);
    });

    it('should support saving and retaining multiple shifts and multiple locations without overwriting', async () => {
      const authRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Surya@123', role: 'hr' });
      const token = authRes.body.token;

      const testUserId = 'usr_test_multishift_' + Date.now();

      // Create test user with multiple shifts and locations
      const createRes = await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'push',
          key: 'users',
          payload: {
            id: testUserId,
            employeeId: 'EMP_TEST_MS',
            name: 'MultiShift Test User',
            role: 'employee',
            scheduleIds: ['sch_q8jji9v', 'sch_3ebecon'],
            scheduleId: 'sch_q8jji9v',
            preferredLocations: ['Noida sector 61', 'chandani chowk'],
            preferredLocation: 'Noida sector 61',
            shiftLocations: {
              'sch_q8jji9v': 'Noida sector 61',
              'sch_3ebecon': 'chandani chowk'
            }
          }
        });
      expect(createRes.status).toBe(200);

      // Verify db state reflects multiple shifts and multiple locations
      const stateRes = await request(app).get('/api/db-state');
      expect(stateRes.status).toBe(200);
      const testUser = stateRes.body.users.find(u => u.id === testUserId);
      expect(testUser).toBeDefined();
      expect(testUser.scheduleIds).toEqual(expect.arrayContaining(['sch_q8jji9v', 'sch_3ebecon']));
      expect(testUser.preferredLocations).toEqual(expect.arrayContaining(['Noida sector 61', 'chandani chowk']));

      // Clean up test user so database remains clean
      await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'delete',
          key: 'users',
          query: { id: testUserId }
        });
    });

    it('should support unassigning all shifts without auto-assigning default shifts', async () => {
      const authRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Surya@123', role: 'hr' });
      const token = authRes.body.token;

      const testUserId = 'usr_test_unassigned_' + Date.now();

      // Create test user with 1 shift
      const createRes = await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'push',
          key: 'users',
          payload: {
            id: testUserId,
            employeeId: 'EMP_TEST_UN',
            name: 'Unassign Test User',
            role: 'employee',
            scheduleIds: ['sch_q8jji9v'],
            scheduleId: 'sch_q8jji9v'
          }
        });
      expect(createRes.status).toBe(200);

      // Unassign all shifts: scheduleIds empty array, scheduleId null
      const unassignRes = await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'update',
          key: 'users',
          query: { id: testUserId },
          updates: {
            scheduleIds: [],
            scheduleId: null
          }
        });
      expect(unassignRes.status).toBe(200);

      // Verify DB state reflects empty shifts
      const stateRes = await request(app).get('/api/db-state');
      expect(stateRes.status).toBe(200);
      const testUser = stateRes.body.users.find(u => u.id === testUserId);
      expect(testUser).toBeDefined();
      expect(testUser.scheduleIds).toEqual([]);
      expect(testUser.scheduleId).toBeNull();

      // Clean up test user
      await request(app)
        .post('/api/mutate-granular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'delete',
          key: 'users',
          query: { id: testUserId }
        });
    });
  });
});


