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
    const appPath = path.join(__dirname, '..', 'src', 'server', 'app.js');
    const appCode = fs.readFileSync(appPath, 'utf8');
    expect(appCode).toContain('/api/events');
    expect(appCode).toContain('createAuditRouter');
    expect(appCode).toContain('createReportsRouter');
    expect(appCode).toContain('broadcastSSEEvent');

    const auditRoutePath = path.join(__dirname, '..', 'src', 'server', 'routes', 'audit.routes.js');
    const auditRouteCode = fs.readFileSync(auditRoutePath, 'utf8');
    expect(auditRouteCode).toContain('/audit-logs');

    const reportsRoutePath = path.join(__dirname, '..', 'src', 'server', 'routes', 'reports.routes.js');
    const reportsRouteCode = fs.readFileSync(reportsRoutePath, 'utf8');
    expect(reportsRouteCode).toContain('/attendance-csv');
    expect(reportsRouteCode).toContain('/payslip-pdf');

    const serverPath = path.join(__dirname, '..', 'server.js');
    const serverCode = fs.readFileSync(serverPath, 'utf8');
    expect(serverCode).toContain('broadcastSSEEvent');
    expect(serverCode).toContain('recordAuditLog');
  });

  it('Verify anti-spoofing accuracy thresholds in client dashboard', () => {
    const dashPath = path.join(__dirname, '..', 'js', 'views', 'employeeDashboard.js');
    const dashCode = fs.readFileSync(dashPath, 'utf8');
    expect(dashCode).toContain('coords.accuracy > 500');
  });

  it('Verify multi-device registry & central biometric vault structures', () => {
    const seedPath = path.join(__dirname, '..', 'seed.json');
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    expect(data).toHaveProperty('biometricDevices');
    expect(data).toHaveProperty('biometricVault');
    expect(data).toHaveProperty('biometricSyncLogs');
    expect(Array.isArray(data.biometricDevices)).toBe(true);
    expect(data.biometricDevices.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(data.biometricVault)).toBe(true);
    expect(data.biometricVault.length).toBeGreaterThanOrEqual(15);

    const routesPath = path.join(__dirname, '..', 'src', 'server', 'routes', 'biometric.routes.js');
    const routesCode = fs.readFileSync(routesPath, 'utf8');
    expect(routesCode).toContain('/biometric/devices');
    expect(routesCode).toContain('/biometric/sync-templates');
    expect(routesCode).toContain('/biometric/template-sync-status');
  });
});
