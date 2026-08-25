const request = require('supertest');
const { app, connectMongoose, mongoose } = require('../server');

describe('HS Group Attendance System API Integration Tests', () => {
  // Ensure database is connected before running tests
  beforeAll(async () => {
    await connectMongoose();
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
});
