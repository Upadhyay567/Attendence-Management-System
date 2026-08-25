// db.js - Local Storage Database Layer

const DB_KEY = 'attendance_system_db';

const defaultSchedules = [
  { id: 'sch_hemant', name: 'Hemant Shift', startTime: '09:00', endTime: '17:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Hemant Location' },
  { id: 'sch_1', name: 'Standard Day Shift', startTime: '09:00', endTime: '17:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Kohat Enclave, Pitampura, Delhi' },
  { id: 'sch_2', name: 'Morning Shift', startTime: '07:00', endTime: '15:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Chandni Chowk' },
  { id: 'sch_3', name: 'Night Shift', startTime: '22:00', endTime: '06:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Omaxe City, Delhi' }
];

const defaultUsers = [
  {
    "id": "usr_admin",
    "username": "admin",
    "employeeId": "HR100",
    "name": "DEEPAK SHARMA HR Admin Manager",
    "password": "Deepak@123",
    "role": "hr",
    "scheduleId": "sch_1",
    "baseSalary": 95000,
    "allowanceHRA": 14250,
    "allowanceTravel": 3000,
    "deductionPF": 7600,
    "deductionPT": 200,
    "deductionTDS": 10,
    "phone": "+91 9876543209",
    "email": "adminsurya.group@gmail.com",
    "dob": "1985-05-12",
    "address": "12, Surya Bhavan, Connaught Place",
    "city": "Delhi",
    "gender": "Male",
    "department": "Human Resources",
    "designation": "HR Admin Manager",
    "dateOfJoining": "2020-04-15",
    "emergencyContact": "+91 98765 43201",
    "documents": [],
    "resume": null,
    "aadhar": null,
    "preferredLocation": "HS Group Worksite (28.6952, 77.1860)",
    "managerId": "",
    "assignedById": "usr_admin",
    "profileVerificationStatus": "Approved",
    "profileVerificationComment": "",
    "pendingProfileEdits": null
  },
  {
    "id": "usr_hr",
    "username": "hr",
    "employeeId": "HR101",
    "name": "shubham HR Coordinator",
    "password": "HRPassword123!",
    "role": "hr",
    "scheduleId": "sch_mfl8wvv",
    "baseSalary": 75000,
    "allowanceHRA": 11250,
    "allowanceTravel": 3000,
    "deductionPF": 6000,
    "deductionPT": 200,
    "deductionTDS": 10,
    "phone": "+91 9876543211",
    "email": "hrsurya.group@gmail.com",
    "dob": "1988-06-15",
    "address": "24, Surya Bhavan, Connaught Place",
    "city": "Delhi",
    "gender": "Female",
    "department": "Human Resources",
    "designation": "HR Coordinator",
    "dateOfJoining": "2022-03-20",
    "emergencyContact": "+91 98765 43202",
    "documents": [],
    "resume": null,
    "aadhar": null,
    "preferredLocation": "Noida sector 61",
    "managerId": "",
    "assignedById": "usr_admin",
    "profileVerificationStatus": "Approved",
    "profileVerificationComment": "",
    "pendingProfileEdits": null
  },
  {
    "id": "usr_manager",
    "username": "manager",
    "employeeId": "MGR102",
    "name": "Manjit  kour Operations Manager",
    "password": "ManagerPassword123!",
    "role": "manager",
    "scheduleId": "sch_q8jji9v",
    "baseSalary": 80000,
    "allowanceHRA": 12000,
    "allowanceTravel": 3000,
    "deductionPF": 6400,
    "deductionPT": 200,
    "deductionTDS": 10,
    "phone": "+91 9876543212",
    "email": "managersurya.group@gmail.com",
    "dob": "1986-04-20",
    "address": "36, Surya Bhavan, Connaught Place",
    "city": "Delhi",
    "gender": "Male",
    "department": "Operations",
    "designation": "Operations Manager",
    "dateOfJoining": "2021-08-01",
    "emergencyContact": "+91 98765 43203",
    "documents": [],
    "resume": null,
    "aadhar": null,
    "preferredLocation": "Noida sector 61",
    "managerId": "",
    "assignedById": "usr_admin",
    "profileVerificationStatus": "Approved",
    "profileVerificationComment": "",
    "pendingProfileEdits": null
  },
  {
    "id": "usr_john",
    "username": "hemant",
    "employeeId": "EMP103",
    "name": "Hemant (Demo)",
    "password": "Hemant123!",
    "role": "employee",
    "managerId": "usr_manager",
    "scheduleId": "sch_q8jji9v",
    "baseSalary": 55000,
    "allowanceHRA": 8250,
    "allowanceTravel": 3000,
    "deductionPF": 4400,
    "deductionPT": 200,
    "deductionTDS": 5,
    "phone": "+91 9999911111",
    "email": "john.doe345@gmail.com",
    "dob": "1992-08-23",
    "address": "H.No. 45, Sector 15",
    "city": "Noida",
    "gender": "Male",
    "department": "Engineering",
    "designation": "Software Engineer",
    "dateOfJoining": "2023-11-12",
    "emergencyContact": "+91 99999 00001",
    "documents": [],
    "resume": {
      "name": "John_Doe_Resume.pdf",
      "size": "380 KB",
      "date": "2026-06-10"
    },
    "aadhar": {
      "name": "Aadhar_Card.pdf",
      "size": "1.4 MB",
      "date": "2026-06-10"
    },
    "bankDetails": {
      "name": "Bank_Passbook.pdf",
      "size": "512 KB",
      "date": "2026-06-10"
    },
    "preferredLocation": "Noida sector 61",
    "assignedById": "usr_admin",
    "profileVerificationStatus": "Approved",
    "profileVerificationComment": "",
    "pendingProfileEdits": null
  },
  {
    "id": "usr_sarah",
    "username": "sarah",
    "employeeId": "EMP104",
    "name": "Sarah Connor",
    "password": "SarahPassword123!",
    "role": "employee",
    "managerId": "usr_manager",
    "scheduleId": "sch_mfl8wvv",
    "baseSalary": 62000,
    "allowanceHRA": 9300,
    "allowanceTravel": 3000,
    "deductionPF": 4960,
    "deductionPT": 200,
    "deductionTDS": 10,
    "phone": "+91 9888822222",
    "email": "sarah.c@surya.group",
    "dob": "1994-11-04",
    "address": "Plot 102, Gali No 3, Laxmi Nagar",
    "city": "Delhi",
    "gender": "Female",
    "department": "Quality Assurance",
    "designation": "QA Lead",
    "dateOfJoining": "2024-02-15",
    "emergencyContact": "+91 98888 00002",
    "documents": [
      {
        "id": "doc_2",
        "name": "PAN_Card.jpg",
        "size": "820 KB",
        "date": "2026-06-12"
      }
    ],
    "resume": null,
    "aadhar": null,
    "preferredLocation": "omaxe Office",
    "assignedById": "usr_admin"
  },
  {
    "id": "usr_david",
    "username": "david",
    "employeeId": "EMP105",
    "name": "David Lightman",
    "password": "DavidPassword123!",
    "role": "employee",
    "managerId": "usr_manager",
    "scheduleId": "sch_bgpyqv3",
    "baseSalary": 48000,
    "allowanceHRA": 7200,
    "allowanceTravel": 3000,
    "deductionPF": 3840,
    "deductionPT": 200,
    "deductionTDS": 5,
    "phone": "+91 9777733333",
    "email": "david.l@surya.group",
    "dob": "1997-03-15",
    "address": "B-4, Block C, Rohini Sector 8",
    "city": "Delhi",
    "gender": "Male",
    "department": "Engineering",
    "designation": "Junior Developer",
    "dateOfJoining": "2025-01-20",
    "emergencyContact": "+91 97777 00003",
    "documents": [],
    "resume": null,
    "aadhar": null,
    "preferredLocation": "chandani chowk",
    "assignedById": "usr_admin"
  },
  {
    "id": "usr_t42n6xh",
    "employeeId": "EMP-190",
    "scheduleId": "sch_q8jji9v",
    "baseSalary": 50000,
    "allowanceHRA": 7500,
    "allowanceTravel": 3000,
    "deductionPF": 4000,
    "deductionPT": 200,
    "deductionTDS": 5,
    "phone": "+918533920083",
    "email": "rahulsharma090@gmail.com",
    "dob": "1990-06-19",
    "address": "",
    "city": "",
    "gender": "Male",
    "department": "Testing",
    "designation": "QA Lead",
    "dateOfJoining": "2026-07-17",
    "emergencyContact": "+91 97777 00003",
    "documents": [],
    "resume": null,
    "aadhar": null,
    "bankDetails": null,
    "name": "Rahul Sharma",
    "username": "rahulsharma",
    "password": "Surya@123",
    "role": "employee",
    "preferredLocation": "Noida sector 61",
    "managerId": "usr_manager",
    "assignedById": "usr_admin"
  },
  {
    "id": "usr_7kek2wc",
    "employeeId": "HR123",
    "scheduleId": "sch_1",
    "baseSalary": 50000,
    "allowanceHRA": 7500,
    "allowanceTravel": 3000,
    "deductionPF": 4000,
    "deductionPT": 200,
    "deductionTDS": 5,
    "phone": "9536885675",
    "email": "hemantupadhyay900@gmail.com",
    "dob": "",
    "address": "",
    "city": "",
    "gender": "Male",
    "department": "HR Administrator",
    "designation": "HR Administrator",
    "dateOfJoining": "2026-07-22",
    "emergencyContact": "",
    "documents": [],
    "resume": null,
    "aadhar": null,
    "bankDetails": null,
    "name": "Hemant upadhyay",
    "username": "HR123",
    "mobile": "9536885675",
    "role": "hr",
    "status": "Active",
    "password": "Hemant@123"
  },
  {
    "id": "usr_finance",
    "username": "finance",
    "employeeId": "EMP106",
    "name": "Finance Manager",
    "password": "FinancePassword123!",
    "role": "finance_manager",
    "scheduleId": "sch_1",
    "baseSalary": 78000,
    "allowanceHRA": 11700,
    "allowanceTravel": 3000,
    "deductionPF": 6240,
    "deductionPT": 200,
    "deductionTDS": 10,
    "phone": "+91 9876543213",
    "email": "finance@surya.group",
    "dob": "1990-09-15",
    "address": "48, Surya Bhavan, Connaught Place",
    "city": "Delhi",
    "gender": "Male",
    "department": "Finance",
    "designation": "Finance Manager",
    "dateOfJoining": "2023-01-10",
    "emergencyContact": "+91 98765 43204",
    "documents": [],
    "resume": null,
    "aadhar": null
  }
];

function generateDemoLogs() {
  const logs = [];
  const today = new Date();
  const users = ['usr_john', 'usr_sarah', 'usr_david'];
  
  for (let i = 20; i >= 1; i--) {
    const logDate = new Date();
    logDate.setDate(today.getDate() - i);
    const dayOfWeek = logDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const dateStr = logDate.toISOString().split('T')[0];
    
    users.forEach(userId => {
      let checkInTime, checkOutTime, status;
      const rand = Math.random();
      
      let shiftStart = '09:00';
      let shiftEnd = '17:00';
      if (userId === 'usr_sarah') { shiftStart = '07:00'; shiftEnd = '15:00'; }
      else if (userId === 'usr_david') { shiftStart = '22:00'; shiftEnd = '06:00'; }

      const [startHour, startMin] = shiftStart.split(':').map(Number);
      const [endHour, endMin] = shiftEnd.split(':').map(Number);
      
      if (rand > 0.08) {
        const punctRand = Math.random();
        let actualStartHour = startHour;
        let actualStartMin = startMin;
        
        if (punctRand > 0.85) {
          actualStartMin += Math.floor(Math.random() * 30) + 16;
          if (actualStartMin >= 60) {
            actualStartHour += 1;
            actualStartMin -= 60;
          }
          status = 'Late';
        } else {
          actualStartMin += Math.floor(Math.random() * 20) - 10;
          if (actualStartMin < 0) {
            actualStartHour -= 1;
            actualStartMin += 60;
          } else if (actualStartMin >= 60) {
            actualStartHour += 1;
            actualStartMin -= 60;
          }
          status = 'On Time';
        }
        
        checkInTime = `${String(actualStartHour).padStart(2, '0')}:${String(actualStartMin).padStart(2, '0')}`;
        
        const checkOutRand = Math.random();
        if (checkOutRand > 0.95) {
          const actualEndHour = endHour - 3 - Math.floor(Math.random() * 2);
          checkOutTime = `${String(actualEndHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
          status = 'Half Day';
        } else {
          const actualEndHour = endHour;
          const actualEndMin = endMin + Math.floor(Math.random() * 15) - 5;
          checkOutTime = `${String(actualEndHour).padStart(2, '0')}:${String(actualEndMin < 0 ? 0 : (actualEndMin >= 60 ? 59 : actualEndMin)).padStart(2, '0')}`;
        }
        
        logs.push({
          id: `log_${userId}_${dateStr}`,
          userId,
          date: dateStr,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status,
          biometricUsed: 'none',
          location: 'Kohat Enclave, Pitampura, Delhi'
        });
      }
    });
  }
  return logs;
}

const defaultLeaves = [
  { id: 'lv_1', userId: 'usr_john', type: 'Annual', startDate: '2026-07-10', endDate: '2026-07-12', reason: 'Family vacation trip', status: 'Pending', requestDate: '2026-06-24', managerComment: '' },
  { id: 'lv_2', userId: 'usr_sarah', type: 'Sick', startDate: '2026-06-10', endDate: '2026-06-11', reason: 'Dental surgery and rest', status: 'Approved', requestDate: '2026-06-08', managerComment: 'Take care and recover!' },
  { id: 'lv_3', userId: 'usr_david', type: 'Casual', startDate: '2026-06-18', endDate: '2026-06-18', reason: 'Personal urgent matter', status: 'Rejected', requestDate: '2026-06-17', managerComment: 'High priority project deadline scheduled on that day.' }
];

export const DB = {
  lastLocalWrite: null,
  data: {
    users: [],
    schedules: [],
    attendanceLogs: [],
    leaveRequests: []
  },

  async resolveApiBase() {
    if (typeof window.apiBaseUrl === 'undefined') {
      window.apiBaseUrl = '';
      try {
        const configRes = await fetch('/server-config.json?v=' + Date.now());
        if (configRes.ok) {
          const config = await configRes.json();
          if (config && config.port) {
            const currentPort = window.location.port;
            if (currentPort !== String(config.port)) {
              window.apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:${config.port}`;
            }
          }
        }
      } catch (configErr) {
        console.warn('Failed to fetch server-config.json. Defaulting to port 8080.', configErr);
        if (window.location.port !== '8080') {
          window.apiBaseUrl = `${window.location.protocol}//${window.location.hostname}:8080`;
        }
      }
    }
  },

  async init() {
    await this.resolveApiBase();
    
    let token = '';
    try {
      const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
      if (sess) {
        token = JSON.parse(sess).token;
      }
    } catch (e) {}

    // Enforce data isolation: If not logged in, empty database state on client to prevent leak
    if (!token) {
      this.data = { users: [], attendanceLogs: [], leaveRequests: [], shiftSwaps: [], schedules: [], notices: [] };
      return;
    }
    
    // Skip server fetch if a local write occurred recently (to prevent race conditions with async mutations)
    const isRecentLocalWrite = this.lastLocalWrite && (Date.now() - this.lastLocalWrite < 2500);
    
    if (!isRecentLocalWrite) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch((window.apiBaseUrl || '') + '/api/db-state?v=' + Date.now(), { 
          signal: controller.signal,
          headers: headers
        });
        
        clearTimeout(timeoutId);
        
        if (res.status === 401) {
          console.warn('Session expired or unauthorized. Clearing client data cache.');
          sessionStorage.removeItem('attendance_current_session');
          localStorage.removeItem('attendance_current_session');
          localStorage.removeItem(DB_KEY);
          this.data = { users: [], attendanceLogs: [], leaveRequests: [], shiftSwaps: [], schedules: [], notices: [] };
          return;
        }
        
        if (!res.ok) throw new Error('API server returned error status');
        this.data = await res.json();
        try {
          localStorage.setItem(DB_KEY, JSON.stringify(this.data));
        } catch (storageErr) {}
        try {
          this.validateAndMigrateState(false);
        } catch (migErr) {}
        console.log('Database state initialized from backend API.');
        return;
      } catch (e) {
        if (window.apiBaseUrl) {
          console.error('Failed to fetch from backend API. Falling back to local cache.', e);
        }
      }
    } else {
      console.log('Skipping backend API fetch due to recent local write.');
    }

    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
      } else {
        await this.reset();
      }
    } catch (err) {
      console.error('Failed to parse local storage cache, resetting to defaults.', err);
      await this.reset();
    }
    
    try {
      this.validateAndMigrateState(false);
    } catch (migErr) {
      console.error('State migration warning:', migErr);
    }
  },

  validateAndMigrateState(shouldSave = true) {
    if (!this.data) this.data = {};
    
    // Check if the current user is an employee under data isolation
    let isEmployeeIsolated = false;
    try {
      const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
      if (sess) {
        if (this.data.users && this.data.users.length === 1) {
          isEmployeeIsolated = true;
        }
      }
    } catch (e) {}

    if (!this.data.schedules) this.data.schedules = [...defaultSchedules];
    if (!this.data.users) this.data.users = [...defaultUsers];
    if (!this.data.attendanceLogs) this.data.attendanceLogs = isEmployeeIsolated ? [] : generateDemoLogs();
    if (!this.data.leaveRequests) this.data.leaveRequests = isEmployeeIsolated ? [] : [...defaultLeaves];
    if (!this.data.uploadHistory) this.data.uploadHistory = [];
    if (!this.data.tickets) this.data.tickets = [];
    if (!this.data.shiftSwaps) {
      this.data.shiftSwaps = [
        {
          id: 'swap_1',
          senderId: 'usr_john',
          receiverId: 'usr_sarah',
          reason: 'Have a personal appointment in the morning.',
          status: 'Pending Coworker',
          date: '2026-06-25',
          managerComment: '',
          coworkerComment: ''
        }
      ];
    }
    if (!this.data.announcements) {
      this.data.announcements = [
        {
          id: 'ann_1',
          title: 'Welcome to the New Attendance & Onboarding Portal',
          content: 'We are thrilled to launch our new employee self-service hub. You can now complete your onboarding documentation online and request shift swaps directly.',
          category: 'General',
          date: '2026-06-25',
          author: 'HR Admin Manager'
        },
        {
          id: 'ann_2',
          title: 'Upcoming Holiday Notice: Eid-ul-Adha',
          content: 'Please note that the office will remain closed on June 29, 2026, in observance of Eid-ul-Adha.',
          category: 'Holiday',
          date: '2026-06-26',
          author: 'HR Coordinator'
        }
      ];
    }
    if (!this.data.financeData) {
      this.data.financeData = {
        yearlyRevenue: 250000000,
        fixedOverhead: 50000000,
        nationalPct: 60
      };
    }
    if (!this.data.financialRecords) {
      this.data.financialRecords = generateDemoFinanceData();
    }
    if (!this.data.budgets) {
      this.data.budgets = generateDemoBudgets();
    }

    let modified = false;

    // Migration: migrate legacy admin role to hr role
    this.data.users.forEach((u, index) => {
      if (u.role === 'admin') { u.role = 'hr'; modified = true; }
      if (!u.status) { u.status = 'Active'; modified = true; }
      if (!u.employeeId) {
        const mappedIds = { 'admin': 'EMP100', 'hr': 'EMP101', 'manager': 'EMP102', 'john': 'EMP103', 'hemant': 'EMP103', 'sarah': 'EMP104', 'david': 'EMP105' };
        u.employeeId = mappedIds[u.username] || ('EMP' + (106 + index));
        modified = true;
      }
      if (u.gender === undefined) {
        u.gender = u.username === 'sarah' || u.username === 'hr' ? 'Female' : (u.username === 'admin' ? 'Other' : 'Male');
        modified = true;
      }
      if (u.department === undefined) {
        if (u.role === 'hr') u.department = 'Human Resources';
        else if (u.role === 'manager') u.department = 'Operations';
        else u.department = 'Engineering';
        modified = true;
      }
      if (u.designation === undefined) {
        if (u.username === 'admin') u.designation = 'HR Admin Manager';
        else if (u.username === 'hr') u.designation = 'HR Coordinator';
        else if (u.username === 'manager') u.designation = 'Operations Manager';
        else if (u.username === 'john' || u.username === 'hemant') u.designation = 'Software Engineer';
        else if (u.username === 'sarah') u.designation = 'QA Lead';
        else u.designation = 'Junior Developer';
        modified = true;
      }
      if (u.dateOfJoining === undefined) {
        const mappedDoj = { 'admin': '2020-04-15', 'hr': '2022-03-20', 'manager': '2021-08-01', 'john': '2023-11-12', 'hemant': '2023-11-12', 'sarah': '2024-02-15', 'david': '2025-01-20' };
        u.dateOfJoining = mappedDoj[u.username] || '2024-05-10';
        modified = true;
      }
      if (u.emergencyContact === undefined) {
        u.emergencyContact = '+91 98765 4320' + (index + 1);
        modified = true;
      }
      if (u.allowanceHRA === undefined) { u.allowanceHRA = Math.round((u.baseSalary || 50000) * 0.15); modified = true; }
      if (u.allowanceTravel === undefined) { u.allowanceTravel = 3000; modified = true; }
      if (u.deductionPF === undefined) { u.deductionPF = Math.round((u.baseSalary || 50000) * 0.08); modified = true; }
      if (u.deductionPT === undefined) { u.deductionPT = 200; modified = true; }
      if (u.deductionTDS === undefined) { u.deductionTDS = (u.baseSalary || 50000) > 60000 ? 10 : 5; modified = true; }
      if (u.assignedById === undefined && u.role === 'employee') { u.assignedById = 'usr_admin'; modified = true; }
    });

    // Ensure essential system users exist (skip if isolated employee view)
    if (!isEmployeeIsolated) {
      ['hr', 'manager', 'finance'].forEach(name => {
        if (!this.data.users.some(u => u.username === name)) {
          const defaultU = defaultUsers.find(u => u.username === name);
          if (defaultU) { this.data.users.push(defaultU); modified = true; }
        }
      });
    }

    // Ensure all schedules have workDays, location, halfDayLimit, gracePeriod
    this.data.schedules.forEach(s => {
      if (!s.workDays) { s.workDays = [1, 2, 3, 4, 5]; modified = true; }
      if (!s.location) { s.location = 'Kohat Enclave, Pitampura, Delhi'; modified = true; }
      if (s.gracePeriod === undefined) { s.gracePeriod = 15; modified = true; }
      if (s.halfDayLimit === undefined) { s.halfDayLimit = 120; modified = true; }
    });

    if (!this.data.customRoles) {
      this.data.customRoles = [];
      modified = true;
    }

    if (modified) {
      if (shouldSave) {
        this.save();
      } else {
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
      }
    }
  },

  save(mutationMeta = null) {
    this.lastLocalWrite = Date.now();
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    window.dispatchEvent(new Event('db_updated'));

    return this.resolveApiBase().then(() => {
      let token = '';
      try {
        const sess = sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session');
        if (sess) token = JSON.parse(sess).token;
      } catch (e) {}

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (mutationMeta) {
        // Granular mutations to prevent race conditions and payload overhead
        return fetch((window.apiBaseUrl || '') + '/api/mutate-granular', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(mutationMeta)
        }).then(res => {
          if (!res.ok) console.warn('Failed to sync granular mutations to MongoDB.');
        }).catch(err => {
          console.warn('Network error syncing granular mutations:', err);
        });
      } else {
        // Fallback to full state sync if no meta is provided (e.g. imports or resets)
        return fetch((window.apiBaseUrl || '') + '/api/mutate', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ action: 'sync', data: this.data })
        }).then(res => {
          if (!res.ok) console.warn('Failed to sync mutations to MongoDB.');
        }).catch(err => {
          console.warn('Network error syncing mutations to MongoDB:', err);
        });
      }
    });
  },

  async reset() {
    try {
      await this.resolveApiBase();
      const seedRes = await fetch((window.apiBaseUrl || '') + '/seed.json?v=' + Date.now());
      if (seedRes.ok) {
        this.data = await seedRes.json();
        this.save();
        console.log('Database state reset from seed.json successfully.');
        return;
      }
    } catch (err) {
      console.warn('Failed to reset DB from seed.json, falling back to hardcoded defaults:', err);
    }
    this.resetToHardcodedDefaults();
  },

  resetToHardcodedDefaults() {
    this.data.schedules = [...defaultSchedules];
    this.data.users = JSON.parse(JSON.stringify(defaultUsers));
    this.data.attendanceLogs = generateDemoLogs();
    this.data.leaveRequests = [...defaultLeaves];
    this.data.tickets = [
      {
        id: 'tkt_1',
        userId: 'usr_john',
        category: 'Attendance',
        subject: 'Missed Check-in / GPS Issue',
        message: 'My check-in didn\'t register today due to poor GPS network signal. Can HR please verify my attendance log manually?',
        date: '2026-06-24',
        status: 'Open',
        responses: []
      },
      {
        id: 'tkt_2',
        userId: 'usr_john',
        category: 'Payroll',
        subject: 'Tax Deduction details',
        message: 'Could you please share the breakdown of this month’s professional tax leave deduction?',
        date: '2026-06-25',
        status: 'Resolved',
        responses: [
          {
            responder: 'HR Coordinator',
            text: 'We have updated the monthly payroll spreadsheet. You can view the full breakdown directly in the Payslips panel.',
            date: '2026-06-25'
          }
        ]
      }
    ];
    this.data.shiftSwaps = [
      {
        id: 'swap_1',
        senderId: 'usr_john',
        receiverId: 'usr_sarah',
        reason: 'Have a personal appointment in the morning.',
        status: 'Pending Coworker',
        date: '2026-06-25',
        managerComment: '',
        coworkerComment: ''
      }
    ];
    this.data.announcements = [
      {
        id: 'ann_1',
        title: 'Welcome to the New Attendance & Onboarding Portal',
        content: 'We are thrilled to launch our new employee self-service hub. You can now complete your onboarding documentation (Resume, Aadhaar, Bank Details, etc.) online and request shift swaps directly.',
        category: 'General',
        date: '2026-06-25',
        author: 'HR Admin Manager'
      },
      {
        id: 'ann_2',
        title: 'Upcoming Holiday Notice: Eid-ul-Adha',
        content: 'Please note that the office will remain closed on June 29, 2026, in observance of Eid-ul-Adha. Have a wonderful holiday with your families!',
        category: 'Holiday',
        date: '2026-06-26',
        author: 'HR Coordinator'
      }
    ];
    this.data.financeData = {
      yearlyRevenue: 250000000,
      fixedOverhead: 50000000,
      nationalPct: 60
    };
    this.data.financialRecords = generateDemoFinanceData();
    this.data.budgets = generateDemoBudgets();
    this.save();
  },

  // Users API
  getUsers() {
    return this.data.users;
  },

  getFinanceData() {
    if (!this.data.financeData) {
      this.data.financeData = {
        yearlyRevenue: 250000000,
        fixedOverhead: 50000000,
        nationalPct: 60
      };
    }
    return this.data.financeData;
  },

  updateFinanceData(data) {
    this.data.financeData = { ...this.getFinanceData(), ...data };
    this.save();
    return this.data.financeData;
  },
  
  getUser(id) {
    if (!id) return null;
    const cleanId = id.toString().trim();
    let found = this.data.users.find(u => u.id === cleanId);
    if (!found) {
      const lower = cleanId.toLowerCase();
      found = this.data.users.find(u => 
        (u.employeeId && u.employeeId.toLowerCase() === lower) ||
        (u.username && u.username.toLowerCase() === lower) ||
        (u.email && u.email.toLowerCase() === lower)
      );
    }
    return found;
  },

  getUserByUsername(username) {
    if (!username) return null;
    return this.data.users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase().trim());
  },

  getUserByEmail(email) {
    if (!email) return null;
    const key = email.toLowerCase().trim();
    return this.data.users.find(u => u.email && u.email.toLowerCase() === key);
  },

  getUserByUsernameOrId(loginKey) {
    if (!loginKey) return null;
    const key = loginKey.toLowerCase().trim();
    return this.data.users.find(u => 
      (u.username && u.username.toLowerCase() === key) || 
      (u.email && u.email.toLowerCase() === key) ||
      (u.employeeId && u.employeeId.toLowerCase() === key)
    );
  },

  addUser(user) {
    const newId = 'usr_' + Math.random().toString(36).substring(2, 9);
    let maxId = 99;
    this.data.users.forEach(u => {
      if (u.employeeId && u.employeeId.startsWith('EMP')) {
        const num = parseInt(u.employeeId.substring(3), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    });
    const nextEmpId = 'EMP' + (maxId + 1);
    const newUser = {
      id: newId,
      employeeId: user.employeeId || nextEmpId,
      scheduleId: user.scheduleId || null,
      preferredLocation: user.preferredLocation || null,
      baseSalary: null,
      allowanceHRA: null,
      allowanceTravel: null,
      deductionPF: null,
      deductionPT: null,
      deductionTDS: null,
      phone: '',
      email: '',
      dob: '',
      address: '',
      city: '',
      gender: 'Male',
      department: 'Engineering',
      designation: 'Software Developer',
      dateOfJoining: new Date().toISOString().split('T')[0],
      emergencyContact: '',
      documents: [],
      resume: null,
      aadhar: null,
      bankDetails: null,
      ...user
    };
    this.data.users.push(newUser);
    this.save({ type: 'push', key: 'users', payload: newUser });
    return newUser;
  },

  registerUser(username, name, password, role = 'employee', employeeId = null) {
    if (this.getUserByUsernameOrId(username)) return null;
    if (employeeId && this.getUserByUsernameOrId(employeeId)) return null;
    const userData = {
      username,
      name,
      password,
      role,
      scheduleId: null,
      preferredLocation: null,
      baseSalary: null
    };
    if (employeeId) {
      userData.employeeId = employeeId.trim();
    }
    return this.addUser(userData);
  },

  updateUser(id, updates) {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      this.data.users[userIndex] = { ...this.data.users[userIndex], ...updates };
      this.save({ type: 'update', key: 'users', query: { id: id }, updates });
      return this.data.users[userIndex];
    }
    return null;
  },

  deleteUser(id) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.data.attendanceLogs = this.data.attendanceLogs.filter(l => l.userId !== id);
    this.data.leaveRequests = this.data.leaveRequests.filter(l => l.userId !== id);
    this.save({ type: 'pull', key: 'users', query: { id } });
    this.save({ type: 'pull', key: 'attendanceLogs', query: { userId: id } });
    this.save({ type: 'pull', key: 'leaveRequests', query: { userId: id } });
  },

  getCustomRoles() {
    if (!this.data.customRoles) {
      this.data.customRoles = [];
    }
    return this.data.customRoles;
  },

  getUserBaseRole(roleId) {
    if (!roleId) return 'employee';
    if (roleId === 'hr' || roleId === 'manager' || roleId === 'finance_manager' || roleId === 'employee') {
      return roleId;
    }
    const customRoles = this.getCustomRoles();
    const custom = customRoles.find(r => r.id === roleId);
    if (custom) {
      return this.getUserBaseRole(custom.parentRole);
    }
    return 'employee';
  },

  addCustomRole(name, parentRole) {
    if (!this.data.customRoles) {
      this.data.customRoles = [];
    }
    const id = name.toLowerCase().replace(/\s+/g, '_');
    if (this.data.customRoles.some(r => r.id === id)) {
      return null;
    }
    const newRole = { id, name, parentRole };
    this.data.customRoles.push(newRole);
    this.save();
    return newRole;
  },

  deleteCustomRole(id) {
    if (!this.data.customRoles) {
      this.data.customRoles = [];
      return false;
    }
    const initialLength = this.data.customRoles.length;
    this.data.customRoles = this.data.customRoles.filter(r => r.id !== id);
    if (this.data.customRoles.length < initialLength) {
      this.save();
      return true;
    }
    return false;
  },

  resetUserPassword(username, newPassword) {
    const user = this.getUserByUsername(username);
    if (user) {
      user.password = newPassword;
      this.save();
      return true;
    }
    return false;
  },

  // Profile Documents & details Updates
  updateUserProfile(userId, details) {
    const user = this.getUser(userId);
    if (user) {
      Object.keys(details).forEach(key => {
        if (details[key] !== undefined) {
          if (['baseSalary', 'allowanceHRA', 'allowanceTravel', 'deductionPF', 'deductionPT', 'deductionTDS'].includes(key)) {
            user[key] = details[key] === null ? null : Number(details[key]);
          } else {
            user[key] = details[key];
          }
        }
      });
      return this.save({ type: 'update', key: 'users', query: { id: userId }, updates: details }).then(() => user);
    }
    return Promise.resolve(null);
  },

  uploadDocument(userId, fileName, fileSize, url = '') {
    const user = this.getUser(userId);
    if (user) {
      user.documents = user.documents || [];
      const newDoc = {
        id: 'doc_' + Math.random().toString(36).substring(2, 9),
        name: fileName,
        size: fileSize,
        url: url || '',
        date: new Date().toISOString().split('T')[0]
      };
      user.documents.push(newDoc);
      this.save();
      return newDoc;
    }
    return null;
  },

  deleteDocument(userId, docId) {
    const user = this.getUser(userId);
    if (user && user.documents) {
      user.documents = user.documents.filter(d => d.id !== docId);
      this.save();
      return true;
    }
    return false;
  },

  uploadResume(userId, fileName, fileSize, url = '') {
    const user = this.getUser(userId);
    if (user) {
      user.resume = {
        name: fileName,
        size: fileSize,
        url: url || '',
        date: new Date().toISOString().split('T')[0]
      };
      this.save();
      return user.resume;
    }
    return null;
  },

  deleteResume(userId) {
    const user = this.getUser(userId);
    if (user) {
      user.resume = null;
      this.save();
      return true;
    }
    return false;
  },

  uploadAadhar(userId, fileName, fileSize, url = '') {
    const user = this.getUser(userId);
    if (user) {
      user.aadhar = {
        name: fileName,
        size: fileSize,
        url: url || '',
        date: new Date().toISOString().split('T')[0]
      };
      this.save();
      return user.aadhar;
    }
    return null;
  },

  deleteAadhar(userId) {
    const user = this.getUser(userId);
    if (user) {
      user.aadhar = null;
      this.save();
      return true;
    }
    return false;
  },

  uploadBankDetails(userId, fileName, fileSize, url = '') {
    const user = this.getUser(userId);
    if (user) {
      user.bankDetails = {
        name: fileName,
        size: fileSize,
        url: url || '',
        date: new Date().toISOString().split('T')[0]
      };
      this.save();
      return user.bankDetails;
    }
    return null;
  },

  deleteBankDetails(userId) {
    const user = this.getUser(userId);
    if (user) {
      user.bankDetails = null;
      this.save();
      return true;
    }
    return false;
  },

  // Schedules API
  getOfficeCoordinates() {
    if (!this.data.officeCoordinates || Object.keys(this.data.officeCoordinates).length === 0) {
      this.data.officeCoordinates = {
        'Kohat Enclave, Pitampura, Delhi': { lat: 28.6978, lng: 77.1408 }
      };
      this.save();
    }
    return this.data.officeCoordinates;
  },

  saveOfficeCoordinate(name, lat, lng, skipSave = false) {
    if (!this.data.officeCoordinates) {
      this.getOfficeCoordinates();
    }
    this.data.officeCoordinates[name] = { lat: Number(lat), lng: Number(lng) };
    if (!skipSave) this.save();
    return this.data.officeCoordinates;
  },

  deleteOfficeCoordinate(name) {
    if (!this.data.officeCoordinates) {
      this.getOfficeCoordinates();
    }
    if (this.data.officeCoordinates[name]) {
      delete this.data.officeCoordinates[name];
      this.save();
      return true;
    }
    return false;
  },

  resolveUserShiftForDate(user, dateStr, preferShiftId = null) {
    if (!user) return { scheduleId: null, schedule: null, preferredLocation: null, allSchedules: [], candidateSchedules: [] };
    
    // Collect all assigned schedule IDs
    let assignedIds = [];
    if (user.scheduleIds && Array.isArray(user.scheduleIds) && user.scheduleIds.length > 0) {
      assignedIds = [...user.scheduleIds];
    } else if (user.scheduleId) {
      assignedIds = [user.scheduleId];
    }

    if (user.futureReassignments && user.futureReassignments.length > 0) {
      const sorted = [...user.futureReassignments].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      for (const reassignment of sorted) {
        if (dateStr >= reassignment.effectiveDate) {
          assignedIds = [reassignment.scheduleId];
        }
      }
    }

    const allSchedules = assignedIds.map(id => this.getSchedule(id)).filter(Boolean);
    if (allSchedules.length === 0) {
      return { scheduleId: null, schedule: null, preferredLocation: null, allSchedules: [], candidateSchedules: [] };
    }

    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay();
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = (dateStr === todayStr);

    // Filter schedules configured for this day of week
    const activeForDay = allSchedules.filter(s => !s.workDays || s.workDays.length === 0 || s.workDays.includes(dayOfWeek));
    const candidateList = activeForDay.length > 0 ? activeForDay : allSchedules;

    let selectedSchedule = null;

    if (preferShiftId) {
      selectedSchedule = candidateList.find(s => String(s.id) === String(preferShiftId)) || allSchedules.find(s => String(s.id) === String(preferShiftId));
    }

    if (!selectedSchedule && isToday) {
      // 1. Check if there is an active clocked-in session today without checkout
      for (const s of candidateList) {
        const log = this.getTodayLog(user.id, s.id);
        if (log && log.checkIn && !log.checkOut) {
          selectedSchedule = s;
          break;
        }
      }

      // 2. If not clocked in, match by current time window
      if (!selectedSchedule) {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();

        for (const s of candidateList) {
          if (s.startTime && s.endTime) {
            const [sH, sM] = s.startTime.split(':').map(Number);
            const [eH, eM] = s.endTime.split(':').map(Number);
            let startMins = sH * 60 + sM - 30; // 30 min before shift
            let endMins = eH * 60 + eM;
            
            if (endMins < startMins) {
              // overnight shift
              if (nowMins >= startMins || nowMins <= endMins) {
                selectedSchedule = s;
                break;
              }
            } else {
              if (nowMins >= startMins && nowMins <= endMins + 120) {
                selectedSchedule = s;
                break;
              }
            }
          }
        }
      }
    }

    if (!selectedSchedule) {
      selectedSchedule = candidateList[0] || allSchedules[0];
    }

    const resolvedLocation = (user && user.shiftLocations && selectedSchedule && user.shiftLocations[selectedSchedule.id]) ||
                             (user && user.preferredLocation) ||
                             (selectedSchedule ? selectedSchedule.location : null);

    return {
      scheduleId: selectedSchedule ? selectedSchedule.id : null,
      schedule: selectedSchedule,
      preferredLocation: resolvedLocation,
      allSchedules: allSchedules,
      candidateSchedules: candidateList
    };
  },

  getUserShiftLocation(user, shiftId) {
    if (!user) return null;
    if (user.shiftLocations && shiftId && user.shiftLocations[shiftId]) {
      return user.shiftLocations[shiftId];
    }
    return user.preferredLocation || null;
  },

  getSchedules() {
    return this.data.schedules;
  },

  getSchedule(id) {
    if (!id) return this.data.schedules[0] || null;
    return this.data.schedules.find(s => String(s.id) === String(id)) || this.data.schedules[0] || null;
  },

  addSchedule(schedule, skipSave = false) {
    const newId = 'sch_' + Math.random().toString(36).substring(2, 9);
    const newSchedule = { id: newId, ...schedule };
    this.data.schedules.push(newSchedule);
    if (!skipSave) this.save({ type: 'push', key: 'schedules', payload: newSchedule });
    return newSchedule;
  },

  updateSchedule(id, updates) {
    const idx = this.data.schedules.findIndex(s => String(s.id) === String(id));
    if (idx !== -1) {
      this.data.schedules[idx] = { ...this.data.schedules[idx], ...updates };
      this.save({ type: 'update', key: 'schedules', query: { id }, updates });
      return this.data.schedules[idx];
    }
    return null;
  },

  deleteSchedule(id) {
    this.data.schedules = this.data.schedules.filter(s => String(s.id) !== String(id));
    
    const fallbackId = this.data.schedules.length > 0 ? this.data.schedules[0].id : null;
    this.data.users.forEach(u => {
      if (String(u.scheduleId) === String(id)) u.scheduleId = fallbackId;
      if (u.scheduleIds && Array.isArray(u.scheduleIds)) {
        u.scheduleIds = u.scheduleIds.filter(sid => String(sid) !== String(id));
        if (u.scheduleIds.length === 0 && fallbackId) u.scheduleIds = [fallbackId];
      }
      if (u.shiftLocations && u.shiftLocations[id]) {
        delete u.shiftLocations[id];
      }
    });
    this.save();
    return true;
  },

  // Attendance Logs API
  getLogs(userId = null) {
    if (userId) {
      return this.data.attendanceLogs.filter(l => l.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
    }
    return this.data.attendanceLogs.sort((a, b) => b.date.localeCompare(a.date));
  },

  getTodayLog(userId, shiftId = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (shiftId) {
      return this.data.attendanceLogs.find(l => l.userId === userId && l.date === todayStr && (l.shiftId === shiftId || (!l.shiftId && (!this.getUser(userId) || this.getUser(userId).scheduleId === shiftId))));
    }
    // If shiftId is not specified, prefer active open session, or match current resolved shift
    const openLog = this.data.attendanceLogs.find(l => l.userId === userId && l.date === todayStr && l.checkIn && !l.checkOut);
    if (openLog) return openLog;
    
    const user = this.getUser(userId);
    const resolved = user ? this.resolveUserShiftForDate(user, todayStr) : null;
    if (resolved && resolved.scheduleId) {
      const match = this.data.attendanceLogs.find(l => l.userId === userId && l.date === todayStr && (l.shiftId === resolved.scheduleId || (!l.shiftId && user.scheduleId === resolved.scheduleId)));
      if (match) return match;
    }

    return this.data.attendanceLogs.find(l => l.userId === userId && l.date === todayStr);
  },

  addPendingCheckIn(userId, location = 'Kohat Enclave, Pitampura, Delhi', coords = '', distance = 0) {
    return null;
  },

  removePendingCheckIn(userId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const idx = this.data.attendanceLogs.findIndex(l => l.id === `log_${userId}_${todayStr}` && l.status === 'Pending Verification');
    if (idx !== -1) {
      this.data.attendanceLogs.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  },

  checkIn(userId, method = 'none', location = null, deviationFlag = false, justification = '', coords = '', distance = 0, facePhoto = null, timeOverride = null, shiftId = null, latitude = null, longitude = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const user = this.getUser(userId);
    const resolved = user ? this.resolveUserShiftForDate(user, todayStr, shiftId) : null;
    const resolvedShiftId = shiftId || (resolved ? resolved.scheduleId : (user ? user.scheduleId : null));
    const schedule = this.getSchedule(resolvedShiftId);
    
    const effectiveLocation = location || 
                              (user && user.shiftLocations && resolvedShiftId && user.shiftLocations[resolvedShiftId]) || 
                              (user && user.preferredLocation) || 
                              'Kohat Enclave, Pitampura, Delhi';
    
    let existing = this.getTodayLog(userId, resolvedShiftId);
    if (existing && existing.checkIn && existing.status !== 'Pending Verification') {
      return existing;
    }

    const timeStr = timeOverride || new Date().toTimeString().split(' ')[0].substring(0, 5);
    let status = 'On Time';
    
    if (schedule && schedule.startTime) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [nowHour, nowMin] = timeStr.split(':').map(Number);
      
      const totalStartMins = startHour * 60 + startMin;
      const totalNowMins = nowHour * 60 + nowMin;
      
      if (totalNowMins > totalStartMins + (schedule.gracePeriod || 15)) {
        status = 'Late';
      }
    }

    if (deviationFlag) {
      status = 'Deviation Logged';
    }

    if (existing) {
      existing.checkIn = timeStr;
      existing.status = status;
      existing.biometricUsed = method;
      existing.location = effectiveLocation;
      existing.coords = coords;
      existing.distance = Number(distance);
      existing.facePhoto = facePhoto;
      existing.shiftId = resolvedShiftId;
      existing.latitude = latitude ? Number(latitude) : null;
      existing.longitude = longitude ? Number(longitude) : null;
      this.save({
        type: 'update',
        key: 'attendanceLogs',
        query: { id: existing.id },
        updates: {
          checkIn: timeStr,
          status,
          biometricUsed: method,
          location: effectiveLocation,
          coords,
          distance: Number(distance),
          facePhoto,
          shiftId: resolvedShiftId,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null
        }
      });
      return existing;
    }

    const logId = resolvedShiftId ? `log_${userId}_${todayStr}_${resolvedShiftId}` : `log_${userId}_${todayStr}`;
    const newLog = {
      id: logId,
      userId,
      date: todayStr,
      shiftId: resolvedShiftId,
      checkIn: timeStr,
      checkOut: null,
      status,
      biometricUsed: method,
      location: effectiveLocation,
      deviationFlag,
      justification,
      coords,
      distance: Number(distance),
      facePhoto: facePhoto,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null
    };

    this.data.attendanceLogs.push(newLog);
    this.save({ type: 'push', key: 'attendanceLogs', payload: newLog });
    return newLog;
  },

  checkOut(userId, method = 'none', facePhoto = null, shiftId = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const log = this.getTodayLog(userId, shiftId);
    if (!log || log.checkOut) return log;

    log.checkOut = timeStr;
    if (method !== 'none') {
      log.biometricUsed = method;
    }
    if (facePhoto) {
      log.facePhotoOut = facePhoto;
    }

    const resolvedShiftId = log.shiftId || shiftId || (this.getUser(userId) ? this.getUser(userId).scheduleId : null);
    const schedule = this.getSchedule(resolvedShiftId);
    if (schedule && schedule.startTime && schedule.endTime) {
      const [startHour, startMin] = log.checkIn.split(':').map(Number);
      const [endHour, endMin] = timeStr.split(':').map(Number);
      const totalWorkMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
      const [schStartHour, schStartMin] = schedule.startTime.split(':').map(Number);
      const [schEndHour, schEndMin] = schedule.endTime.split(':').map(Number);
      const expectedWorkMins = (schEndHour * 60 + schEndMin) - (schStartHour * 60 + schStartMin);
      
      if (expectedWorkMins > 0 && totalWorkMins < expectedWorkMins / 2) {
        log.status = 'Half Day';
      }
    }

    this.save({
      type: 'update',
      key: 'attendanceLogs',
      query: { id: log.id },
      updates: {
        checkOut: log.checkOut,
        biometricUsed: log.biometricUsed,
        facePhotoOut: log.facePhotoOut || null,
        status: log.status
      }
    });
    return log;
  },

  deleteAttendanceLog(logId) {
    if (!this.data.attendanceLogs) return false;
    const idx = this.data.attendanceLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      this.data.attendanceLogs.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  },

  updateAttendanceLog(logId, updatedFields) {
    if (!this.data.attendanceLogs) return null;
    const log = this.data.attendanceLogs.find(l => l.id === logId);
    if (log) {
      Object.assign(log, updatedFields);
      this.save();
      return log;
    }
    return null;
  },

  createManualAttendanceLog(logData) {
    if (!this.data.attendanceLogs) this.data.attendanceLogs = [];
    const id = logData.id || `log_${logData.userId}_${logData.date}_${Date.now()}`;
    const newLog = {
      id,
      userId: logData.userId,
      date: logData.date,
      shiftId: logData.shiftId || null,
      checkIn: logData.checkIn || null,
      checkOut: logData.checkOut || null,
      status: logData.status || 'On Time',
      biometricUsed: logData.biometricUsed || 'manual',
      location: logData.location || 'HS Group HQ, Pitampura, Delhi',
      deviationFlag: !!logData.deviationFlag,
      justification: logData.justification || '',
      coords: logData.coords || '28.697800° N, 77.140800° E',
      distance: logData.distance || 0,
      facePhoto: null
    };
    this.data.attendanceLogs.unshift(newLog);
    this.save();
    return newLog;
  },

  // Leave Requests API
  getLeaveRequests(userId = null) {
    if (userId) {
      return this.data.leaveRequests.filter(r => r.userId === userId).sort((a, b) => b.requestDate.localeCompare(a.requestDate));
    }
    return this.data.leaveRequests.sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  },

  applyLeave(userId, type, startDate, endDate, reason, approverHead = '', supportingDoc = null) {
    const newId = 'lv_' + Math.random().toString(36).substring(2, 9);
    const newRequest = {
      id: newId,
      userId,
      type,
      startDate,
      endDate,
      reason,
      approverHead,
      status: 'Pending',
      requestDate: new Date().toISOString().split('T')[0],
      managerComment: '',
      supportingDoc
    };
    this.data.leaveRequests.push(newRequest);
    this.save({ type: 'push', key: 'leaveRequests', payload: newRequest });
    return newRequest;
  },

  updateLeaveStatus(id, status, comment = '') {
    const req = this.data.leaveRequests.find(r => r.id === id);
    if (req) {
      req.status = status;
      req.managerComment = comment;
      this.save({ type: 'update', key: 'leaveRequests', query: { id }, updates: { status, managerComment: comment } });
      return req;
    }
    return null;
  },

  // Payroll Calculations
  calculateMonthlyPayroll(userId, month, year) {
    const user = this.getUser(userId);
    if (!user) return null;

    const baseSalary = user.baseSalary || 0;
    const allowanceHRA = user.allowanceHRA !== undefined && user.allowanceHRA !== null ? user.allowanceHRA : 0;
    const allowanceTravel = user.allowanceTravel !== undefined && user.allowanceTravel !== null ? user.allowanceTravel : 0;
    const deductionPF = user.deductionPF !== undefined && user.deductionPF !== null ? user.deductionPF : 0;
    const deductionPT = user.deductionPT !== undefined && user.deductionPT !== null ? user.deductionPT : 0;
    const deductionTDS = user.deductionTDS !== undefined && user.deductionTDS !== null ? user.deductionTDS : 0;
    
    // ESI contribution fallback to 0.75% of basic salary if not defined
    const deductionESI = user.deductionESI !== undefined && user.deductionESI !== null ? user.deductionESI : Math.round(baseSalary * 0.0075);

    const totalDays = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    const workingDates = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
        workingDates.push(dateObj.toISOString().split('T')[0]);
      }
    }

    const allLogs = this.getLogs(user.id); // Safe lookup using resolved user id
    const monthlyLogs = allLogs.filter(l => {
      const [lY, lM] = l.date.split('-').map(Number);
      return lY === year && (lM - 1) === month;
    });

    const allLeaves = this.getLeaveRequests(user.id); // Safe lookup
    const approvedLeaves = allLeaves.filter(lv => {
      if (lv.status !== 'Approved') return false;
      const start = new Date(lv.startDate);
      const end = new Date(lv.endDate);
      const startMonth = start.getMonth();
      const startYear = start.getFullYear();
      const endMonth = end.getMonth();
      const endYear = end.getFullYear();
      return (startYear <= year && endYear >= year) && (startMonth <= month && endMonth >= month);
    });

    let approvedLeaveDays = 0;
    workingDates.forEach(dateStr => {
      const dateVal = new Date(dateStr);
      const isOnLeave = approvedLeaves.some(lv => {
        const start = new Date(lv.startDate);
        const end = new Date(lv.endDate);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return dateVal >= start && dateVal <= end;
      });
      if (isOnLeave) approvedLeaveDays++;
    });

    const presentDays = monthlyLogs.filter(l => l.checkIn).length;
    const lateDays = monthlyLogs.filter(l => l.status === 'Late').length;
    const halfDays = monthlyLogs.filter(l => l.status === 'Half Day').length;

    let absentDays = workingDays - presentDays - approvedLeaveDays;
    if (absentDays < 0) absentDays = 0;

    // Load custom payroll adjustments
    const adj = (this.data.payrollAdjustments || []).find(a => a.userId === user.id && a.month === month && a.year === year);
    const bonus = adj ? (adj.bonus || 0) : 0;
    const adhocDeduction = adj ? (adj.deduction || 0) : 0;
    const remarks = adj ? (adj.remarks || '') : '';

    const dailyRate = Math.round(baseSalary / (workingDays || 22));
    const absentDeduction = absentDays * dailyRate;
    const halfDayDeduction = Math.round(halfDays * 0.5 * dailyRate);
    
    // Dynamic Overtime calculation
    let totalOvertimeMins = 0;
    const sched = this.getSchedule(user.scheduleId) || {
      name: 'Standard Day Shift',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriod: 15,
      workDays: [1, 2, 3, 4, 5],
      location: 'Kohat Enclave, Pitampura, Delhi'
    };

    monthlyLogs.forEach(log => {
      if (log.checkIn && log.checkOut) {
        const [sH, sM] = sched.startTime.split(':').map(Number);
        const [eH, eM] = sched.endTime.split(':').map(Number);
        const shiftMins = (eH * 60 + eM) - (sH * 60 + sM);
        const [iH, iM] = log.checkIn.split(':').map(Number);
        const [oH, oM] = log.checkOut.split(':').map(Number);
        const workedMins = (oH * 60 + oM) - (iH * 60 + iM);
        if (workedMins > shiftMins) {
          totalOvertimeMins += (workedMins - shiftMins);
        }
      }
    });

    const overtimeHours = Math.floor(totalOvertimeMins / 60);
    const overtimeMins = totalOvertimeMins % 60;
    const overtimeText = `${overtimeHours}h ${overtimeMins}m`;
    const hourlyRate = (baseSalary / (workingDays || 22) / 8);
    const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);

    const attendanceDeductions = absentDeduction + halfDayDeduction;
    const grossEarnings = baseSalary + allowanceHRA + allowanceTravel + bonus + overtimePay;
    const taxableEarnings = (baseSalary + allowanceHRA + allowanceTravel) - attendanceDeductions;
    const clampedTaxableEarnings = taxableEarnings < 0 ? 0 : taxableEarnings;
    const deductionTDSVal = Math.round(clampedTaxableEarnings * (deductionTDS / 100));
    const statutoryDeductions = deductionPF + deductionPT + deductionTDSVal + deductionESI;
    
    const totalDeductions = attendanceDeductions + statutoryDeductions + adhocDeduction;
    const netSalary = grossEarnings - attendanceDeductions - statutoryDeductions - adhocDeduction;

    return {
      userId: user.id,
      employeeName: user.name,
      baseSalary,
      allowanceHRA,
      allowanceTravel,
      deductionPF,
      deductionPT,
      deductionESI,
      deductionTDS,
      deductionTDSVal,
      workingDays,
      presentDays,
      lateDays,
      halfDays,
      approvedLeaveDays,
      absentDays,
      dailyRate,
      absentDeduction,
      halfDayDeduction,
      attendanceDeductions,
      statutoryDeductions,
      grossEarnings,
      taxableEarnings,
      totalDeductions,
      bonus,
      adhocDeduction,
      remarks,
      netSalary: netSalary < 0 ? 0 : netSalary,
      overtimeHours,
      overtimeText,
      overtimePay
    };
  },

  savePayrollAdjustment(userId, month, year, bonus, deduction, remarks) {
    if (!this.data.payrollAdjustments) {
      this.data.payrollAdjustments = [];
    }
    let adj = this.data.payrollAdjustments.find(a => a.userId === userId && a.month === month && a.year === year);
    if (!adj) {
      adj = {
        id: 'adj_' + Math.random().toString(36).substring(2, 9),
        userId,
        month,
        year
      };
      this.data.payrollAdjustments.push(adj);
    }
    adj.bonus = Number(bonus) || 0;
    adj.deduction = Number(deduction) || 0;
    adj.remarks = remarks || '';
    this.save();
    return adj;
  },

  // Support Tickets API
  getTickets() {
    if (!this.data.tickets) {
      this.data.tickets = [];
    }
    return this.data.tickets;
  },

  addTicket(userId, category, subject, message) {
    if (!this.data.tickets) {
      this.data.tickets = [];
    }
    const newTicket = {
      id: 'tkt_' + Math.random().toString(36).substring(2, 9),
      userId,
      category,
      subject,
      message,
      date: new Date().toISOString().split('T')[0],
      status: 'Open',
      responses: []
    };
    this.data.tickets.push(newTicket);
    this.save();
    return newTicket;
  },

  respondToTicket(ticketId, responder, text) {
    if (!this.data.tickets) {
      this.data.tickets = [];
    }
    const ticket = this.data.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.responses.push({
        responder,
        text,
        date: new Date().toISOString().split('T')[0]
      });
      ticket.status = 'Resolved';
      this.save();
      return ticket;
    }
    return null;
  },

  // Shift Swaps API
  getShiftSwaps(userId = null) {
    if (!this.data.shiftSwaps) {
      this.data.shiftSwaps = [];
    }
    if (userId) {
      return this.data.shiftSwaps.filter(s => s.senderId === userId || s.receiverId === userId);
    }
    return this.data.shiftSwaps;
  },

  submitShiftSwap(senderId, receiverId, reason, swapType = 'both') {
    if (!this.data.shiftSwaps) {
      this.data.shiftSwaps = [];
    }
    const newSwap = {
      id: 'swap_' + Math.random().toString(36).substring(2, 9),
      senderId,
      receiverId,
      reason,
      swapType,
      status: 'Pending Coworker',
      date: new Date().toISOString().split('T')[0],
      managerComment: '',
      coworkerComment: ''
    };
    this.data.shiftSwaps.push(newSwap);
    this.save({ type: 'push', key: 'shiftSwaps', payload: newSwap });
    return newSwap;
  },

  respondToShiftSwapCoworker(swapId, accept, comment = '') {
    if (!this.data.shiftSwaps) return null;
    const swap = this.data.shiftSwaps.find(s => s.id === swapId);
    if (swap && swap.status === 'Pending Coworker') {
      swap.status = accept ? 'Pending Manager' : 'Rejected';
      swap.coworkerComment = comment;
      this.save({ type: 'update', key: 'shiftSwaps', query: { id: swapId }, updates: { status: swap.status, coworkerComment: comment } });
      return swap;
    }
    return null;
  },

  respondToShiftSwapManager(swapId, approve, comment = '') {
    if (!this.data.shiftSwaps) return null;
    const swap = this.data.shiftSwaps.find(s => s.id === swapId);
    if (swap && swap.status === 'Pending Manager') {
      swap.status = approve ? 'Approved' : 'Rejected';
      swap.managerComment = comment;
      if (approve) {
        // Swap schedules / locations
        const sender = this.getUser(swap.senderId);
        const receiver = this.getUser(swap.receiverId);
        if (sender && receiver) {
          const type = swap.swapType || 'both';
          if (type === 'both' || type === 'shift') {
            const tempSched = sender.scheduleId;
            sender.scheduleId = receiver.scheduleId;
            receiver.scheduleId = tempSched;
          }
          if (type === 'both' || type === 'location') {
            const loc1 = sender.preferredLocation || 'Kohat Enclave, Pitampura, Delhi';
            const loc2 = receiver.preferredLocation || 'Kohat Enclave, Pitampura, Delhi';
            sender.preferredLocation = loc2;
            receiver.preferredLocation = loc1;
          }
        }
      }
      this.save();
      return swap;
    }
    return null;
  },

  // Geofencing excuse APIs
  excuseDeviation(logId, comment = '') {
    const log = this.data.attendanceLogs.find(l => l.id === logId);
    if (log) {
      log.deviationFlag = false;
      log.status = 'On Time';
      log.managerComment = comment;
      this.save();
      return log;
    }
    return null;
  },

  flagDeviationAsViolation(logId, comment = '') {
    const log = this.data.attendanceLogs.find(l => l.id === logId);
    if (log) {
      log.status = 'Late';
      log.managerComment = comment;
      this.save();
      return log;
    }
    return null;
  },

  // Announcements APIs
  getAnnouncements() {
    if (!this.data.announcements) {
      this.data.announcements = [];
    }
    return this.data.announcements;
  },

  addAnnouncement(title, content, category, author) {
    if (!this.data.announcements) {
      this.data.announcements = [];
    }
    const newAnn = {
      id: 'ann_' + Math.random().toString(36).substring(2, 9),
      title,
      content,
      category,
      date: new Date().toISOString().split('T')[0],
      author
    };
    this.data.announcements.unshift(newAnn);
    this.save({ type: 'push', key: 'announcements', payload: newAnn });
    return newAnn;
  },

  deleteAnnouncement(id) {
    if (!this.data.announcements) return;
    this.data.announcements = this.data.announcements.filter(a => a.id !== id);
    this.save({ type: 'pull', key: 'announcements', query: { id } });
  },

  approveUserDocument(userId, docType) {
    const user = this.getUser(userId);
    if (!user) return null;
    if (!user.verificationStatuses) {
      user.verificationStatuses = {};
    }
    user.verificationStatuses[docType] = 'Approved';
    this.save({ type: 'update', key: 'users', query: { id: userId }, updates: { verificationStatuses: user.verificationStatuses } });
    return user;
  },

  rejectUserDocument(userId, docType) {
    const user = this.getUser(userId);
    if (!user) return null;
    if (!user.verificationStatuses) {
      user.verificationStatuses = {};
    }
    user.verificationStatuses[docType] = 'Rejected';
    this.save({ type: 'update', key: 'users', query: { id: userId }, updates: { verificationStatuses: user.verificationStatuses } });
    return user;
  },

  getFinancialRecords() {
    if (!this.data.financialRecords) {
      this.data.financialRecords = [];
    }
    return this.data.financialRecords;
  },

  addFinancialRecord(record) {
    if (!this.data.financialRecords) {
      this.data.financialRecords = [];
    }
    const newRecord = {
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      ...record,
      timestamp: new Date().toISOString()
    };
    this.data.financialRecords.push(newRecord);
    this.save({ type: 'push', key: 'financialRecords', payload: newRecord });
    return newRecord;
  },

  deleteFinancialRecord(id) {
    if (!this.data.financialRecords) return;
    this.data.financialRecords = this.data.financialRecords.filter(r => r.id !== id);
    this.save({ type: 'pull', key: 'financialRecords', query: { id } });
  },

  getBudgets() {
    if (!this.data.budgets) {
      this.data.budgets = [];
    }
    return this.data.budgets;
  },

  addBudget(budget) {
    if (!this.data.budgets) {
      this.data.budgets = [];
    }
    const newBudget = {
      id: 'bgt_' + Math.random().toString(36).substring(2, 9),
      ...budget
    };
    this.data.budgets.push(newBudget);
    this.save({ type: 'push', key: 'budgets', payload: newBudget });
    return newBudget;
  },

  deleteBudget(id) {
    if (!this.data.budgets) return;
    this.data.budgets = this.data.budgets.filter(b => b.id !== id);
    this.save({ type: 'pull', key: 'budgets', query: { id } });
  },

  async login(username, password, skipCheck, role) {
    await this.resolveApiBase();
    const res = await fetch((window.apiBaseUrl || '') + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, skipCheck, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed.');
    }
    const session = await res.json();
    return session;
  }
};

function generateDemoFinanceData() {
  const records = [];
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  
  months.forEach((m, idx) => {
    records.push({
      id: `rev_${idx}_1`,
      type: 'revenue',
      category: 'Yearly Revenue',
      amount: 22000000 + (idx * 1500000),
      date: `${m}-28`,
      details: `Client billing receipts for segment ${m}`,
      department: 'General',
      project: 'Global Operations'
    });
    records.push({
      id: `exp_${idx}_1`,
      type: 'expense',
      category: 'Upload Office Expenses',
      amount: 150000,
      date: `${m}-05`,
      details: 'Office rent & supplies',
      department: 'Operations',
      project: 'General Overhead'
    });
    records.push({
      id: `exp_${idx}_2`,
      type: 'expense',
      category: 'Upload Utility Bills',
      amount: 45000,
      date: `${m}-10`,
      details: 'Electricity and internet bills',
      department: 'Operations',
      project: 'General Overhead'
    });
    records.push({
      id: `exp_${idx}_3`,
      type: 'expense',
      category: 'Upload Project Expenses',
      amount: 500000 + (idx * 50000),
      date: `${m}-15`,
      details: 'Cloud computing server infrastructure usage',
      department: 'Engineering',
      project: 'Cloud Migrations'
    });
    records.push({
      id: `pay_${idx}_1`,
      type: 'payroll',
      category: 'Upload Employee Salary',
      amount: 450000,
      date: `${m}-30`,
      details: `Monthly salaries for ${m}`,
      department: 'General',
      project: 'Internal Operations'
    });
    records.push({
      id: `pay_${idx}_2`,
      type: 'payroll',
      category: 'Upload Tax Details',
      amount: 45000,
      date: `${m}-30`,
      details: `Monthly TDS payments for ${m}`,
      department: 'General',
      project: 'Internal Operations'
    });
  });

  records.push({
    id: 'inv_1',
    type: 'investment',
    category: 'Upload Investments',
    amount: 5000000,
    date: '2026-02-15',
    details: 'Mutual fund capital investments',
    department: 'Finance',
    project: 'Treasury'
  });
  records.push({
    id: 'ast_1',
    type: 'investment',
    category: 'Upload Assets',
    amount: 20000000,
    date: '2026-01-10',
    details: 'Office real estate & computers',
    department: 'Finance',
    project: 'Treasury'
  });
  records.push({
    id: 'lia_1',
    type: 'investment',
    category: 'Upload Liabilities',
    amount: 4000000,
    date: '2026-03-20',
    details: 'Long-term corporate credit lines',
    department: 'Finance',
    project: 'Treasury'
  });

  return records;
}

function generateDemoBudgets() {
  return [
    { id: 'bgt_1', department: 'Engineering', project: 'Cloud Migrations', amount: 12000000, date: '2026-01-01' },
    { id: 'bgt_2', department: 'Operations', project: 'General Overhead', amount: 3000000, date: '2026-01-01' },
    { id: 'bgt_3', department: 'Human Resources', project: 'Staffing Drive', amount: 2000000, date: '2026-01-01' }
  ];
}

