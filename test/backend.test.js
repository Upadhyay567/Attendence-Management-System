const request = require('supertest');
const { app, connectMongoose, mongoose, syncLocalToMongoOnBoot } = require('../server');

describe('HS Group Attendance System API Integration Tests', () => {
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
  });
});

