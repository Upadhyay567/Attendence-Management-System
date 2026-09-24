import React, { useMemo } from 'react';

function AdminDashboard({ dbState, onNavigate }) {
  const users = dbState?.users || [];
  const attendanceLogs = dbState?.attendanceLogs || [];
  const leaveRequests = dbState?.leaveRequests || [];
  const schedules = dbState?.schedules || [];

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Compute metrics
  const activeStaffCount = useMemo(() => {
    return users.filter(u => u.status === 'Active' || !u.status).length;
  }, [users]);

  const todayPunches = useMemo(() => {
    // If today has punches, use today. Otherwise use the most recent date available in logs
    let list = attendanceLogs.filter(l => l.date === todayStr);
    if (list.length === 0 && attendanceLogs.length > 0) {
      // Find latest date in logs
      const sorted = [...attendanceLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const latestDate = sorted[0]?.date;
      if (latestDate) {
        list = attendanceLogs.filter(l => l.date === latestDate);
      }
    }
    return list;
  }, [attendanceLogs, todayStr]);

  const presentCount = useMemo(() => {
    return todayPunches.filter(p => !!p.checkIn).length;
  }, [todayPunches]);

  const lateCount = useMemo(() => {
    return todayPunches.filter(p => (p.status || '').toLowerCase().includes('late')).length;
  }, [todayPunches]);

  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(l => (l.status || '').toLowerCase() === 'pending').length;
  }, [leaveRequests]);

  // Lookup helpers
  const getUser = (userId) => {
    return users.find(u => u.id === userId || u.employeeId === userId) || {};
  };

  const getShift = (shiftId) => {
    return schedules.find(s => s.id === shiftId) || {};
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Executive Operations Dashboard</h2>
          <p className="view-subtitle">Real-time attendance overview & workforce metrics for House of Surya</p>
        </div>
        <div className="view-header-actions">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => onNavigate('schedules')}
          >
            📅 Manage Schedules & Roster
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap bg-blue-subtle">👥</div>
          <div className="kpi-data">
            <span className="kpi-value">{activeStaffCount}</span>
            <span className="kpi-label">Active Employees</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap bg-green-subtle">✅</div>
          <div className="kpi-data">
            <span className="kpi-value">{presentCount}</span>
            <span className="kpi-label">Present (Today/Latest)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap bg-amber-subtle">⚠️</div>
          <div className="kpi-data">
            <span className="kpi-value">{lateCount}</span>
            <span className="kpi-label">Late Arrivals</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap bg-purple-subtle">📝</div>
          <div className="kpi-data">
            <span className="kpi-value">{pendingLeavesCount}</span>
            <span className="kpi-label">Pending Leave Requests</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap bg-maroon-subtle">🕒</div>
          <div className="kpi-data">
            <span className="kpi-value">{schedules.length}</span>
            <span className="kpi-label">Configured Shifts</span>
          </div>
        </div>
      </div>

      {/* Live Punch Activity Feed */}
      <div className="card dashboard-card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Live Attendance Activity</h3>
            <span className="card-subtitle">
              Showing {todayPunches.length} records {todayPunches[0]?.date ? `for ${todayPunches[0].date}` : ''}
            </span>
          </div>
          <button 
            type="button" 
            className="btn btn-outline btn-sm"
            onClick={() => onNavigate('attendance')}
          >
            View All Attendance Logs →
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Source / Gate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayPunches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No punch activity recorded for this period.
                  </td>
                </tr>
              ) : (
                todayPunches.slice(0, 10).map((punch) => {
                  const emp = getUser(punch.userId);
                  const shift = getShift(punch.shiftId);
                  const status = (punch.status || 'Present').toLowerCase();
                  let badgeClass = 'badge-success';
                  if (status.includes('late')) badgeClass = 'badge-warning';
                  else if (status.includes('half')) badgeClass = 'badge-purple';
                  else if (status.includes('absent')) badgeClass = 'badge-danger';

                  return (
                    <tr key={punch.id || `${punch.userId}-${punch.date}`}>
                      <td>
                        <div className="emp-cell">
                          <span className="emp-name">{emp.name || punch.userId}</span>
                          <span className="emp-sub">{emp.employeeId || ''}</span>
                        </div>
                      </td>
                      <td>{emp.department || '—'}</td>
                      <td>
                        <span className="shift-pill">{shift.name || punch.shiftId || 'General'}</span>
                      </td>
                      <td className="font-mono">{punch.checkIn || '—'}</td>
                      <td className="font-mono">{punch.checkOut || '—'}</td>
                      <td>
                        <span className="device-source" title={punch.biometricUsed || punch.location}>
                          {punch.biometricUsed ? `📟 ${punch.biometricUsed}` : (punch.location || '📍 Worksite')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${badgeClass}`}>
                          {punch.status || 'On Time'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Quick Actions & Pending Requests */}
      <div className="dashboard-columns">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Approvals</h3>
            <button 
              type="button" 
              className="btn-link"
              onClick={() => onNavigate('leaves')}
            >
              See All ({leaveRequests.length})
            </button>
          </div>
          <div className="pending-leaves-list">
            {leaveRequests.filter(l => (l.status || '').toLowerCase() === 'pending').slice(0, 4).length === 0 ? (
              <p className="text-muted p-3 text-center">No pending leave requests at this moment.</p>
            ) : (
              leaveRequests
                .filter(l => (l.status || '').toLowerCase() === 'pending')
                .slice(0, 4)
                .map((req) => {
                  const emp = getUser(req.userId);
                  return (
                    <div key={req.id} className="leave-request-item">
                      <div>
                        <strong>{emp.name || req.userId}</strong>
                        <div className="text-sm text-muted">
                          {req.type || 'Leave'}: {req.startDate} to {req.endDate}
                        </div>
                        <div className="text-sm text-secondary">Reason: "{req.reason || 'Personal'}"</div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline"
                        onClick={() => onNavigate('leaves')}
                      >
                        Review
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Roster & Shifts Overview</h3>
            <button 
              type="button" 
              className="btn-link"
              onClick={() => onNavigate('schedules')}
            >
              Configure Shifts
            </button>
          </div>
          <div className="shifts-list-compact">
            {schedules.slice(0, 4).map((sch) => (
              <div key={sch.id} className="shift-summary-row">
                <div>
                  <span className="font-semibold">{sch.name}</span>
                  <div className="text-sm text-muted">
                    ⏰ {sch.startTime} - {sch.endTime} (Grace: {sch.gracePeriod || 15}m)
                  </div>
                </div>
                <span className="location-tag">{sch.location ? sch.location.split('(')[0] : 'Worksite'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
