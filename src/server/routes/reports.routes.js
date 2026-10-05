// src/server/routes/reports.routes.js - PDF & CSV Reports Routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { downloadAttendanceCSV, downloadPayslipPDF } = require('../controllers/reports.controller');

function createReportsRouter(User, AttendanceLog, getUseLocalFileDB) {
  router.get('/attendance-csv', authenticateToken, (req, res) => {
    downloadAttendanceCSV(req, res, User, AttendanceLog, getUseLocalFileDB());
  });

  router.get('/payslip-pdf', authenticateToken, (req, res) => {
    downloadPayslipPDF(req, res, User, getUseLocalFileDB());
  });

  // Profile download query route supporting userIds & location filtering
  router.post('/reports/profiles', async (req, res) => {
    try {
      const { userIds, location } = req.body || {};
      let users = [];
      const useLocal = typeof getUseLocalFileDB === 'function' ? getUseLocalFileDB() : true;
      if (useLocal) {
        const fs = require('fs');
        const path = require('path');
        const LOCAL_DB_FILE = path.join(__dirname, '..', '..', '..', 'seed.json');
        if (fs.existsSync(LOCAL_DB_FILE)) {
          const raw = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
          users = (raw.users || []).filter(u => u && u.status !== 'Inactive');
        }
      } else {
        users = await User.find({ status: { $ne: 'Inactive' } }).lean().catch(() => []);
      }

      const normalizeLocationName = (loc) => {
        if (!loc || typeof loc !== 'string') return '';
        const l = loc.trim();
        const lower = l.toLowerCase();
        if (lower === 'chattarpur') return 'Chattarpur Office';
        if (lower === 'omaxe office' || lower === 'surya omaxe') return 'Delhi Head Office';
        if (lower.includes('pitampura') || lower === 'hs group hq, pitampura, delhi') return 'PITAM PURA';
        return l;
      };

      const getUserPrimaryLocation = (u) => {
        if (!u) return 'Head Office';
        let loc = (u.preferredLocation && u.preferredLocation.trim()) ||
                  (Array.isArray(u.preferredLocations) && u.preferredLocations.find(l => l && l.trim())) ||
                  (Array.isArray(u.assignedLocations) && u.assignedLocations.find(l => l && l.trim())) ||
                  (u.workLocation && u.workLocation.trim()) ||
                  '';
        return loc ? normalizeLocationName(loc) : 'Head Office';
      };

      if (Array.isArray(userIds) && userIds.length > 0 && !userIds.includes('all')) {
        users = users.filter(u => userIds.includes(u.id) || (u.employeeId && userIds.includes(u.employeeId)));
      }

      if (location && location !== 'all') {
        const target = normalizeLocationName(location).toLowerCase().trim();
        users = users.filter(u => {
          const uLoc = getUserPrimaryLocation(u).toLowerCase().trim();
          return uLoc === target;
        });
      }

      return res.json({ success: true, profiles: users, count: users.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createReportsRouter;
module.exports.createReportsRouter = createReportsRouter;
