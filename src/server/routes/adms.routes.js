// src/server/routes/adms.routes.js
// Express Router for ZKTeco ADMS / iClock HTTP Push Protocol & ADMS Management APIs

const express = require('express');
const admsController = require('../biometric/adms.controller');

const iclockRouter = express.Router();
const admsApiRouter = express.Router();

// =====================================================
// /iclock/* HARDWARE ENDPOINTS
// Called directly by ZKTeco biometric devices
// =====================================================

// Main data handshake and push endpoint
iclockRouter.get('/cdata', admsController.handleCdata);
iclockRouter.post('/cdata', admsController.handleCdata);

// Command polling endpoint
iclockRouter.get('/getrequest', admsController.handleGetRequest);

// Command result endpoint
iclockRouter.post('/devicecmd', admsController.handleDeviceCmd);

// Keepalive / ping endpoint
iclockRouter.get('/ping', admsController.handlePing);
iclockRouter.post('/ping', admsController.handlePing);

// Registration endpoint
iclockRouter.get('/registry', admsController.handleRegistry);
iclockRouter.post('/registry', admsController.handleRegistry);

// Cloud push endpoint
iclockRouter.all('/push', admsController.handlePush);


// =====================================================
// /api/adms/* MANAGEMENT & DASHBOARD ENDPOINTS
// Called by Web UI / Admin / Diagnostic tools
// =====================================================

// Check connected cloud push devices & active queue
admsApiRouter.get('/status', admsController.getStatus);

// Manually trigger discovery & pull users/logs from a device
admsApiRouter.post('/sync', admsController.triggerSync);

// Send arbitrary ADMS command to device
admsApiRouter.post('/command', admsController.sendCommand);

// Pull data from existing ZKTeco easy WDMS Cloud Server (203.115.110.93:8081)
const easywdmsService = require('../biometric/easywdms.service');
admsApiRouter.post('/wdms-sync', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and password for the ZKTeco easy WDMS server (203.115.110.93:8081)'
      });
    }

    const result = await easywdmsService.syncFromWDMS(username, password);
    return res.json({
      success: true,
      message: `Successfully synchronized from ZKTeco WDMS: ${result.terminalsCount} devices, ${result.employeesCount} employees, ${result.transactionsCount} punches`,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


module.exports = {
  iclockRouter,
  admsApiRouter
};
