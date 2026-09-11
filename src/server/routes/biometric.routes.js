// src/server/routes/biometric.routes.js

const express = require('express');

const router =
  express.Router();

const {
  testDevice,
  getUsers,
  getLogs,
  syncAttendance
} =
  require('../controllers/biometric.controller');


/*
 * Device connection test
 */
router.get(
  '/biometric/test',
  testDevice
);


/*
 * Read K40 users
 */
router.get(
  '/biometric/users',
  getUsers
);


/*
 * Read K40 attendance logs
 */
router.get(
  '/biometric/logs',
  getLogs
);


/*
 * Manually synchronize
 */
router.post(
  '/biometric/sync',
  syncAttendance
);


module.exports = router;