// src/server/routes/auth.routes.js - Authentication Express Routes
const express = require('express');
const router = express.Router();
const {
  loginUser,
  identifyUser,
  sendOtp,
  verifyOtp,
  resetPassword
} = require('../controllers/auth.controller');

router.post('/login', loginUser);
router.post('/identify', identifyUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
