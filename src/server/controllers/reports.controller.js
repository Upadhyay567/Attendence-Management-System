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
    let allLogs = [];
    let allSchedules = [];
    let allLeaves = [];
    let allAdjustments = [];

    if (User && User.db && User.db.readyState === 1 && !useLocalFileDB) {
      if (employeeId) {
        targetUser = await User.findOne({ $or: [{ employeeId: employeeId }, { id: employeeId }] }).lean();
      }
      if (!targetUser && req.user) {
        targetUser = await User.findOne({ id: req.user.id }).lean();
      }
      const AttendanceLogModel = User.db.models.AttendanceLog;
      const ScheduleModel = User.db.models.Schedule;
      const LeaveRequestModel = User.db.models.LeaveRequest;
      const AdjustmentModel = User.db.models.PayrollAdjustment;

      if (AttendanceLogModel) allLogs = await AttendanceLogModel.find({}).lean();
      if (ScheduleModel) allSchedules = await ScheduleModel.find({}).lean();
      if (LeaveRequestModel) allLeaves = await LeaveRequestModel.find({}).lean();
      if (AdjustmentModel) allAdjustments = await AdjustmentModel.find({}).lean();
    } else if (fs.existsSync(LOCAL_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf-8'));
      const users = parsed.users || [];
      if (employeeId) {
        targetUser = users.find(u => u.employeeId === employeeId || u.id === employeeId);
      }
      if (!targetUser && req.user) {
        targetUser = users.find(u => u.id === req.user.id);
      }
      allLogs = parsed.attendanceLogs || [];
      allSchedules = parsed.schedules || [];
      allLeaves = parsed.leaves || parsed.leaveRequests || [];
      allAdjustments = parsed.payrollAdjustments || [];
    }

    if (!targetUser) {
      return res.status(404).send('<h2>Employee record not found for payslip generation.</h2>');
    }

    const now = new Date();
    let month = req.query.month !== undefined ? Number(req.query.month) : now.getMonth();
    let year = req.query.year !== undefined ? Number(req.query.year) : now.getFullYear();
    if (req.query.month !== undefined && month >= 1 && month <= 12 && req.query.isZeroIndexed !== 'true') {
      month = month - 1;
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const baseSalary = targetUser.baseSalary !== undefined && targetUser.baseSalary !== null ? Number(targetUser.baseSalary) : 0;
    const exactDailyRate = totalDays > 0 ? (baseSalary / totalDays) : 0;
    const dailyRate = Math.round(exactDailyRate);

    const sched = allSchedules.find(s => s.id === targetUser.scheduleId) || {
      name: 'Standard Day Shift',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriod: 15,
      halfDayLimit: 200,
      workDays: [1, 2, 3, 4, 5]
    };
    const scheduledWorkDaysList = (sched.workDays && Array.isArray(sched.workDays) && sched.workDays.length > 0)
      ? sched.workDays
      : [1, 2, 3, 4, 5];

    // Filter logs for this user and month
    const userLogs = allLogs.filter(l => {
      if (!l.date || !l.date.startsWith(monthPrefix)) return false;
      return (l.userId === targetUser.id || l.employeeId === targetUser.id || l.employeeId === targetUser.employeeId || (targetUser.biometricUserId && l.biometricUserId === targetUser.biometricUserId));
    });

    const logByDate = new Map();
    userLogs.forEach(l => {
      if (!logByDate.has(l.date) || (!logByDate.get(l.date).checkIn && l.checkIn)) {
        logByDate.set(l.date, l);
      }
    });

    const approvedLeaves = allLeaves.filter(lv => (lv.userId === targetUser.id || lv.employeeId === targetUser.employeeId) && lv.status === 'Approved');
    const isDateOnApprovedLeave = (dateStr) => {
      for (let i = 0; i < approvedLeaves.length; i++) {
        const lv = approvedLeaves[i];
        const start = (lv.startDate || '').substring(0, 10);
        const end = (lv.endDate || '').substring(0, 10);
        if (dateStr >= start && dateStr <= end) return true;
      }
      return false;
    };

    // 200-minute rule status evaluator
    const evaluateLogStatus = (log, scheduleObj, dateStr, isPastDate) => {
      if (!log) return 'Absent';
      if (log.status === 'Half Day') return 'Half Day';
      if (!log.checkIn && !log.checkOut) return log.status || 'Absent';
      if (!log.checkIn && log.checkOut) return 'Half Day';
      if (log.checkIn && !log.checkOut && isPastDate) return 'Half Day';

      const [inH, inM] = log.checkIn.split(':').map(Number);
      const inMins = (inH || 0) * 60 + (inM || 0);
      const startH = (scheduleObj && scheduleObj.startTime) ? Number(scheduleObj.startTime.split(':')[0]) : 9;
      const startM = (scheduleObj && scheduleObj.startTime) ? Number(scheduleObj.startTime.split(':')[1]) : 0;
      const startMins = startH * 60 + startM;
      const grace = (scheduleObj && scheduleObj.gracePeriod !== undefined) ? Number(scheduleObj.gracePeriod) : 15;
      const halfDayLimit = (scheduleObj && scheduleObj.halfDayLimit !== undefined) ? Number(scheduleObj.halfDayLimit) : 200;

      if (inMins >= startMins + halfDayLimit) return 'Half Day';

      if (log.checkOut) {
        const [outH, outM] = log.checkOut.split(':').map(Number);
        const outMins = (outH || 0) * 60 + (outM || 0);
        let workMins = outMins - inMins;
        if (workMins < 0) workMins += 24 * 60;

        let expectedMins = 8 * 60;
        let endMins = 17 * 60;
        if (scheduleObj && scheduleObj.startTime && scheduleObj.endTime) {
          const [endH, endM] = scheduleObj.endTime.split(':').map(Number);
          endMins = (endH * 60 + (endM || 0));
          expectedMins = endMins - startMins;
          if (expectedMins < 0) expectedMins += 24 * 60;
        }

        // 200-minute rule: early departure exceeding half-day limit cutoff (leaving >= 200m before shift end)
        if (scheduleObj && scheduleObj.endTime) {
          const earlyDepartureMins = endMins - outMins;
          if (earlyDepartureMins >= halfDayLimit) return 'Half Day';
        }

        const halfDayThreshold = expectedMins > 0 ? (expectedMins / 2) : 240;
        if (workMins < halfDayThreshold || workMins < 240) return 'Half Day';
      }

      if (inMins > startMins + grace) return 'Late';
      return 'On Time';
    };

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const isPastMonth = (year < currentYear) || (year === currentYear && month < currentMonth);
    const isCurrentMonth = (year === currentYear && month === currentMonth);
    const maxElapsedDay = isPastMonth ? totalDays : (isCurrentMonth ? Math.min(currentDay, totalDays) : 0);
    const isPartialMonth = isCurrentMonth && (maxElapsedDay < totalDays);

    let joinDay = 1;
    if (targetUser.dateOfJoining) {
      const [jY, jM, jD] = targetUser.dateOfJoining.split('-').map(Number);
      if (jY === year && (jM - 1) === month) {
        joinDay = Math.max(1, jD);
      } else if (jY > year || (jY === year && (jM - 1) > month)) {
        joinDay = totalDays + 1;
      }
    }

    let scheduledWorkDays = 0;
    let scheduledPresentDays = 0;
    let weeklyOffPresentDays = 0;
    let sundayPresentDays = 0;
    let sundayPresentUnits = 0;
    let weeklyOffDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let approvedLeaveDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(year, month, d);
      const dow = dt.getDay();
      const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const isSched = scheduledWorkDaysList.includes(dow);
      const isSun = (dow === 0);
      const isElapsed = (d <= maxElapsedDay);
      const isEmployed = (d >= joinDay);
      const log = logByDate.get(dateStr);
      const hasPunch = !!(log && (log.checkIn || log.checkOut));
      const onLeave = isDateOnApprovedLeave(dateStr);
      const isCompletedDay = (d < currentDay || isPastMonth);

      if (isSched) {
        scheduledWorkDays++;
        if (isElapsed) {
          if (hasPunch) {
            scheduledPresentDays++;
            const status = evaluateLogStatus(log, sched, dateStr, isCompletedDay);
            if (status === 'Late') lateDays++;
            if (status === 'Half Day') halfDays++;
          } else if (onLeave) {
            approvedLeaveDays++;
          } else if (onLeave) {
            approvedLeaveDays++;
          } else if (isEmployed && isCompletedDay) {
            absentDays++;
          }
        }
      } else {
        if (isElapsed) {
          if (hasPunch) {
            weeklyOffPresentDays++;
            const status = evaluateLogStatus(log, sched, dateStr, isCompletedDay);
            if (isSun) {
              sundayPresentDays++;
              sundayPresentUnits += (status === 'Half Day' ? 0.5 : 1.0);
            }
            if (status === 'Late') lateDays++;
            if (status === 'Half Day') halfDays++;
          } else {
            weeklyOffDays++;
          }
        }
      }
    }

    const presentDays = scheduledPresentDays + weeklyOffPresentDays;
    const sundaySalary = (sundayPresentUnits > 0 && exactDailyRate > 0)
      ? Math.round(sundayPresentUnits * exactDailyRate)
      : 0;

    // 2-Day Weekly Rule for elapsed Sundays
    let unpaidSundayDays = 0;
    for (let d = 1; d <= maxElapsedDay; d++) {
      const dt = new Date(year, month, d);
      if (dt.getDay() !== 0) continue;
      const sunDateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const workedSun = logByDate.has(sunDateStr) && !!(logByDate.get(sunDateStr).checkIn || logByDate.get(sunDateStr).checkOut);
      if (workedSun) continue;

      let leavesInWeek = 0;
      for (let offset = 6; offset >= 1; offset--) {
        const prevDay = d - offset;
        let checkDateStr;
        let checkDow;

        if (prevDay >= 1) {
          const pDt = new Date(year, month, prevDay);
          checkDow = pDt.getDay();
          checkDateStr = `${monthPrefix}-${String(prevDay).padStart(2, '0')}`;
        } else {
          const pDt = new Date(year, month, prevDay);
          checkDow = pDt.getDay();
          const pY = pDt.getFullYear();
          const pM = String(pDt.getMonth() + 1).padStart(2, '0');
          const pD = String(pDt.getDate()).padStart(2, '0');
          checkDateStr = `${pY}-${pM}-${pD}`;
        }

        if (scheduledWorkDaysList.includes(checkDow)) {
          if (isDateOnApprovedLeave(checkDateStr)) {
            leavesInWeek += 1.0;
          } else {
            const l = logByDate.get(checkDateStr) || allLogs.find(x => x.date === checkDateStr && (x.userId === targetUser.id || x.employeeId === targetUser.employeeId));
            if (l && (l.checkIn || l.checkOut)) {
              const st = evaluateLogStatus(l, sched, checkDateStr, true);
              if (st === 'Half Day') leavesInWeek += 0.5;
            } else if (userLogs.length > 0) {
              leavesInWeek += 1.0;
            }
          }
        }
      }

      if (leavesInWeek >= 2.0) {
        unpaidSundayDays++;
      }
    }

    const todayDateStr = `${monthPrefix}-${String(currentDay).padStart(2, '0')}`;
    const todayLog = logByDate.get(todayDateStr);
    const hasTodayPunch = Boolean(todayLog && (todayLog.checkIn || todayLog.checkOut));
    const periodDays = isPastMonth ? totalDays : (isCurrentMonth ? (hasTodayPunch ? currentDay : Math.max(1, currentDay - 1)) : 0);
    const eligiblePaidDays = Math.max(0, periodDays - absentDays - unpaidSundayDays - (halfDays * 0.5));

    // Prorated Nominal Base Salary
    const periodNominalBase = isPartialMonth ? Math.round(periodDays * exactDailyRate) : baseSalary;
    const absentDeduction = Math.round(absentDays * exactDailyRate);
    const sundayDeduction = Math.round(unpaidSundayDays * exactDailyRate);
    const halfDayDeduction = Math.round(halfDays * 0.5 * exactDailyRate);
    const attendanceDeductions = absentDeduction + sundayDeduction + halfDayDeduction;

    const earnedBaseSalary = Math.max(0, periodNominalBase - attendanceDeductions);

    const fullHRA = targetUser.allowanceHRA !== undefined && targetUser.allowanceHRA !== null ? Number(targetUser.allowanceHRA) : 0;
    const fullTravel = targetUser.allowanceTravel !== undefined && targetUser.allowanceTravel !== null ? Number(targetUser.allowanceTravel) : 0;
    const fullCCA = targetUser.allowanceCCA !== undefined && targetUser.allowanceCCA !== null ? Number(targetUser.allowanceCCA) : 0;
    const fullPerformance = targetUser.allowancePerformance !== undefined && targetUser.allowancePerformance !== null ? Number(targetUser.allowancePerformance) : 0;
    const fullBaseOther = targetUser.allowanceOther !== undefined && targetUser.allowanceOther !== null ? Number(targetUser.allowanceOther) : 0;

    const hra = isPartialMonth ? Math.round((fullHRA / totalDays) * periodDays) : fullHRA;
    const travel = isPartialMonth ? Math.round((fullTravel / totalDays) * periodDays) : fullTravel;
    const cca = isPartialMonth ? Math.round((fullCCA / totalDays) * periodDays) : fullCCA;
    const performance = isPartialMonth ? Math.round((fullPerformance / totalDays) * periodDays) : fullPerformance;
    const baseOther = isPartialMonth ? Math.round((fullBaseOther / totalDays) * periodDays) : fullBaseOther;
    const otherAllowances = baseOther + sundaySalary;

    // Statutory Bonus Parameters (Payment of Bonus Act, 1965):
    // - Bonus Eligibility Wage Ceiling: ₹21,000/month
    // - Minimum Bonus Calculation Base: ₹7,000/month or applicable minimum wage, whichever is higher
    // - Minimum Bonus Rate: 8.33% annually
    // - Maximum Bonus Rate: 20% annually
    const bonusEligibilityCeiling = 21000;
    const isBonusEligible = baseSalary <= bonusEligibilityCeiling;
    const applicableMinWage = Number(targetUser.applicableMinimumWage || 7000);
    const minBonusBase = Math.max(7000, applicableMinWage);
    const bonusCalculationBase = isBonusEligible ? Math.min(baseSalary, minBonusBase) : 0;
    const minStatutoryBonusMonthly = isBonusEligible ? Math.round(bonusCalculationBase * 0.0833) : 0;
    const maxStatutoryBonusMonthly = isBonusEligible ? Math.round(bonusCalculationBase * 0.20) : 0;
    const statutoryBonus = minStatutoryBonusMonthly;

    const adj = allAdjustments.find(a => a.userId === targetUser.id && a.month === month && a.year === year);
    let bonus = 0;
    if (adj && adj.bonus !== undefined && adj.bonus !== null) {
      bonus = Number(adj.bonus) || 0;
    } else if (targetUser.bonus !== undefined && targetUser.bonus !== null && Number(targetUser.bonus) > 0) {
      bonus = Number(targetUser.bonus);
    } else if (isBonusEligible) {
      bonus = statutoryBonus;
    }
    if (isBonusEligible && bonus > 0 && bonus < statutoryBonus) {
      bonus = statutoryBonus;
    }

    const adhocDeduction = adj ? (Number(adj.deduction) || 0) : 0;

    const periodGrossSalary = periodNominalBase + hra + travel + cca + performance + otherAllowances + bonus;
    const earnedGrossSalary = earnedBaseSalary + hra + travel + cca + performance + otherAllowances + bonus;
    const fullMonthlyGross = baseSalary + fullHRA + fullTravel + fullCCA + fullPerformance + fullBaseOther + sundaySalary + bonus;

    // Statutory EPF Contribution Parameters:
    // - Employee EPF Contribution: 12% of applicable PF wages
    // - EPF Wage Ceiling: ₹15,000/month (statutory EPFO) or ₹25,000/month (CTC tracker rules)
    const epfWageCeiling = Number(targetUser.epfWageCeiling) || 25000;
    const pfNominalWage = isPartialMonth ? periodNominalBase : baseSalary;
    const applicablePFWage = Math.min(pfNominalWage, epfWageCeiling);
    const isPFApplicable = (targetUser.pfApplicable !== false) && (targetUser.isPFExempt !== true) && (targetUser.pfExempt !== true);
    const pf = isPFApplicable ? Math.round(applicablePFWage * 0.12) : 0;

    // Statutory ESI Contribution Parameters:
    // - Employee ESI Contribution: 0.75% of eligible ESI wages
    // - ESI Wage Ceiling: ₹21,000/month
    const esiWageCeiling = 21000;
    const monthlyGrossForESI = baseSalary + fullHRA + fullTravel + fullCCA + fullPerformance + fullBaseOther + sundaySalary;
    const isESIEligible = (monthlyGrossForESI <= esiWageCeiling) || (baseSalary <= esiWageCeiling);
    let esi = 0;
    if (isESIEligible) {
      const eligibleESIWages = Math.max(0, periodGrossSalary - (bonus > 0 ? bonus : 0));
      esi = Math.round(eligibleESIWages * 0.0075);
    }

    // Statutory Gratuity Provision Parameters:
    // - Gratuity Provision Rate: 4.81% of Basic + DA (estimated)
    const basicForGratuity = isPartialMonth ? periodNominalBase : baseSalary;
    const daAmount = Number(targetUser.allowanceDA || 0);
    const gratuityBasis = basicForGratuity + daAmount;
    const gratuityProvision = Math.round(gratuityBasis * 0.0481);
    const gratuityRate = '4.81%';

    const advance = targetUser.deductionAdvance !== undefined && targetUser.deductionAdvance !== null ? Number(targetUser.deductionAdvance) : 0;
    const otherDeductions = targetUser.deductionOther !== undefined && targetUser.deductionOther !== null ? Number(targetUser.deductionOther) : 0;
    const tdsRate = targetUser.deductionTDS !== undefined && targetUser.deductionTDS !== null ? Number(targetUser.deductionTDS) : 0;
    const tds = Math.round(earnedGrossSalary * (tdsRate / 100));

    const statutoryDeductions = pf + esi + advance + otherDeductions + tds;
    const totalDeductions = attendanceDeductions + statutoryDeductions + adhocDeduction;
    const netSalary = Math.max(0, periodGrossSalary - totalDeductions);

    const periodLabel = isPartialMonth
      ? `${monthNames[month]} 1 – ${monthNames[month]} ${periodDays}, ${year} (Partial Month: ${periodDays}/${totalDays} days)`
      : `${monthNames[month]} ${year}`;

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payslip - <%= user.name %> (<%= periodLabel %>)</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background: #f8fafc; }
          .payslip-card { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); padding: 40px; border: 1px solid #e2e8f0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #89201B; padding-bottom: 20px; margin-bottom: 24px; }
          .company-title { font-size: 24px; font-weight: 800; color: #89201B; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .payslip-badge { background: #fef3c7; color: #92400e; font-weight: 700; padding: 6px 16px; border-radius: 20px; font-size: 12.5px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f1f5f9; padding: 18px 20px; border-radius: 12px; margin-bottom: 20px; }
          .meta-item { font-size: 13px; }
          .meta-item span { color: #64748b; }
          .meta-item strong { color: #0f172a; }
          .attendance-banner { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 10px; margin-bottom: 24px; text-align: center; }
          .att-box span { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
          .att-box strong { font-size: 14px; color: #0f172a; }
          .table-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 9px; color: #475569; }
          td { border-bottom: 1px solid #e2e8f0; padding: 9px; }
          .amount { text-align: right; font-weight: 600; }
          .net-salary-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 18px 26px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; margin-top: 10px; }
          .footer-note { font-size: 11px; text-align: center; color: #94a3b8; margin-top: 32px; }
          @media print { body { background: none; padding: 0; } .payslip-card { box-shadow: none; border: none; } }
        </style>
      </head>
      <body>
        <div class="payslip-card">
          <div class="header">
            <div>
              <h1 class="company-title">SURYA GROUP / HS ENTERPRISES</h1>
              <div class="subtitle">Official Salary Statement & Statutory Tax Summary</div>
            </div>
            <div class="payslip-badge"><%= periodLabel %></div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><span>Employee Name:</span> <strong><%= user.name %></strong></div>
            <div class="meta-item"><span>Employee ID:</span> <strong><%= user.employeeId || 'N/A' %></strong></div>
            <div class="meta-item"><span>Department:</span> <strong><%= user.department || 'General' %></strong></div>
            <div class="meta-item"><span>Designation:</span> <strong><%= user.designation || 'Staff Associate' %></strong></div>
            <div class="meta-item"><span>Joining Date:</span> <strong><%= user.dateOfJoining || 'N/A' %></strong></div>
            <div class="meta-item"><span>Location / Branch:</span> <strong><%= user.preferredLocation || user.workLocation || 'HS Office' %></strong></div>
          </div>

          <div class="attendance-banner">
            <div class="att-box"><span>Statement Period</span><strong><%= periodDays %> / <%= totalDays %> Days</strong></div>
            <div class="att-box"><span>Eligible Paid Days</span><strong style="color:#0284c7"><%= eligiblePaidDays %> Days</strong></div>
            <div class="att-box"><span>Present Days</span><strong style="color:#16a34a"><%= presentDays %> Days <%= sundayPresentDays > 0 ? '(+' + sundayPresentDays + ' Sun)' : '' %></strong></div>
            <div class="att-box"><span>Absent / Half-Days</span><strong style="color:<%= absentDays > 0 ? '#dc2626' : '#0f172a' %>"><%= absentDays %> abs / <%= halfDays %> half</strong></div>
          </div>

          <div class="table-section">
            <div>
              <h3 style="font-size:14px; color:#10b981; margin-bottom:10px">💵 EARNINGS</h3>
              <table>
                <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Basic Salary (₹<%= baseSalary.toLocaleString() %>)</td>
                    <td class="amount">₹<%= periodNominalBase.toLocaleString() %></td>
                  </tr>
                  <% if (isPartialMonth) { %>
                  <tr style="font-size:11.5px; color:#64748b; background:#f8fafc">
                    <td style="padding-left:14px">↳ Full Monthly Basic Rate</td>
                    <td class="amount">₹<%= baseSalary.toLocaleString() %></td>
                  </tr>
                  <% } %>
                  <tr><td>House Rent Allowance (HRA)</td><td class="amount">₹<%= hra.toLocaleString() %></td></tr>
                  <tr><td>Special Travel Allowance</td><td class="amount">₹<%= travel.toLocaleString() %></td></tr>
                  <% if (cca > 0) { %><tr><td>City Compensatory Allowance (CCA)</td><td class="amount">₹<%= cca.toLocaleString() %></td></tr><% } %>
                  <% if (performance > 0) { %><tr><td>Performance Amount</td><td class="amount">₹<%= performance.toLocaleString() %></td></tr><% } %>
                  <% if (otherAllowances > 0) { %>
                  <tr>
                    <td>Other Allowances <%= sundaySalary > 0 ? '(incl. ₹' + sundaySalary.toLocaleString() + ' for ' + sundayPresentDays + ' Sun)' : '' %></td>
                    <td class="amount">₹<%= otherAllowances.toLocaleString() %></td>
                  </tr>
                  <% } %>
                  <% if (bonus > 0) { %><tr><td>Manager Bonus / Rewards</td><td class="amount" style="color:#10b981">₹<%= bonus.toLocaleString() %></td></tr><% } %>
                  <tr style="font-weight:700; background:#f8fafc"><td>Period Gross Earnings</td><td class="amount">₹<%= periodGrossSalary.toLocaleString() %></td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3 style="font-size:14px; color:#ef4444; margin-bottom:10px">📉 DEDUCTIONS</h3>
              <table>
                <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
                <tbody>
                  <tr><td>Absent Penalties (<%= absentDays %>d)</td><td class="amount" style="color:#ef4444">₹<%= absentDeduction.toLocaleString() %></td></tr>
                  <% if (sundayDeduction > 0) { %><tr><td>Sunday Leave Penalties (<%= unpaidSundayDays %> Sun)</td><td class="amount" style="color:#ef4444">₹<%= sundayDeduction.toLocaleString() %></td></tr><% } %>
                  <tr><td>Half-day Deductions (<%= halfDays %> occ)</td><td class="amount" style="color:#ef4444">₹<%= halfDayDeduction.toLocaleString() %></td></tr>
                  <tr><td>Provident Fund (PF) Contribution (12% ceiling ₹<%= epfWageCeiling.toLocaleString() %>)</td><td class="amount">₹<%= pf.toLocaleString() %></td></tr>
                  <tr><td>Employee State Insurance (ESI) (0.75% ceiling ₹21,000)</td><td class="amount" style="color:<%= esi > 0 ? '#ef4444' : '#64748b' %>"><%= esi > 0 ? '₹' + esi.toLocaleString() : '₹0 (Exempt: Gross > ₹21k)' %></td></tr>
                  <% if (advance > 0) { %><tr><td>Advance Salary Deduction</td><td class="amount">₹<%= advance.toLocaleString() %></td></tr><% } %>
                  <% if (otherDeductions > 0) { %><tr><td>Others Deduction</td><td class="amount">₹<%= otherDeductions.toLocaleString() %></td></tr><% } %>
                  <tr><td>Tax Deducted at Source (TDS) (<%= tdsRate %>%)</td><td class="amount">₹<%= tds.toLocaleString() %></td></tr>
                  <% if (adhocDeduction > 0) { %><tr><td>Manager Ad-hoc Deduction</td><td class="amount" style="color:#ef4444">₹<%= adhocDeduction.toLocaleString() %></td></tr><% } %>
                  <tr style="font-weight:700; background:#f8fafc"><td>Total Deductions</td><td class="amount">₹<%= totalDeductions.toLocaleString() %></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin-top:14px; margin-bottom:14px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; color:#475569; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div><strong>Statutory Gratuity Provision (4.81% of Basic+DA):</strong> ₹<%= gratuityProvision.toLocaleString() %></div>
            <div><strong>EPF:</strong> 12% on applicable PF wages (Ceiling ₹<%= epfWageCeiling.toLocaleString() %>)</div>
            <div><strong>ESI:</strong> <%= esi > 0 ? 'Covered (0.75%)' : 'Exempt (Wage > ₹21k ceiling)' %></div>
            <div><strong>Bonus:</strong> <%= isBonusEligible ? 'Eligible (Base ₹7,000 @ 8.33%)' : 'Exempt (> ₹21k ceiling)' %></div>
          </div>

          <div class="net-salary-box">
            <span>NET TAKE-HOME SALARY:</span>
            <span>₹<%= netSalary.toLocaleString() %></span>
          </div>

          <div class="footer-note">
            Official computer-generated salary document issued by Surya Group / HS Enterprises. No signature required. Generated on <%= new Date().toLocaleDateString() %>.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const renderedHTML = ejs.render(htmlTemplate, {
      user: targetUser,
      periodLabel,
      totalDays,
      periodDays,
      isPartialMonth,
      eligiblePaidDays,
      presentDays,
      sundayPresentDays,
      absentDays,
      halfDays,
      baseSalary,
      periodNominalBase,
      earnedBaseSalary,
      hra,
      travel,
      cca,
      performance,
      otherAllowances,
      sundaySalary,
      bonus,
      periodGrossSalary,
      absentDeduction,
      sundayDeduction,
      halfDayDeduction,
      unpaidSundayDays,
      pf,
      esi,
      advance,
      otherDeductions,
      tdsRate,
      tds,
      adhocDeduction,
      totalDeductions,
      netSalary,
      gratuityProvision,
      gratuityRate,
      isPFApplicable,
      epfWageCeiling,
      isESIEligible,
      esiWageCeiling,
      isBonusEligible,
      statutoryBonus
    });

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(renderedHTML);
  } catch (err) {
    res.status(500).send('<h2>Failed to generate payslip PDF: ' + err.message + '</h2>');
  }
}

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
