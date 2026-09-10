// src/server/routes/audit.routes.js - Security Audit Log Routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

const LOCAL_DB_FILE = path.join(__dirname, '..', '..', '..', 'seed.json');

function createAuditRouter(AuditLogModel, getUseLocalFileDB) {
  router.get('/audit-logs', authenticateToken, requireRole(['hr', 'manager']), async (req, res) => {
    try {
      const useLocal = getUseLocalFileDB();
      let logs = [];
      
      if (AuditLogModel && AuditLogModel.db && AuditLogModel.db.readyState === 1 && !useLocal) {
        logs = await AuditLogModel.find({}).sort({ timestamp: -1 }).limit(100).lean();
      } else if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        logs = data.auditLogs || [];
      }
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve audit logs: ' + err.message });
    }
  });

  return router;
}

module.exports = createAuditRouter;
