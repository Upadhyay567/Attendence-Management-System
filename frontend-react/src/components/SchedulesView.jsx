import React, { useState, useMemo } from 'react';
import { api } from '../services/api';

function SchedulesView({ dbState, onDataUpdated }) {
  const users = dbState?.users || [];
  const schedules = dbState?.schedules || [];
  const officeCoordinates = dbState?.officeCoordinates || {};

  // Extract location names from officeCoordinates or schedules
  const availableLocations = useMemo(() => {
    const locSet = new Set();
    // From officeCoordinates keys
    Object.keys(officeCoordinates).forEach(k => locSet.add(k));
    // From schedules
    schedules.forEach(s => {
      if (s.location) locSet.add(s.location);
    });
    // Defaults if empty
    if (locSet.size === 0) {
      locSet.add('Chandni Chowk HQ');
      locSet.add('Noida Sector 61');
      locSet.add('Omaxe Mall Worksite');
    }
    return Array.from(locSet);
  }, [officeCoordinates, schedules]);

  // Bulk Assignment State
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [targetShiftId, setTargetShiftId] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set();
    users.forEach(u => {
      if (u.department) set.add(u.department);
    });
    return ['All', ...Array.from(set)];
  }, [users]);

  // Filtered employees
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchDept = filterDepartment === 'All' || u.department === filterDepartment;
      const matchSearch = !searchQuery || 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchDept && matchSearch;
    });
  }, [users, filterDepartment, searchQuery]);

  // Toggle individual user
  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Toggle Select All visible
  const handleSelectAllVisible = (e) => {
    if (e.target.checked) {
      const visibleIds = filteredUsers.map(u => u.id);
      setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...visibleIds])));
    } else {
      const visibleIds = new Set(filteredUsers.map(u => u.id));
      setSelectedUserIds(selectedUserIds.filter(id => !visibleIds.has(id)));
    }
  };

  const isAllVisibleSelected = filteredUsers.length > 0 && 
    filteredUsers.every(u => selectedUserIds.includes(u.id));

  // Perform Bulk Assignment
  const handleApplyBulkAssignment = async () => {
    if (selectedUserIds.length === 0) {
      setAlertMsg({ type: 'error', text: 'Please select at least one employee from the roster.' });
      return;
    }
    if (!targetShiftId && !targetLocation) {
      setAlertMsg({ type: 'error', text: 'Please choose a Target Shift or Target Location to assign.' });
      return;
    }

    setIsAssigning(true);
    setAlertMsg(null);

    try {
      const updates = {};
      if (targetShiftId) updates.scheduleId = targetShiftId;
      if (targetLocation) updates.preferredLocation = targetLocation;

      // Update each selected user
      let count = 0;
      for (const uid of selectedUserIds) {
        await api.mutateGranular('update', 'users', null, { id: uid }, updates);
        count++;
      }

      setAlertMsg({
        type: 'success',
        text: `Successfully assigned ${count} employee(s) to ${targetShiftId ? 'new shift' : ''} ${targetLocation ? `at ${targetLocation}` : ''}!`
      });
      setSelectedUserIds([]);
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message || 'Bulk assignment failed.' });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Shift Roster & Schedules</h2>
          <p className="view-subtitle">Manage work schedules, shift timings, and bulk roster assignments</p>
        </div>
      </div>

      {alertMsg && (
        <div className={`alert ${alertMsg.type === 'error' ? 'alert-danger' : 'alert-success'} mb-4`}>
          {alertMsg.text}
        </div>
      )}

      {/* Shifts Summary Cards */}
      <div className="shifts-grid mb-4">
        {schedules.map((sch) => (
          <div key={sch.id} className="shift-card">
            <div className="shift-card-header">
              <span className="shift-name">{sch.name}</span>
              <span className="badge-shift-time">{sch.startTime} - {sch.endTime}</span>
            </div>
            <div className="shift-card-body">
              <p className="shift-location">📍 {sch.location || 'All Workstations'}</p>
              <div className="shift-meta">
                <span>Grace: {sch.gracePeriod || 15}m</span>
                <span>Half-day: {sch.halfDayLimit || 120}m</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Shift Assignment Action Box */}
      <div className="card bulk-assignment-card mb-4">
        <div className="card-header bg-maroon text-white">
          <div className="d-flex align-center gap-2">
            <span className="icon">⚡</span>
            <h3 className="card-title text-white">Bulk Shift & Location Assignment</h3>
          </div>
          <span className="badge badge-light">
            {selectedUserIds.length} Selected
          </span>
        </div>

        <div className="p-4">
          <p className="text-secondary text-sm mb-3">
            Select employees from the roster below, choose the target shift and location, and click Apply.
          </p>
          <div className="form-row align-end">
            <div className="form-group flex-1">
              <label htmlFor="target-shift-select">Target Shift</label>
              <select 
                id="target-shift-select"
                value={targetShiftId} 
                onChange={(e) => setTargetShiftId(e.target.value)}
                className="form-control"
              >
                <option value="">-- Choose Shift to Assign --</option>
                {schedules.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group flex-1">
              <label htmlFor="target-location-select">Target Working Location</label>
              <select 
                id="target-location-select"
                value={targetLocation} 
                onChange={(e) => setTargetLocation(e.target.value)}
                className="form-control"
              >
                <option value="">-- Choose Location to Assign --</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <button 
                type="button" 
                onClick={handleApplyBulkAssignment}
                disabled={isAssigning || selectedUserIds.length === 0}
                className="btn btn-primary"
              >
                {isAssigning ? 'Applying...' : `Assign (${selectedUserIds.length}) Staff`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="card">
        <div className="card-header flex-wrap gap-3">
          <h3 className="card-title">Employee Roster List</h3>
          
          <div className="table-filters d-flex gap-2 flex-wrap">
            <input 
              type="text" 
              placeholder="Search name, ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control search-input"
            />

            <select 
              value={filterDepartment} 
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="form-control dept-filter"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={isAllVisibleSelected} 
                    onChange={handleSelectAllVisible}
                    aria-label="Select all visible employees"
                  />
                </th>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Assigned Shift</th>
                <th>Preferred Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No employees matching the search filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((emp) => {
                  const shift = schedules.find(s => s.id === emp.scheduleId);
                  const isChecked = selectedUserIds.includes(emp.id);

                  return (
                    <tr key={emp.id} className={isChecked ? 'row-selected' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleToggleUser(emp.id)}
                          aria-label={`Select ${emp.name}`}
                        />
                      </td>
                      <td>
                        <div className="emp-cell">
                          <span className="emp-name font-semibold">{emp.name || 'Unnamed'}</span>
                          <span className="emp-sub">{emp.employeeId || emp.username}</span>
                        </div>
                      </td>
                      <td>{emp.department || '—'}</td>
                      <td>{emp.designation || '—'}</td>
                      <td>
                        <span className="shift-pill">
                          {shift ? shift.name : 'General (Default)'}
                        </span>
                      </td>
                      <td>
                        <span className="location-cell">
                          {emp.preferredLocation || shift?.location || 'Head Office'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${(emp.status || 'Active').toLowerCase() === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {emp.status || 'Active'}
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

export default SchedulesView;
