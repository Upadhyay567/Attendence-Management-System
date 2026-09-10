// src/server/routes/events.routes.js - Real-Time Server-Sent Events (SSE) Stream
const express = require('express');
const router = express.Router();

const sseClients = new Set();

function broadcastSSEEvent(eventType, data = {}) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  });
}

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { id: Date.now(), res };
  sseClients.add(client);

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientsCount: sseClients.size })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

module.exports = {
  eventsRouter: router,
  broadcastSSEEvent,
  sseClients
};
