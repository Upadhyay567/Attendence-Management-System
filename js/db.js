// db.js - Local Storage Database Layer

const DB_KEY = 'attendance_system_db';

const defaultSchedules = [
  { id: 'sch_1', name: 'Standard Day Shift', startTime: '09:00', endTime: '17:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Kohat Enclave, Pitampura, Delhi' },
  { id: 'sch_2', name: 'Morning Shift', startTime: '07:00', endTime: '15:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Chandni Chowk' },
  { id: 'sch_3', name: 'Night Shift', startTime: '22:00', endTime: '06:00', gracePeriod: 15, workDays: [1, 2, 3, 4, 5], location: 'Omaxe City, Delhi' }
];

const defaultUsers = [
  { 
    id: 'usr_admin', 
    username: 'admin', 
    employeeId: 'EMP100',
    name: 'HR Admin Manager', 
    password: 'AdminPassword123!', 
    role: 'hr', 
    biometricRegistered: { face: true, finger: true }, 
    scheduleId: 'sch_1', 
    baseSalary: 95000,
    allowanceHRA: 14250,
    allowanceTravel: 3000,
    deductionPF: 7600,
    deductionPT: 200,
    deductionTDS: 10,
    phone: '+91 9876543209',
    email: 'admin@surya.group',
    dob: '1985-05-12',
    address: '12, Surya Bhavan, Connaught Place',
    city: 'Delhi',
    gender: 'Other',
    department: 'Human Resources',
    designation: 'HR Admin Manager',
    dateOfJoining: '2020-04-15',
    emergencyContact: '+91 98765 43201',
    documents: [],
    resume: null,
    aadhar: null
  },
  { 
    id: 'usr_hr', 
    username: 'hr', 
    employeeId: 'EMP101',
    name: 'HR Coordinator', 
    password: 'HRPassword123!', 
    role: 'hr', 
    biometricRegistered: { face: false, finger: false }, 
    scheduleId: 'sch_1', 
    baseSalary: 75000,
    allowanceHRA: 11250,
    allowanceTravel: 3000,
    deductionPF: 6000,
    deductionPT: 200,
    deductionTDS: 10,
    phone: '+91 9876543211',
    email: 'hr@surya.group',
    dob: '1988-06-15',
    address: '24, Surya Bhavan, Connaught Place',
    city: 'Delhi',
    gender: 'Female',
    department: 'Human Resources',
    designation: 'HR Coordinator',
    dateOfJoining: '2022-03-20',
    emergencyContact: '+91 98765 43202',
    documents: [],
    resume: null,
    aadhar: null
  },
  { 
    id: 'usr_manager', 
    username: 'manager', 
    employeeId: 'EMP102',
    name: 'Operations Manager', 
    password: 'ManagerPassword123!', 
    role: 'manager', 
    biometricRegistered: { face: false, finger: false }, 
    scheduleId: 'sch_1', 
    baseSalary: 80000,
    allowanceHRA: 12000,
    allowanceTravel: 3000,
    deductionPF: 6400,
    deductionPT: 200,
    deductionTDS: 10,
    phone: '+91 9876543212',
    email: 'manager@surya.group',
    dob: '1986-04-20',
    address: '36, Surya Bhavan, Connaught Place',
    city: 'Delhi',
    gender: 'Male',
    department: 'Operations',
    designation: 'Operations Manager',
    dateOfJoining: '2021-08-01',
    emergencyContact: '+91 98765 43203',
    documents: [],
    resume: null,
    aadhar: null
  },
  { 
    id: 'usr_john', 
    username: 'john', 
    employeeId: 'EMP103',
    name: 'John Doe', 
    password: 'JohnPassword123!', 
    role: 'employee', 
    biometricRegistered: { face: true, finger: false }, 
    scheduleId: 'sch_1', 
    baseSalary: 55000,
    allowanceHRA: 8250,
    allowanceTravel: 3000,
    deductionPF: 4400,
    deductionPT: 200,
    deductionTDS: 5,
    phone: '+91 9999911111',
    email: 'john.doe@surya.group',
    dob: '1992-08-23',
    address: 'H.No. 45, Sector 15',
    city: 'Noida',
    gender: 'Male',
    department: 'Engineering',
    designation: 'Software Engineer',
    dateOfJoining: '2023-11-12',
    emergencyContact: '+91 99999 00001',
    documents: [],
    resume: { name: 'John_Doe_Resume.pdf', size: '380 KB', date: '2026-06-10' },
    aadhar: { name: 'Aadhar_Card.pdf', size: '1.4 MB', date: '2026-06-10' },
    bankDetails: { name: 'Bank_Passbook.pdf', size: '512 KB', date: '2026-06-10' }
  },
  { 
    id: 'usr_sarah', 
    username: 'sarah', 
    employeeId: 'EMP104',
    name: 'Sarah Connor', 
    password: 'SarahPassword123!', 
    role: 'employee', 
    biometricRegistered: { face: false, finger: true }, 
    scheduleId: 'sch_2', 
    baseSalary: 62000,
    allowanceHRA: 9300,
    allowanceTravel: 3000,
    deductionPF: 4960,
    deductionPT: 200,
    deductionTDS: 10,
    phone: '+91 9888822222',
    email: 'sarah.c@surya.group',
    dob: '1994-11-04',
    address: 'Plot 102, Gali No 3, Laxmi Nagar',
    city: 'Delhi',
    gender: 'Female',
    department: 'Quality Assurance',
    designation: 'QA Lead',
    dateOfJoining: '2024-02-15',
    emergencyContact: '+91 98888 00002',
    documents: [
      { id: 'doc_2', name: 'PAN_Card.jpg', size: '820 KB', date: '2026-06-12' }
    ],
    resume: null,
    aadhar: null
  },
  { 
    id: 'usr_david', 
    username: 'david', 
    employeeId: 'EMP105',
    name: 'David Lightman', 
    password: 'DavidPassword123!', 
    role: 'employee', 
    biometricRegistered: { face: false, finger: false }, 
    scheduleId: 'sch_3', 
    baseSalary: 48000,
    allowanceHRA: 7200,
    allowanceTravel: 3000,
    deductionPF: 3840,
    deductionPT: 200,
    deductionTDS: 5,
    phone: '+91 9777733333',
    email: 'david.l@surya.group',
    dob: '1997-03-15',
    address: 'B-4, Block C, Rohini Sector 8',
    city: 'Delhi',
    gender: 'Male',
    department: 'Engineering',
    designation: 'Junior Developer',
    dateOfJoining: '2025-01-20',
    emergencyContact: '+91 97777 00003',
    documents: [],
    resume: null,
    aadhar: null
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
          biometricUsed: Math.random() > 0.4 ? (Math.random() > 0.5 ? 'face' : 'fingerprint') : 'none',
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
  data: {
    users: [],
    schedules: [],
    attendanceLogs: [],
    leaveRequests: []
  },

  init() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        // Migration: migrate legacy admin role to hr role
        this.data.users.forEach(u => {
          if (u.role === 'admin') u.role = 'hr';
        });

        // Migration: ensure every user has a dynamic employeeId and aadhar property
        this.data.users.forEach((u, index) => {
          if (!u.employeeId) {
            const mappedIds = {
              'admin': 'EMP100',
              'hr': 'EMP101',
              'manager': 'EMP102',
              'john': 'EMP103',
              'sarah': 'EMP104',
              'david': 'EMP105'
            };
            u.employeeId = mappedIds[u.username] || ('EMP' + (106 + index));
          }
          if (u.aadhar === undefined) {
            if (u.username === 'john') {
              u.aadhar = { name: 'Aadhar_Card.pdf', size: '1.4 MB', date: '2026-06-10' };
              // Clean it from general documents array if it exists
              u.documents = (u.documents || []).filter(d => !d.name.includes('Aadhar'));
            } else {
              u.aadhar = null;
            }
          }
          if (u.gender === undefined) {
            u.gender = u.username === 'sarah' || u.username === 'hr' ? 'Female' : (u.username === 'admin' ? 'Other' : 'Male');
          }
          if (u.department === undefined) {
            if (u.role === 'hr') u.department = 'Human Resources';
            else if (u.role === 'manager') u.department = 'Operations';
            else u.department = 'Engineering';
          }
          if (u.designation === undefined) {
            if (u.username === 'admin') u.designation = 'HR Admin Manager';
            else if (u.username === 'hr') u.designation = 'HR Coordinator';
            else if (u.username === 'manager') u.designation = 'Operations Manager';
            else if (u.username === 'john') u.designation = 'Software Engineer';
            else if (u.username === 'sarah') u.designation = 'QA Lead';
            else u.designation = 'Junior Developer';
          }
          if (u.dateOfJoining === undefined) {
            const mappedDoj = {
              'admin': '2020-04-15',
              'hr': '2022-03-20',
              'manager': '2021-08-01',
              'john': '2023-11-12',
              'sarah': '2024-02-15',
              'david': '2025-01-20'
            };
            u.dateOfJoining = mappedDoj[u.username] || '2024-05-10';
          }
          if (u.emergencyContact === undefined) {
            u.emergencyContact = '+91 98765 4320' + (index + 1);
          }
          if (u.allowanceHRA === undefined) {
            u.allowanceHRA = Math.round((u.baseSalary || 50000) * 0.15);
          }
          if (u.allowanceTravel === undefined) {
            u.allowanceTravel = 3000;
          }
          if (u.deductionPF === undefined) {
            u.deductionPF = Math.round((u.baseSalary || 50000) * 0.08);
          }
          if (u.deductionPT === undefined) {
            u.deductionPT = 200;
          }
          if (u.deductionTDS === undefined) {
            u.deductionTDS = (u.baseSalary || 50000) > 60000 ? 10 : 5;
          }
        });
        
        // Seed default HR & Manager if not exists in local storage
        if (!this.data.users.some(u => u.username === 'hr')) {
          this.data.users.push(defaultUsers.find(u => u.username === 'hr'));
        }
        if (!this.data.users.some(u => u.username === 'manager')) {
          this.data.users.push(defaultUsers.find(u => u.username === 'manager'));
        }
        if (!this.data.tickets) {
          this.data.tickets = [];
        }
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
        }
        this.save();
      } catch (e) {
        console.error('Failed to parse DB, resetting to default', e);
        this.reset();
      }
    } else {
      this.reset();
    }
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  },

  reset() {
    this.data.schedules = [...defaultSchedules];
    this.data.users = JSON.parse(JSON.stringify(defaultUsers));
    this.data.attendanceLogs = generateDemoLogs();
    this.data.leaveRequests = [...defaultLeaves];
    this.data.tickets = [
      {
        id: 'tkt_1',
        userId: 'usr_john',
        category: 'Attendance',
        subject: 'Missed Biometric Clock-in',
        message: 'My biometric face clock-in failed today due to lighting. Can HR please verify my attendance log manually?',
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
    this.save();
  },

  // Users API
  getUsers() {
    return this.data.users;
  },
  
  getUser(id) {
    return this.data.users.find(u => u.id === id);
  },

  getUserByUsername(username) {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  getUserByUsernameOrId(loginKey) {
    const key = loginKey.toLowerCase().trim();
    return this.data.users.find(u => 
      u.username.toLowerCase() === key || 
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
      employeeId: nextEmpId,
      biometricRegistered: { face: false, finger: false },
      scheduleId: 'sch_1',
      baseSalary: 50000,
      allowanceHRA: Math.round(50000 * 0.15),
      allowanceTravel: 3000,
      deductionPF: Math.round(50000 * 0.08),
      deductionPT: 200,
      deductionTDS: 5,
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
    this.save();
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
      scheduleId: 'sch_1',
      baseSalary: 50000
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
      this.save();
      return this.data.users[userIndex];
    }
    return null;
  },

  deleteUser(id) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.data.attendanceLogs = this.data.attendanceLogs.filter(l => l.userId !== id);
    this.data.leaveRequests = this.data.leaveRequests.filter(l => l.userId !== id);
    this.save();
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
      if (details.name !== undefined) user.name = details.name;
      if (details.phone !== undefined) user.phone = details.phone;
      if (details.email !== undefined) user.email = details.email;
      if (details.dob !== undefined) user.dob = details.dob;
      if (details.gender !== undefined) user.gender = details.gender;
      if (details.address !== undefined) user.address = details.address;
      if (details.city !== undefined) user.city = details.city;
      if (details.emergencyContact !== undefined) user.emergencyContact = details.emergencyContact;
      if (details.username !== undefined) user.username = details.username;
      if (details.employeeId !== undefined) user.employeeId = details.employeeId;
      if (details.department !== undefined) user.department = details.department;
      if (details.designation !== undefined) user.designation = details.designation;
      if (details.dateOfJoining !== undefined) user.dateOfJoining = details.dateOfJoining;
      if (details.allowanceHRA !== undefined) user.allowanceHRA = Number(details.allowanceHRA);
      if (details.allowanceTravel !== undefined) user.allowanceTravel = Number(details.allowanceTravel);
      if (details.deductionPF !== undefined) user.deductionPF = Number(details.deductionPF);
      if (details.deductionPT !== undefined) user.deductionPT = Number(details.deductionPT);
      if (details.deductionTDS !== undefined) user.deductionTDS = Number(details.deductionTDS);
      this.save();
      return user;
    }
    return null;
  },

  uploadDocument(userId, fileName, fileSize) {
    const user = this.getUser(userId);
    if (user) {
      user.documents = user.documents || [];
      const newDoc = {
        id: 'doc_' + Math.random().toString(36).substring(2, 9),
        name: fileName,
        size: fileSize,
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

  uploadResume(userId, fileName, fileSize) {
    const user = this.getUser(userId);
    if (user) {
      user.resume = {
        name: fileName,
        size: fileSize,
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

  uploadAadhar(userId, fileName, fileSize) {
    const user = this.getUser(userId);
    if (user) {
      user.aadhar = {
        name: fileName,
        size: fileSize,
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

  uploadBankDetails(userId, fileName, fileSize) {
    const user = this.getUser(userId);
    if (user) {
      user.bankDetails = {
        name: fileName,
        size: fileSize,
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
  getSchedules() {
    return this.data.schedules;
  },

  getSchedule(id) {
    return this.data.schedules.find(s => s.id === id) || defaultSchedules[0];
  },

  addSchedule(schedule) {
    const newId = 'sch_' + Math.random().toString(36).substring(2, 9);
    const newSchedule = { id: newId, ...schedule };
    this.data.schedules.push(newSchedule);
    this.save();
    return newSchedule;
  },

  updateSchedule(id, updates) {
    const idx = this.data.schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.schedules[idx] = { ...this.data.schedules[idx], ...updates };
      this.save();
      return this.data.schedules[idx];
    }
    return null;
  },

  deleteSchedule(id) {
    if (this.data.schedules.length <= 1) return false;
    this.data.schedules = this.data.schedules.filter(s => s.id !== id);
    
    const fallbackId = this.data.schedules[0].id;
    this.data.users.forEach(u => {
      if (u.scheduleId === id) u.scheduleId = fallbackId;
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

  getTodayLog(userId) {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.data.attendanceLogs.find(l => l.userId === userId && l.date === todayStr);
  },

  checkIn(userId, method = 'none', location = 'Kohat Enclave, Pitampura, Delhi', deviationFlag = false, justification = '', coords = '', distance = 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    
    const existing = this.getTodayLog(userId);
    if (existing) return existing;

    const user = this.getUser(userId);
    const schedule = this.getSchedule(user.scheduleId);
    let status = 'On Time';
    
    if (schedule) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [nowHour, nowMin] = timeStr.split(':').map(Number);
      
      const totalStartMins = startHour * 60 + startMin;
      const totalNowMins = nowHour * 60 + nowMin;
      
      if (totalNowMins > totalStartMins + schedule.gracePeriod) {
        status = 'Late';
      }
    }

    if (deviationFlag) {
      status = 'Deviation Logged';
    }

    const newLog = {
      id: `log_${userId}_${todayStr}`,
      userId,
      date: todayStr,
      checkIn: timeStr,
      checkOut: null,
      status,
      biometricUsed: method,
      location: location,
      deviationFlag,
      justification,
      coords,
      distance
    };

    this.data.attendanceLogs.push(newLog);
    this.save();
    return newLog;
  },

  checkOut(userId, method = 'none') {
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const log = this.data.attendanceLogs.find(l => l.userId === userId && l.date === todayStr);
    if (!log || log.checkOut) return log;

    log.checkOut = timeStr;
    if (method !== 'none') {
      log.biometricUsed = method; // Log checkout biometric type
    }

    const user = this.getUser(userId);
    const schedule = this.getSchedule(user.scheduleId);
    if (schedule) {
      const [startHour, startMin] = log.checkIn.split(':').map(Number);
      const [endHour, endMin] = timeStr.split(':').map(Number);
      const totalWorkMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
      const [schStartHour, schStartMin] = schedule.startTime.split(':').map(Number);
      const [schEndHour, schEndMin] = schedule.endTime.split(':').map(Number);
      const expectedWorkMins = (schEndHour * 60 + schEndMin) - (schStartHour * 60 + schStartMin);
      
      if (totalWorkMins < expectedWorkMins / 2) {
        log.status = 'Half Day';
      }
    }

    this.save();
    return log;
  },

  // Leave Requests API
  getLeaveRequests(userId = null) {
    if (userId) {
      return this.data.leaveRequests.filter(r => r.userId === userId).sort((a, b) => b.requestDate.localeCompare(a.requestDate));
    }
    return this.data.leaveRequests.sort((a, b) => b.requestDate.localeCompare(a.requestDate));
  },

  applyLeave(userId, type, startDate, endDate, reason) {
    const newId = 'lv_' + Math.random().toString(36).substring(2, 9);
    const newRequest = {
      id: newId,
      userId,
      type,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      requestDate: new Date().toISOString().split('T')[0],
      managerComment: ''
    };
    this.data.leaveRequests.push(newRequest);
    this.save();
    return newRequest;
  },

  updateLeaveStatus(id, status, comment = '') {
    const req = this.data.leaveRequests.find(r => r.id === id);
    if (req) {
      req.status = status;
      req.managerComment = comment;
      this.save();
      return req;
    }
    return null;
  },

  // Payroll Calculations
  calculateMonthlyPayroll(userId, month, year) {
    const user = this.getUser(userId);
    if (!user) return null;

    const baseSalary = user.baseSalary || 50000;
    const allowanceHRA = user.allowanceHRA !== undefined ? user.allowanceHRA : Math.round(baseSalary * 0.15);
    const allowanceTravel = user.allowanceTravel !== undefined ? user.allowanceTravel : 3000;
    const deductionPF = user.deductionPF !== undefined ? user.deductionPF : Math.round(baseSalary * 0.08);
    const deductionPT = user.deductionPT !== undefined ? user.deductionPT : 200;
    const deductionTDS = user.deductionTDS !== undefined ? user.deductionTDS : (baseSalary > 60000 ? 10 : 5);

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

    const allLogs = this.getLogs(userId);
    const monthlyLogs = allLogs.filter(l => {
      const [lY, lM] = l.date.split('-').map(Number);
      return lY === year && (lM - 1) === month;
    });

    const allLeaves = this.getLeaveRequests(userId);
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
    const adj = (this.data.payrollAdjustments || []).find(a => a.userId === userId && a.month === month && a.year === year);
    const bonus = adj ? (adj.bonus || 0) : 0;
    const adhocDeduction = adj ? (adj.deduction || 0) : 0;
    const remarks = adj ? (adj.remarks || '') : '';

    const dailyRate = Math.round(baseSalary / workingDays);
    const absentDeduction = absentDays * dailyRate;
    const halfDayDeduction = Math.round(halfDays * 0.5 * dailyRate);
    
    const attendanceDeductions = absentDeduction + halfDayDeduction;
    const grossEarnings = baseSalary + allowanceHRA + allowanceTravel + bonus;
    const taxableEarnings = (baseSalary + allowanceHRA + allowanceTravel) - attendanceDeductions;
    const clampedTaxableEarnings = taxableEarnings < 0 ? 0 : taxableEarnings;
    const deductionTDSVal = Math.round(clampedTaxableEarnings * (deductionTDS / 100));
    const statutoryDeductions = deductionPF + deductionPT + deductionTDSVal;
    
    const totalDeductions = attendanceDeductions + statutoryDeductions + adhocDeduction;
    const netSalary = grossEarnings - attendanceDeductions - statutoryDeductions - adhocDeduction;

    return {
      userId,
      employeeName: user.name,
      baseSalary,
      allowanceHRA,
      allowanceTravel,
      deductionPF,
      deductionPT,
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
      netSalary: netSalary < 0 ? 0 : netSalary
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
    this.save();
    return newSwap;
  },

  respondToShiftSwapCoworker(swapId, accept, comment = '') {
    if (!this.data.shiftSwaps) return null;
    const swap = this.data.shiftSwaps.find(s => s.id === swapId);
    if (swap && swap.status === 'Pending Coworker') {
      swap.status = accept ? 'Pending Manager' : 'Rejected';
      swap.coworkerComment = comment;
      this.save();
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
    this.save();
    return newAnn;
  },

  deleteAnnouncement(id) {
    if (!this.data.announcements) return;
    this.data.announcements = this.data.announcements.filter(a => a.id !== id);
    this.save();
  },

  approveUserDocument(userId, docType) {
    const user = this.getUser(userId);
    if (!user) return null;
    if (!user.verificationStatuses) {
      user.verificationStatuses = {};
    }
    user.verificationStatuses[docType] = 'Approved';
    this.save();
    return user;
  }
};
