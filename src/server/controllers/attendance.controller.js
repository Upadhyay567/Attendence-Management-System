// src/server/controllers/attendance.controller.js - Attendance & Mutation Handlers
const fs = require('fs');
const path = require('path');
const { 
  User, AttendanceLog, LeaveRequest, ShiftSwap, Schedule, Notice, OfficeCoordinate, AuditLog,
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
      stateObj[key].unshift(payload);
    }
  } else if (type === 'update' && query && updates) {
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

async function getDbState(req, res) {
  try {
    const online = await connectMongoose();
    const useLocal = getUseLocalFileDB();

    if (online && !useLocal) {
      const [users, attendanceLogs, leaveRequests, shiftSwaps, schedules, notices, officeCoords] = await Promise.all([
        User.find({}).lean(),
        AttendanceLog.find({}).lean(),
        LeaveRequest.find({}).lean(),
        ShiftSwap.find({}).lean(),
        Schedule.find({}).lean(),
        Notice.find({}).lean(),
        OfficeCoordinate.find({}).lean()
      ]);

      const officeCoordinatesObj = {};
      officeCoords.forEach(c => { officeCoordinatesObj[c.name] = { lat: c.lat, lng: c.lng }; });

      return res.json({
        users,
        attendanceLogs,
        leaveRequests,
        shiftSwaps,
        schedules,
        notices,
        officeCoordinates: officeCoordinatesObj
      });
    } else {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
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

    // Geofence Validation for attendance logs check-in
    if (key === 'attendanceLogs' && type === 'push' && payload && payload.latitude && payload.longitude) {
      const defaultOfficeLat = 28.6978;
      const defaultOfficeLng = 77.1408;
      const dist = calculateHaversineDistance(payload.latitude, payload.longitude, defaultOfficeLat, defaultOfficeLng);
      
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
  handleGranularMutation
};
