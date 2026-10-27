// src/server/controllers/attendance.controller.js - Attendance & Mutation Handlers
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { 
  User, AttendanceLog, LeaveRequest, ShiftSwap, Schedule, Notice, OfficeCoordinate, AuditLog, BiometricDevice,
  connectMongoose, getUseLocalFileDB, LOCAL_DB_FILE 
} = require('../config/db');
const { broadcastSSEEvent } = require('../routes/events.routes');
const { recordAuditLog } = require('../middleware/audit.middleware');

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

function applyLocalUpdate(stateObj, type, key, payload, updates, query) {
  if (!stateObj) return;
  if (!stateObj[key]) stateObj[key] = Array.isArray(payload) ? [] : (type === 'push' ? [] : {});

  if (type === 'push' && payload) {
    if (Array.isArray(stateObj[key])) {
      if (payload && payload.id) {
        const existingIdx = stateObj[key].findIndex(item => item && item.id === payload.id);
        if (existingIdx !== -1) {
          stateObj[key][existingIdx] = { ...stateObj[key][existingIdx], ...payload };
          return;
        }
      }
      if (key === 'users' && payload && payload.employeeId) {
        const existingIdx = stateObj[key].findIndex(item => item && item.employeeId && String(item.employeeId).toUpperCase() === String(payload.employeeId).toUpperCase());
        if (existingIdx !== -1) {
          stateObj[key][existingIdx] = { ...stateObj[key][existingIdx], ...payload };
          return;
        }
      }
      stateObj[key].unshift(payload);
    }
  } else if (type === 'update' && query && updates) {
    if (key === 'users') {
      if ((updates.scheduleId === '' || updates.scheduleId === null) || (Array.isArray(updates.scheduleIds) && updates.scheduleIds.length === 0)) {
        if (updates.scheduleIds === undefined) updates.scheduleIds = [];
        if (updates.scheduleId === undefined) updates.scheduleId = '';
        if (updates.shiftLocations === undefined) updates.shiftLocations = {};
        const todayStr = new Date().toISOString().split('T')[0];
        if (Array.isArray(stateObj.attendanceLogs)) {
          stateObj.attendanceLogs.forEach(l => {
            if (query && query.id && String(l.userId) === String(query.id) && l.date === todayStr) {
              l.shiftId = '';
              if (l.checkIn && l.status === 'Late') {
                l.status = 'On Time';
              }
            }
          });
        }
      }
    }
    if (Array.isArray(stateObj[key])) {
      stateObj[key] = stateObj[key].map(item => {
        let match = true;
        for (const k in query) {
          if (String(item[k]) !== String(query[k])) { match = false; break; }
        }
        return match ? { ...item, ...updates } : item;
      });
    }
  } else if ((type === 'delete' || type === 'pull') && query) {
    if (Array.isArray(stateObj[key])) {
      stateObj[key] = stateObj[key].filter(item => {
        let match = true;
        for (const k in query) {
          if (String(item[k]) !== String(query[k])) { match = false; break; }
        }
        return !match;
      });
    }
  } else if (type === 'set' && payload) {
    stateObj[key] = payload;
  }
}

let cachedDbState = null;
let cachedMTime = 0;

function invalidateLocalDbCache() {
  cachedDbState = null;
  cachedMTime = 0;
}

function readLocalDbStateCached() {
  if (!fs.existsSync(LOCAL_DB_FILE)) return cachedDbState || null;
  try {
    const stat = fs.statSync(LOCAL_DB_FILE);
    if (!cachedDbState || stat.mtimeMs !== cachedMTime) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      if (raw && raw.trim()) {
        cachedDbState = JSON.parse(raw);
        cachedMTime = stat.mtimeMs;
      }
    }
    return cachedDbState;
  } catch (err) {
    if (cachedDbState) return cachedDbState;
    try {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        if (raw && raw.trim()) {
          cachedDbState = JSON.parse(raw);
          return cachedDbState;
        }
      }
    } catch (_) {}
    return cachedDbState || null;
  }
}

function sendGzipJson(req, res, data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const acceptEncoding = (req.headers && req.headers['accept-encoding']) || '';

  if (acceptEncoding.includes('gzip')) {
    zlib.gzip(Buffer.from(jsonStr), (err, compressed) => {
      if (err) {
        res.setHeader('Content-Type', 'application/json');
        return res.send(jsonStr);
      }
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.length);
      return res.end(compressed);
    });
  } else {
    res.setHeader('Content-Type', 'application/json');
    return res.send(jsonStr);
  }
}

async function getDbState(req, res) {
  try {
    const online = await connectMongoose();
    const useLocal = getUseLocalFileDB();

    if (online && !useLocal) {
      const [users, attendanceLogs, leaveRequests, shiftSwaps, schedules, notices, officeCoords, biometricDevices] = await Promise.all([
        User.find({}, '-password').lean(),
        AttendanceLog.find(
          {},
          'id userId employeeId biometricUserId employeeName date checkIn checkOut status shiftId location biometricUsed departureLocation lastBiometricPunchAt -_id'
        ).sort({ date: -1 }).lean(),
        LeaveRequest.find({}).lean(),
        ShiftSwap.find({}).lean(),
        Schedule.find({}).lean(),
        Notice.find({}).lean(),
        OfficeCoordinate.find({}).lean(),
        BiometricDevice.find({}).lean()
      ]);

      const localData = readLocalDbStateCached();
      
      // Merge in any users from localData that might not have mirrored to Mongo yet
      const localMap = new Map((localData?.users || []).map(u => [String(u.id), u]));
      let finalUsers = users.map(u => {
        const localUser = localMap.get(String(u.id));
        const rawRole = u.role !== undefined && u.role !== null ? u.role : (localUser ? localUser.role : 'employee');
        const normRole = (rawRole === 14 || rawRole === '14' || String(rawRole).toLowerCase() === 'admin' || String(rawRole).toLowerCase() === 'hr')
          ? 'hr'
          : ((rawRole === 'manager' || rawRole === 'finance_manager') ? rawRole : 'employee');

        if (localUser) {
          return {
            ...localUser,
            ...u,
            role: normRole,
            department: u.department || localUser.department || '',
            designation: u.designation || localUser.designation || '',
            baseSalary: (u.baseSalary !== undefined && u.baseSalary !== null && u.baseSalary !== '') ? u.baseSalary : (localUser.baseSalary || null),
            allowanceHRA: (u.allowanceHRA !== undefined && u.allowanceHRA !== null) ? u.allowanceHRA : (localUser.allowanceHRA || 0),
            allowanceTravel: (u.allowanceTravel !== undefined && u.allowanceTravel !== null) ? u.allowanceTravel : (localUser.allowanceTravel || 0),
            allowanceCCA: (u.allowanceCCA !== undefined && u.allowanceCCA !== null) ? u.allowanceCCA : (localUser.allowanceCCA || 0),
            allowancePerformance: (u.allowancePerformance !== undefined && u.allowancePerformance !== null) ? u.allowancePerformance : (localUser.allowancePerformance || 0),
            allowanceOther: (u.allowanceOther !== undefined && u.allowanceOther !== null) ? u.allowanceOther : (localUser.allowanceOther || 0),
            bonus: (u.bonus !== undefined && u.bonus !== null) ? u.bonus : (localUser.bonus || 0),
            totalAllowances: (u.totalAllowances !== undefined && u.totalAllowances !== null) ? u.totalAllowances : (localUser.totalAllowances || 0),
            deductionPF: (u.deductionPF !== undefined && u.deductionPF !== null) ? u.deductionPF : (localUser.deductionPF || 0),
            deductionESI: (u.deductionESI !== undefined && u.deductionESI !== null) ? u.deductionESI : (localUser.deductionESI || 0),
            deductionAdvance: (u.deductionAdvance !== undefined && u.deductionAdvance !== null) ? u.deductionAdvance : (localUser.deductionAdvance || 0),
            deductionOther: (u.deductionOther !== undefined && u.deductionOther !== null) ? u.deductionOther : (localUser.deductionOther || 0),
            deductionPT: 0,
            deductionTDS: (u.deductionTDS !== undefined && u.deductionTDS !== null) ? u.deductionTDS : (localUser.deductionTDS || 0),
            totalDeductions: (u.totalDeductions !== undefined && u.totalDeductions !== null) ? u.totalDeductions : (localUser.totalDeductions || 0),
            uanNo: u.uanNo || localUser.uanNo || u.uanNumber || localUser.uanNumber || '',
            pfNo: u.pfNo || localUser.pfNo || u.pfNumber || localUser.pfNumber || '',
            esiNo: u.esiNo || localUser.esiNo || u.esiNumber || localUser.esiNumber || '',
            esiNumber: u.esiNumber || localUser.esiNumber || u.esiNo || localUser.esiNo || '',
            bankName: u.bankName || localUser.bankName || '',
            accountNumber: u.accountNumber || localUser.accountNumber || '',
            ifscCode: u.ifscCode || localUser.ifscCode || '',
            bankBranchName: u.bankBranchName || localUser.bankBranchName || '',
            workLocation: u.workLocation || localUser.workLocation || '',
            preferredLocation: u.preferredLocation || localUser.preferredLocation || '',
            photo: (u.photo && typeof u.photo === 'string' && u.photo.trim()) ? u.photo : (localUser.photo || null),
            facePhoto: (u.facePhoto && typeof u.facePhoto === 'string' && u.facePhoto.trim()) ? u.facePhoto : (localUser.facePhoto || null),
            scheduleIds: (Array.isArray(u.scheduleIds) && u.scheduleIds.length > 0) ? u.scheduleIds : (localUser.scheduleIds || []),
            preferredLocations: (Array.isArray(u.preferredLocations) && u.preferredLocations.length > 0) ? u.preferredLocations : (localUser.preferredLocations || []),
            shiftLocations: (u.shiftLocations && typeof u.shiftLocations === 'object' && Object.keys(u.shiftLocations).length > 0) ? u.shiftLocations : (localUser.shiftLocations || {}),
            dateOfJoining: u.dateOfJoining || localUser.dateOfJoining || '',
            branch: u.branch || localUser.branch || '',
            pincode: u.pincode || localUser.pincode || '',
            bloodGroup: u.bloodGroup || localUser.bloodGroup || '',
            emergencyContact: u.emergencyContact || localUser.emergencyContact || '',
            biometricUserId: u.biometricUserId || localUser.biometricUserId || u.biometricId || localUser.biometricId || '',
            resume: u.resume || localUser.resume || null,
            aadhar: u.aadhar || localUser.aadhar || null,
            bankDetails: u.bankDetails || localUser.bankDetails || null,
            documents: (Array.isArray(u.documents) && u.documents.length > 0) ? u.documents : (localUser.documents || []),
            verificationStatuses: u.verificationStatuses || localUser.verificationStatuses || {},
            profileVerificationStatus: u.profileVerificationStatus || localUser.profileVerificationStatus || 'Approved',
            profileVerificationComment: u.profileVerificationComment || localUser.profileVerificationComment || ''
          };
        }
        return { ...u, role: normRole };
      });

      if (localData && Array.isArray(localData.users)) {
        const mongoIds = new Set(users.map(u => String(u.id)));
        const missing = localData.users.filter(u => u && u.id && !mongoIds.has(String(u.id))).map(u => {
          const rawRole = u.role;
          const normRole = (rawRole === 14 || rawRole === '14' || String(rawRole).toLowerCase() === 'admin' || String(rawRole).toLowerCase() === 'hr')
            ? 'hr'
            : ((rawRole === 'manager' || rawRole === 'finance_manager') ? rawRole : 'employee');
          return { ...u, role: normRole };
        });
        if (missing.length > 0) {
          finalUsers = [...finalUsers, ...missing];
        }
      }

      // Preserve all attendance logs without truncation, merging any pending local-only logs
      let finalLogs = attendanceLogs || [];
      if (localData && Array.isArray(localData.attendanceLogs) && localData.attendanceLogs.length > 0) {
        const mongoLogIds = new Set(finalLogs.map(l => l.id));
        const missingLocalLogs = localData.attendanceLogs.filter(l => l && l.id && !mongoLogIds.has(l.id));
        if (missingLocalLogs.length > 0) {
          finalLogs = [...finalLogs, ...missingLocalLogs];
        }
      }

      // Biometric devices merge
      let finalDevices = biometricDevices || [];
      if (localData && Array.isArray(localData.biometricDevices)) {
        const mongoDevIds = new Set(finalDevices.map(d => d.id));
        const missingDevs = localData.biometricDevices.filter(d => d && !mongoDevIds.has(d.id));
        finalDevices = [...finalDevices, ...missingDevs];
      }

      const officeCoordinatesObj = {};
      officeCoords.forEach(c => { officeCoordinatesObj[c.name] = { lat: c.lat, lng: c.lng }; });
      if (localData && localData.officeCoordinates) {
        Object.assign(officeCoordinatesObj, localData.officeCoordinates);
      }

      // Start with all local metadata (tickets, announcements, customRoles, budgets, etc.)
      const baseState = localData ? { ...localData } : {};
      delete baseState.activityLogs;
      delete baseState.processedPunchIds;
      delete baseState.biometricVault;

      return sendGzipJson(req, res, {
        ...baseState,
        users: finalUsers,
        attendanceLogs: finalLogs,
        leaveRequests,
        shiftSwaps,
        schedules,
        notices,
        officeCoordinates: officeCoordinatesObj,
        biometricDevices: finalDevices
      });
    } else {
      const localData = readLocalDbStateCached();
      if (localData) {
        const { activityLogs, processedPunchIds, biometricVault, ...clientData } = localData;
        return sendGzipJson(req, res, clientData);
      }
      return res.status(404).json({ error: 'Seed database file missing.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch database state: ' + err.message });
  }
}

async function handleGranularMutation(req, res) {
  try {
    const { type, key, payload, updates, query } = req.body || {};

    // Geofence Validation for attendance logs check-in (dynamically resolves shift worksite coordinates)
    if (key === 'attendanceLogs' && type === 'push' && payload && payload.latitude && payload.longitude) {
      let targetLat = 28.6978;
      let targetLng = 77.1408;

      const localState = readLocalDbStateCached();
      if (localState && payload.userId) {
        const u = (localState.users || []).find(emp => String(emp.id) === String(payload.userId));
        const sId = payload.shiftId || (u ? u.scheduleId : null);
        const sched = (localState.schedules || []).find(s => String(s.id) === String(sId));
        const locName = (u && u.shiftLocations && sId && u.shiftLocations[sId]) || (sched ? sched.location : null) || (u ? u.preferredLocation : null);
        
        if (locName && localState.officeCoordinates && localState.officeCoordinates[locName]) {
          targetLat = localState.officeCoordinates[locName].lat;
          targetLng = localState.officeCoordinates[locName].lng;
        }
      }

      const dist = calculateHaversineDistance(payload.latitude, payload.longitude, targetLat, targetLng);
      
      if (dist > 100) {
        return res.status(400).json({ 
          error: `Geofence validation failed! Check-in rejected: distance (${(dist/1000).toFixed(2)} km) exceeds 100m radius threshold.` 
        });
      }
    }

    const online = await connectMongoose();
    const useLocal = getUseLocalFileDB();

    if (fs.existsSync(LOCAL_DB_FILE)) {
      const rawState = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const stateObj = JSON.parse(rawState);
      applyLocalUpdate(stateObj, type, key, payload, updates, query);
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(stateObj, null, 2), 'utf-8');
      invalidateLocalDbCache();
    }

    if (online && !useLocal) {
      if (type === 'push' && payload && payload.id) {
        try {
          if (key === 'users') await User.updateOne({ id: payload.id }, { $set: payload }, { upsert: true });
          else if (key === 'attendanceLogs') await AttendanceLog.updateOne({ id: payload.id }, { $set: payload }, { upsert: true });
          else if (key === 'leaveRequests') await LeaveRequest.updateOne({ id: payload.id }, { $set: payload }, { upsert: true });
          else if (key === 'shiftSwaps') await ShiftSwap.updateOne({ id: payload.id }, { $set: payload }, { upsert: true });
          else if (key === 'schedules') await Schedule.updateOne({ id: payload.id }, { $set: payload }, { upsert: true });
          else if (key === 'notices') await Notice.updateOne({ id: payload.id }, { $set: payload }, { upsert: true });
        } catch (mongoPushErr) {
          console.warn('⚠️ Non-fatal Mongo push warning:', mongoPushErr.message);
        }
      } else if (type === 'update' && query && updates) {
        try {
          if (key === 'users') await User.updateOne(query, { $set: updates });
          else if (key === 'attendanceLogs') await AttendanceLog.updateOne(query, { $set: updates });
          else if (key === 'leaveRequests') await LeaveRequest.updateOne(query, { $set: updates });
          else if (key === 'shiftSwaps') await ShiftSwap.updateOne(query, { $set: updates });
          else if (key === 'schedules') await Schedule.updateOne(query, { $set: updates });
          else if (key === 'notices') await Notice.updateOne(query, { $set: updates });
        } catch (mongoErr) {
          console.warn('⚠️ Non-fatal Mongo update warning:', mongoErr.message);
        }
      } else if ((type === 'delete' || type === 'pull') && query) {
        try {
          if (key === 'leaveRequests') await LeaveRequest.deleteMany(query);
          else if (key === 'shiftSwaps') await ShiftSwap.deleteMany(query);
          else if (key === 'attendanceLogs') await AttendanceLog.deleteMany(query);
          else if (key === 'users') await User.deleteMany(query);
          else if (key === 'schedules') await Schedule.deleteMany(query);
          else if (key === 'notices') await Notice.deleteMany(query);
        } catch (mongoDelErr) {
          console.warn('⚠️ Non-fatal Mongo delete warning:', mongoDelErr.message);
        }
      }
    }

    broadcastSSEEvent('db_updated', { type, key, timestamp: Date.now() });
    
    await recordAuditLog(AuditLog, useLocal, {
      action: `${type.toUpperCase()}_${key}`,
      userId: req.user ? req.user.id : 'anonymous',
      userName: req.user ? req.user.name : '',
      userRole: req.user ? req.user.role : '',
      details: payload || updates || query,
      ipAddress: req.ip
    });

    res.json({ success: true, type, key });
  } catch (err) {
    res.status(500).json({ error: 'Failed to apply granular update: ' + err.message });
  }
}

module.exports = {
  getDbState,
  handleGranularMutation,
  invalidateLocalDbCache,
  readLocalDbStateCached
};
