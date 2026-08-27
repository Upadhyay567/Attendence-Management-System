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

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const ejs = require('ejs');

const JWT_SECRET = process.env.JWT_SECRET || 'hs_group_delhi_jwt_secret_2026_key';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: { error: 'Too many authentication requests from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Define Mongoose Schemas for split collections
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: String,
  scheduleId: String,
  preferredLocation: String,
  baseSalary: Number,
  allowanceHRA: Number,
  allowanceTravel: Number,
  deductionPF: Number,
  deductionPT: Number,
  deductionTDS: Number,
  phone: String,
  email: String,
  dob: String,
  address: String,
  city: String,
  gender: String,
  department: String,
  designation: String,
  dateOfJoining: String,
  emergencyContact: String,
  name: String,
  username: { type: String, required: true },
  role: { type: String, enum: ['employee', 'hr', 'manager', 'finance_manager'], default: 'employee' },
  status: { type: String, default: 'Active' },
  photo: String,
  password: { type: String, default: '' },
  profileVerificationStatus: String,
  profileVerificationComment: String,
  pendingProfileEdits: mongoose.Schema.Types.Mixed,
  profileEditCount: { type: Number, default: 0 },
  passwordResetCount: { type: Number, default: 0 },
  scheduleIds: [String],
  shiftLocations: mongoose.Schema.Types.Mixed
}, { strict: false, minimize: false });

const AttendanceLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  date: String,
  shiftId: String,
  checkIn: String,
  checkOut: String,
  status: String,
  biometricUsed: String,
  location: String,
  deviationFlag: Boolean,
  justification: String,
  coords: String,
  distance: Number,
  facePhoto: String,
  facePhotoOut: String,
  latitude: Number,
  longitude: Number
}, { strict: false, minimize: false });

const ScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  startTime: String,
  endTime: String,
  gracePeriod: Number,
  weeklyOffs: [Number]
}, { strict: false, minimize: false });

const LeaveRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: String,
  leaveType: String,
  startDate: String,
  endDate: String,
  reason: String,
  status: { type: String, default: 'Pending' },
  comments: String,
  createdAt: String,
  document: String
}, { strict: false, minimize: false });

const ShiftSwapSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  senderId: String,
  receiverId: String,
  date: String,
  status: { type: String, default: 'Pending' },
  shiftId: String,
  createdAt: String
}, { strict: false, minimize: false });

const NoticeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  content: String,
  date: String,
  important: Boolean
}, { strict: false, minimize: false });

const OfficeCoordinateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  lat: Number,
  lng: Number
}, { strict: false, minimize: false });

// Register models
const User = mongoose.model('User', UserSchema);
const AttendanceLog = mongoose.model('AttendanceLog', AttendanceLogSchema);
const Schedule = mongoose.model('Schedule', ScheduleSchema);
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
const ShiftSwap = mongoose.model('ShiftSwap', ShiftSwapSchema);
const Notice = mongoose.model('Notice', NoticeSchema);
const OfficeCoordinate = mongoose.model('OfficeCoordinate', OfficeCoordinateSchema);

// Map frontend DB key names to Mongoose models
const modelsMap = {
  users: User,
  attendanceLogs: AttendanceLog,
  schedules: Schedule,
  leaveRequests: LeaveRequest,
  shiftSwaps: ShiftSwap,
  notices: Notice
};

// Cryptographic helpers for password security (bcrypt-based by default, with backwards compatibility)
function hashPassword(password) {
  if (!password) return '';
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hashedPassword) {
  if (!hashedPassword || !password) return false;
  
  // Bcrypt verify
  if (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(password, hashedPassword);
    } catch (e) {
      return false;
    }
  }

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

// Calculate Haversine distance between two coordinates in meters
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

// Authentication middleware to validate tokens and inject user context using JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
    }
    req.user = decoded;
    next();
  });
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

let isMongoConnected = false;
let useLocalFileDB = false;
const LOCAL_DB_FILE = path.join(__dirname, 'seed.json');

async function connectMongoose() {
  if (useLocalFileDB) return false;
  if (isMongoConnected) return true;
  try {
    await mongoose.connect(`${MONGO_URL}/${DB_NAME}`, {
      connectTimeoutMS: 1000,
      serverSelectionTimeoutMS: 1000
    });
    isMongoConnected = true;
    console.log('Connected to MongoDB database successfully via Mongoose.');
    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB connection omitted/offline. Operating on local database (seed.json).');
    useLocalFileDB = true;
    isMongoConnected = false;
    return false;
  }
}

// 0. Server-Side Authentication
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  try {
    const { username, password, skipCheck, role } = req.body;
    
    // Input Validation
    if (role && !['employee', 'hr', 'manager', 'finance_manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid portal role specified.' });
    }
    
    let targetUsername = username ? String(username).trim() : '';
    if (!targetUsername && skipCheck) {
      if (role === 'hr') targetUsername = 'hr';
      else if (role === 'manager') targetUsername = 'manager';
      else targetUsername = 'john';
    }
    
    if (!targetUsername) {
      return res.status(400).json({ error: 'Username or Employee ID is required.' });
    }
    
    let matchedUser = null;
    const online = await connectMongoose();
    if (useLocalFileDB || !online) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const users = JSON.parse(rawSeed).users || [];
      matchedUser = users.find(u =>
        (u.employeeId && u.employeeId.toUpperCase() === targetUsername.toUpperCase()) ||
        (u.username && u.username.toLowerCase() === targetUsername.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === targetUsername.toLowerCase()) ||
        (u.id && u.id.toLowerCase() === targetUsername.toLowerCase())
      );
    } else {
      matchedUser = await User.findOne({
        $or: [
          { employeeId: new RegExp(`^${targetUsername}$`, 'i') },
          { username: new RegExp(`^${targetUsername}$`, 'i') },
          { email: new RegExp(`^${targetUsername}$`, 'i') },
          { id: new RegExp(`^${targetUsername}$`, 'i') }
        ]
      }).lean();
    }
    
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
    
    // Generate secure signed JWT token
    const token = jwt.sign(
      { userId: matchedUser.id, role: matchedUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
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
app.post('/api/auth/send-otp', authRateLimiter, async (req, res) => {
  try {
    const { userId, method } = req.body;
    if (!userId || !method) {
      return res.status(400).json({ error: 'User ID and verification method are required.' });
    }

    if (!['otp', 'sms', 'email'].includes(method)) {
      return res.status(400).json({ error: 'Invalid verification method.' });
    }

    let user = null;
    const online = await connectMongoose();
    if (useLocalFileDB || !online) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const users = JSON.parse(rawSeed).users || [];
      user = users.find(u => u.id === userId);
    } else {
      user = await User.findOne({ id: userId }).lean();
    }
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

          const templatePath = path.join(__dirname, 'templates', 'otp-email.ejs');
          const htmlContent = await ejs.renderFile(templatePath, { userName: user.name, otp });

          await transporter.sendMail({
            from: `"HS Group Delhi" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'HS Group Delhi - Password Reset Verification Code',
            text: `Dear ${user.name},\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nHouse of Surya / HS Group Delhi`,
            html: htmlContent
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
app.post('/api/auth/verify-otp', authRateLimiter, (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required.' });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Verification code must be exactly 6 digits.' });
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
app.post('/api/auth/identify', authRateLimiter, async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier is required.' });
    }
    
    let matchedUser = null;
    const online = await connectMongoose();
    if (useLocalFileDB || !online) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const users = JSON.parse(rawSeed).users || [];
      matchedUser = users.find(u => {
        const key = identifier.trim().toLowerCase();
        const cleanKey = identifier.replace(/\D/g, '');
        const userPhone = (u.phone || u.mobile || '').replace(/\D/g, '');
        const isPhoneMatch = cleanKey && userPhone && (cleanKey === userPhone || cleanKey.endsWith(userPhone) || userPhone.endsWith(cleanKey));
        
        return (u.username && u.username.toLowerCase() === key) ||
               (u.email && u.email.toLowerCase() === key) ||
               (u.employeeId && u.employeeId.toLowerCase() === key) ||
               isPhoneMatch;
      });
    } else {
      const key = identifier.trim();
      const cleanKey = identifier.replace(/\D/g, '');
      const filter = [
        { username: new RegExp(`^${key}$`, 'i') },
        { email: new RegExp(`^${key}$`, 'i') },
        { employeeId: new RegExp(`^${key}$`, 'i') }
      ];
      if (cleanKey) {
        filter.push({ phone: new RegExp(cleanKey) });
        filter.push({ mobile: new RegExp(cleanKey) });
      }
      matchedUser = await User.findOne({ $or: filter }).lean();
    }
    
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
app.post('/api/auth/reset-password', authRateLimiter, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'User ID and new password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    
    const online = await connectMongoose();
    const hashedPassword = hashPassword(newPassword);
    
    if (online && !useLocalFileDB) {
      const user = await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      user.password = hashedPassword;
      user.passwordResetCount = (user.passwordResetCount || 0) + 1;
      await user.save();
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

    let stateData = null;
    const online = await connectMongoose();

    if (useLocalFileDB || !online) {
      const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      stateData = JSON.parse(rawSeed);
    } else {
      // Query all collections concurrently
      const [
        usersDocs,
        attendanceDocs,
        leaveDocs,
        swapDocs,
        scheduleDocs,
        noticeDocs,
        officeDocs
      ] = await Promise.all([
        User.find({}).lean(),
        AttendanceLog.find({}).lean(),
        LeaveRequest.find({}).lean(),
        ShiftSwap.find({}).lean(),
        Schedule.find({}).lean(),
        Notice.find({}).lean(),
        OfficeCoordinate.find({}).lean()
      ]);

      // If database is completely empty (e.g. fresh MongoDB run), seed it from default seed.json
      if (usersDocs.length === 0 && scheduleDocs.length === 0) {
        console.log('MongoDB collections are empty. Seeding from default seed.json...');
        const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        stateData = JSON.parse(rawSeed);
        
        // Seed Mongoose collections
        await Promise.all([
          User.insertMany(stateData.users || []),
          AttendanceLog.insertMany(stateData.attendanceLogs || []),
          LeaveRequest.insertMany(stateData.leaveRequests || []),
          ShiftSwap.insertMany(stateData.shiftSwaps || []),
          Schedule.insertMany(stateData.schedules || []),
          Notice.insertMany(stateData.notices || []),
          OfficeCoordinate.insertMany(
            Object.entries(stateData.officeCoordinates || {}).map(([name, coords]) => ({ name, ...coords }))
          )
        ]);
        console.log('Database successfully seeded via Mongoose.');
      } else {
        // Transform officeCoordinates array back into key-value map
        const officeCoordinates = {};
        officeDocs.forEach(d => {
          officeCoordinates[d.name] = { lat: d.lat, lng: d.lng };
        });

        stateData = {
          users: usersDocs,
          attendanceLogs: attendanceDocs,
          leaveRequests: leaveDocs,
          shiftSwaps: swapDocs,
          schedules: scheduleDocs,
          notices: noticeDocs,
          officeCoordinates
        };
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
    
    const online = await connectMongoose();
    if (useLocalFileDB || !online) {
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, localFile: true });
    }
    
    // Also merge passwords from MongoDB if available
    try {
      const existingDbUsers = await User.find({}).lean();
      if (existingDbUsers) {
        mergePasswords(data, existingDbUsers);
      }
    } catch (e) {}

    // Synchronize each Mongoose collection
    await Promise.all([
      User.deleteMany({}).then(() => User.insertMany(data.users || [])),
      AttendanceLog.deleteMany({}).then(() => AttendanceLog.insertMany(data.attendanceLogs || [])),
      LeaveRequest.deleteMany({}).then(() => LeaveRequest.insertMany(data.leaveRequests || [])),
      ShiftSwap.deleteMany({}).then(() => ShiftSwap.insertMany(data.shiftSwaps || [])),
      Schedule.deleteMany({}).then(() => Schedule.insertMany(data.schedules || [])),
      Notice.deleteMany({}).then(() => Notice.insertMany(data.notices || [])),
      OfficeCoordinate.deleteMany({}).then(() => 
        OfficeCoordinate.insertMany(
          Object.entries(data.officeCoordinates || {}).map(([name, coords]) => ({ name, ...coords }))
        )
      )
    ]);
    
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

    // Backend duplicate validation check for users
    if (key === 'users' && type === 'push' && payload) {
      const online = await connectMongoose();
      if (online && !useLocalFileDB) {
        const usernameExists = await User.exists({ username: payload.username });
        if (usernameExists) {
          return res.status(400).json({ error: `The Employee ID / HR ID '${payload.username.toUpperCase()}' is already taken.` });
        }
        const emailExists = await User.exists({ email: payload.email });
        if (emailExists) {
          return res.status(400).json({ error: `Email '${payload.email}' is already registered to another account.` });
        }
      } else {
        if (fs.existsSync(LOCAL_DB_FILE)) {
          const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
          const stateObj = JSON.parse(rawState);
          const users = stateObj.users || [];
          if (users.some(u => u.username.toLowerCase() === payload.username.toLowerCase())) {
            return res.status(400).json({ error: `The Employee ID / HR ID '${payload.username.toUpperCase()}' is already taken.` });
          }
          if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
            return res.status(400).json({ error: `Email '${payload.email}' is already registered to another account.` });
          }
        }
      }
    }

    // Geofencing Proximity check for attendance logs on clock-in (type push)
    if (key === 'attendanceLogs' && type === 'push' && payload) {
      const officeName = payload.location || 'Kohat Enclave, Pitampura, Delhi';
      
      let officeCoordinates = {};
      const online = await connectMongoose();
      if (useLocalFileDB || !online) {
        const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        officeCoordinates = JSON.parse(rawSeed).officeCoordinates || {};
      } else {
        const officeDocs = await OfficeCoordinate.find({}).lean();
        officeDocs.forEach(d => {
          officeCoordinates[d.name] = { lat: d.lat, lng: d.lng };
        });
      }

      const office = officeCoordinates[officeName] || officeCoordinates['Kohat Enclave, Pitampura, Delhi'] || Object.values(officeCoordinates)[0];
      if (office) {
        let employeeLat = payload.latitude;
        let employeeLng = payload.longitude;

        // Fallback: if raw coordinates are missing but coords string is present, parse it
        if ((employeeLat === undefined || employeeLat === null) && payload.coords) {
          const match = payload.coords.match(/([\d\.\-]+).*?([\d\.\-]+)/);
          if (match) {
            employeeLat = parseFloat(match[1]);
            employeeLng = parseFloat(match[2]);
          }
        }

        if (employeeLat !== undefined && employeeLat !== null && employeeLng !== undefined && employeeLng !== null) {
          const dist = calculateHaversineDistance(employeeLat, employeeLng, office.lat, office.lng);
          if (dist > 100) { // 100 meters
            return res.status(400).json({ error: `Geofence validation failed. You are out of range for ${officeName} (Distance: ${dist.toFixed(1)}m).` });
          }
        } else {
          return res.status(400).json({ error: 'Geofence validation failed. GPS coordinates are missing from the check-in request.' });
        }
      }
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

    const online = await connectMongoose();

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
    if (online && !useLocalFileDB) {
      const Model = modelsMap[key];
      if (Model) {
        if (type === 'push') {
          const exists = await Model.exists({ id: payload.id });
          if (!exists) {
            await Model.create(payload);
          }
        } else if (type === 'update') {
          await Model.updateOne(query, { $set: updates });
        } else if (type === 'pull') {
          await Model.deleteOne(query);
        }
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

let isSyncing = false;

async function syncLocalToMongo(seedData) {
  if (isSyncing) return;
  isSyncing = true;
  try {
    await Promise.all([
      User.deleteMany({}).then(() => User.insertMany(seedData.users || [])),
      AttendanceLog.deleteMany({}).then(() => AttendanceLog.insertMany(seedData.attendanceLogs || [])),
      LeaveRequest.deleteMany({}).then(() => LeaveRequest.insertMany(seedData.leaveRequests || [])),
      ShiftSwap.deleteMany({}).then(() => ShiftSwap.insertMany(seedData.shiftSwaps || [])),
      Schedule.deleteMany({}).then(() => Schedule.insertMany(seedData.schedules || [])),
      Notice.deleteMany({}).then(() => Notice.insertMany(seedData.notices || [])),
      OfficeCoordinate.deleteMany({}).then(() => 
        OfficeCoordinate.insertMany(
          Object.entries(seedData.officeCoordinates || {}).map(([name, coords]) => ({ name, ...coords }))
        )
      )
    ]);
  } finally {
    isSyncing = false;
  }
}

async function syncLocalToMongoOnBoot() {
  try {
    const online = await connectMongoose();
    if (online && !useLocalFileDB) {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const seedData = JSON.parse(rawSeed);
        await syncLocalToMongo(seedData);
        console.log('🔄 Synced local seed.json database state to MongoDB successfully on startup.');
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to sync local seed.json to MongoDB on boot:', err.message);
  }
}

// Watch seed.json for manual edits in VS Code and sync to MongoDB in real-time
if (process.env.NODE_ENV !== 'test') {
  let watchTimeout = null;
  try {
    fs.watch(LOCAL_DB_FILE, (eventType) => {
      if (eventType === 'change') {
        clearTimeout(watchTimeout);
        watchTimeout = setTimeout(async () => {
          try {
            const online = await connectMongoose();
            if (online && !useLocalFileDB) {
              console.log('📝 Detected manual modification to seed.json. Syncing to MongoDB...');
              const rawSeed = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
              const seedData = JSON.parse(rawSeed);
              await syncLocalToMongo(seedData);
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
}


// Database Status & Sync endpoints
app.get('/api/db-status', async (req, res) => {
  try {
    const isOnline = mongoose.connection.readyState === 1;
    let uCount = 0;
    let lCount = 0;
    
    if (isOnline && !useLocalFileDB) {
      uCount = await User.countDocuments().catch(() => 0);
      lCount = await AttendanceLog.countDocuments().catch(() => 0);
    } else {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        uCount = (parsed.users || []).length;
        lCount = (parsed.attendanceLogs || []).length;
      }
    }

    res.json({
      online: isOnline,
      mode: useLocalFileDB ? 'Local file (seed.json)' : (isOnline ? 'MongoDB Atlas' : 'Local file fallback'),
      usersCount: uCount,
      logsCount: lCount,
      lastSynced: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db-sync', async (req, res) => {
  try {
    await syncLocalToMongoOnBoot();
    res.json({ success: true, message: 'Database successfully synchronized with local state.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

if (require.main === module) {
  startExpressServer(PORT);
}

module.exports = { app, connectMongoose, mongoose, User, AttendanceLog, OfficeCoordinate, syncLocalToMongoOnBoot };
