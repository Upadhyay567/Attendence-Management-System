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
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          
          * { box-sizing: border-box; }
          
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #ffffff;
            color: #000000;
            margin: 0;
            padding: 15px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .enterprise-payslip {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1.5px solid #000000;
            width: 100%;
            max-width: 860px;
            margin: 0 auto;
            font-size: 11.5px;
            line-height: 1.35;
            box-sizing: border-box;
          }

          .ep-header {
            text-align: center;
            padding: 10px 14px 4px;
            border-bottom: 1px solid #000000;
          }

          .ep-company-name {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #000000 !important;
          }

          .ep-company-address {
            font-size: 10.5px;
            font-weight: 600;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            color: #222222 !important;
            margin-top: 2px;
          }

          .ep-period-bar {
            padding: 5px 10px;
            font-size: 12px;
            font-weight: 600;
            border-bottom: 1.5px solid #000000;
            color: #000000 !important;
            background: #ffffff;
          }

          .ep-period-bar em {
            font-style: italic;
            font-weight: 700;
          }

          .ep-emp-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 1.5px solid #000000;
          }

          .ep-emp-table td {
            padding: 3.5px 8px;
            border-right: 1px solid #000000;
            border-bottom: 1px solid #000000;
            font-size: 11px;
            color: #000000 !important;
            vertical-align: middle;
          }

          .ep-emp-table tr:last-child td {
            border-bottom: none;
          }

          .ep-lbl {
            font-weight: 600;
            color: #111111 !important;
            display: inline-block;
            min-width: 110px;
          }

          .ep-val {
            font-weight: 600;
            color: #000000 !important;
          }

          .ep-main-table {
            width: 100%;
            border-collapse: collapse;
          }

          .ep-main-table th {
            background: #ffffff !important;
            color: #000000 !important;
            font-weight: 800;
            font-size: 11px;
            padding: 4px 6px;
            border: 1px solid #000000;
            text-align: left;
          }

          .ep-main-table td {
            padding: 3px 6px;
            border: 1px solid #000000;
            font-size: 11px;
            color: #000000 !important;
            background: #ffffff;
          }

          .ep-main-table td.ep-num {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .ep-main-table tfoot td {
            border-top: 1.5px solid #000000;
            border-bottom: 1.5px solid #000000;
            font-weight: 800;
            background: #ffffff !important;
            color: #000000 !important;
          }

          .ep-footer-table {
            width: 100%;
            border-collapse: collapse;
            border-top: 1.5px solid #000000;
          }

          .ep-footer-table td {
            padding: 6px 10px;
            font-size: 11px;
            color: #000000 !important;
            background: #ffffff;
          }

          .ep-ftr-row {
            margin-bottom: 3px;
          }

          .ep-ftr-lbl {
            font-size: 10px;
            color: #222222 !important;
            margin-right: 6px;
          }

          .ep-ftr-val {
            font-weight: 600;
            color: #000000 !important;
          }

          .ep-net-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #000000;
            padding-bottom: 4px;
            margin-bottom: 4px;
          }

          .ep-net-lbl {
            font-size: 12.5px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #000000 !important;
          }

          .ep-net-val {
            font-size: 14.5px;
            font-weight: 900;
            color: #000000 !important;
          }

          .ep-empr-pf-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
          }

          .ep-empr-pf-lbl {
            font-weight: 600;
            color: #222222 !important;
          }

          .ep-empr-pf-val {
            font-weight: 700;
            color: #000000 !important;
          }

          .ep-statutory-notes {
            border-top: 1px dashed #cbd5e1;
            padding: 6px 10px;
            background: #f8fafc;
            font-size: 10px;
            color: #475569;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 4px;
          }

          @media print {
            body { padding: 0; background: #fff; }
            .enterprise-payslip {
              border: 1.5px solid #000 !important;
              box-shadow: none !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="enterprise-payslip">
          <!-- 1. COMPANY HEADER & PAYSLIP PERIOD -->
          <div class="ep-header">
            <div class="ep-company-name">SURYA ETHNIC FASHION (INDIA) PRIVATE LIMITED</div>
            <div class="ep-company-address">1421 1ST FLOOR GALI KISHAN DUTT MALIWARA CHANDNI CHOWK DELHI-110006</div>
          </div>
          <div class="ep-period-bar">
            Payslip for Month-Year : <em><%= periodLabel %></em>
          </div>

          <!-- 2. EMPLOYEE INFORMATION GRID -->
          <table class="ep-emp-table">
            <tbody>
              <tr>
                <td style="width:38%;">
                  <span class="ep-lbl">Employee Code</span>
                  <span class="ep-val">: <%= user.employeeId || 'E' + (user.id || '') %></span>
                </td>
                <td style="width:32%;">
                  <span class="ep-lbl">D.O.J</span>
                  <span class="ep-val">: <%= user.dateOfJoining || '01-07-2021' %></span>
                </td>
                <td style="width:30%;">
                  <span class="ep-lbl">D.O.B</span>
                  <span class="ep-val">: <%= user.dob || '14-07-1986' %></span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="ep-lbl">Name of Employee</span>
                  <span class="ep-val">: <strong><%= (user.name || '').toUpperCase() %></strong></span>
                </td>
                <td colspan="2">
                  <span class="ep-lbl">Father/Husband's Name</span>
                  <span class="ep-val">: <%= user.fatherName || user.emergencyContact || 'SH. RAGHVENDRA TRIPATHI' %></span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="ep-lbl">Designation</span>
                  <span class="ep-val">: <%= user.designation || 'PRO' %></span>
                </td>
                <td colspan="2">
                  <span class="ep-lbl">UAN No.</span>
                  <span class="ep-val"><%= user.uanNo || user.uan || '100409137016' %></span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="ep-lbl">Department</span>
                  <span class="ep-val">: <%= user.department || 'FIRST FLOOR' %></span>
                </td>
                <td colspan="2"></td>
              </tr>
              <tr>
                <td colspan="3">
                  <span class="ep-lbl">Address</span>
                  <span class="ep-val">: <%= user.address || user.preferredLocation || user.workLocation || '' %></span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 3. TRI-PANEL PAYROLL TABLE: DAYS WORKED | EARNINGS | DEDUCTIONS -->
          <table class="ep-main-table">
            <thead>
              <tr class="ep-main-th-row">
                <th colspan="2" class="ep-th ep-col-days-hd" style="width:21%;">Days Worked</th>
                <th class="ep-th ep-col-earn-hd" style="width:25%;">E A R N I N G S</th>
                <th class="ep-th ep-col-rates-hd" style="width:12%;text-align:right;">Rates</th>
                <th class="ep-th ep-col-payable-hd" style="width:13%;text-align:right;">Payable</th>
                <th class="ep-th ep-col-ded-hd" style="width:17%;">D E D U C T I O N S</th>
                <th class="ep-th ep-col-amt-hd" style="width:12%;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="width:14%;">Total Days</td>
                <td class="ep-num" style="width:7%;"><%= Number(totalDays).toFixed(1) %></td>
                <td>Basic</td>
                <td class="ep-num"><%= Number(baseSalary).toFixed(2) %></td>
                <td class="ep-num"><%= Number(earnedBaseSalary).toFixed(2) %></td>
                <td>P.F.</td>
                <td class="ep-num"><%= Number(pf).toFixed(2) %></td>
              </tr>
              <tr>
                <td>Days Worked</td>
                <td class="ep-num"><%= Number(presentDays).toFixed(1) %></td>
                <td>D.A.</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td>V.P.F.</td>
                <td class="ep-num">0.00</td>
              </tr>
              <tr>
                <td>Holidays</td>
                <td class="ep-num"><%= Number(totalDays - periodDays).toFixed(1) %></td>
                <td>H.R.A.</td>
                <td class="ep-num"><%= Number(user.allowanceHRA || hra).toFixed(2) %></td>
                <td class="ep-num"><%= Number(hra).toFixed(2) %></td>
                <td>E.S.I.</td>
                <td class="ep-num"><%= Number(esi).toFixed(2) %></td>
              </tr>
              <tr>
                <td>Absent</td>
                <td class="ep-num"><%= Number(absentDays).toFixed(1) %></td>
                <td>C.C.A.</td>
                <td class="ep-num"><%= Number(user.allowanceCCA || cca).toFixed(2) %></td>
                <td class="ep-num"><%= Number(cca).toFixed(2) %></td>
                <td>Advance</td>
                <td class="ep-num"><%= Number(advance).toFixed(2) %></td>
              </tr>
              <tr>
                <td>C.L.</td>
                <td class="ep-num">0.0</td>
                <td>Conveyance Allowance</td>
                <td class="ep-num"><%= Number(user.allowanceTravel || travel).toFixed(2) %></td>
                <td class="ep-num"><%= Number(travel).toFixed(2) %></td>
                <td>Loan Installment</td>
                <td class="ep-num">0.00</td>
              </tr>
              <tr>
                <td>E.L.</td>
                <td class="ep-num">0.0</td>
                <td>Arrears</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td>Advance Sal. Deduction</td>
                <td class="ep-num">0.00</td>
              </tr>
              <tr>
                <td>S.L.</td>
                <td class="ep-num">0.0</td>
                <td>Advance Salary</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td>L.w.f.</td>
                <td class="ep-num">0.00</td>
              </tr>
              <tr>
                <td><strong>Days Payable</strong></td>
                <td class="ep-num"><strong><%= Number(eligiblePaidDays).toFixed(1) %></strong></td>
                <td>Leave Salary</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td>Other Dedu.</td>
                <td class="ep-num"><%= Number(otherDeductions + adhocDeduction).toFixed(2) %></td>
              </tr>
              <tr>
                <td></td>
                <td class="ep-num"></td>
                <td>Overtime</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td>T.D.S.</td>
                <td class="ep-num"><%= Number(tds).toFixed(2) %></td>
              </tr>
              <tr>
                <td></td>
                <td class="ep-num"></td>
                <td>Bonus</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num"><%= Number(bonus).toFixed(2) %></td>
                <td></td>
                <td class="ep-num"></td>
              </tr>
              <tr>
                <td></td>
                <td class="ep-num"></td>
                <td>Other Allow.</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num"><%= Number(otherAllowances).toFixed(2) %></td>
                <td></td>
                <td class="ep-num"></td>
              </tr>
              <tr>
                <td></td>
                <td class="ep-num"></td>
                <td>Medical Allow.</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td></td>
                <td class="ep-num"></td>
              </tr>
              <tr>
                <td></td>
                <td class="ep-num"></td>
                <td>Leave Encasment</td>
                <td class="ep-num">0.00</td>
                <td class="ep-num">0.00</td>
                <td></td>
                <td class="ep-num"></td>
              </tr>
            </tbody>
            <!-- 4. TOTALS ROW -->
            <tfoot>
              <tr class="ep-totals-tr">
                <td colspan="2" class="ep-tot-lbl"><strong>T O T A L S :</strong></td>
                <td></td>
                <td class="ep-num ep-tot-val"><strong><%= Number(baseSalary + Number(user.allowanceHRA || hra) + Number(user.allowanceTravel || travel) + Number(user.allowanceCCA || cca)).toFixed(2) %></strong></td>
                <td class="ep-num ep-tot-val"><strong><%= Number(earnedBaseSalary + hra + travel + cca + otherAllowances + bonus).toFixed(2) %></strong></td>
                <td></td>
                <td class="ep-num ep-tot-val"><strong><%= Number(pf + esi + advance + otherDeductions + adhocDeduction + tds).toFixed(2) %></strong></td>
              </tr>
            </tfoot>
          </table>

          <!-- 5. BANKING & STATUTORY DETAILS & NET PAYABLE -->
          <table class="ep-footer-table">
            <tbody>
              <tr>
                <td style="width:58%;vertical-align:top;border-right:1.5px solid #000;border-bottom:none;">
                  <div class="ep-ftr-row">
                    <span class="ep-ftr-lbl">Other Details:</span>
                    <span class="ep-ftr-val">Payment Mode : <%= user.paymentMode || 'Cheque' %></span>
                  </div>
                  <div class="ep-ftr-row">
                    <span class="ep-ftr-val">EPF NO. <%= user.pfNo || user.epfNo || 'DL/CPM/29544/10241' %></span>
                    <span class="ep-ftr-val" style="margin-left:24px;">Bank Name : <%= user.bankName || 'KOTAK MAHINDRA BANK' %></span>
                  </div>
                  <div class="ep-ftr-row" style="padding-left:145px;">
                    <span class="ep-ftr-val">A/c No. : <%= user.accountNumber || user.accountNo || '01720030209123' %></span>
                  </div>
                  <div class="ep-ftr-row">
                    <span class="ep-ftr-val">PAN NO. <%= user.pan || user.panNo || 'AHGPT5354F' %></span>
                  </div>
                </td>
                <td style="width:42%;vertical-align:top;border-bottom:none;">
                  <div class="ep-net-row">
                    <span class="ep-net-lbl">NET PAYABLE :</span>
                    <span class="ep-net-val"><%= Number(netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) %></span>
                  </div>
                  <div class="ep-empr-pf-row">
                    <span class="ep-empr-pf-lbl">Empr.Cont.P.F. :</span>
                    <span class="ep-empr-pf-val"><%= Number(pf).toFixed(2) %></span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Statutory Notes Bar -->
          <div class="ep-statutory-notes">
            <span><strong>Basic Salary Rate:</strong> ₹<%= Number(baseSalary).toLocaleString() %></span>
            <span><strong>EPF (12%):</strong> Ceiling ₹<%= Number(epfWageCeiling).toLocaleString() %></span>
            <span><strong>ESI (0.75%):</strong> <%= esi > 0 ? 'Covered' : 'Exempt (> ₹21k)' %></span>
            <span><strong>Gratuity:</strong> 4.81% Provision (₹<%= Number(gratuityProvision).toLocaleString() %>)</span>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;max-width:860px;margin:30px auto 0;font-size:10.5px;color:#64748b">
          <div style="border-top:1.5px dashed #94a3b8;padding-top:4px;width:160px;text-align:center">Authorized Signatory</div>
          <div style="border-top:1.5px dashed #94a3b8;padding-top:4px;width:160px;text-align:center">Employee Signature</div>
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
