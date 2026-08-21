// js/views/leavesView.js - Leave Applications & Balances
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils, html } from '../utils/helpers.js';
import { closeModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderEmployeeLeaves() {
  const user = Auth.getCurrentUser();
  const main = document.getElementById('main-view');

  // Calculate today's date in YYYY-MM-DD local format
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Automatically determine the Approval Head based on department
  const getApprovalHeadForDepartment = (dept) => {
    const department = (dept || '').toLowerCase();
    if (department.includes('engineering') || department.includes('quality assurance') || department.includes('qa')) {
      return 'Operations Manager';
    } else if (department.includes('finance')) {
      return 'Finance Manager';
    } else if (department.includes('operations')) {
      return 'HR Admin Manager';
    } else if (department.includes('resources') || department.includes('hr')) {
      return 'HR Admin Manager';
    } else {
      return 'HR Admin Manager';
    }
  };

  const approverName = getApprovalHeadForDepartment(user.department);

  main.innerHTML = html`
    <div class="content-header">
      <div>
        <h1 class="content-title">Leave Request Desk</h1>
        <div class="content-subtitle">Request leaves and check status approvals.</div>
      </div>
    </div>
    <div class="content-body">
      <div class="dashboard-split reverse">
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Apply for New Leave</h3></div>
          <form id="leave-request-form">
            <div class="form-group">
              <label class="form-label" for="leave-type">Leave Type</label>
              <select class="form-input" id="leave-type" required>
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Annual">Annual Leave</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="leave-approver">Approval Head</label>
              <select class="form-input" id="leave-approver" required>
                <option value="HR Admin Manager" ${approverName === 'HR Admin Manager' ? 'selected' : ''}>HR Admin Manager</option>
                <option value="Operations Manager" ${approverName === 'Operations Manager' ? 'selected' : ''}>Operations Manager</option>
                <option value="Finance Manager" ${approverName === 'Finance Manager' ? 'selected' : ''}>Finance Manager</option>
                <option value="Department Head" ${approverName === 'Department Head' ? 'selected' : ''}>Department Head</option>
              </select>
            </div>

            <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div>
                <label class="form-label" for="leave-start">Start Date</label>
                <input class="form-input" type="date" id="leave-start" min="${localTodayStr}" required>
              </div>
              <div>
                <label class="form-label" for="leave-end">End Date</label>
                <input class="form-input" type="date" id="leave-end" min="${localTodayStr}" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="leave-reason">Reason for Leave</label>
              <textarea class="form-input" id="leave-reason" placeholder="Describe the reason..." rows="3" required style="resize:vertical"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="leave-proof">Supporting Document <span style="color:var(--text-muted);font-weight:normal;font-size:12px;">(Optional, e.g. medical certificate)</span></label>
              <input class="form-input" type="file" id="leave-proof" accept="image/*,.pdf,.doc,.docx" style="padding:8px">
            </div>
            <button class="btn" type="submit" style="background: var(--primary); color: #ffffff; border-radius: 8px; font-weight: 700; height: 42px; width: 100%; border: none; cursor: pointer; transition: all 0.2s ease;">Submit Request</button>
          </form>
          <div id="leave-alert" style="display:none"></div>
        </div>
        <div class="card-panel">
          <div class="card-panel-header"><h3 class="card-panel-title">Leave Request History</h3></div>
          <div class="table-container">
            <table class="custom-table">
              <thead><tr><th>Dates</th><th>Type</th><th>Approver</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody id="leave-history-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  renderPersonalLeaves(user.id);

  document.getElementById('leave-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('leave-type').value;
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value.trim();
    const chosenApprover = document.getElementById('leave-approver').value;

    if (start < localTodayStr) {
      showLeaveAlert('Leave start date cannot be in the past.', 'error');
      return;
    }
    if (end < start) {
      showLeaveAlert('Start date cannot be after end date.', 'error');
      return;
    }

    const proofFile = document.getElementById('leave-proof').files[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const uploadAndSubmit = async () => {
      let fileUrl = null;
      if (proofFile) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Uploading file...';
        }

        // Restrict upload sizes to a maximum of 5MB.
        if (proofFile.size > 5 * 1024 * 1024) {
          showLeaveAlert('File size exceeds the 5MB limit.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
          }
          return;
        }

        // Validate mime-types (PDF, JPEG, PNG)
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(proofFile.type)) {
          showLeaveAlert('Invalid file type. Only PDF, JPEG, and PNG are allowed.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
          }
          return;
        }

        try {
          const formData = new FormData();
          formData.append('file', proofFile);

          await DB.resolveApiBase();
          const session = JSON.parse(sessionStorage.getItem('attendance_current_session') || localStorage.getItem('attendance_current_session') || '{}');
          
          const uploadRes = await fetch((window.apiBaseUrl || '') + '/api/upload-leave-doc', {
            method: 'POST',
            headers: {
              'Authorization': session.token ? `Bearer ${session.token}` : ''
            },
            body: formData
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.error || 'Failed to upload document.');
          }

          const uploadData = await uploadRes.json();
          fileUrl = uploadData.url;
        } catch (err) {
          showLeaveAlert('Upload error: ' + err.message, 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
          }
          return;
        }
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request';
      }

      DB.applyLeave(user.id, type, start, end, reason, chosenApprover, fileUrl);
      showLeaveAlert('Leave request submitted successfully!', 'success');
      document.getElementById('leave-request-form').reset();
      renderPersonalLeaves(user.id);
    };

    uploadAndSubmit();
  });
}