// server.js - Thin Server Launcher Engine (Imports Modular Architecture from src/server)
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const os = require('os');

const app = require('./src/server/app');
const { 
  mongoose, User, AttendanceLog, LeaveRequest, ShiftSwap, Schedule, Notice, OfficeCoordinate, AuditLog,
  connectMongoose, syncLocalToMongoOnBoot, getUseLocalFileDB, LOCAL_DB_FILE 
} = require('./src/server/config/db');

const {
  startBiometricScheduler
} = require('./src/server/biometric/biometricScheduler');

const { broadcastSSEEvent, sseClients } = require('./src/server/routes/events.routes');
const { recordAuditLog } = require('./src/server/middleware/audit.middleware');

const PORT = parseInt(process.env.PORT || '8080', 10);

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
    } catch (err) {}
  }
}

function startExpressServer(portToTry) {
  freePort(portToTry);
  const serverInstance = app.listen(portToTry, '0.0.0.0', async () => {
    console.log(`===================================================`);
    console.log(`  HS GROUP DELHI EXPRESS LIVE SERVER ACTIVE `);
    console.log(`  Local Laptop:  http://localhost:${portToTry}`);
    console.log(`  Mobile / LAN:  http://${localIP}:${portToTry}`);
    console.log(`===================================================`);

    await syncLocalToMongoOnBoot();

    startBiometricScheduler();

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

if (require.main === module) {
  startExpressServer(PORT);
}

module.exports = { 
  app, 
  connectMongoose, 
  mongoose, 
  User, 
  AttendanceLog, 
  OfficeCoordinate, 
  syncLocalToMongoOnBoot, 
  broadcastSSEEvent, 
  recordAuditLog 
};
