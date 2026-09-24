import React, { useState, useMemo } from 'react';
import { api } from '../services/api';

function LeavesView({ dbState, currentUser, onDataUpdated }) {
  const users = dbState?.users || [];
  const leaveRequests = dbState?.leaveRequests || [];

  const isEmployeeOnly = currentUser?.role?.toLowerCase() === 'employee';

  const [activeTab, setActiveTab] = useState(isEmployeeOnly ? 'my-leaves' : 'pending');
  const [actionFeedback, setActionFeedback] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  // Apply form state for employee
  const [leaveType, setLeaveType] = useState('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const getUser = (userId) => {
    return users.find(u => u.id === userId || u.employeeId === userId) || {};
  };

  const handleDecision = async (leaveId, decision) => {
    setProcessingId(leaveId);
    setActionFeedback(null);
    try {
      await api.mutateGranular(
        'update',
        'leaveRequests',
        null,
        { id: leaveId },
        { 
          status: decision,
          managerComment: `Reviewed and ${decision} by ${currentUser?.name || 'Manager'}`
        }
      );
      setActionFeedback({ type: 'success', text: `Leave request successfully marked as ${decision}.` });
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || `Failed to ${decision} leave.` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setActionFeedback({ type: 'error', text: 'Please select valid start and end dates.' });
      return;
    }

    setIsApplying(true);
    setActionFeedback(null);

    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const newLeave = {
        id: `lv_${Math.random().toString(36).substr(2, 7)}`,
        userId: currentUser.id,
        type: leaveType,
        startDate,
        endDate,
        reason,
        status: 'Pending',
        requestDate: todayStr,
        managerComment: '',
        supportingDoc: null
      };

      await api.mutateGranular('create', 'leaveRequests', newLeave);
      setActionFeedback({ type: 'success', text: 'Leave application submitted successfully!' });
      setStartDate('');
      setEndDate('');
      setReason('');
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to submit leave.' });
    } finally {
      setIsApplying(false);
    }
  };

  // Leaves filtered for view
  const displayedLeaves = useMemo(() => {
    if (isEmployeeOnly) {
      return leaveRequests.filter(l => l.userId === currentUser.id || l.userId === currentUser.employeeId);
    }

    if (activeTab === 'pending') {
      return leaveRequests.filter(l => (l.status || '').toLowerCase() === 'pending');
    }
    if (activeTab === 'approved') {
      return leaveRequests.filter(l => (l.status || '').toLowerCase() === 'approved');
    }
    if (activeTab === 'rejected') {
      return leaveRequests.filter(l => (l.status || '').toLowerCase() === 'rejected');
    }
    return leaveRequests;
  }, [leaveRequests, isEmployeeOnly, activeTab, currentUser]);

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2 className="view-title">
            {isEmployeeOnly ? 'Leave Applications & Balance' : 'Leave Management & Approvals'}
          </h2>
          <p className="view-subtitle">Review team leave requests, track absence balances, and take approvals</p>
        </div>
      </div>

      {actionFeedback && (
        <div className={`alert ${actionFeedback.type === 'error' ? 'alert-danger' : 'alert-success'} mb-4`}>
          {actionFeedback.text}
        </div>
      )}

      {/* If Employee: Show Application Form */}
      {isEmployeeOnly && (
        <div className="card mb-4">
          <div className="card-header bg-maroon text-white">
            <h3 className="card-title text-white">Submit New Leave Application</h3>
          </div>
          <form onSubmit={handleApplyLeave} className="p-4">
            <div className="form-row">
              <div className="form-group flex-1">
                <label>Leave Category</label>
                <select 
                  value={leaveType} 
                  onChange={(e) => setLeaveType(e.target.value)} 
                  className="form-control"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Paid">Annual / Paid Leave</option>
                  <option value="Maternity/Paternity">Maternity/Paternity Leave</option>
                  <option value="Bereavement">Bereavement Leave</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control" 
                  required 
                />
              </div>

              <div className="form-group flex-1">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control" 
                  required 
                />
              </div>
            </div>

            <div className="form-group mt-3">
              <label>Reason / Handover Notes</label>
              <textarea 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                rows="2" 
                className="form-control"
                placeholder="Describe reason for leave..."
                required 
              />
            </div>

            <div className="form-actions mt-3">
              <button type="submit" disabled={isApplying} className="btn btn-primary">
                {isApplying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs for Manager / Admin */}
      {!isEmployeeOnly && (
        <div className="tab-bar mb-4">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Requests ({leaveRequests.filter(l => (l.status || '').toLowerCase() === 'pending').length})
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            Rejected
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All History
          </button>
        </div>
      )}

      {/* Requests Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applied On</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                {!isEmployeeOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={isEmployeeOnly ? 6 : 7} className="text-center py-4 text-muted">
                    No leave requests found in this view.
                  </td>
                </tr>
              ) : (
                displayedLeaves.map((req) => {
                  const emp = getUser(req.userId);
                  const isPending = (req.status || '').toLowerCase() === 'pending';
                  const isApproved = (req.status || '').toLowerCase() === 'approved';
                  let statusBadge = isPending ? 'badge-purple' : (isApproved ? 'badge-success' : 'badge-danger');

                  return (
                    <tr key={req.id}>
                      <td>{req.requestDate || '—'}</td>
                      <td>
                        <div className="emp-cell">
                          <span className="emp-name font-semibold">{emp.name || req.userId}</span>
                          <span className="emp-sub">{emp.employeeId || ''} {emp.department ? `• ${emp.department}` : ''}</span>
                        </div>
                      </td>
                      <td><span className="leave-type-pill">{req.type || 'Leave'}</span></td>
                      <td className="font-mono">{req.startDate} → {req.endDate}</td>
                      <td>{req.reason || '—'}</td>
                      <td><span className={`status-badge ${statusBadge}`}>{req.status || 'Pending'}</span></td>
                      {!isEmployeeOnly && (
                        <td>
                          {isPending ? (
                            <div className="d-flex gap-2">
                              <button 
                                type="button" 
                                className="btn btn-sm btn-success"
                                disabled={processingId === req.id}
                                onClick={() => handleDecision(req.id, 'Approved')}
                              >
                                Approve
                              </button>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-danger"
                                disabled={processingId === req.id}
                                onClick={() => handleDecision(req.id, 'Rejected')}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted">Completed</span>
                          )}
                        </td>
                      )}
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

export default LeavesView;
