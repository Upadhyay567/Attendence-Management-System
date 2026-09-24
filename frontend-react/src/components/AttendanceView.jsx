import React, { useState, useMemo } from 'react';

function AttendanceView({ dbState, currentUser }) {
  const users = dbState?.users || [];
  const attendanceLogs = dbState?.attendanceLogs || [];
  const schedules = dbState?.schedules || [];

  const isEmployeeOnly = currentUser?.role?.toLowerCase() === 'employee';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Helpers
  const getUser = (userId) => {
    return users.find(u => u.id === userId || u.employeeId === userId) || {};
  };

  const getShift = (shiftId) => {
    return schedules.find(s => s.id === shiftId) || {};
  };

  // Base list
  const baseLogs = useMemo(() => {
    if (isEmployeeOnly) {
      return attendanceLogs.filter(l => l.userId === currentUser.id || l.userId === currentUser.employeeId);
    }
    return attendanceLogs;
  }, [attendanceLogs, isEmployeeOnly, currentUser]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return baseLogs
      .filter((log) => {
        const emp = getUser(log.userId);
        const matchSearch = !searchQuery || 
          (emp.name && emp.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (emp.employeeId && emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (log.userId && log.userId.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchStatus = filterStatus === 'All' || 
          (log.status && log.status.toLowerCase().includes(filterStatus.toLowerCase()));

        const matchDate = !filterDate || log.date === filterDate;

        return matchSearch && matchStatus && matchDate;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [baseLogs, searchQuery, filterStatus, filterDate, users]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page when filter changes
  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            {isEmployeeOnly ? 'My Attendance Record' : 'Attendance & Punch Register'}
          </h2>
          <p className="view-subtitle">
            {isEmployeeOnly ? 'Detailed history of your punch times and working hours' : 'Audit logs, daily check-ins, biometric punches, and status tracking'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-4">
        <div className="p-3 d-flex flex-wrap gap-3 align-center">
          {!isEmployeeOnly && (
            <div className="form-group mb-0 flex-1">
              <input 
                type="text" 
                placeholder="Search staff name or ID..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="form-control"
              />
            </div>
          )}

          <div className="form-group mb-0">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => handleFilterChange(setFilterDate, e.target.value)}
              className="form-control"
              title="Filter by date"
            />
          </div>

          <div className="form-group mb-0">
            <select 
              value={filterStatus}
              onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
              className="form-control"
            >
              <option value="All">All Statuses</option>
              <option value="Time">On Time</option>
              <option value="Late">Late</option>
              <option value="Half">Half Day</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {(searchQuery || filterDate || filterStatus !== 'All') && (
            <button 
              type="button" 
              onClick={() => {
                setSearchQuery('');
                setFilterDate('');
                setFilterStatus('All');
                setCurrentPage(1);
              }}
              className="btn btn-outline btn-sm"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-sm text-secondary">
            Found <strong>{filteredLogs.length}</strong> record(s)
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Shift</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Source / Device</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const emp = getUser(log.userId);
                  const shift = getShift(log.shiftId);
                  const status = (log.status || 'Present').toLowerCase();
                  let badge = 'badge-success';
                  if (status.includes('late')) badge = 'badge-warning';
                  else if (status.includes('half')) badge = 'badge-purple';
                  else if (status.includes('absent')) badge = 'badge-danger';

                  return (
                    <tr key={log.id || `${log.userId}-${log.date}`}>
                      <td className="font-semibold">{log.date}</td>
                      <td>
                        <div className="emp-cell">
                          <span className="emp-name">{emp.name || log.userId}</span>
                          <span className="emp-sub">{emp.employeeId || ''} {emp.department ? `• ${emp.department}` : ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className="shift-pill">{shift.name || log.shiftId || 'General'}</span>
                      </td>
                      <td className="font-mono">{log.checkIn || '—'}</td>
                      <td className="font-mono">{log.checkOut || '—'}</td>
                      <td>
                        <span className="device-source">
                          {log.biometricUsed ? `📟 ${log.biometricUsed}` : (log.location || '📍 Worksite')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${badge}`}>
                          {log.status || 'On Time'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button 
              type="button" 
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              type="button" 
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceView;
