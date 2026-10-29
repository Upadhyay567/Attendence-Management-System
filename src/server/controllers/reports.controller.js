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

    // Formatting helpers
    const fNum = (n, d = 2) => Number(n || 0).toFixed(d);
    const fCur = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 3A. Days Worked (Attendance Items - All Database Columns, 0 for empty)
    const holidays = Number(totalDays - periodDays);
    const daysList = [
      { label: 'Total Days', value: fNum(totalDays, 1) },
      { label: 'Days Worked', value: fNum(presentDays, 1) },
      { label: 'Weekly Off / Holidays', value: fNum(holidays, 1) },
      { label: 'Absent', value: fNum(absentDays, 1) },
      { label: 'Half Days', value: fNum(halfDays, 1) },
      { label: 'Approved Leaves', value: fNum(0, 1) },
      { label: 'Days Payable', value: fNum(eligiblePaidDays, 1), isBold: true }
    ];

    // 3B. Earnings components (All Database Columns - Showing 0 for empty values)
    const rateBasic = isPartialMonth ? periodNominalBase : baseSalary;
    const payableBasic = earnedBaseSalary;
    const rateHRA = Number(targetUser.allowanceHRA !== undefined && targetUser.allowanceHRA !== null ? targetUser.allowanceHRA : fullHRA);
    const payableHRA = hra;
    const rateTravel = Number(targetUser.allowanceTravel !== undefined && targetUser.allowanceTravel !== null ? targetUser.allowanceTravel : fullTravel);
    const payableTravel = travel;
    const rateCCA = Number(targetUser.allowanceCCA !== undefined && targetUser.allowanceCCA !== null ? targetUser.allowanceCCA : fullCCA);
    const payableCCA = cca;
    const ratePerf = Number(targetUser.allowancePerformance || fullPerformance);
    const payablePerf = performance;
    const rateDA = Number(targetUser.allowanceDA || 0);
    const payableDA = daAmount;
    const rateOther = Number(targetUser.allowanceOther || fullBaseOther);
    const payableOther = otherAllowances;
    const payableBonus = bonus;

    const earningsList = [
      { label: isPartialMonth ? `Basic Salary (₹${rateBasic.toLocaleString('en-IN')})` : 'Basic Salary', rate: fNum(rateBasic, 2), payable: fNum(payableBasic, 2), rawRate: rateBasic, rawPayable: payableBasic },
      { label: 'Dearness Allowance (D.A.)', rate: fNum(rateDA, 2), payable: fNum(payableDA, 2), rawRate: rateDA, rawPayable: payableDA },
      { label: 'House Rent Allowance (H.R.A.)', rate: fNum(rateHRA, 2), payable: fNum(payableHRA, 2), rawRate: rateHRA, rawPayable: payableHRA },
      { label: 'Conveyance Allowance', rate: fNum(rateTravel, 2), payable: fNum(payableTravel, 2), rawRate: rateTravel, rawPayable: payableTravel },
      { label: 'City Compensatory (C.C.A.)', rate: fNum(rateCCA, 2), payable: fNum(payableCCA, 2), rawRate: rateCCA, rawPayable: payableCCA },
      { label: 'Performance Allowance', rate: fNum(ratePerf, 2), payable: fNum(payablePerf, 2), rawRate: ratePerf, rawPayable: payablePerf },
      { label: 'Other Allowances', rate: fNum(rateOther, 2), payable: fNum(payableOther, 2), rawRate: rateOther, rawPayable: payableOther },
      { label: 'Overtime Pay', rate: '0.00', payable: '0.00', rawRate: 0, rawPayable: 0 },
      { label: 'Bonus / Rewards', rate: '0.00', payable: fNum(payableBonus, 2), rawRate: 0, rawPayable: payableBonus },
      { label: 'Arrears', rate: '0.00', payable: '0.00', rawRate: 0, rawPayable: 0 }
    ];

    // 3C. Deductions (All Database Columns - Showing 0 for empty values)
    const deductionsList = [
      { label: 'Provident Fund (P.F.)', amount: fNum(pf, 2), rawAmount: pf },
      { label: 'Employee State Ins. (E.S.I.)', amount: fNum(esi, 2), rawAmount: esi },
      { label: 'Advance Salary Deduction', amount: fNum(advance, 2), rawAmount: advance },
      { label: 'Tax Deducted at Source (T.D.S.)', amount: fNum(tds, 2), rawAmount: tds },
      { label: 'Other Deductions', amount: fNum(otherDeductions, 2), rawAmount: otherDeductions },
      { label: 'Manager Ad-hoc Deduction', amount: fNum(adhocDeduction, 2), rawAmount: adhocDeduction },
      { label: 'Loan Installment', amount: '0.00', rawAmount: 0 }
    ];

    // Totals
    const totalRates = earningsList.reduce((acc, it) => acc + (it.rawRate || 0), 0);
    const totalPayable = earningsList.reduce((acc, it) => acc + (it.rawPayable || 0), 0);
    const totalDeductionsCalc = deductionsList.reduce((acc, it) => acc + (it.rawAmount || 0), 0);
    const netPayableCalc = Math.max(0, totalPayable - totalDeductionsCalc);

    // Multi-column rows
    const maxRows = Math.max(daysList.length, earningsList.length, deductionsList.length);
    let rowsHTML = '';
    for (let i = 0; i < maxRows; i++) {
      const dItem = daysList[i];
      const eItem = earningsList[i];
      const dedItem = deductionsList[i];

      const dLabel = dItem ? (dItem.isBold ? `<strong>${esc(dItem.label)}</strong>` : esc(dItem.label)) : '';
      const dVal = dItem ? (dItem.isBold ? `<strong>${dItem.value}</strong>` : dItem.value) : '';
      const eLabel = eItem ? esc(eItem.label) : '';
      const eRate = eItem ? eItem.rate : '';
      const ePay = eItem ? eItem.payable : '';
      const dedLabel = dedItem ? esc(dedItem.label) : '';
      const dedAmt = dedItem ? dedItem.amount : '';

      rowsHTML += `
        <tr>
          <td style="width:14%;${dItem && dItem.isBold ? 'background:#f8fafc;' : ''}">${dLabel}</td>
          <td class="ep-num" style="width:7%;${dItem && dItem.isBold ? 'background:#f8fafc;' : ''}">${dVal}</td>
          <td style="width:25%;">${eLabel}</td>
          <td class="ep-num" style="width:12%;">${eRate}</td>
          <td class="ep-num" style="width:13%;font-weight:700;color:#0f172a;">${ePay}</td>
          <td style="width:17%;">${dedLabel}</td>
          <td class="ep-num" style="width:12%;color:${dedAmt && Number(dedAmt) > 0 ? '#dc2626' : '#64748b'};">${dedAmt}</td>
        </tr>
      `;
    }

    // Database fields for Bank & Identity (Showing 0 for empty values)
    const bankName = (targetUser.bankName && targetUser.bankName.trim()) ? targetUser.bankName.trim() : '0';
    const acctNo = (targetUser.accountNumber || targetUser.accountNo || targetUser.bankAccount || '').trim() || '0';
    const panNo = (targetUser.pan || targetUser.panNo || '').trim() || '0';
    const pfNo = (targetUser.pfNo || targetUser.epfNo || '').trim() || '0';
    const uanNo = (targetUser.uanNo || targetUser.uan || '').trim() || '0';
    const paymentMode = (targetUser.paymentMode && targetUser.paymentMode.trim()) ? targetUser.paymentMode.trim() : (bankName !== '0' ? 'Bank Transfer' : '0');
    const fatherName = (targetUser.fatherName && targetUser.fatherName.trim()) ? targetUser.fatherName.trim() : (targetUser.guardianName && targetUser.guardianName.trim() ? targetUser.guardianName.trim() : '0');
    const address = (targetUser.address && targetUser.address.trim()) ? targetUser.address.trim() : (targetUser.preferredLocation || targetUser.workLocation || '0');
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
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 15px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .enterprise-payslip {
            background: #ffffff !important;
            color: #0f172a !important;
            border: 2px solid #89201b;
            border-radius: 12px;
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
            font-size: 12px;
            line-height: 1.4;
            box-sizing: border-box;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
            overflow: hidden;
          }

          .ep-header-premium {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: linear-gradient(135deg, #ffffff 0%, #fff9f9 100%);
            border-bottom: 2px solid #89201b;
          }

          .ep-brand-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .ep-brand-logo {
            height: 52px;
            width: auto;
            object-fit: contain;
          }

          .ep-brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #89201b !important;
            margin: 0;
            line-height: 1.2;
          }

          .ep-brand-subtitle {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: #64748b;
            margin-top: 4px;
          }

          .ep-period-badge {
            text-align: right;
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 8px 16px;
            border-radius: 8px;
          }

          .ep-period-lbl {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #991b1b;
          }

          .ep-period-val {
            font-size: 15px;
            font-weight: 800;
            color: #89201b;
            margin-top: 2px;
          }

          .ep-emp-table {
            width: 100%;
            border-collapse: collapse;
            background: #f8fafc;
            border-bottom: 1.5px solid #cbd5e1;
          }

          .ep-emp-table td {
            padding: 6px 14px;
            border-right: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            color: #1e293b !important;
            vertical-align: middle;
          }

          .ep-emp-table tr:last-child td {
            border-bottom: none;
          }

          .ep-lbl {
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #64748b !important;
            display: inline-block;
            min-width: 125px;
          }

          .ep-val {
            font-weight: 700;
            color: #0f172a !important;
          }

          .ep-main-table {
            width: 100%;
            border-collapse: collapse;
          }

          .ep-main-table th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            text-align: left;
          }

          .ep-main-table td {
            padding: 6px 10px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
            color: #1e293b !important;
            background: #ffffff;
          }

          .ep-main-table tr:nth-child(even) td {
            background: #fafbfc;
          }

          .ep-main-table td.ep-num {
            text-align: right;
            font-variant-numeric: tabular-nums;
            font-weight: 600;
          }

          .ep-main-table tfoot td {
            border-top: 2px solid #0f172a;
            border-bottom: 2px solid #0f172a;
            font-weight: 800;
            background: #f1f5f9 !important;
            color: #0f172a !important;
            padding: 8px 10px;
          }

          .ep-footer-table {
            width: 100%;
            border-collapse: collapse;
            background: #ffffff;
            border-top: 1.5px solid #cbd5e1;
          }

          .ep-footer-table td {
            padding: 14px 18px;
            font-size: 12px;
            color: #1e293b !important;
            vertical-align: top;
          }

          .ep-bank-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
          }

          .ep-bank-item {
            display: flex;
            font-size: 11.5px;
          }

          .ep-bank-lbl {
            font-weight: 700;
            color: #64748b;
            width: 110px;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.4px;
          }

          .ep-bank-val {
            font-weight: 700;
            color: #0f172a;
          }

          .ep-net-card-premium {
            background: linear-gradient(135deg, #89201b 0%, #5b1310 100%);
            color: #ffffff !important;
            border-radius: 8px;
            padding: 14px 18px;
            box-shadow: 0 4px 12px rgba(137, 32, 27, 0.25);
          }

          .ep-net-card-premium .ep-net-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 8px;
            margin-bottom: 8px;
          }

          .ep-net-card-premium .ep-net-lbl {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #fca5a5 !important;
          }

          .ep-net-card-premium .ep-net-val {
            font-size: 21px;
            font-weight: 900;
            color: #ffffff !important;
          }

          .ep-net-card-premium .ep-empr-pf-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11.5px;
            color: #f8fafc;
          }

          .ep-statutory-notes {
            border-top: 1px dashed #cbd5e1;
            padding: 8px 18px;
            background: #f8fafc;
            font-size: 11px;
            color: #475569;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 6px;
          }

          @media print {
            body { padding: 0; background: #fff; }
            .enterprise-payslip {
              border: 1.5px solid #89201b !important;
              box-shadow: none !important;
              max-width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="enterprise-payslip">
          <!-- 1. PREMIUM HEADER WITH BRAND LOGO & PERIOD (NO COMPANY ADDRESS) -->
          <div class="ep-header-premium">
            <div class="ep-brand-left">
              <img src="/assets/surya_logo_transparent_hd.png" alt="House of Surya" class="ep-brand-logo" onerror="this.src='/surya-logo.png'" />
              <div>
                <h1 class="ep-brand-title">SURYA ETHNIC FASHION (INDIA) PRIVATE LIMITED</h1>
                <div class="ep-brand-subtitle">House of Surya | Employee Salary Statement</div>
              </div>
            </div>
            <div class="ep-period-badge">
              <div class="ep-period-lbl">Statement Period</div>
              <div class="ep-period-val"><%= periodLabel %></div>
            </div>
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
                  <span class="ep-val">: <%= user.dateOfJoining || user.doj || 'N/A' %></span>
                </td>
                <td style="width:30%;">
                  <span class="ep-lbl">D.O.B</span>
                  <span class="ep-val">: <%= user.dob || user.dateOfBirth || 'N/A' %></span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="ep-lbl">Name of Employee</span>
                  <span class="ep-val">: <strong><%= (user.name || '').toUpperCase() %></strong></span>
                </td>
                <td colspan="2">
                  <span class="ep-lbl">Father/Husband's Name</span>
                  <span class="ep-val">: <%= fatherName %></span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="ep-lbl">Designation</span>
                  <span class="ep-val">: <%= user.designation || 'Staff Associate' %></span>
                </td>
                <td colspan="2">
                  <span class="ep-lbl">UAN No.</span>
                  <span class="ep-val">: <%= uanNo %></span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="ep-lbl">Department</span>
                  <span class="ep-val">: <%= user.department || 'General' %></span>
                </td>
                <td colspan="2">
                  <span class="ep-lbl">Location / Worksite</span>
                  <span class="ep-val">: <%= user.preferredLocation || user.workLocation || 'HS Office' %></span>
                </td>
              </tr>
              <tr>
                <td colspan="3">
                  <span class="ep-lbl">Address</span>
                  <span class="ep-val">: <%= address %></span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 3. DYNAMIC TRI-PANEL PAYROLL TABLE -->
          <table class="ep-main-table">
            <thead>
              <tr class="ep-main-th-row">
                <th colspan="2" class="ep-th" style="width:21%;">Days Worked</th>
                <th class="ep-th" style="width:25%;">E A R N I N G S</th>
                <th class="ep-th" style="width:12%;text-align:right;">Rates</th>
                <th class="ep-th" style="width:13%;text-align:right;">Payable</th>
                <th class="ep-th" style="width:17%;">D E D U C T I O N S</th>
                <th class="ep-th" style="width:12%;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <%- rowsHTML %>
            </tbody>
            <!-- 4. TOTALS ROW -->
            <tfoot>
              <tr class="ep-totals-tr">
                <td colspan="2" class="ep-tot-lbl"><strong>T O T A L S :</strong></td>
                <td></td>
                <td class="ep-num ep-tot-val"><strong><%= fNum(totalRates, 2) %></strong></td>
                <td class="ep-num ep-tot-val"><strong><%= fNum(totalPayable, 2) %></strong></td>
                <td></td>
                <td class="ep-num ep-tot-val"><strong><%= fNum(totalDeductionsCalc, 2) %></strong></td>
              </tr>
            </tfoot>
          </table>

          <!-- 5. BANKING DETAILS & PREMIUM NET PAYABLE CARD -->
          <table class="ep-footer-table">
            <tbody>
              <tr>
                <td style="width:58%;">
                  <div class="ep-bank-grid">
                    <div class="ep-bank-item"><span class="ep-bank-lbl">Payment Mode</span><span class="ep-bank-val">: <%= paymentMode %></span></div>
                    <div class="ep-bank-item"><span class="ep-bank-lbl">Bank Name</span><span class="ep-bank-val">: <%= bankName %></span></div>
                    <div class="ep-bank-item"><span class="ep-bank-lbl">Account No.</span><span class="ep-bank-val">: <%= acctNo %></span></div>
                    <div class="ep-bank-item"><span class="ep-bank-lbl">PAN Number</span><span class="ep-bank-val">: <%= panNo %></span></div>
                    <div class="ep-bank-item"><span class="ep-bank-lbl">EPF Number</span><span class="ep-bank-val">: <%= pfNo %></span></div>
                    <div class="ep-bank-item"><span class="ep-bank-lbl">UAN Number</span><span class="ep-bank-val">: <%= uanNo %></span></div>
                  </div>
                </td>
                <td style="width:42%;">
                  <div class="ep-net-card-premium">
                    <div class="ep-net-row">
                      <span class="ep-net-lbl">NET PAYABLE :</span>
                      <span class="ep-net-val">₹<%= fCur(netPayableCalc) %></span>
                    </div>
                    <div class="ep-empr-pf-row">
                      <span>Employer EPF Contribution (Empr.Cont.P.F.):</span>
                      <strong>₹<%= fNum(pf, 2) %></strong>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Statutory Notes Bar -->
          <div class="ep-statutory-notes">
            <span><strong>Basic Salary Rate:</strong> ₹<%= Number(baseSalary).toLocaleString('en-IN') %></span>
            <span><strong>EPF (12%):</strong> Ceiling ₹<%= Number(epfWageCeiling).toLocaleString('en-IN') %></span>
            <span><strong>ESI (0.75%):</strong> <%= esi > 0 ? 'Covered' : 'Exempt (> ₹21k)' %></span>
            <span><strong>Gratuity:</strong> 4.81% Provision (₹<%= Number(gratuityProvision).toLocaleString('en-IN') %>)</span>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;max-width:960px;margin:30px auto 0;font-size:11px;color:#64748b">
          <div style="border-top:1.5px dashed #94a3b8;padding-top:4px;width:180px;text-align:center">Authorized Signatory</div>
          <div style="border-top:1.5px dashed #94a3b8;padding-top:4px;width:180px;text-align:center">Employee Signature</div>
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
      fatherName,
      uanNo,
      address,
      paymentMode,
      bankName,
      acctNo,
      panNo,
      pfNo,
      rowsHTML,
      totalRates,
      totalPayable,
      totalDeductionsCalc,
      netPayableCalc,
      pf,
      baseSalary,
      epfWageCeiling,
      esi,
      gratuityProvision,
      fNum,
      fCur
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
