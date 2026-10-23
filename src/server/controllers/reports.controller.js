// src/server/controllers/reports.controller.js - Printable PDF Payslip & CSV Register Generators
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const LOCAL_DB_FILE = path.join(__dirname, '..', '..', '..', 'seed.json');

async function downloadAttendanceCSV(req, res, User, AttendanceLog, useLocalFileDB) {
  try {
    let logs = [];
    let users = [];

    if (AttendanceLog && AttendanceLog.db && AttendanceLog.db.readyState === 1 && !useLocalFileDB) {
      logs = await AttendanceLog.find({}).lean();
      users = await User.find({}).lean();
    } else if (fs.existsSync(LOCAL_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
      logs = parsed.attendanceLogs || [];
      users = parsed.users || [];
    }

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    let csvContent = 'Date,Employee ID,Employee Name,Department,Check In,Check Out,Status,Location,Coordinates,Distance (km)\n';
    logs.forEach(l => {
      const u = userMap[l.userId] || {};
      const empId = (u.employeeId || 'N/A').replace(/,/g, '');
      const empName = (u.name || 'Unknown').replace(/,/g, '');
      const dept = (u.department || 'N/A').replace(/,/g, '');
      const loc = (l.location || 'Office HQ').replace(/,/g, '');
      const coords = (l.coords || '').replace(/,/g, '');

      csvContent += `"${l.date || ''}","${empId}","${empName}","${dept}","${l.checkIn || '--:--'}","${l.checkOut || '--:--'}","${l.status || ''}","${loc}","${coords}","${l.distance || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Attendance_Register_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate attendance CSV report: ' + err.message });
  }
}

async function downloadPayslipPDF(req, res, User, useLocalFileDB) {
  try {
    const { employeeId } = req.query;
    let targetUser = null;

    if (User && User.db && User.db.readyState === 1 && !useLocalFileDB) {
      if (employeeId) {
        targetUser = await User.findOne({ $or: [{ employeeId: employeeId }, { id: employeeId }] }).lean();
      }
      if (!targetUser && req.user) {
        targetUser = await User.findOne({ id: req.user.id }).lean();
      }
    } else if (fs.existsSync(LOCAL_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
      const users = parsed.users || [];
      if (employeeId) {
        targetUser = users.find(u => u.employeeId === employeeId || u.id === employeeId);
      }
      if (!targetUser && req.user) {
        targetUser = users.find(u => u.id === req.user.id);
      }
    }

    if (!targetUser) {
      return res.status(404).send('<h2>Employee record not found for payslip generation.</h2>');
    }

    const baseSalary = targetUser.baseSalary !== undefined && targetUser.baseSalary !== null ? Number(targetUser.baseSalary) : 0;
    const hra = targetUser.allowanceHRA !== undefined && targetUser.allowanceHRA !== null ? Number(targetUser.allowanceHRA) : 0;
    const travel = targetUser.allowanceTravel !== undefined && targetUser.allowanceTravel !== null ? Number(targetUser.allowanceTravel) : 0;
    const grossSalary = baseSalary + hra + travel;

    const pf = targetUser.deductionPF !== undefined && targetUser.deductionPF !== null ? Number(targetUser.deductionPF) : 0;
    const pt = targetUser.deductionPT !== undefined && targetUser.deductionPT !== null ? Number(targetUser.deductionPT) : 0;
    const tds = targetUser.deductionTDS !== undefined && targetUser.deductionTDS !== null ? Number(targetUser.deductionTDS) : 0;
    const totalDeductions = pf + pt + tds;

    const netSalary = grossSalary - totalDeductions;
    const monthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payslip - <%= user.name %></title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #f8fafc; }
          .payslip-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding: 40px; border: 1px solid #e2e8f0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #89201B; padding-bottom: 20px; margin-bottom: 30px; }
          .company-title { font-size: 24px; font-weight: 800; color: #89201B; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .payslip-badge { background: #fef3c7; color: #92400e; font-weight: 700; padding: 6px 16px; border-radius: 20px; font-size: 13px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
          .meta-item { font-size: 13.5px; }
          .meta-item span { color: #64748b; }
          .meta-item strong { color: #0f172a; }
          .table-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
          th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 10px; color: #475569; }
          td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
          .amount { text-align: right; font-weight: 600; }
          .net-salary-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 20px 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; margin-top: 20px; }
          .footer-note { font-size: 11px; text-align: center; color: #94a3b8; margin-top: 40px; }
          @media print { body { background: none; padding: 0; } .payslip-card { box-shadow: none; border: none; } }
        </style>
      </head>
      <body>
        <div class="payslip-card">
          <div class="header">
            <div>
              <h1 class="company-title">SURYA GROUP / HS ENTERPRISES</h1>
              <div class="subtitle">Official Monthly Salary Payslip & Tax Summary</div>
            </div>
            <div class="payslip-badge">PAYSLIP FOR <%= monthYear %></div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><span>Employee Name:</span> <strong><%= user.name %></strong></div>
            <div class="meta-item"><span>Employee ID:</span> <strong><%= user.employeeId || 'N/A' %></strong></div>
            <div class="meta-item"><span>Department:</span> <strong><%= user.department || 'General' %></strong></div>
            <div class="meta-item"><span>Designation:</span> <strong><%= user.designation || 'Staff' %></strong></div>
            <div class="meta-item"><span>Joining Date:</span> <strong><%= user.dateOfJoining || 'N/A' %></strong></div>
            <div class="meta-item"><span>Phone:</span> <strong><%= user.phone || 'N/A' %></strong></div>
          </div>

          <div class="table-section">
            <div>
              <h3 style="font-size:15px; color:#10b981; margin-bottom:12px">💵 EARNINGS</h3>
              <table>
                <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
                <tbody>
                  <tr><td>Basic Salary</td><td class="amount">₹<%= baseSalary.toLocaleString() %></td></tr>
                  <tr><td>House Rent Allowance (HRA)</td><td class="amount">₹<%= hra.toLocaleString() %></td></tr>
                  <tr><td>Special Travel Allowance</td><td class="amount">₹<%= travel.toLocaleString() %></td></tr>
                  <tr style="font-weight:700; background:#f8fafc"><td>Gross Earnings</td><td class="amount">₹<%= grossSalary.toLocaleString() %></td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 style="font-size:15px; color:#ef4444; margin-bottom:12px">📉 DEDUCTIONS</h3>
              <table>
                <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
                <tbody>
                  <tr><td>Provident Fund (PF)</td><td class="amount">₹<%= pf.toLocaleString() %></td></tr>
                  <tr><td>Professional Tax (PT)</td><td class="amount">₹<%= pt.toLocaleString() %></td></tr>
                  <tr><td>Tax Deducted at Source (TDS)</td><td class="amount">₹<%= tds.toLocaleString() %></td></tr>
                  <tr style="font-weight:700; background:#f8fafc"><td>Total Deductions</td><td class="amount">₹<%= totalDeductions.toLocaleString() %></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="net-salary-box">
            <span>NET TAKE-HOME SALARY:</span>
            <span>₹<%= netSalary.toLocaleString() %></span>
          </div>

          <div class="footer-note">
            This is a computer-generated official document. No physical signature is required. Generated on <%= new Date().toLocaleDateString() %>.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const renderedHTML = ejs.render(htmlTemplate, { user: targetUser, monthYear, baseSalary, hra, travel, grossSalary, pf, pt, tds, totalDeductions, netSalary });
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderedHTML);
  } catch (err) {
    res.status(500).send('<h2>Failed to generate payslip PDF: ' + err.message + '</h2>');
  }
}

/**
 * Generate Excel Bulk Upload Data Template with native Data Validation Dropdowns for:
 * 1. Work Location (Column F) - From database officeCoordinates & schedules
 * 2. Assigned Shift (Column Q) - From database schedules
 * 3. Blood Group (Column L) - Predefined options
 * 4. Gender (Column K) - Predefined options
 */
async function downloadBulkUploadTemplateExcel(req, res) {
  try {
    const ExcelJS = require('exceljs');
    let state = {};
    if (fs.existsSync(LOCAL_DB_FILE)) {
      try {
        state = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
      } catch (_) {}
    }

    // 1. Fetch available work locations from database records
    const locSet = new Set();
    const officeCoords = state.officeCoordinates || {};
    Object.keys(officeCoords).forEach(loc => {
      if (!loc || typeof loc !== 'string') return;
      const clean = loc.trim();
      const lower = clean.toLowerCase();
      if (!lower.includes('close') && !lower.includes('(') && !lower.includes('mock') && lower !== 'none' && lower !== '--') {
        locSet.add(clean);
      }
    });
    (state.schedules || []).forEach(s => {
      if (s && s.location && typeof s.location === 'string') {
        const clean = s.location.trim();
        if (clean && !clean.toLowerCase().includes('close') && !clean.includes('(')) {
          locSet.add(clean);
        }
      }
    });
    locSet.add('Delhi Head Office');
    locSet.add('HS Office');
    const workLocations = Array.from(locSet).sort((a, b) => a.localeCompare(b));

    // 2. Fetch available shifts from database records
    const shiftSet = new Set();
    (state.schedules || []).forEach(s => {
      if (s && s.name && typeof s.name === 'string') {
        const clean = s.name.trim();
        if (clean) shiftSet.add(clean);
      }
    });
    shiftSet.add('General Shift');
    shiftSet.add('Morning Shift 900');
    shiftSet.add('Afternoon shift');
    const assignedShifts = Array.from(shiftSet);

    // 3. Predefined Blood Group options
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    // 4. Predefined Gender options
    const genders = ['Male', 'Female', 'Other'];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'HS Group Delhi';
    wb.created = new Date();

    const ws = wb.addWorksheet('Employees Template');
    const refWs = wb.addWorksheet('ReferenceLists');
    refWs.state = 'hidden';

    // Populate reference sheet for data validation dropdowns
    workLocations.forEach((loc, i) => { refWs.getCell(i + 1, 1).value = loc; });
    assignedShifts.forEach((s, i) => { refWs.getCell(i + 1, 2).value = s; });
    genders.forEach((g, i) => { refWs.getCell(i + 1, 3).value = g; });
    bloodGroups.forEach((b, i) => { refWs.getCell(i + 1, 4).value = b; });

    const locRange = `ReferenceLists!$A$1:$A$${workLocations.length}`;
    const shiftRange = `ReferenceLists!$B$1:$B$${assignedShifts.length}`;
    const genderRange = `ReferenceLists!$C$1:$C$${genders.length}`;
    const bgRange = `ReferenceLists!$D$1:$D$${bloodGroups.length}`;

    // Exactly 26 standard columns in exact specified sequence
    ws.columns = [
      { header: 'Employee ID', key: 'empId', width: 16 },
      { header: 'Employee Name', key: 'name', width: 22 },
      { header: 'Department', key: 'dept', width: 20 },
      { header: 'Designation', key: 'desig', width: 22 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Work Location', key: 'location', width: 24 }, // Column F
      { header: 'Mobile Number', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Date of Joining', key: 'doj', width: 16 },
      { header: 'Date of Birth', key: 'dob', width: 16 },
      { header: 'Gender', key: 'gender', width: 14 }, // Column K
      { header: 'Blood Group', key: 'bloodGroup', width: 14 }, // Column L
      { header: 'Pincode', key: 'pincode', width: 14 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'Biometric User ID', key: 'bioId', width: 18 },
      { header: 'Assigned Shift', key: 'shift', width: 22 }, // Column Q
      { header: 'Base Salary', key: 'base', width: 14 },
      { header: 'HRA', key: 'hra', width: 12 },
      { header: 'Travel Allowance', key: 'ta', width: 18 },
      { header: 'PF', key: 'pf', width: 12 },
      { header: 'PT', key: 'pt', width: 12 },
      { header: 'Bank Name', key: 'bank', width: 22 },
      { header: 'Account Number', key: 'account', width: 20 },
      { header: 'IFSC Code', key: 'ifsc', width: 16 },
      { header: 'UAN Number', key: 'uan', width: 18 }
    ];

    // Style Header Row
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF89201B' }
    };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 26;

    // Add standard sample rows
    ws.addRow({
      empId: 'EMP101',
      name: 'Rahul Sharma',
      dept: 'Engineering',
      desig: 'Software Developer',
      branch: 'Delhi Head Office',
      location: 'Delhi Head Office',
      phone: '+91 9876543210',
      email: 'rahul.sharma@example.com',
      doj: '2024-05-15',
      dob: '1995-08-20',
      gender: 'Male',
      bloodGroup: 'B+',
      pincode: '110001',
      city: 'New Delhi',
      state: 'Delhi',
      bioId: '101',
      shift: 'General Shift',
      base: 45000,
      hra: 6750,
      ta: 2000,
      pf: 1800,
      pt: 200,
      bank: 'State Bank of India',
      account: '987654321012',
      ifsc: 'SBIN0001234',
      uan: '100987654321'
    });

    ws.addRow({
      empId: 'EMP102',
      name: 'Priya Verma',
      dept: 'Human Resources',
      desig: 'HR Executive',
      branch: 'HS Office',
      location: 'HS Office',
      phone: '+91 9812345678',
      email: 'priya.verma@example.com',
      doj: '2024-06-01',
      dob: '1998-03-12',
      gender: 'Female',
      bloodGroup: 'O+',
      pincode: '110006',
      city: 'Delhi',
      state: 'Delhi',
      bioId: '102',
      shift: 'General Shift',
      base: 38000,
      hra: 5700,
      ta: 1500,
      pf: 1800,
      pt: 200,
      bank: 'HDFC Bank',
      account: '50100234567891',
      ifsc: 'HDFC0000123',
      uan: '100987654322'
    });

    // Apply data validations ONLY to the four specified columns (rows 2 to 500)
    for (let r = 2; r <= 500; r++) {
      // 1. Work Location (Column F)
      ws.getCell(`F${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [locRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Location',
        error: 'Please select an available work location from the dropdown list.'
      };

      // 4. Gender (Column K)
      ws.getCell(`K${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [genderRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Gender',
        error: 'Please select a valid gender option from the dropdown list.'
      };

      // 3. Blood Group (Column L)
      ws.getCell(`L${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [bgRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Blood Group',
        error: 'Please select a valid blood group option from the dropdown list.'
      };

      // 2. Assigned Shift (Column Q)
      ws.getCell(`Q${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [shiftRange],
        showErrorMessage: true,
        errorTitle: 'Invalid Shift',
        error: 'Please select an available shift from the dropdown list.'
      };
    }

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Employee_Bulk_Upload_Template.xlsx"');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Failed to generate bulk upload template:', err);
    return res.status(500).json({ error: 'Failed to generate bulk upload template: ' + err.message });
  }
}

module.exports = {
  downloadAttendanceCSV,
  downloadPayslipPDF,
  downloadBulkUploadTemplateExcel
};
