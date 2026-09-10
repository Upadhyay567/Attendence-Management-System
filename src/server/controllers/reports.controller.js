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

    const baseSalary = targetUser.baseSalary || 50000;
    const hra = targetUser.allowanceHRA || Math.round(baseSalary * 0.15);
    const travel = targetUser.allowanceTravel || 3000;
    const grossSalary = baseSalary + hra + travel;

    const pf = targetUser.deductionPF || Math.round(baseSalary * 0.08);
    const pt = targetUser.deductionPT || 200;
    const tds = targetUser.deductionTDS || 500;
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

module.exports = {
  downloadAttendanceCSV,
  downloadPayslipPDF
};
