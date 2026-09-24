import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

function EmployeeDashboard({ user, dbState, onDataUpdated }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workRemarks, setWorkRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Leave Form state
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const timeFormatted = useMemo(() => {
    return currentTime.toLocaleTimeString('en-US', { hour12: false });
  }, [currentTime]);

  // Current user's shift
  const userShift = useMemo(() => {
    const schedules = dbState?.schedules || [];
    if (!user) return null;
    return schedules.find(s => s.id === user.scheduleId) || schedules[0] || null;
  }, [dbState, user]);

  // Today's attendance record for current user
  const todayPunch = useMemo(() => {
    const logs = dbState?.attendanceLogs || [];
    if (!user) return null;
    return logs.find(l => (l.userId === user.id || l.userId === user.employeeId) && l.date === todayStr);
  }, [dbState, user, todayStr]);

  // Past punches for this user
  const myRecentPunches = useMemo(() => {
    const logs = dbState?.attendanceLogs || [];
    if (!user) return [];
    return logs
      .filter(l => l.userId === user.id || l.userId === user.employeeId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
  }, [dbState, user]);

  // My leaves
  const myLeaves = useMemo(() => {
    const leaves = dbState?.leaveRequests || [];
    if (!user) return [];
    return leaves
      .filter(l => l.userId === user.id || l.userId === user.employeeId)
      .sort((a, b) => (b.requestDate || b.startDate || '').localeCompare(a.requestDate || a.startDate || ''));
  }, [dbState, user]);

  const handleClockIn = async () => {
    setIsSubmitting(true);
    setNotification(null);
    try {
      const nowTime = new Date().toTimeString().split(' ')[0];
      const newPunch = {
        id: `ATT_${user.id}_${todayStr}_${Date.now()}`,
        userId: user.id,
        date: todayStr,
        shiftId: userShift ? userShift.id : 'default_shift',
        checkIn: nowTime,
        checkOut: '',
        status: 'On Time',
        location: userShift?.location || 'House of Surya Head Office',
        deviationFlag: false,
        justification: workRemarks || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await api.mutateGranular('create', 'attendanceLogs', newPunch);
      setNotification({ type: 'success', text: `Successfully Clocked In at ${nowTime}!` });
      setWorkRemarks('');
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to clock in.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayPunch) return;
    setIsSubmitting(true);
    setNotification(null);
    try {
      const nowTime = new Date().toTimeString().split(' ')[0];
      await api.mutateGranular(
        'update',
        'attendanceLogs',
        null,
        { id: todayPunch.id },
        { 
          checkOut: nowTime, 
          justification: workRemarks ? `${todayPunch.justification || ''} [Out: ${workRemarks}]`.trim() : todayPunch.justification,
          updatedAt: new Date().toISOString()
        }
      );

      setNotification({ type: 'success', text: `Successfully Clocked Out at ${nowTime}!` });
      setWorkRemarks('');
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to clock out.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      setNotification({ type: 'error', text: 'Please select valid start and end dates.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newLeave = {
        id: `lv_${Math.random().toString(36).substr(2, 7)}`,
        userId: user.id,
        type: leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason,
        status: 'Pending',
        requestDate: todayStr,
        managerComment: '',
        supportingDoc: null
      };

      await api.mutateGranular('create', 'leaveRequests', newLeave);
      setNotification({ type: 'success', text: 'Leave request submitted successfully for approval.' });
      setShowLeaveForm(false);
      setLeaveReason('');
      setLeaveStart('');
      setLeaveEnd('');
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to submit leave request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">Welcome back, {user?.name || 'Employee'}!</h2>
          <p className="view-subtitle">Today is {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="view-header-actions">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setShowLeaveForm(!showLeaveForm)}
          >
            {showLeaveForm ? '✕ Close Form' : '🌴 Apply for Leave'}
          </button>
        </div>
      </div>

      {notification && (
        <div className={`alert ${notification.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
          {notification.text}
        </div>
      )}

      {/* Leave Application Modal/Form */}
      {showLeaveForm && (
        <div className="card mb-4 border-maroon">
          <div className="card-header bg-maroon-subtle">
            <h3 className="card-title text-maroon">Apply for Leave</h3>
          </div>
          <form onSubmit={handleApplyLeave} className="p-4">
            <div className="form-row">
              <div className="form-group">
                <label>Leave Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="form-control">
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Annual">Annual / Paid Leave</option>
                  <option value="Emergency">Emergency Leave</option>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={leaveStart} 
                  onChange={(e) => setLeaveStart(e.target.value)} 
                  className="form-control"
                  required 
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={leaveEnd} 
                  onChange={(e) => setLeaveEnd(e.target.value)} 
                  className="form-control"
                  required 
                />
              </div>
            </div>
            <div className="form-group mt-3">
              <label>Reason for Leave</label>
              <textarea 
                value={leaveReason} 
                onChange={(e) => setLeaveReason(e.target.value)} 
                rows="2" 
                className="form-control"
                placeholder="State your reason..."
                required
              />
            </div>
            <div className="form-actions mt-3">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <button type="button" onClick={() => setShowLeaveForm(false)} className="btn btn-outline ml-2">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Punch Clock & Today's Shift Grid */}
      <div className="dashboard-columns">
        {/* Clock In / Out Action Card */}
        <div className="card punch-card">
          <div className="card-header">
            <h3 className="card-title">Live Geofence Punch</h3>
            <span className="badge-geofence-live">📍 In Office Geofence</span>
          </div>

          <div className="punch-clock-display">
            <div className="digital-clock">{timeFormatted}</div>
            <div className="digital-date">{todayStr}</div>
          </div>

          <div className="punch-status-section">
            {!todayPunch ? (
              <div className="punch-state-box not-checked-in">
                <p className="state-headline">You haven't clocked in today.</p>
                <p className="state-desc">Press the button below to register your check-in.</p>
              </div>
            ) : !todayPunch.checkOut ? (
              <div className="punch-state-box checked-in">
                <p className="state-headline">✅ Checked In: <strong>{todayPunch.checkIn}</strong></p>
                <p className="state-desc">Work in progress. Remember to clock out before leaving.</p>
              </div>
            ) : (
              <div className="punch-state-box completed">
                <p className="state-headline">🎉 Shift Completed for Today</p>
                <p className="state-desc">
                  In: <strong>{todayPunch.checkIn}</strong> | Out: <strong>{todayPunch.checkOut}</strong>
                </p>
              </div>
            )}
          </div>

          {(!todayPunch || !todayPunch.checkOut) && (
            <div className="punch-form-wrap">
              <input 
                type="text" 
                value={workRemarks}
                onChange={(e) => setWorkRemarks(e.target.value)}
                placeholder="Work remarks / task notes (optional)..."
                className="form-control mb-3"
              />

              {!todayPunch ? (
                <button 
                  type="button" 
                  onClick={handleClockIn}
                  disabled={isSubmitting}
                  className="btn-punch btn-punch-in"
                >
                  {isSubmitting ? 'Recording...' : '👉 Punch In (Clock In)'}
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleClockOut}
                  disabled={isSubmitting}
                  className="btn-punch btn-punch-out"
                >
                  {isSubmitting ? 'Recording...' : '👋 Punch Out (Clock Out)'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Current Assigned Shift & Location Details */}
        <div className="card shift-details-card">
          <div className="card-header">
            <h3 className="card-title">Assigned Shift & Roster</h3>
          </div>
          <div className="shift-info-body">
            <div className="info-item">
              <span className="info-label">Assigned Shift</span>
              <span className="info-value font-semibold">{userShift?.name || 'General Shift'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Standard Timings</span>
              <span className="info-value font-mono">
                {userShift ? `${userShift.startTime} - ${userShift.endTime}` : '09:30 - 18:30'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Grace Period</span>
              <span className="info-value">{userShift?.gracePeriod || 15} minutes</span>
            </div>
            <div className="info-item">
              <span className="info-label">Base Location</span>
              <span className="info-value">{userShift?.location || user?.preferredLocation || 'House of Surya Head Office'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Department</span>
              <span className="info-value">{user?.department || 'Operations'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Designation</span>
              <span className="info-value">{user?.designation || 'Staff'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Punches Table */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">My Recent Punches</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Location / Device</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myRecentPunches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-3 text-muted">No attendance punches found yet.</td>
                </tr>
              ) : (
                myRecentPunches.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.date}</td>
                    <td className="font-mono">{p.checkIn || '—'}</td>
                    <td className="font-mono">{p.checkOut || '—'}</td>
                    <td>{p.biometricUsed || p.location || 'Worksite'}</td>
                    <td>
                      <span className={`status-badge ${(p.status || '').toLowerCase().includes('late') ? 'badge-warning' : 'badge-success'}`}>
                        {p.status || 'On Time'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Leaves List */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">My Leave History</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applied Date</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myLeaves.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-3 text-muted">No leave requests submitted.</td>
                </tr>
              ) : (
                myLeaves.map((l) => {
                  let badge = 'badge-purple';
                  if ((l.status || '').toLowerCase() === 'approved') badge = 'badge-success';
                  if ((l.status || '').toLowerCase() === 'rejected') badge = 'badge-danger';
                  return (
                    <tr key={l.id}>
                      <td>{l.requestDate || '—'}</td>
                      <td><strong>{l.type || 'Casual'}</strong></td>
                      <td>{l.startDate} → {l.endDate}</td>
                      <td>{l.reason || '—'}</td>
                      <td><span className={`status-badge ${badge}`}>{l.status || 'Pending'}</span></td>
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

export default EmployeeDashboard;
