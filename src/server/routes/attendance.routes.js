// src/server/routes/attendance.routes.js - Attendance & Mutation Express Routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getDbState, handleGranularMutation } = require('../controllers/attendance.controller');

router.get('/db-state', getDbState);
router.post('/mutate-granular', authenticateToken, handleGranularMutation);

module.exports = router;
