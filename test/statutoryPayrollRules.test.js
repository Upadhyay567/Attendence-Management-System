const fs = require('fs');
const path = require('path');

describe('Statutory Payroll Rules & Calculation Engine Compliance', () => {
  let DB;

  beforeAll(() => {
    // Setup browser mocks
    global.window = { addEventListener: () => {} };
    global.document = { addEventListener: () => {} };
    global.localStorage = { getItem: () => null, setItem: () => {} };
    global.sessionStorage = { getItem: () => null, setItem: () => {} };
    global.navigator = { onLine: true };
    global.Event = class {};
    global.CustomEvent = class {};

    const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
    const mod = { exports: {} };
    const wrapped = code.replace(/export\s+const\s+DB\s+=/g, 'const DB =').concat('\nmodule.exports = { DB };');
    const fn = new Function('module', 'exports', 'require', wrapped);
    fn(mod, mod.exports, require);
    DB = mod.exports.DB;
    DB.save = () => Promise.resolve();

    DB.data = {
      users: [
        {
          id: 'usr_high_earner',
          employeeId: 'EMP_HIGH',
          name: 'High Earner',
          baseSalary: 45000,
          allowanceHRA: 6750,
          allowanceTravel: 2000,
          allowanceCCA: 0,
          allowancePerformance: 0,
          allowanceOther: 0,
          deductionPF: 1800,
          deductionESI: 0,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        },
        {
          id: 'usr_mid_earner',
          employeeId: 'EMP_MID',
          name: 'Mid Earner',
          baseSalary: 18000,
          allowanceHRA: 2000,
          allowanceTravel: 0,
          allowanceCCA: 0,
          allowancePerformance: 0,
          allowanceOther: 0,
          deductionPF: null,
          deductionESI: null,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        },
        {
          id: 'usr_low_earner',
          employeeId: 'EMP_LOW',
          name: 'Low Earner',
          baseSalary: 10000,
          allowanceHRA: 0,
          allowanceTravel: 0,
          allowanceCCA: 0,
          allowancePerformance: 0,
          allowanceOther: 0,
          deductionPF: null,
          deductionESI: null,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        },
        {
          id: 'usr_sub_min',
          employeeId: 'EMP_SUB',
          name: 'Sub Min Wage Earner',
          baseSalary: 6000,
          allowanceHRA: 0,
          allowanceTravel: 0,
          allowanceCCA: 0,
          allowancePerformance: 0,
          allowanceOther: 0,
          deductionPF: null,
          deductionESI: null,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        },
        {
          id: 'usr_higher_min_wage',
          employeeId: 'EMP_MIN_WAGE',
          name: 'Higher Min Wage Earner',
          baseSalary: 16000,
          applicableMinimumWage: 9000,
          allowanceHRA: 0,
          allowanceTravel: 0,
          allowanceCCA: 0,
          allowancePerformance: 0,
          allowanceOther: 0,
          deductionPF: null,
          deductionESI: null,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        },
        {
          id: 'usr_pf_exempt',
          employeeId: 'EMP_EXEMPT',
          name: 'Exempt From PF',
          baseSalary: 50000,
          pfApplicable: false,
          deductionPF: 0, // Explicitly exempt
          deductionESI: 0,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        },
        {
          id: 'usr_with_da',
          employeeId: 'EMP_DA',
          name: 'With DA Earner',
          baseSalary: 20000,
          allowanceDA: 5000,
          deductionPF: null,
          deductionESI: null,
          deductionAdvance: 0,
          deductionOther: 0,
          deductionPT: 0,
          deductionTDS: 0,
          scheduleId: 'sch_default'
        }
      ],
      schedules: [
        {
          id: 'sch_default',
          name: 'Standard Shift',
          startTime: '09:00',
          endTime: '17:00',
          workDays: [1, 2, 3, 4, 5, 6]
        }
      ],
      attendanceLogs: [],
      leaveRequests: [],
      payrollAdjustments: []
    };
  });

  test('Parameter 1 & 2: Employee EPF Contribution (12% of applicable PF wages) with ₹25,000 ceiling', () => {
    // High earner (₹45,000 > ₹25,000): Capped at ₹25,000 ceiling => 12% of 25,000 = ₹3,000
    const pHigh = DB.calculateMonthlyPayroll('usr_high_earner', 8, 2026);
    expect(pHigh.deductionPF).toBe(3000);
    expect(pHigh.epfWageCeiling).toBe(25000);
    expect(pHigh.applicablePFWage).toBe(25000);

    // Mid earner (₹18,000 <= ₹25,000): 12% of 18,000 = ₹2,160
    const pMid = DB.calculateMonthlyPayroll('usr_mid_earner', 8, 2026);
    expect(pMid.deductionPF).toBe(2160);
    expect(pMid.applicablePFWage).toBe(18000);

    // Low earner (₹10,000 <= ₹25,000): 12% of ₹10,000 = ₹1,200
    const pLow = DB.calculateMonthlyPayroll('usr_low_earner', 8, 2026);
    expect(pLow.deductionPF).toBe(1200);
    expect(pLow.applicablePFWage).toBe(10000);

    // Sub-min earner (₹6,000 <= ₹25,000): 12% of ₹6,000 = ₹720
    const pSub = DB.calculateMonthlyPayroll('usr_sub_min', 8, 2026);
    expect(pSub.deductionPF).toBe(720);
    expect(pSub.applicablePFWage).toBe(6000);

    // Verify applicability: Employee with deductionPF === 0 is exempt => ₹0
    const pExempt = DB.calculateMonthlyPayroll('usr_pf_exempt', 8, 2026);
    expect(pExempt.deductionPF).toBe(0);
    expect(pExempt.isPFApplicable).toBe(false);

    // Explicit custom ceiling (e.g. standard EPFO ₹15,000)
    DB.data.users.push({
      id: 'usr_statutory_15k',
      name: 'Statutory 15k Staff',
      baseSalary: 35000,
      epfWageCeiling: 15000,
      scheduleId: 'sch_default'
    });
    const p15k = DB.calculateMonthlyPayroll('usr_statutory_15k', 8, 2026);
    expect(p15k.epfWageCeiling).toBe(15000);
    expect(p15k.applicablePFWage).toBe(15000);
    expect(p15k.deductionPF).toBe(1800); // 12% of ₹15,000 = ₹1,800
  });

  test('CTC Tracker Distinction: Employer parameters (Employer EPF 12%, Employer ESI 3.25%, EDLI 0.5%, EPF Admin 0.5%) are NOT deducted from employee pay', () => {
    const p = DB.calculateMonthlyPayroll('usr_mid_earner', 8, 2026);
    // Employee deduction is strictly 0.75% for ESI and 12% for EPF
    expect(p.deductionESI).toBe(150); // 0.75% of 20,000
    expect(p.deductionPF).toBe(2160); // 12% of 18,000 (applicable under ₹25,000 ceiling)

    // Employer shares are NOT deducted from employee net pay
    // Employer ESI (3.25%) = 650 is company cost, NOT employee deduction
    expect(p.statutoryDeductions).toBe(p.deductionPF + p.deductionESI);
    expect(p.totalDeductions).toBe(p.attendanceDeductions + p.statutoryDeductions);
    expect(p.netSalary).toBe(p.periodGrossEarnings - p.totalDeductions);
  });

  test('Parameter 3 & 4: Employee ESI Contribution (0.75% of eligible ESI wages) with ₹21,000 ceiling', () => {
    // High earner (Gross ₹53,750 > ₹21,000): 100% EXEMPT from ESI => ₹0
    const pHigh = DB.calculateMonthlyPayroll('usr_high_earner', 8, 2026);
    expect(pHigh.deductionESI).toBe(0);
    expect(pHigh.isESIEligible).toBe(false);
    expect(pHigh.esiWageCeiling).toBe(21000);

    // Mid earner (Gross ₹20,000 + bonus ₹583 <= ₹21,000 or base ₹18,000 <= 21,000):
    // Eligible ESI wages = ₹20,000. 0.75% of ₹20,000 = ₹150
    const pMid = DB.calculateMonthlyPayroll('usr_mid_earner', 8, 2026);
    expect(pMid.isESIEligible).toBe(true);
    expect(pMid.deductionESI).toBe(150);

    // Low earner (Gross ₹10,000): 0.75% of ₹10,000 = ₹75
    const pLow = DB.calculateMonthlyPayroll('usr_low_earner', 8, 2026);
    expect(pLow.isESIEligible).toBe(true);
    expect(pLow.deductionESI).toBe(75);

    // Sub-min earner (Gross ₹6,000): 0.75% of ₹6,000 = ₹45
    const pSub = DB.calculateMonthlyPayroll('usr_sub_min', 8, 2026);
    expect(pSub.isESIEligible).toBe(true);
    expect(pSub.deductionESI).toBe(45);
  });

  test('Parameter 5, 6, 7 & 8: Statutory Bonus Eligibility, Base, and Rate limits (8.33% - 20%)', () => {
    // High earner (₹45,000 > ₹21,000 ceiling): NOT eligible for statutory bonus
    const pHigh = DB.calculateMonthlyPayroll('usr_high_earner', 8, 2026);
    expect(pHigh.isBonusEligible).toBe(false);
    expect(pHigh.bonusEligibilityCeiling).toBe(21000);
    expect(pHigh.statutoryBonus).toBe(0);
    expect(pHigh.bonus).toBe(0);

    // Mid earner (₹18,000 <= ₹21,000 ceiling): ELIGIBLE
    // Base = min(18000, max(7000, 7000)) = ₹7,000
    // Min bonus rate (8.33% annually) => monthly = round(7000 * 0.0833) = ₹583
    const pMid = DB.calculateMonthlyPayroll('usr_mid_earner', 8, 2026);
    expect(pMid.isBonusEligible).toBe(true);
    expect(pMid.bonusCalculationBase).toBe(7000);
    expect(pMid.minStatutoryBonusMonthly).toBe(583);
    expect(pMid.maxStatutoryBonusMonthly).toBe(1400); // 20% max = 1400
    expect(pMid.bonus).toBe(583);

    // Low earner (₹10,000 <= ₹21,000 ceiling): Base = ₹7,000 => ₹583
    const pLow = DB.calculateMonthlyPayroll('usr_low_earner', 8, 2026);
    expect(pLow.isBonusEligible).toBe(true);
    expect(pLow.bonusCalculationBase).toBe(7000);
    expect(pLow.bonus).toBe(583);

    // Sub-min earner (₹6,000 <= ₹21,000 ceiling): Base = min(6000, 7000) = ₹6,000
    // Min bonus rate = round(6000 * 0.0833) = ₹500
    const pSub = DB.calculateMonthlyPayroll('usr_sub_min', 8, 2026);
    expect(pSub.isBonusEligible).toBe(true);
    expect(pSub.bonusCalculationBase).toBe(6000);
    expect(pSub.bonus).toBe(500);

    // Higher min wage earner (₹16,000 base, applicable min wage ₹9,000):
    // Base = min(16000, max(7000, 9000)) = ₹9,000
    // Min bonus rate = round(9000 * 0.0833) = ₹750
    const pMinWage = DB.calculateMonthlyPayroll('usr_higher_min_wage', 8, 2026);
    expect(pMinWage.isBonusEligible).toBe(true);
    expect(pMinWage.bonusCalculationBase).toBe(9000);
    expect(pMinWage.bonus).toBe(750);
  });

  test('Parameter 9: Gratuity Provision Rate (4.81% of Basic + DA, estimated)', () => {
    // High earner (Basic ₹45,000, DA ₹0): 4.81% of 45,000 = ₹2,165
    const pHigh = DB.calculateMonthlyPayroll('usr_high_earner', 8, 2026);
    expect(pHigh.gratuityRate).toBe('4.81%');
    expect(pHigh.gratuityBasis).toBe(45000);
    expect(pHigh.gratuityProvision).toBe(Math.round(45000 * 0.0481)); // 2165

    // Mid earner (Basic ₹18,000, DA ₹0): 4.81% of 18,000 = ₹866
    const pMid = DB.calculateMonthlyPayroll('usr_mid_earner', 8, 2026);
    expect(pMid.gratuityBasis).toBe(18000);
    expect(pMid.gratuityProvision).toBe(Math.round(18000 * 0.0481)); // 866

    // With DA Earner (Basic ₹20,000 + DA ₹5,000 = ₹25,000): 4.81% of 25,000 = ₹1,203
    const pDA = DB.calculateMonthlyPayroll('usr_with_da', 8, 2026);
    expect(pDA.gratuityBasis).toBe(25000);
    expect(pDA.gratuityProvision).toBe(Math.round(25000 * 0.0481)); // 1203
  });

  test('Mathematical integrity: periodGrossEarnings - totalDeductions === netSalary across all cases', () => {
    const userIds = [
      'usr_high_earner', 'usr_mid_earner', 'usr_low_earner',
      'usr_sub_min', 'usr_higher_min_wage', 'usr_pf_exempt', 'usr_with_da'
    ];

    userIds.forEach(uid => {
      const p = DB.calculateMonthlyPayroll(uid, 8, 2026);
      expect(p.periodGrossEarnings - p.totalDeductions).toBe(p.netSalary);
      expect(p.netSalary).toBeGreaterThanOrEqual(0);
    });
  });
});
