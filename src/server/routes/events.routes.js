// src/server/routes/events.routes.js - Real-Time Server-Sent Events (SSE) Stream
const express = require('express');
const router = express.Router();

const sseClients = new Set();

// Keep-alive heartbeat interval (15s) to prevent browser/OS connection suspension (net::ERR_NETWORK_IO_SUSPENDED)
const HEARTBEAT_INTERVAL_MS = 15000;
let heartbeatTimer = null;

function ensureHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    if (sseClients.size === 0) return;
    const deadClients = [];
    sseClients.forEach(client => {
      try {
        client.res.write(': keep-alive\n\n');
      } catch (err) {
        deadClients.push(client);
      }
    });
    deadClients.forEach(c => sseClients.delete(c));
  }, HEARTBEAT_INTERVAL_MS);
  if (heartbeatTimer.unref) heartbeatTimer.unref();
}

function broadcastSSEEvent(eventType, data = {}) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const deadClients = [];
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (err) {
      deadClients.push(client);
    }
  });
  deadClients.forEach(c => sseClients.delete(c));
}

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const client = { id: Date.now(), res };
  sseClients.add(client);
  ensureHeartbeat();

  // Retry interval tells browser to wait 5 seconds before reconnecting
  res.write(`retry: 5000\n\n`);
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientsCount: sseClients.size })}\n\n`);

  const cleanup = () => {
    sseClients.delete(client);
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
});

module.exports = {
  eventsRouter: router,
  broadcastSSEEvent,
  sseClients
};
