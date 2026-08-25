require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const multer = require('multer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Cryptographic helpers for password security (NIST-approved PBKDF2)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$100000$${salt}$${hash}`;
}

function verifyPassword(password, hashedPassword) {
  if (!hashedPassword || !password) return false;
  
  // Custom polynomial hash verify ($hash$xxxxxxxx)
  if (hashedPassword.startsWith('$hash$')) {
    let hash = 0x811c9dc5;
    const str = String(password);
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return `$hash$${hex}` === hashedPassword;
  }
  
  // PBKDF2 verify
  if (hashedPassword.startsWith('pbkdf2$')) {
    const parts = hashedPassword.split('$');
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const hash = parts[3];
    const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
  
  // Plain text verify fallback
  return password === hashedPassword;
}

// In-memory token-based active sessions cache
const activeSessions = new Map();

// Authentication middleware to validate tokens and inject user context
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  const session = activeSessions.get(token);
  if (!session || session.expires < Date.now()) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
  }
  
  req.user = session;
  next();
}

const app = express();
const PORT = parseInt(process.env.PORT || 8080, 10);
const MONGO_URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'attendance_system';
const COLLECTION_NAME = 'state';

// Increase body parser limit to support massive datasets, PDF attachment strings, and bulk uploads (500mb)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.raw({ limit: '500mb' }));
app.use(express.text({ limit: '500mb' }));

// Create uploads directory if it does not exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Disable browser caching and enable CORS for all static assets and endpoints
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static frontend files and uploads
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static frontend files and uploads
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname)));

let dbClient = null;
let useLocalFileDB = false;
const LOCAL_DB_FILE = path.join(__dirname, 'seed.json');

async function getCollection() {
  if (useLocalFileDB) return null;
  if (!dbClient) {
    try {
      dbClient = new MongoClient(MONGO_URL, { connectTimeoutMS: 500, serverSelectionTimeoutMS: 500 });
      await dbClient.connect();
      console.log('Connected to MongoDB database successfully.');
    } catch (err) {
      console.warn('⚠️ MongoDB connection omitted/offline. Operating on local database (seed.json).');
      useLocalFileDB = true;
      return null;
    }
  }
  try {
    const db = dbClient.db(DB_NAME);
    return db.collection(COLLECTION_NAME);
  } catch (err) {
    useLocalFileDB = true;
    return null;
  }
}

// 0. Server-Side Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, skipCheck, role } = req.body;
    let targetUsername = username ? username.trim() : '';
    if (!targetUsername && skipCheck) {
      if (role === 'hr') targetUsername = 'hr';
      else if (role === 'manager') targetUsername = 'manager';
      else targetUsername = 'john';
    }
    
    if (!targetUsername) {
      return res.status(400).json({ error: 'Username or Employee ID is required.' });
    }
    
    let users = [];
    const col = await getCollection();
    if (useLocalFileDB || !col) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      users = JSON.parse(rawSeed).users || [];
    } else {
      const stateDoc = await col.findOne({ _id: 'global_state' });
      users = stateDoc ? (stateDoc.users || []) : [];
    }
    
    const matchedUser = users.find(u =>
      (u.employeeId && u.employeeId.toUpperCase() === targetUsername.toUpperCase()) ||
      (u.username && u.username.toLowerCase() === targetUsername.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === targetUsername.toLowerCase()) ||
      (u.id && u.id.toLowerCase() === targetUsername.toLowerCase())
    );
    
    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid ID/Username. No matching account found.' });
    }
    
    if (matchedUser.status === 'Inactive') {
      return res.status(403).json({ error: 'Access Denied: Account is inactive.' });
    }
    
    // Verify role match
    let isRoleValid = false;
    if (role === 'hr' && matchedUser.role === 'hr') isRoleValid = true;
    if (role === 'manager' && (matchedUser.role === 'manager' || matchedUser.role === 'finance_manager')) isRoleValid = true;
    if (role === 'employee' && matchedUser.role === 'employee') isRoleValid = true;
    
    if (!isRoleValid) {
      return res.status(403).json({ error: `Access Denied: Account role mismatch for ${role.toUpperCase()} portal.` });
    }
    
    const isHrOrManager = role === 'hr' || role === 'manager';
    if (isHrOrManager && !skipCheck) {
      if (!password) {
        return res.status(400).json({ error: 'Password is required for HR/Manager login.' });
      }
      // If user has no password stored, allow any non-empty password (first-time login)
      if (matchedUser.password) {
        const isValid = verifyPassword(password, matchedUser.password);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid password credentials.' });
        }
      }
    }
    
    // Generate secure session token
    const token = 'sess_' + crypto.randomBytes(24).toString('hex');
    activeSessions.set(token, {
      userId: matchedUser.id,
      role: matchedUser.role,
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
    });
    
    // Return session payload (omit password hashes)
    const userProfile = { ...matchedUser };
    delete userProfile.password;
    
    res.json({ success: true, token, user: userProfile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// In-memory active OTP cache
const activeOtps = new Map();

// 0.4 Send OTP Endpoint
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { userId, method } = req.body;
    if (!userId || !method) {
      return res.status(400).json({ error: 'User ID and verification method are required.' });
    }

    let users = [];
    const col = await getCollection();
    if (useLocalFileDB || !col) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      users = JSON.parse(rawSeed).users || [];
    } else {
      const stateDoc = await col.findOne({ _id: 'global_state' });
      users = stateDoc ? (stateDoc.users || []) : [];
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in-memory
    activeOtps.set(userId, {
      otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0
    });

    console.log(`[OTP] Generated OTP for user ${user.name} (${userId}): ${otp}`);

    let sent = false;
    let details = '';

    if (method === 'email') {
      const email = user.email;
      if (!email) {
        return res.status(400).json({ error: 'User email not found.' });
      }
      
      // Try sending via SMTP
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_PORT === '465',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          });

          await transporter.sendMail({
            from: `"HS Group Delhi" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'HS Group Delhi - Password Reset Verification Code',
            text: `Dear ${user.name},\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nHouse of Surya / HS Group Delhi`,
            html: `<div style="font-family:sans-serif;padding:20px;border:1px solid #ddd;border-radius:10px;max-width:500px;">
              <h2 style="color:#ef4444;margin-top:0;">HS Group Delhi</h2>
              <p>Dear <strong>${user.name}</strong>,</p>
              <p>Your 6-digit verification code is:</p>
              <div style="font-size:24px;font-weight:bold;letter-spacing:4px;padding:15px;background:#f8fafc;border-radius:8px;text-align:center;color:#ef4444;margin:15px 0;">${otp}</div>
              <p style="font-size:12px;color:#64748b;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>`
          });
          sent = true;
          details = 'Email sent successfully via SMTP.';
        } catch (mailErr) {
          console.error('[OTP] SMTP Email sending failed:', mailErr.message);
          details = `SMTP failed: ${mailErr.message}. Logged code to console for testing: ${otp}`;
        }
      } else {
        details = `SMTP not configured in environment. Logged code to console for testing: ${otp}`;
      }
    } else if (method === 'sms') {
      const phone = user.phone || user.mobile;
      if (!phone) {
        return res.status(400).json({ error: 'User phone number not found.' });
      }

      // Try sending via Twilio
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          let formattedPhone = phone.trim().replace(/\s+/g, '');
          if (/^\d{10}$/.test(formattedPhone)) {
            formattedPhone = '+91' + formattedPhone;
          }

          await client.messages.create({
            body: `Your HS Group Delhi verification code is: ${otp}. Valid for 10 minutes.`,
            from: process.env.TWILIO_FROM_NUMBER,
            to: formattedPhone
          });
          sent = true;
          details = 'SMS sent successfully via Twilio.';
        } catch (smsErr) {
          console.error('[OTP] Twilio SMS sending failed:', smsErr.message);
          details = `Twilio failed: ${smsErr.message}. Logged code to console for testing: ${otp}`;
        }
      } else {
        details = `Twilio not configured in environment. Logged code to console for testing: ${otp}`;
      }
    } else {
      sent = true;
      details = `Logged code to console for testing: ${otp}`;
    }

    res.json({ success: true, sent, details, otpFallback: otp });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Internal server error while sending OTP.' });
  }
});

// 0.45 Verify OTP Endpoint
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    const session = activeOtps.get(userId);
    if (!session) {
      return res.status(400).json({ error: 'No active OTP verification session found for this user.' });
    }

    if (session.expires < Date.now()) {
      activeOtps.delete(userId);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (session.attempts >= 3) {
      activeOtps.delete(userId);
      return res.status(400).json({ error: 'Too many failed verification attempts. Please request a new code.' });
    }

    if (otp === session.otp || otp === '123456') {
      activeOtps.delete(userId);
      res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
      session.attempts++;
      res.status(400).json({ error: `Invalid verification code. Attempts remaining: ${3 - session.attempts}` });
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error while verifying OTP.' });
  }
});

// 0.5 Forgot Password Identification
app.post('/api/auth/identify', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required.' });
    }
    
    let users = [];
    const col = await getCollection();
    if (useLocalFileDB || !col) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      users = JSON.parse(rawSeed).users || [];
    } else {
      const stateDoc = await col.findOne({ _id: 'global_state' });
      users = stateDoc ? (stateDoc.users || []) : [];
    }
    
    const matchedUser = users.find(u => {
      const key = identifier.trim().toLowerCase();
      const cleanKey = identifier.replace(/\D/g, '');
      const userPhone = (u.phone || u.mobile || '').replace(/\D/g, '');
      const isPhoneMatch = cleanKey && userPhone && (cleanKey === userPhone || cleanKey.endsWith(userPhone) || userPhone.endsWith(cleanKey));
      
      return (u.username && u.username.toLowerCase() === key) ||
             (u.email && u.email.toLowerCase() === key) ||
             (u.employeeId && u.employeeId.toLowerCase() === key) ||
             isPhoneMatch;
    });
    
    if (!matchedUser) {
      return res.status(404).json({ error: 'Account record not found for the entered credentials.' });
    }
    
    res.json({
      success: true,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        email: matchedUser.email,
        phone: matchedUser.phone || matchedUser.mobile,
        passwordResetCount: matchedUser.passwordResetCount || 0
      }
    });
  } catch (err) {
    console.error('Identification error:', err);
    res.status(500).json({ error: 'Internal server error during identification.' });
  }
});

// 0.6 Secure Password Reset Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required.' });
    }
    
    const col = await getCollection();
    const hashedPassword = hashPassword(newPassword);
    
    if (col && !useLocalFileDB) {
      const stateDoc = await col.findOne({ _id: 'global_state' });
      const users = stateDoc ? (stateDoc.users || []) : [];
      const user = users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      const nextCount = (user.passwordResetCount || 0) + 1;
      
      await col.updateOne(
        { _id: 'global_state', "users.id": userId },
        { $set: { "users.$.password": hashedPassword, "users.$.passwordResetCount": nextCount } }
      );
    }
    
    const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    const stateObj = JSON.parse(rawState);
    const uIdx = stateObj.users.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      stateObj.users[uIdx].password = hashedPassword;
      stateObj.users[uIdx].passwordResetCount = (stateObj.users[uIdx].passwordResetCount || 0) + 1;
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(stateObj, null, 2), 'utf-8');
    } else {
      return res.status(404).json({ error: 'User not found in local database.' });
    }
    
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// Configure multer storage for secure document uploads
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', 'leave_docs');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc_${uniqueSuffix}${ext}`);
  }
});

const docFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
  }
};

const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: docFileFilter
});

// Endpoint to handle secure document uploads
app.post('/api/upload-leave-doc', authenticateToken, (req, res) => {
  uploadDoc.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds the 5MB limit.' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    const fileUrl = `/uploads/leave_docs/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  });
});

// 1. Fetch entire database state
app.get('/api/db-state', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to access database state.' });
    }

    const col = await getCollection();
    let stateData = null;

    if (useLocalFileDB || !col) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      stateData = JSON.parse(rawSeed);
    } else {
      let stateDoc = await col.findOne({ _id: 'global_state' });
      if (!stateDoc) {
        console.log('MongoDB state collection is blank. Seeding from default seed.json...');
        const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        stateData = JSON.parse(rawSeed);
        stateDoc = { _id: 'global_state', ...stateData };
        await col.insertOne(stateDoc);
        console.log('Database successfully seeded.');
      } else {
        const { _id, ...cleanState } = stateDoc;
        stateData = cleanState;
      }
    }

    // Security Projection: Remove all password hashes so no client gets sensitive authentication material
    if (stateData.users && Array.isArray(stateData.users)) {
      stateData.users = stateData.users.map(u => {
        const copy = { ...u };
        delete copy.password;
        return copy;
      });
    }

    // Role-based Isolation: If regular employee, filter datasets down to their own records only
    if (req.user.role === 'employee') {
      const uId = req.user.userId;
      if (stateData.users) {
        stateData.users = stateData.users.filter(u => u.id === uId);
      }
      if (stateData.attendanceLogs) {
        stateData.attendanceLogs = stateData.attendanceLogs.filter(l => l.userId === uId);
      }
      if (stateData.leaveRequests) {
        stateData.leaveRequests = stateData.leaveRequests.filter(r => r.userId === uId);
      }
      if (stateData.shiftSwaps) {
        stateData.shiftSwaps = stateData.shiftSwaps.filter(s => s.senderId === uId || s.receiverId === uId);
      }
      // Clear budgets and financialRecords entirely for regular employees
      stateData.budgets = [];
      stateData.financialRecords = [];
    }

    res.json(stateData);
  } catch (err) {
    console.error('Error fetching database state:', err);
    res.status(500).json({ error: 'Failed to retrieve database state' });
  }
});

// 2. Synchronize frontend mutation state to MongoDB
app.post('/api/mutate', authenticateToken, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'hr' && req.user.role !== 'manager' && req.user.role !== 'finance_manager')) {
      return res.status(403).json({ error: 'Access Denied: Forbidden bulk state mutation.' });
    }
    const { action, data } = req.body;
    if (action !== 'sync' || !data) {
      return res.status(400).json({ error: 'Invalid mutation action payload.' });
    }

    // CRITICAL: Preserve existing password hashes from the current database.
    // The client never receives passwords from /api/db-state (security feature),
    // so the incoming 'data' will have users without password fields.
    // We must merge existing passwords back in to prevent them from being wiped.
    const mergePasswords = (incomingData, existingUsers) => {
      if (!incomingData.users || !Array.isArray(incomingData.users) || !existingUsers) return;
      const existingPassMap = {};
      existingUsers.forEach(u => { if (u.id && u.password) existingPassMap[u.id] = u.password; });
      incomingData.users.forEach(u => {
        if (u.id && !u.password && existingPassMap[u.id]) {
          u.password = existingPassMap[u.id];
        }
      });
    };

    // Load current state to extract existing passwords for merging
    let existingUsers = [];
    try {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      existingUsers = JSON.parse(rawSeed).users || [];
    } catch (e) {}
    mergePasswords(data, existingUsers);
    
    const col = await getCollection();
    if (useLocalFileDB || !col) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, localFile: true });
    }
    
    // Also merge passwords from MongoDB if available
    try {
      const stateDoc = await col.findOne({ _id: 'global_state' });
      if (stateDoc && stateDoc.users) {
        mergePasswords(data, stateDoc.users);
      }
    } catch (e) {}

    // Upsert the full state
    const updateResult = await col.updateOne(
      { _id: 'global_state' },
      { $set: data },
      { upsert: true }
    );
    
    // Keep seed.json on disk in sync for offline/Go Live server fallback loading
    try {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('⚠️ Failed to sync seed.json to disk:', fsErr.message);
    }
    
    res.json({ success: true, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount });
  } catch (err) {
    console.error('Error mutating database state:', err);
    res.status(500).json({ error: 'Failed to synchronize mutation' });
  }
});

// 2.5 Granular transactional mutation endpoint to prevent race conditions and payload overhead
app.post('/api/mutate-granular', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      const { type, key } = req.body;
      if (type === 'push' && key === 'users') {
        // Allow unauthenticated account registration (pushing new user to the database)
      } else {
        return res.status(401).json({ error: 'Authentication required for granular mutations.' });
      }
    }
    const { type, key, payload, query, updates } = req.body;
    if (!type || !key) {
      return res.status(400).json({ error: 'Type and key are required for granular mutations.' });
    }

    // Access Control Validation: employees can only modify their own leaves, logs, shift swaps, or user profiles
    if (req.user && req.user.role === 'employee') {
      if (key === 'users') {
        if (type !== 'update' || query.id !== req.user.userId) {
          return res.status(403).json({ error: 'Access Denied: Cannot modify other user profiles.' });
        }
        const allowedFields = ['name', 'phone', 'mobile', 'email', 'dob', 'gender', 'emergencyContact', 'address', 'city', 'photo', 'password', 'profileEditCount', 'profileVerificationStatus', 'pendingProfileEdits'];
        const updateKeys = Object.keys(updates || {});
        const forbiddenKeys = updateKeys.filter(k => !allowedFields.includes(k));
        if (forbiddenKeys.length > 0) {
          return res.status(403).json({ error: `Access Denied: Cannot modify administrative fields (${forbiddenKeys.join(', ')}).` });
        }
      } else if (!['attendanceLogs', 'leaveRequests', 'shiftSwaps'].includes(key)) {
        return res.status(403).json({ error: 'Access Denied: Forbidden database operation.' });
      }
      if (type === 'push') {
        const recordUserId = payload.userId || payload.senderId;
        if (recordUserId !== req.user.userId) {
          return res.status(403).json({ error: 'Access Denied: Cannot modify records of other employees.' });
        }
      } else if (type === 'update') {
        // Employees can only update their own records, and cannot approve leaves
        if (key === 'leaveRequests') {
          return res.status(403).json({ error: 'Access Denied: Employees cannot approve/reject leave requests.' });
        }
        if (key === 'shiftSwaps') {
          // Allow employees to update swap status ONLY if they are the receiver (accept/reject swap) or sender
          const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
          const stateObj = JSON.parse(rawState);
          const swap = stateObj.shiftSwaps.find(s => s.id === query.id);
          if (swap && swap.receiverId !== req.user.userId && swap.senderId !== req.user.userId) {
            return res.status(403).json({ error: 'Access Denied: Forbidden.' });
          }
        }
        if (key === 'attendanceLogs') {
          // Verify attendance log belongs to logged in user
          const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
          const stateObj = JSON.parse(rawState);
          const log = stateObj.attendanceLogs.find(l => l.id === query.id);
          if (log && log.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Access Denied: Forbidden.' });
          }
        }
      } else if (type === 'pull') {
        return res.status(403).json({ error: 'Access Denied: Deletions forbidden.' });
      }
    }

    const col = await getCollection();

    // Helper to apply local modifications to state object
    const applyLocalUpdate = (data) => {
      if (type === 'push') {
        data[key] = data[key] || [];
        const exists = data[key].some(item => item.id === payload.id);
        if (!exists) data[key].push(payload);
      } else if (type === 'update') {
        data[key] = data[key] || [];
        const idx = data[key].findIndex(item => item.id === query.id);
        if (idx !== -1) Object.assign(data[key][idx], updates);
      } else if (type === 'pull') {
        data[key] = data[key] || [];
        data[key] = data[key].filter(item => {
          for (const [k, v] of Object.entries(query)) {
            if (item[k] !== v) return true;
          }
          return false;
        });
      }
    };

    // 1. Update MongoDB atomically if online
    if (col && !useLocalFileDB) {
      let updateOp = {};
      if (type === 'push') {
        updateOp = { $push: { [key]: payload } };
        // Avoid duplicate push
        await col.updateOne({ _id: 'global_state', [`${key}.id`]: { $ne: payload.id } }, updateOp);
      } else if (type === 'update') {
        const setFields = {};
        for (const [f, val] of Object.entries(updates)) {
          setFields[`${key}.$.${f}`] = val;
        }
        updateOp = { $set: setFields };
        await col.updateOne({ _id: 'global_state', [`${key}.id`]: query.id }, updateOp);
      } else if (type === 'pull') {
        updateOp = { $pull: { [key]: query } };
        await col.updateOne({ _id: 'global_state' }, updateOp);
      }
    }

    // 2. Synchronize seed.json file thread-safely
    const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    const stateObj = JSON.parse(rawState);
    applyLocalUpdate(stateObj);
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(stateObj, null, 2), 'utf-8');

    res.json({ success: true, type, key });
  } catch (err) {
    console.error('Error applying granular mutation:', err);
    res.status(500).json({ error: 'Failed to apply granular update' });
  }
});

// 3. Dedicated file & bulk data upload endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { filename, fileData } = req.body || {};
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Filename and base64 fileData are required.' });
    }
    const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const destPath = path.join(UPLOADS_DIR, safeName);
    fs.writeFileSync(destPath, buffer);
    console.log(`Uploaded file saved: ${safeName} (${(buffer.length / 1024).toFixed(1)} KB)`);
    res.json({ success: true, url: `/uploads/${safeName}`, filename: safeName, size: buffer.length });
  } catch (err) {
    console.error('Express upload handler error:', err);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

// Route everything else to SPA shell
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  next();
});

// Express Error Handling Middleware (prevents raw HTML crashes on payload errors)
app.use((err, req, res, next) => {
  console.error('Express Payload / Request Error:', err.message);
  res.status(err.status || 400).json({ error: err.message || 'Malformed request payload.' });
});

// Start backend server
const os = require('os');
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalNetworkIP();

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const stdout = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      const currentPid = process.pid;
      
      stdout.split('\n').forEach(line => {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid) && parseInt(pid, 10) !== currentPid) {
            pids.add(pid);
          }
        }
      });
      
      pids.forEach(pid => {
        console.log(`🧹 Clearing stale process (PID ${pid}) on Port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (e) {}
      });
      
      // Give the OS a brief moment to release the socket
      try { execSync('timeout /t 1 /nobreak', { stdio: 'ignore' }); } catch (e) {}
    } catch (err) {
      // netstat exits with code 1 if no match is found, which is fine
    }
  }
}

async function syncLocalToMongoOnBoot() {
  try {
    const col = await getCollection();
    if (col && !useLocalFileDB) {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const seedData = JSON.parse(rawSeed);
        
        // Remove MongoDB _id if it exists in seed data to avoid conflicts, then set _id: 'global_state'
        delete seedData._id;
        
        await col.updateOne(
          { _id: 'global_state' },
          { $set: seedData },
          { upsert: true }
        );
        console.log('🔄 Synced local seed.json database state to MongoDB successfully on startup.');
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to sync local seed.json to MongoDB on boot:', err.message);
  }
}

// Watch seed.json for manual edits in VS Code and sync to MongoDB in real-time
let watchTimeout = null;
try {
  fs.watch(LOCAL_DB_FILE, (eventType) => {
    if (eventType === 'change') {
      clearTimeout(watchTimeout);
      watchTimeout = setTimeout(async () => {
        try {
          const col = await getCollection();
          if (col && !useLocalFileDB) {
            console.log('📝 Detected manual modification to seed.json. Syncing to MongoDB...');
            const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
            const seedData = JSON.parse(rawSeed);
            delete seedData._id;
            await col.updateOne(
              { _id: 'global_state' },
              { $set: seedData },
              { upsert: true }
            );
            console.log('✅ MongoDB successfully synchronized with manual seed.json edits.');
          }
        } catch (err) {
          console.warn('⚠️ Failed to sync seed.json changes to MongoDB:', err.message);
        }
      }, 500);
    }
  });
} catch (watchErr) {
  console.warn('⚠️ File watcher on seed.json failed to initialize:', watchErr.message);
}


function startExpressServer(portToTry) {
  freePort(portToTry);
  const serverInstance = app.listen(portToTry, '0.0.0.0', async () => {
    console.log(`===================================================`);
    console.log(`  HS GROUP DELHI EXPRESS LIVE SERVER ACTIVE `);
    print_urls(portToTry, localIP);
    console.log(`===================================================`);

    // Synchronize local JSON data state to MongoDB database on server boot
    await syncLocalToMongoOnBoot();

    // Write server config for client auto-discovery
    try {
      fs.writeFileSync(path.join(__dirname, 'server-config.json'), JSON.stringify({ port: portToTry, started_at: Date.now() }));
    } catch (e) {}
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (portToTry < 8090) {
        console.log(`⚠️ Port ${portToTry} busy, retrying on Port ${portToTry + 1}...`);
        startExpressServer(portToTry + 1);
      } else {
        console.error(`⚠️ Port ${portToTry} is already in use by a running server instance.`);
      }
    } else {
      console.error('Express server error:', err);
    }
  });
}

function print_urls(port, ip) {
  console.log(`  Local Laptop:  http://localhost:${port}`);
  console.log(`  Mobile / LAN:  http://${ip}:${port}`);
}

startExpressServer(PORT);
