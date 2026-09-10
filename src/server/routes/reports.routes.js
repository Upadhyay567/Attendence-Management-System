// src/server/routes/reports.routes.js - PDF & CSV Reports Routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { downloadAttendanceCSV, downloadPayslipPDF } = require('../controllers/reports.controller');

function createReportsRouter(User, AttendanceLog, getUseLocalFileDB) {
  router.get('/attendance-csv', authenticateToken, (req, res) => {
    downloadAttendanceCSV(req, res, User, AttendanceLog, getUseLocalFileDB());
  });

  router.get('/payslip-pdf', authenticateToken, (req, res) => {
    downloadPayslipPDF(req, res, User, getUseLocalFileDB());
  });

  return router;
}

module.exports = createReportsRouter;
