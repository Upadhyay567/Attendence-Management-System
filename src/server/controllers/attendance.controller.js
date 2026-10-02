// src/server/controllers/attendance.controller.js - Attendance & Mutation Handlers
const fs = require('fs');
const path = require('path');
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
        if (updates.preferredLocations === undefined) updates.preferredLocations = [];
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
          if (item[k] !== query[k]) { match = false; break; }
        }
        return match ? { ...item, ...updates } : item;
      });
    }
  } else if (type === 'delete' && query) {
    if (Array.isArray(stateObj[key])) {
      stateObj[key] = stateObj[key].filter(item => {
        let match = true;
        for (const k in query) {
          if (item[k] !== query[k]) { match = false; break; }
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
  if (!fs.existsSync(LOCAL_DB_FILE)) return null;
  try {
    const stat = fs.statSync(LOCAL_DB_FILE);
    if (!cachedDbState || stat.mtimeMs !== cachedMTime) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      cachedDbState = JSON.parse(raw);
      cachedMTime = stat.mtimeMs;
    }
    return cachedDbState;
  } catch (err) {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    return null;
  }
}

async function getDbState(req, res) {
  try {
    const online = await connectMongoose();
    const useLocal = getUseLocalFileDB();

    if (online && !useLocal) {
      const [users, attendanceLogs, leaveRequests, shiftSwaps, schedules, notices, officeCoords, biometricDevices] = await Promise.all([
        User.find({}).lean(),
        AttendanceLog.find({}).lean(),
        LeaveRequest.find({}).lean(),
        ShiftSwap.find({}).lean(),
        Schedule.find({}).lean(),
        Notice.find({}).lean(),
        OfficeCoordinate.find({}).lean(),
        BiometricDevice.find({}).lean()
      ]);

      const localData = readLocalDbStateCached();
      
      // Merge in any users from localData that might not have mirrored to Mongo yet
      const localMap = new Map((localData?.users || []).map(u => [u.id, u]));
      let finalUsers = users.map(u => {
        const localUser = localMap.get(u.id);
        if (localUser) {
          return {
            ...localUser,
            ...u,
            resume: u.resume || localUser.resume || null,
            aadhar: u.aadhar || localUser.aadhar || null,
            bankDetails: u.bankDetails || localUser.bankDetails || null,
            documents: (Array.isArray(u.documents) && u.documents.length > 0) ? u.documents : (localUser.documents || []),
            verificationStatuses: u.verificationStatuses || localUser.verificationStatuses || {},
            profileVerificationStatus: u.profileVerificationStatus || localUser.profileVerificationStatus || 'Approved',
            profileVerificationComment: u.profileVerificationComment || localUser.profileVerificationComment || ''
          };
        }
        return u;
      });

      if (localData && Array.isArray(localData.users) && localData.users.length > users.length) {
        const mongoIds = new Set(users.map(u => u.id));
        const missing = localData.users.filter(u => u && !mongoIds.has(u.id));
        finalUsers = [...finalUsers, ...missing];
      }

      // Robust Map-based merge for attendanceLogs: preserve non-empty checkOuts and latest punches
      const logMap = new Map();
      (attendanceLogs || []).forEach(l => {
        if (l && l.id) logMap.set(l.id, l);
      });
      (localData?.attendanceLogs || []).forEach(localLog => {
        if (!localLog || !localLog.id) return;
        const existing = logMap.get(localLog.id);
        if (!existing) {
          logMap.set(localLog.id, localLog);
        } else {
          const localTime = new Date(localLog.updatedAt || localLog.lastBiometricPunchAt || localLog.checkOutTime || localLog.checkInTime || 0).getTime();
          const existingTime = new Date(existing.updatedAt || existing.lastBiometricPunchAt || existing.checkOutTime || existing.checkInTime || 0).getTime();
          const hasCheckOutLocal = localLog.checkOut && localLog.checkOut !== '--' && localLog.checkOut !== '--:--';
          const hasCheckOutExisting = existing.checkOut && existing.checkOut !== '--' && existing.checkOut !== '--:--';
          if ((!hasCheckOutExisting && hasCheckOutLocal) || localTime >= existingTime) {
            logMap.set(localLog.id, { ...existing, ...localLog });
          }
        }
      });
      const finalLogs = Array.from(logMap.values());

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

      return res.json({
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
        return res.json(clientData);
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
      if (type === 'update' && key === 'users' && query && updates) {
        try {
          await User.updateOne(query, { $set: updates });
        } catch (mongoErr) {
          console.warn('⚠️ Non-fatal Mongo user update warning:', mongoErr.message);
        }
      } else if (type === 'delete' && query) {
        try {
          if (key === 'leaveRequests') await LeaveRequest.deleteOne(query);
          else if (key === 'shiftSwaps') await ShiftSwap.deleteOne(query);
          else if (key === 'attendanceLogs') await AttendanceLog.deleteOne(query);
          else if (key === 'users') await User.deleteOne(query);
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
