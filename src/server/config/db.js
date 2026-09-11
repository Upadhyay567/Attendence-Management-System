// src/server/config/db.js - Database Configuration & Fallback Engine
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'attendance_system';
const LOCAL_DB_FILE = path.join(__dirname, '..', '..', '..', 'seed.json');

let isMongoConnected = false;
let useLocalFileDB = false;
let isSyncing = false;

// Define Mongoose Schemas
const UserSchema = new mongoose.Schema({
  // ZKTeco K40 Pro User ID
  biometricUserId: {
    type: String,
    default: null,
    index: true
  },
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
  managerId: String,
  assignedById: String,
  profileVerificationStatus: String,
  profileVerificationComment: String,
  pendingProfileEdits: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const AttendanceLogSchema = new mongoose.Schema({
  biometricDeviceId: String,

  biometricUserId: String,

  biometricPunchId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  lastBiometricPunchAt: String,
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  date: { type: String, required: true },
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
  latitude: Number,
  longitude: Number
}, { timestamps: true });

const LeaveRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: String,
  startDate: String,
  endDate: String,
  reason: String,
  status: String,
  requestDate: String,
  managerComment: String
}, { timestamps: true });

const ShiftSwapSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  requesterId: String,
  targetUserId: String,
  date: String,
  reason: String,
  status: String,
  requestDate: String
}, { timestamps: true });

const ScheduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  startTime: String,
  endTime: String,
  gracePeriod: Number,
  workDays: [Number],
  location: String
}, { timestamps: true });

const NoticeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  content: String,
  category: String,
  date: String,
  author: String
}, { timestamps: true });

const OfficeCoordinateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  lat: Number,
  lng: Number
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  id: String,
  timestamp: { type: Date, default: Date.now },
  action: String,
  actionType: String,
  actorId: String,
  actorRole: String,
  targetEntity: String,
  changes: String,
  userId: String,
  userName: String,
  userRole: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const AttendanceLog = mongoose.model('AttendanceLog', AttendanceLogSchema);
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);
const ShiftSwap = mongoose.model('ShiftSwap', ShiftSwapSchema);
const Schedule = mongoose.model('Schedule', ScheduleSchema);
const Notice = mongoose.model('Notice', NoticeSchema);
const OfficeCoordinate = mongoose.model('OfficeCoordinate', OfficeCoordinateSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

async function connectMongoose() {
  if (useLocalFileDB) return false;
  if (isMongoConnected) return true;
  try {
    const rawUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    const targetUrl = (rawUrl.includes('://') && rawUrl.includes('/', rawUrl.indexOf('://') + 3) && !rawUrl.endsWith('/'))
      ? rawUrl
      : `${rawUrl.replace(/\/$/, '')}/${DB_NAME}`;

    await mongoose.connect(targetUrl, {
      connectTimeoutMS: 1500,
      serverSelectionTimeoutMS: 1500
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

async function syncLocalToMongo(seedData) {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const safeInsert = (model, docs) => {
      if (!docs || !Array.isArray(docs) || docs.length === 0) return Promise.resolve();
      return model.deleteMany({})
        .then(() => model.insertMany(docs, { ordered: false }))
        .catch(err => console.warn(`⚠️ Warning: non-fatal sync issue on ${model.modelName}:`, err.message));
    };

    const officeDocs = Object.entries(seedData.officeCoordinates || {}).map(([name, coords]) => ({ name, ...coords }));

    await Promise.all([
      safeInsert(User, seedData.users || []),
      safeInsert(AttendanceLog, seedData.attendanceLogs || []),
      safeInsert(LeaveRequest, seedData.leaveRequests || []),
      safeInsert(ShiftSwap, seedData.shiftSwaps || []),
      safeInsert(Schedule, seedData.schedules || []),
      safeInsert(Notice, seedData.notices || []),
      safeInsert(OfficeCoordinate, officeDocs)
    ]);
  } catch (err) {
    console.warn('⚠️ Non-fatal syncLocalToMongo warning:', err.message);
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

module.exports = {
  mongoose,
  User,
  AttendanceLog,
  LeaveRequest,
  ShiftSwap,
  Schedule,
  Notice,
  OfficeCoordinate,
  AuditLog,
  connectMongoose,
  syncLocalToMongo,
  syncLocalToMongoOnBoot,
  getUseLocalFileDB: () => useLocalFileDB,
  setUseLocalFileDB: (val) => { useLocalFileDB = val; },
  getIsMongoConnected: () => isMongoConnected,
  LOCAL_DB_FILE
};
