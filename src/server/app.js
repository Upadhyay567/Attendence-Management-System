// src/server/app.js - Modular Express Application Architecture Engine
const express = require('express');
const path = require('path');
const fs = require('fs');

const { 
  User, AttendanceLog, LeaveRequest, ShiftSwap, Schedule, Notice, OfficeCoordinate, AuditLog,
  connectMongoose, syncLocalToMongoOnBoot, getUseLocalFileDB, LOCAL_DB_FILE, mongoose 
} = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const createReportsRouter = require('./routes/reports.routes');
const createAuditRouter = require('./routes/audit.routes');
const { eventsRouter, broadcastSSEEvent } = require('./routes/events.routes');
const biometricRoutes = require('./routes/biometric.routes');

const app = express();

// Enable CORS for mobile, LAN, and multi-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  if (req.path !== '/api/events' && !req.path.startsWith('/css/') && !req.path.startsWith('/js/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Serve Static Frontend Assets & Public directory
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ROOT_DIR = path.join(__dirname, '..', '..');

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}
app.use(express.static(ROOT_DIR));

// Mount Modular Express API Routes
app.use('/api/auth', authRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', biometricRoutes);
app.use('/api', createReportsRouter(User, AttendanceLog, getUseLocalFileDB));
app.use('/api', createAuditRouter(AuditLog, getUseLocalFileDB));
app.use('/api', eventsRouter);

// Sync whole DB endpoint
app.post('/api/mutate', async (req, res) => {
  try {
    const { action, data } = req.body || {};
    if (action === 'sync' && data) {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
      broadcastSSEEvent('db_updated', { action: 'sync', timestamp: Date.now() });
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Invalid mutation request.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Status & Sync endpoints
app.get('/api/db-status', async (req, res) => {
  try {
    const isOnline = mongoose.connection.readyState === 1;
    let uCount = 0;
    let lCount = 0;
    
    if (isOnline && !getUseLocalFileDB()) {
      uCount = await User.countDocuments().catch(() => 0);
      lCount = await AttendanceLog.countDocuments().catch(() => 0);
    } else if (fs.existsSync(LOCAL_DB_FILE)) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      uCount = (parsed.users || []).length;
      lCount = (parsed.attendanceLogs || []).length;
    }

    res.json({
      online: isOnline,
      mode: getUseLocalFileDB() ? 'Local file (seed.json)' : (isOnline ? 'MongoDB Atlas' : 'Local file fallback'),
      usersCount: uCount,
      logsCount: lCount,
      lastSynced: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA shell fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(ROOT_DIR, 'index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Payload / Request Error:', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Malformed request payload.' });
});

module.exports = app;
