# Surya Attendance & Payroll Management System
## End-to-End Implementation Report & Architecture Specification

---

## 1. Executive Summary
The **Surya Attendance & Payroll Management System** is a lightweight, secure Single Page Application (SPA) designed for employee time-tracking, shift schedules, geo-verification, and payroll processing. Built for **HS Group Delhi (House of Surya)**, the application facilitates employee check-ins, shift swap request coordination, profile database management, and payroll statements, with strong role-based access control (RBAC).

---

## 2. System Architecture
The application runs as a front-end SPA supported by a mocked database layer stored in browser `localStorage`.
* **Routing Layer (`js/app.js`)**: A client-side hash router that parses navigation links (e.g., `#dashboard`, `#admin-schedules`, `#employee-swaps`) and mounts views dynamically.
* **Database & Calculation Layer (`js/db.js`)**: An object-oriented API that performs schema queries, database transactions, shift assignments, and payroll calculations.
* **Security & Authentication (`js/auth.js`)**: Validates passwords, tracks active sessions, and simulates biometric registers.

---

## 3. Phased Implementation Details

### Phase 1: Location & Geofencing System Overhaul
* **Mock Office Geofence Coordinates**:
  1. **Kohat Enclave, Pitampura, Delhi (HQ)** — Coord: `28.6978° N, 77.1408° E` (In-Range).
  2. **Chandni Chowk (Hub)** — Coord: `28.6562° N, 77.2310° E` (Out of Range - 9.8 km deviation).
  3. **Omaxe City, Delhi (Branch)** — Coord: `28.8130° N, 77.0673° E` (Out of Range - 14.5 km deviation).
* **Clock-in Verification Logic**:
  * Biometric actions (Face ID, Fingerprint) are restricted to the HQ location.
  * Attempting to clock in from an out-of-range location disables biometric buttons.
  * Employees can check in via Passcode only after filling out an **Out-of-Geofence Deviation Justification** textarea.
  * Out-of-range logs are flagged as `Pending Manager Review`.

### Phase 2: Shift Schedule Location Selector
* **Shift Settings Modal**: A location dropdown selection was added to the **Create / Edit Shift Calendar** modal.
* **Inline Shift Card Controls**: Added interactive **Location Select** and **Location Swap** dropdown selectors directly onto the shift cards on the admin page.
  * Changing location instantly saves modifications to `localStorage`.
  * Selecting another shift from the swap dropdown swaps the locations between both patterns immediately.

### Phase 3: Location-Aware Shift Swapping
* **Coworker Preview**: The coworker swap dropdown displays each coworker's assigned shift name and location.
* **Coworker Assignment Preview Block**: Selecting a coworker displays a detailed current assignment card showing their shift times and location before submission.
* **Swap Mode Configurations**:
  1. **Swap Both Shift & Work Location**: Exchanges the shift timings and the preferred work locations of both users.
  2. **Swap Work Location Only**: Exchanges the preferred work locations while keeping their current shift timings.
  3. **Swap Shift Only**: Exchanges shift timings while keeping their current preferred work location.
* **Ledgers Update**: Updated the Sent Requests, Received Requests, and Manager Approval logs to display locations and swap modes.

### Phase 4: Role-Based Payroll & Profile Access
* **Segregation of Duties**: Both the **HR Coordinator** and **Operations Manager** can now access, edit, and configure the payroll/salaries of general Employees (`role === 'employee'`).
* **HR Payroll Controlled by Manager**:
  * Operations Manager can view, edit, and delete the HR Coordinator's profile and payroll.
  * The HR Coordinator is hidden from the register table when logged in as HR, preventing them from modifying their own salary, base payroll coefficients, or portal access roles.
* **Role Escalation Protection**: The user editor modal restricts portal role assignments; only the Operations Manager can change user access roles (assigning `Employee`, `HR Coordinator`, or `Operations Manager`). When edited by HR, the selection is restricted to the `Employee` role.

### Phase 5: Manager Payslip Adjustments
* **Interactive Adjustments Drawer**: Added an **✏️ Edit Adjustments** button to the Admin Payslip Preview drawer (visible only to the logged-in Operations Manager).
* **Adjustment Modals**: Clicking this button opens a modal to customize:
  * **Discretionary Bonus** (Earning Addition)
  * **Ad-hoc Deductions** (Deduction Subtraction)
  * **Manager Remarks / Notes** (Printed directly onto the payslip statement)
* **Calculations & Persistence**: Integrated adjustments directly into the database calculations (`js/db.js`). The net disbursed payouts reflect the overridden values immediately.
* **Payslip Template Update**: Modified both the administrator inspect template and the employee's personal payslip statement (`js/app.js`) to display discretionary bonuses, custom deductions, and remarks dynamically when present.

---

## 4. Verification & Testing Guide

### Running the App Locally
The application is served locally via a Python HTTP server on port 8012:
```bash
python -m http.server 8012
```
To run the server, browse to: **[http://localhost:8012](http://localhost:8012)**

### Simulated User Credentials
1. **Operations Manager** (Full Control, edit HR, adjust payslips):
   * Username: `manager`
   * Password: `ManagerPassword123!`
2. **HR Coordinator** (Manage employee shifts & profiles, no self-edits):
   * Username: `hr`
   * Password: `HRPassword123!`
3. **General Employee** (John Doe):
   * Username: `john`
   * Password: `JohnPassword123!`
