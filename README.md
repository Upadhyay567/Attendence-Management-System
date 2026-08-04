<div align="center">

  # 🏢 HS Group Attendance & HR Management System
  ### *Enterprise-Grade GPS-Verified Attendance, Automated Payroll & Workforce Analytics*

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Version](https://img.shields.io/badge/Version-2.5.0--Enterprise-emerald.svg)]()
  [![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white)]()
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)]()
  [![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)]()
  [![CSS3](https://img.shields.io/badge/Design-Glassmorphic_UI-8b5cf6.svg)]()
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

  ---

  [Key Features](#-key-features) •
  [Tech Stack](#-technology-stack) •
  [Quick Start](#-quick-start--installation) •
  [Demo Accounts](#-demo-accounts) •
  [Mobile Access](#-mobile--network-setup) •
  [License](#-license)

</div>

<br/>

## 🌟 Executive Summary

**HS Group Attendance & HR Management System** is a full-featured, enterprise-grade Single Page Application (SPA) designed to streamline human resource workflows, employee attendance, shift scheduling, payroll calculation, and real-time site verification.

Equipped with **GPS Geofence Validation**, **Multi-Threaded Dual Servers** (Python Live Server + Express Backend), and **Glassmorphic Responsive UI**, this platform guarantees seamless performance on both Desktop and Mobile web browsers over local LAN/Wi-Fi networks.

---

## 🔥 Key Features

### 📍 1. Smart GPS & Worksite Geofencing
- **Precision Verification**: Validates employee check-ins against exact worksite coordinates using Haversine distance math.
- **Dynamic Site Monitoring**: Allows HR to configure custom office coordinates and location drop-downs.
- **Auto Check-in Flow**: Optional proximity auto check-in with GPS permission fallbacks and status indicators.

### 💼 2. Role-Based Access Control (RBAC) & Account Management
- **Role Hierarchy**: Multi-tier permissions for **Employee**, **Manager**, **HR**, and **HR Admin**.
- **Role-Specific ID Automation**:
  - `HR` prefix for HR accounts (e.g. `HR100`)
  - `MGR` prefix for Managers (e.g. `MGR100`)
  - `EMP` prefix for Employees (e.g. `EMP100`)
- **Account Control Panel**: HR/Admin management modal for creating, updating, activating/deactivating accounts, and resetting passwords with `$hash$` hashing.

### 💰 3. Automated Payroll & Salary Slip Generator
- **Structure Calculations**: Base Salary, HRA (15%), Travel Allowance, Provident Fund (8% PF), Professional Tax (PT), and TDS deductions.
- **Instant Payslip Generation**: Monthly summary computation with downloadable PDF salary certificates.

### 📊 4. Shift Scheduling & Attendance Analytics
- **Shift Assignment**: Morning, Evening, and Night shift allocation per department.
- **Visual Analytics**: Interactive daily, weekly, and monthly attendance charts, late mark tracking, and leave management.

### 🎨 5. Ultra-Modern Glassmorphic UI Suite
- **Dark Mode Design**: Styled with sleek dark gradients, glassmorphism, floating SVG badges, micro-animations, and responsive tables.
- **Custom Dialog Modals**: Replacement of browser alert/confirm/prompt boxes with high-end, animated popup cards.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | HTML5, JavaScript (ES6+ Modules) | Modular SPA Architecture without heavy frameworks |
| **Styling & Theme** | Vanilla CSS3 (Custom Tokens) | Glassmorphic design, HSL palette, dark theme, responsive grid |
| **Live Server** | Python `http.server.ThreadingHTTPServer` | Multi-threaded HTTP web server listening on Port `8080` |
| **Backend API** | Node.js + Express | RESTful backend service listening on Port `8080` |
| **Database Sync** | JSON Persistence (`seed.json`) & MongoDB Sync | Real-time state synchronization |
| **Security** | Custom Hashing (`$hash$`) | Dual-credential authentication & password protection |

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Python 3.8+** (installed on system)
- **Node.js 18+** *(Optional: required only for Express backend sync)*

### Step 1: Clone the Repository
```bash
git clone https://github.com/Upadhyay567/Attendence-Management-System.git
cd Attendence-Management-System
```

### Step 2: Start the Servers
Double-click **`run-server.bat`** in Windows File Explorer, or run in terminal:

```bash
run-server.bat
```

> **Note**: `run-server.bat` automatically launches the Node.js Express server on `http://localhost:8080` (if Node.js is installed), or falls back to the Python Multi-Threaded HTTP Server on `http://localhost:8080` (if Python is installed), opening your default browser after a 2-second setup delay. If neither is available, it opens `index.html` directly.

---

## 🔑 Demo Accounts

Use these pre-configured credentials to test different role permissions:

| Role | Username / Email | Password | Generated ID |
| :--- | :--- | :--- | :--- |
| **HR Admin** | `admin` | `Deepak@123` | `EMP100` / `HR100` |
| **HR Coordinator** | `hr` | `HRPassword123!` | `HR101` |
| **Operations Manager** | `manager` | `ManagerPassword123!` | `MGR102` |
| **Employee (Demo)** | `hemant` | `Hemant123!` | `EMP103` |

---

## 📱 Mobile & Network Access

To access the platform on your **Mobile Device** or any laptop connected to the same Wi-Fi network:

1. Open `cmd` and find your computer's local IP (e.g. `192.168.1.72`).
2. Open the mobile browser and visit:
   ```text
   http://<YOUR_LOCAL_IP>:8080
   ```
3. *(Optional)* Add a Windows Firewall rule if mobile access is blocked:
   ```cmd
   netsh advfirewall firewall add rule name="HS Group Live Server" dir=in action=allow protocol=TCP localport=8080
   ```

---

## 📂 Project Structure

```text
Attendence-Management-System/
├── index.html                  # Main SPA Container & Views
├── server.py                   # Multi-Threaded Python HTTPServer (Port 8080)
├── server.js                   # Node.js Express Backend API (Port 8080)
├── run-server.bat              # Concurrent Dual-Server Windows Launcher
├── seed.json                   # Unified State Database & Seeding Store
├── css/
│   └── style.css               # Glassmorphic Design System & Tokens
├── js/
│   ├── app.js                  # SPA Router, Custom Dialogs & View Controllers
│   ├── db.js                   # Data Layer, CRUD Methods & ID Prefix Generators
│   ├── auth.js                 # Authentication Service & Session Manager
│   └── utils.js                # Helpers, Hashing & CSV/PDF Exporters
└── assets/                     # Logos, Badges & Branding Media
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [issues page](https://github.com/Upadhyay567/Attendence-Management-System/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">

  **Created with ❤️ by [Upadhyay567](https://github.com/Upadhyay567)**

</div>
