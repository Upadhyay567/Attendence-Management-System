// src/server/middleware/audit.middleware.js - Security & Compliance Audit Log Engine
const fs = require('fs');
const path = require('path');

const LOCAL_DB_FILE = path.join(__dirname, '..', '..', '..', 'seed.json');

async function recordAuditLog(AuditLogModel, useLocalFileDB, logData) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: logData.action || 'GENERAL_ACTION',
    userId: logData.userId || 'SYSTEM',
    userName: logData.userName || '',
    userRole: logData.userRole || '',
    details: logData.details || {},
    ipAddress: logData.ipAddress || '127.0.0.1'
  };

  try {
    if (AuditLogModel && AuditLogModel.db && AuditLogModel.db.readyState === 1 && !useLocalFileDB) {
      await AuditLogModel.create(entry);
    } else {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (!data.auditLogs) data.auditLogs = [];
        data.auditLogs.unshift(entry);
        if (data.auditLogs.length > 500) data.auditLogs.pop(); // Retain latest 500
        fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
    }
  } catch (err) {
    console.warn('⚠️ Non-fatal warning: failed to write security audit log:', err.message);
  }
}

module.exports = {
  recordAuditLog
};
