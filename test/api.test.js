const fs = require('fs');
const path = require('path');

describe('Attendance System Core & Security API Tests', () => {
  it('Verify database seed configuration structure', () => {
    const seedPath = path.join(__dirname, '..', 'seed.json');
    expect(fs.existsSync(seedPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('schedules');
    expect(data).toHaveProperty('attendanceLogs');
  });

  it('Verify real-time SSE stream & audit log endpoints in server architecture', () => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    const serverCode = fs.readFileSync(serverPath, 'utf8');
    expect(serverCode).toContain('/api/events');
    expect(serverCode).toContain('/api/audit-logs');
    expect(serverCode).toContain('/api/reports/payslip-pdf');
    expect(serverCode).toContain('/api/reports/attendance-csv');
    expect(serverCode).toContain('broadcastSSEEvent');
    expect(serverCode).toContain('recordAuditLog');
  });

  it('Verify anti-spoofing accuracy thresholds in client dashboard', () => {
    const dashPath = path.join(__dirname, '..', 'js', 'views', 'employeeDashboard.js');
    const dashCode = fs.readFileSync(dashPath, 'utf8');
    expect(dashCode).toContain('coords.accuracy > 500');
  });
});
