// src/server/biometric/adms.controller.js
// Express Controller for ZKTeco ADMS / iClock HTTP Push Protocol

const admsService = require('./adms.service');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Main ADMS data communication endpoint: /iclock/cdata
 * GET: Device handshake & protocol negotiation
 * POST: Upload of ATTLOG (punches), USER (enrollments), BIODATA, OPERLOG
 */
async function handleCdata(req, res) {
  try {
    const sn = req.query.SN || req.query.sn || '';
    const clientIp = getClientIp(req);

    res.setHeader('Content-Type', 'text/plain');

    if (req.method === 'GET') {
      const responseText = await admsService.handleHandshake(sn, clientIp, req.query);
      return res.status(200).send(responseText);
    }

    if (req.method === 'POST') {
      const table = String(req.query.table || req.query.TABLE || '').trim().toUpperCase();
      const rawBody = req.body || '';

      switch (table) {
        case 'ATTLOG': {
          const result = await admsService.handleAttLog(sn, clientIp, rawBody, req.query);
          return res.status(200).send(result);
        }

        case 'USER':
        case 'USERINFO': {
          const result = await admsService.handleUserUpload(sn, clientIp, rawBody, req.query);
          return res.status(200).send(result);
        }

        case 'BIODATA':
        case 'FINGERTMP': {
          const result = await admsService.handleBioData(sn, clientIp, rawBody, req.query);
          return res.status(200).send(result);
        }

        case 'OPERLOG': {
          await admsService.trackDeviceHeartbeat(sn, clientIp, req.query);
          return res.status(200).send('OK');
        }

        case 'OPTIONS': {
          await admsService.trackDeviceHeartbeat(sn, clientIp, req.query);
          return res.status(200).send('OK');
        }

        default: {
          await admsService.trackDeviceHeartbeat(sn, clientIp, req.query);
          console.log(`ℹ️ [ADMS cdata] Unknown or unhandled table '${table}' from SN=${sn}. Returning OK.`);
          return res.status(200).send('OK');
        }
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('❌ [ADMS cdata] Error:', err);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('OK'); // Always return OK so device does not freeze
  }
}

/**
 * Command polling endpoint: /iclock/getrequest
 * Device queries server for pending commands
 */
async function handleGetRequest(req, res) {
  try {
    const sn = req.query.SN || req.query.sn || '';
    const clientIp = getClientIp(req);

    res.setHeader('Content-Type', 'text/plain');
    const commandResponse = await admsService.handleGetRequest(sn, clientIp, req.query);
    return res.status(200).send(commandResponse);
  } catch (err) {
    console.error('❌ [ADMS getrequest] Error:', err);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('OK');
  }
}

/**
 * Command result confirmation endpoint: /iclock/devicecmd
 */
async function handleDeviceCmd(req, res) {
  try {
    const sn = req.query.SN || req.query.sn || '';
    const clientIp = getClientIp(req);
    const rawBody = req.body || '';

    res.setHeader('Content-Type', 'text/plain');
    const result = await admsService.handleDeviceCmd(sn, clientIp, rawBody, req.query);
    return res.status(200).send(result);
  } catch (err) {
    console.error('❌ [ADMS devicecmd] Error:', err);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('OK');
  }
}

/**
 * Keepalive / ping endpoint: /iclock/ping
 */
async function handlePing(req, res) {
  const sn = req.query.SN || req.query.sn || '';
  const clientIp = getClientIp(req);
  await admsService.trackDeviceHeartbeat(sn, clientIp, req.query);
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
}

/**
 * Device registration endpoint: /iclock/registry
 */
async function handleRegistry(req, res) {
  const sn = req.query.SN || req.query.sn || '';
  const clientIp = getClientIp(req);
  await admsService.trackDeviceHeartbeat(sn, clientIp, req.query);
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('RegistryCode=OK');
}

/**
 * Cloud push endpoint: /iclock/push
 */
async function handlePush(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
}

/**
 * JSON Management API: GET /api/adms/status
 */
function getStatus(req, res) {
  return res.json(admsService.getAdmsStatus());
}

/**
 * JSON Management API: POST /api/adms/sync
 */
function triggerSync(req, res) {
  const sn = req.body?.serial || req.body?.sn || req.query?.sn || 'dev_zk_chattarpur';
  admsService.queueCommand(sn, 'INFO');
  admsService.queueCommand(sn, 'DATA QUERY USERINFO');
  admsService.queueCommand(sn, 'DATA QUERY ATTLOG');

  return res.json({
    success: true,
    message: `Commands queued for device ${sn}: INFO, DATA QUERY USERINFO, DATA QUERY ATTLOG`,
    serial: sn
  });
}

/**
 * JSON Management API: POST /api/adms/command
 */
function sendCommand(req, res) {
  const { sn, command } = req.body || {};
  if (!sn || !command) {
    return res.status(400).json({ error: 'Missing serial number (sn) or command' });
  }

  const queued = admsService.queueCommand(sn, command);
  return res.json({
    success: true,
    command: queued
  });
}

module.exports = {
  handleCdata,
  handleGetRequest,
  handleDeviceCmd,
  handlePing,
  handleRegistry,
  handlePush,
  getStatus,
  triggerSync,
  sendCommand
};
