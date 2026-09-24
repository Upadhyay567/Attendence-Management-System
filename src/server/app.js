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
const { invalidateLocalDbCache } = require('./controllers/attendance.controller');
const { authenticateToken } = require('./middleware/auth.middleware');
const multer = require('multer');


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

// Security Hardening: Block direct access to sensitive data files, scripts, and server internals
const SENSITIVE_FILE_PATTERNS = [
  /^\/seed\.json$/i,
  /^\/package(?:-lock)?\.json$/i,
  /^\/server\.js$/i,
  /^\/server-config\.json$/i,
  /^\/\.env/i,
  /^\/\.git/i,
  /\.(?:bat|vbs|cmd|ps1|sh|bak|tmp|log|md|ejs)$/i,
  /^\/(?:src|test|node_modules|scratch|brain|\.system_generated)\//i
];

app.use((req, res, next) => {
  const reqPath = decodeURI(req.path || '').toLowerCase();
  for (const pattern of SENSITIVE_FILE_PATTERNS) {
    if (pattern.test(reqPath)) {
      return res.status(403).json({ error: 'Access denied: sensitive resource.' });
    }
  }
  next();
});

// Serve Static Frontend Assets & Public directory
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ROOT_DIR = path.join(__dirname, '..', '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// Serve explicit client directories
app.use('/css', express.static(path.join(ROOT_DIR, 'css')));
app.use('/js', express.static(path.join(ROOT_DIR, 'js')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve root public assets (index.html, logos, favicons) safely
app.use(express.static(ROOT_DIR, {
  dotfiles: 'ignore',
  index: ['index.html'],
  setHeaders: (res, filePath) => {
    const filename = path.basename(filePath).toLowerCase();
    if (
      filename === 'seed.json' ||
      filename === 'package.json' ||
      filename === 'package-lock.json' ||
      filename === 'server.js' ||
      filename === 'server-config.json' ||
      filename.endsWith('.bat') ||
      filename.endsWith('.vbs') ||
      filename.endsWith('.md')
    ) {
      res.status(403);
      throw new Error('Access denied');
    }
  }
}));

// Helper to validate file signatures (magic bytes) against declared file extension
function validateFileSignature(buffer, fileExt) {
  if (!buffer || buffer.length < 4) return false;
  const ext = fileExt.toLowerCase();
  if (ext === '.pdf') {
    // %PDF header
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  if (ext === '.png') {
    // \x89 P N G header
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    // JPEG SOI marker (\xFF\xD8\xFF)
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  return false;
}

const uploadMultipart = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

const uploadMiddleware = uploadMultipart.single('file');

function handleSecureUpload(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please log in to upload files.' });
    }

    let fileBuffer = null;
    let originalName = '';

    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname || 'document.pdf';
    } else if (req.body && req.body.fileData) {
      originalName = req.body.filename || 'document.pdf';
      const fileData = req.body.fileData;
      if (typeof fileData !== 'string') {
        return res.status(400).json({ error: 'Invalid file data format.' });
      }
      if (fileData.startsWith('data:')) {
        const commaIdx = fileData.indexOf(',');
        fileBuffer = Buffer.from(fileData.substring(commaIdx + 1), 'base64');
      } else {
        fileBuffer = Buffer.from(fileData, 'base64');
      }
    } else {
      return res.status(400).json({ error: 'No file data received.' });
    }

    const rawExt = path.extname(originalName).toLowerCase();
    const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
      return res.status(400).json({ 
        error: `Invalid file type '${rawExt || 'unknown'}'. Allowed file types are: .pdf, .png, .jpg, .jpeg` 
      });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty.' });
    }
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds maximum permitted limit of 5 MB.` 
      });
    }

    if (!validateFileSignature(fileBuffer, rawExt)) {
      return res.status(400).json({ 
        error: `File content does not match the declared extension '${rawExt}'. Corrupted or invalid file header.` 
      });
    }

    const cleanBase = path.basename(originalName, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const safeFilename = `${Date.now()}_${cleanBase}${rawExt}`;
    const targetPath = path.resolve(UPLOADS_DIR, safeFilename);

    if (!targetPath.startsWith(path.resolve(UPLOADS_DIR))) {
      return res.status(400).json({ error: 'Invalid file destination path.' });
    }

    fs.writeFileSync(targetPath, fileBuffer);
    return res.json({ 
      success: true, 
      url: `/uploads/${safeFilename}`, 
      filename: safeFilename,
      size: fileBuffer.length
    });
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ error: 'Failed to process file upload: ' + err.message });
  }
}

// Secure upload endpoints (supporting both multipart FormData and base64 JSON)
const processUploadRequest = (req, res) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds maximum permitted limit of 5 MB.' });
      }
      return res.status(400).json({ error: err.message || 'File upload parsing error.' });
    }
    handleSecureUpload(req, res);
  });
};

app.post('/api/upload', authenticateToken, processUploadRequest);
app.post('/api/upload-leave-doc', authenticateToken, processUploadRequest);

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
        invalidateLocalDbCache();
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

// API 404 handler - ensure all unhandled /api/* calls return JSON
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl || req.path} not found.` });
});

// SPA shell fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    const ext = path.extname(req.path).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map', '.txt', '.xml'].includes(ext)) {
      return res.status(404).end();
    }
    return res.sendFile(path.join(ROOT_DIR, 'index.html'), (err) => {
      if (err && !res.headersSent) {
        if (err.code === 'ECONNABORTED' || err.code === 'ECANCELED' || err.statusCode === 404) {
          return res.status(err.statusCode || 404).end();
        }
        next(err);
      }
    });
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error('Express Payload / Request Error:', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Malformed request payload.' });
});

module.exports = app;
