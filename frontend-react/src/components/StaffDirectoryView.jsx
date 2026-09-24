import React, { useState, useMemo } from 'react';

function StaffDirectoryView({ dbState }) {
  const users = dbState?.users || [];
  const schedules = dbState?.schedules || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const departments = useMemo(() => {
    const s = new Set();
    users.forEach(u => { if (u.department) s.add(u.department); });
    return ['All', ...Array.from(s)];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !searchQuery || 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.designation && u.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDept = deptFilter === 'All' || u.department === deptFilter;
      const matchStatus = statusFilter === 'All' || (u.status || 'Active').toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchDept && matchStatus;
    });
  }, [users, searchQuery, deptFilter, statusFilter]);

  const activeCount = useMemo(() => users.filter(u => (u.status || 'Active').toLowerCase() === 'active').length, [users]);

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Staff & Personnel Directory</h2>
          <p className="view-subtitle">Comprehensive list of House of Surya employees, contact information, and role assignments</p>
        </div>
      </div>

      {/* Filter and stats */}
      <div className="card mb-4">
        <div className="p-3 d-flex flex-wrap gap-3 align-center">
          <div className="form-group mb-0 flex-1">
            <input 
              type="text" 
              placeholder="Search by name, ID, email, or designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="form-group mb-0">
            <select 
              value={deptFilter} 
              onChange={(e) => setDeptFilter(e.target.value)}
              className="form-control"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-secondary">
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> staff ({activeCount} active)
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Contact</th>
                <th>Shift / Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No employees match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const shift = schedules.find(s => s.id === u.scheduleId);
                  const isActive = (u.status || 'Active').toLowerCase() === 'active';

                  return (
                    <tr key={u.id || u.employeeId}>
                      <td>
                        <div className="emp-cell">
                          <span className="emp-name font-semibold">{u.name || 'Unnamed'}</span>
                          <span className="emp-sub">{u.employeeId || u.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${u.role === 'hr' ? 'badge-role-admin' : (u.role === 'manager' ? 'badge-role-manager' : 'badge-role-employee')}`}>
                          {u.role ? u.role.toUpperCase() : 'EMPLOYEE'}
                        </span>
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>{u.designation || '—'}</td>
                      <td>
                        <div className="contact-cell">
                          <span className="text-sm">{u.email || '—'}</span>
                          <span className="text-sm text-muted">{u.phone || u.mobile || ''}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-col">
                          <span className="text-sm font-semibold">{shift ? shift.name : 'General Shift'}</span>
                          <span className="text-xs text-muted">{u.preferredLocation || 'Head Office'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.status || 'Active'}
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
    </div>
  );
}

export default StaffDirectoryView;
