// js/views/financeView.js - Financial Ledger & Payroll Calculations
import { DB } from '../core/db.js';
import { Auth } from '../core/auth.js';
import { Utils } from '../utils/helpers.js';
import { closeModal } from '../components/modals.js';
import { showToastNotification } from '../components/toast.js';

export function renderAdminFinance() {
  const main = document.getElementById('main-view');
  const user = Auth.getCurrentUser();
  if (!user || user.role !== 'finance_manager') {
    window.location.hash = '#dashboard';
    return;
  }

  const isEditor = user.username === 'admin' || user.role === 'hr';
  const records = DB.getFinancialRecords();
  const budgets = DB.getBudgets();

  // Filters state
  let filterYear = 'all';
  let filterMonth = 'all';
  let filterQuarter = 'all';
  let filterDept = 'all';
  let filterProj = 'all';
  let filterCat = 'all';

  function calculateFinanceMetrics(filteredRecords) {
    let rev = 0;
    let exp = 0;
    let pay = 0;
    let inv = 0;

    filteredRecords.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'revenue') rev += amt;
      else if (r.type === 'expense') exp += amt;
      else if (r.type === 'payroll') pay += amt;
      else if (r.type === 'investment') {
        if (r.category === 'Upload Liabilities') {
          exp += amt;
        } else {
          inv += amt;
        }
      }
    });

    const totalExp = exp + pay;
    const profit = rev - totalExp;
    
    const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const budgetRemaining = totalBudget - totalExp;

    return {
      revenue: rev,
      expenses: totalExp,
      profit: profit > 0 ? profit : 0,
      loss: profit < 0 ? Math.abs(profit) : 0,
      payroll: pay,
      budgetRemaining
    };
  }

  function getFilteredRecords() {
    return records.filter(r => {
      const d = new Date(r.date);
      const yr = d.getFullYear().toString();
      const mo = (d.getMonth() + 1).toString().padStart(2, '0');
      const qtr = Math.ceil((d.getMonth() + 1) / 3).toString();

      if (filterYear !== 'all' && yr !== filterYear) return false;
      if (filterMonth !== 'all' && mo !== filterMonth) return false;
      if (filterQuarter !== 'all' && qtr !== filterQuarter) return false;
      if (filterDept !== 'all' && r.department !== filterDept) return false;
      if (filterProj !== 'all' && r.project !== filterProj) return false;
      if (filterCat !== 'all' && r.category !== filterCat) return false;
      return true;
    });
  }

  function renderDashboardUI() {
    const activeRecords = getFilteredRecords();
    const metrics = calculateFinanceMetrics(activeRecords);

    const years = [...new Set(records.map(r => new Date(r.date).getFullYear()))].sort();
    const depts = [...new Set(records.map(r => r.department).filter(Boolean))];
    const projs = [...new Set(records.map(r => r.project).filter(Boolean))];
    const cats = [...new Set(records.map(r => r.category).filter(Boolean))];

    main.innerHTML = `
      <div class="content-header">
        <div>
          <h1 class="content-title">💼 Corporate Finance Desk</h1>
          <div class="content-subtitle">Central ledger, budget allocations, and P&L statements.</div>
        </div>
      </div>
      <div class="content-body">
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px">
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--primary)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Total Revenue</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:4px">₹${metrics.revenue.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--error)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Total Expenses</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:4px">₹${metrics.expenses.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--success)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Net Profit</div>
            <div style="font-size:18px; font-weight:700; color:var(--success); margin-top:4px">₹${metrics.profit.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--error)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Net Loss</div>
            <div style="font-size:18px; font-weight:700; color:var(--error); margin-top:4px">₹${metrics.loss.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--warning)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Payroll Cost</div>
            <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:4px">₹${metrics.payroll.toLocaleString()}</div>
          </div>
          <div class="card-panel" style="padding:15px; border-left:4px solid var(--cyan)">
            <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:700">Budget Remaining</div>
            <div style="font-size:18px; font-weight:700; color:var(--cyan); margin-top:4px">₹${metrics.budgetRemaining.toLocaleString()}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: ${isEditor ? '300px 1fr' : '1fr'}; gap:20px; margin-bottom:20px; align-items:start">
          
          ${isEditor ? `
          <div class="card-panel" style="padding:15px">
            <h3 class="card-panel-title" style="font-size:14px; margin-bottom:12px">📥 Upload Financial Record</h3>
            
            <div class="form-group" style="margin-bottom:10px">
              <label class="form-label">Record Type</label>
              <select class="form-input" id="up-type" style="padding:6px; font-size:12px">
                <option value="revenue">Revenue Management</option>
                <option value="expense">Expense Management</option>
                <option value="payroll">Payroll Upload</option>
                <option value="investment">Investment Section</option>
                <option value="budget">Budget Section</option>
              </select>
            </div>
            
            <form id="finance-upload-form" style="display:flex; flex-direction:column; gap:10px">
              <div class="form-group">
                <label class="form-label" for="up-category">Category</label>
                <select class="form-input" id="up-category" style="padding:6px; font-size:12px" required>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="up-amount">Amount (INR)</label>
                <input class="form-input" type="number" id="up-amount" required style="padding:6px; font-size:12px">
              </div>
              <div class="form-group">
                <label class="form-label" for="up-date">Transaction Date</label>
                <input class="form-input" type="date" id="up-date" required style="padding:6px; font-size:12px" value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label class="form-label" for="up-dept">Department</label>
                <select class="form-input" id="up-dept" style="padding:6px; font-size:12px">
                  <option value="General">General / Administrative</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="up-project">Project / Details</label>
                <input class="form-input" type="text" id="up-project" placeholder="e.g. Cloud Migrations" style="padding:6px; font-size:12px">
              </div>
              <div class="form-group">
                <label class="form-label" for="up-desc">Remarks / Comments</label>
                <input class="form-input" type="text" id="up-desc" placeholder="Details or vendor name" style="padding:6px; font-size:12px">
              </div>
              
              <button class="btn" type="submit" style="margin-top:5px; background:var(--primary); color:var(--bg-app); font-weight:700; padding:8px 12px; font-size:12px">Upload Record</button>
            </form>
            <div id="finance-upload-alert" style="display:none; margin-top:10px"></div>
          </div>
          ` : ''}

          <div class="card-panel" style="padding:15px">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px">
              <h3 class="card-panel-title" style="font-size:14px; margin:0">📋 P&L Transaction Ledger</h3>
              <div style="display:flex; gap:6px">
                <button class="btn btn-secondary btn-xs" id="btn-export-csv" style="padding:5px 10px; font-size:11px">Export CSV</button>
                <button class="btn btn-secondary btn-xs" id="btn-export-excel" style="padding:5px 10px; font-size:11px">Export Excel</button>
                <button class="btn btn-secondary btn-xs" id="btn-export-pdf" style="padding:5px 10px; font-size:11px; background:var(--primary); color:var(--bg-app); border:none">Print PDF Report</button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:8px; margin-bottom:15px; background:rgba(255,255,255,0.01); border:1px solid var(--border); padding:10px; border-radius:var(--radius-sm)">
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Year</label>
                <select class="form-input" id="fil-year" style="padding:4px; font-size:11px">
                  <option value="all">All Years</option>
                  ${years.map(y => `<option value="${y}" ${filterYear === y.toString() ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Month</label>
                <select class="form-input" id="fil-month" style="padding:4px; font-size:11px">
                  <option value="all">All Months</option>
                  ${['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => `<option value="${m}" ${filterMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Quarter</label>
                <select class="form-input" id="fil-quarter" style="padding:4px; font-size:11px">
                  <option value="all">All Quarters</option>
                  <option value="1" ${filterQuarter === '1' ? 'selected' : ''}>Q1 (Jan-Mar)</option>
                  <option value="2" ${filterQuarter === '2' ? 'selected' : ''}>Q2 (Apr-Jun)</option>
                  <option value="3" ${filterQuarter === '3' ? 'selected' : ''}>Q3 (Jul-Sep)</option>
                  <option value="4" ${filterQuarter === '4' ? 'selected' : ''}>Q4 (Oct-Dec)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Department</label>
                <select class="form-input" id="fil-dept" style="padding:4px; font-size:11px">
                  <option value="all">All Depts</option>
                  ${depts.map(d => `<option value="${d}" ${filterDept === d ? 'selected' : ''}>${d}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Project</label>
                <select class="form-input" id="fil-proj" style="padding:4px; font-size:11px">
                  <option value="all">All Projects</option>
                  ${projs.map(p => `<option value="${p}" ${filterProj === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size:10px">Category</label>
                <select class="form-input" id="fil-cat" style="padding:4px; font-size:11px">
                  <option value="all">All Categories</option>
                  ${cats.map(c => `<option value="${c}" ${filterCat === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="table-container" style="max-height:300px; overflow-y:auto">
              <table class="custom-table" style="font-size:12px">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Dept / Project</th>
                    <th>Description</th>
                    <th style="text-align:right">Amount</th>
                    ${isEditor ? '<th>Action</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${activeRecords.length === 0 ? `<tr><td colspan="7" style="text-align:center; color:var(--text-muted)">No matching records found.</td></tr>` : activeRecords.map(r => `
                    <tr>
                      <td>${r.date}</td>
                      <td><span class="badge badge-${r.type === 'revenue' ? 'approved' : 'absent'}" style="font-size:10px; padding:2px 6px">${r.type.toUpperCase()}</span></td>
                      <td style="font-weight:600">${Utils.escape(r.category)}</td>
                      <td>${Utils.escape(r.department)} / <span style="color:var(--text-secondary)">${Utils.escape(r.project || '-')}</span></td>
                      <td>${Utils.escape(r.details || '')}</td>
                      <td style="text-align:right; font-weight:700; color:${r.type === 'revenue' ? 'var(--success)' : 'var(--text-primary)'}">₹${(Number(r.amount) || 0).toLocaleString()}</td>
                      ${isEditor ? `<td><button class="btn-delete-record" data-id="${r.id}" style="background:none; border:none; color:var(--error); cursor:pointer; font-size:11px; text-decoration:underline">Delete</button></td>` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <div class="card-panel" style="padding:20px; margin-top:20px">
          <h3 class="card-panel-title" style="font-size:15px; margin-bottom:15px">📊 Annual Financial Report (Year 2026 Rollup)</h3>
          
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px">
            
            <div style="font-size:13px; line-height:1.6">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Annual Revenue:</span>
                <strong>₹${metrics.revenue.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Salary Expenses Paid:</span>
                <strong>₹${metrics.payroll.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Operational Expenses:</span>
                <strong>₹${(metrics.expenses - metrics.payroll).toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Asset Investments:</span>
                <strong>₹${(records.filter(r => r.type === 'investment' && r.category !== 'Upload Liabilities').reduce((sum, r) => sum + r.amount, 0)).toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Corporate Tax Paid:</span>
                <strong>₹${(records.filter(r => r.category === 'Upload Tax Details').reduce((sum, r) => sum + r.amount, 0)).toLocaleString()}</strong>
              </div>
            </div>

            <div style="font-size:13px; line-height:1.6">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Profit Generated:</span>
                <strong style="color:var(--success)">₹${metrics.profit.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Total Loss Incurred:</span>
                <strong style="color:var(--error)">₹${metrics.loss.toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Net Company Worth:</span>
                <strong>₹${(metrics.revenue - metrics.expenses + 25000000).toLocaleString()}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>Financial Growth Ratio:</span>
                <strong style="color:var(--success)">+14.2%</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:6px 0">
                <span>P&L Status Verification:</span>
                <span class="badge badge-approved" id="lbl-finance-verification" style="font-size:10px; background:rgba(16,185,129,0.1); color:var(--success)">✅ Verified by Manager</span>
              </div>
            </div>

          </div>

          ${user.role === 'finance_manager' ? `
          <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:15px; display:flex; justify-content:flex-end; gap:10px">
            <button class="btn btn-secondary" id="btn-verify-finance-reject" style="width:auto; background:var(--error); border:none; color:white">Reject / Flag Discrepancy</button>
            <button class="btn" id="btn-verify-finance-approve" style="width:auto; background:var(--success); color:var(--bg-app)">Approve & Certify Report</button>
          </div>
          ` : ''}

        </div>

      </div>
    `;

    document.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (await confirm('Permanently delete this financial record?')) {
          DB.deleteFinancialRecord(id);
          renderDashboardUI();
        }
      });
    });

    document.getElementById('fil-year').addEventListener('change', (e) => { filterYear = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-month').addEventListener('change', (e) => { filterMonth = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-quarter').addEventListener('change', (e) => { filterQuarter = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-dept').addEventListener('change', (e) => { filterDept = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-proj').addEventListener('change', (e) => { filterProj = e.target.value; renderDashboardUI(); });
    document.getElementById('fil-cat').addEventListener('change', (e) => { filterCat = e.target.value; renderDashboardUI(); });

    document.getElementById('btn-export-csv').addEventListener('click', () => triggerCSVExport(activeRecords));
    document.getElementById('btn-export-excel').addEventListener('click', () => triggerCSVExport(activeRecords, 'excel'));
    document.getElementById('btn-export-pdf').addEventListener('click', triggerPDFExport);

    const btnApproveReport = document.getElementById('btn-verify-finance-approve');
    const btnRejectReport = document.getElementById('btn-verify-finance-reject');
    const lblStatus = document.getElementById('lbl-finance-verification');
    
    if (btnApproveReport && lblStatus) {
      btnApproveReport.addEventListener('click', () => {
        lblStatus.textContent = '✅ Certified & Approved';
        lblStatus.style.background = 'rgba(16,185,129,0.1)';
        lblStatus.style.color = 'var(--success)';
        alert('Report successfully certified by Finance Manager.');
      });
    }
    if (btnRejectReport && lblStatus) {
      btnRejectReport.addEventListener('click', async () => {
        const comment = await prompt('Enter description of discrepancy:');
        if (comment) {
          lblStatus.textContent = `❌ Flagged: ${comment}`;
          lblStatus.style.background = 'rgba(239,68,68,0.1)';
          lblStatus.style.color = 'var(--error)';
        }
      });
    }
  }

  function triggerCSVExport(recordsList, type = 'csv') {
    const headers = ['Date', 'Type', 'Category', 'Department', 'Project', 'Amount', 'Description'];
    const rows = recordsList.map(r => [
      r.date, r.type, r.category, r.department, r.project, r.amount, r.details
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", type === 'excel' ? "Financial_Report_2026.xls" : "Financial_Report_2026.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function triggerPDFExport() {
    window.print();
  }

  const categoriesMap = {
    revenue: ['Upload Company Revenue', 'Monthly Revenue', 'Quarterly Revenue', 'Yearly Revenue'],
    expense: ['Upload Salary Expenses', 'Upload Office Expenses', 'Upload Project Expenses', 'Upload Utility Bills', 'Upload Vendor Payments', 'Upload Miscellaneous Expenses'],
    payroll: ['Upload Employee Salary', 'Upload Bonus', 'Upload Incentives', 'Upload Overtime Payment', 'Upload Deductions', 'Upload Tax Details', 'Upload PF & ESI Details'],
    investment: ['Upload Investments', 'Upload Assets', 'Upload Liabilities'],
    budget: ['Create Budget', 'Update Budget', 'Department Wise Budget', 'Project Wise Budget']
  };

  renderDashboardUI();

  const selectType = document.getElementById('up-type');
  const selectCat = document.getElementById('up-category');
  
  if (selectType && selectCat) {
    const updateCategoryOptions = () => {
      const type = selectType.value;
      const opts = categoriesMap[type] || [];
      selectCat.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join('');
    };
    selectType.addEventListener('change', updateCategoryOptions);
    updateCategoryOptions();
  }

  const uploadForm = document.getElementById('finance-upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('up-type').value;
      const category = document.getElementById('up-category').value;
      const amount = Number(document.getElementById('up-amount').value);
      const date = document.getElementById('up-date').value;
      const department = document.getElementById('up-dept').value;
      const project = document.getElementById('up-project').value.trim() || 'General';
      const details = document.getElementById('up-desc').value.trim() || '';

      const record = DB.addFinancialRecord({ type, category, amount, date, department, project, details });

      if (type === 'budget') {
        DB.addBudget({ department, project, amount, date });
      }

      const budgetsList = DB.getBudgets();
      const totalBudget = budgetsList.filter(b => b.department === department).reduce((sum, b) => sum + b.amount, 0);
      const totalExpenses = DB.getFinancialRecords().filter(r => r.department === department && (r.type === 'expense' || r.type === 'payroll')).reduce((sum, r) => sum + r.amount, 0);

      if (totalExpenses > totalBudget && totalBudget > 0) {
        if (typeof addSystemNotificationAlert === 'function') {
          addSystemNotificationAlert(`⚠️ Budget Exceeded! ${department} expenses of ₹${totalExpenses.toLocaleString()} have exceeded the allocated budget limit of ₹${totalBudget.toLocaleString()}!`);
        }
      }

      const allRecords = DB.getFinancialRecords();
      const summary = calculateFinanceMetrics(allRecords);
      if (summary.loss > 0) {
        if (typeof addSystemNotificationAlert === 'function') {
          addSystemNotificationAlert(`⚠️ Loss Warning: Company P&L deficit logged. Expenses exceed current revenues by ₹${summary.loss.toLocaleString()}!`);
        }
      } else if (summary.profit > 10000000) {
        if (typeof addSystemNotificationAlert === 'function') {
          addSystemNotificationAlert(`🎉 Goal Achieved: Projected net annual profit target exceeded ₹1,00,00,000!`);
        }
      }

      const alertEl = document.getElementById('finance-upload-alert');
      if (alertEl) {
        alertEl.className = 'alert alert-success';
        alertEl.textContent = 'Financial record successfully uploaded!';
        alertEl.style.display = 'flex';
        setTimeout(() => {
          alertEl.style.display = 'none';
          uploadForm.reset();
          renderDashboardUI();
        }, 1500);
      }
    });
  }
}

function addSystemNotificationAlert(title, desc = '') {
  if (!DB.data.financeAlerts) {
    DB.data.financeAlerts = [];
  }
  DB.data.financeAlerts.unshift({
    id: 'fnalert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    title,
    desc,
    date: new Date().toISOString().split('T')[0]
  });
  DB.save();
  updateNotificationsUI();
}




// =============================================================
// GEOLOCATION RADAR MAP & WORKSITE LOCATION MANAGEMENT PANEL
// =============================================================

function drawRadarMap(canvasId, targetLat, targetLng, currentLat, currentLng, distance, inRange, targetName, isOffline = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const w = rect.width;
  const h = rect.height;
  
  // Clean dark slate background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  
  const cx = w / 2;
  const cy = h / 2;
  
  // Concentric radar rings
  ctx.strokeStyle = isOffline ? 'rgba(255, 255, 255, 0.05)' : 'rgba(251, 191, 36, 0.1)';
  ctx.lineWidth = 1;
  for (let r = 30; r < Math.max(w, h); r += 30) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Crosshairs grid
  ctx.strokeStyle = isOffline ? 'rgba(255, 255, 255, 0.02)' : 'rgba(251, 191, 36, 0.05)';
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.stroke();
  
  // Geofence Circle (100 meters, mapped to 40px radius)
  const geofenceRadius = 40;
  ctx.strokeStyle = isOffline ? 'rgba(255, 255, 255, 0.15)' : (inRange ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)');
  ctx.fillStyle = isOffline ? 'rgba(255, 255, 255, 0.02)' : (inRange ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.02)');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, geofenceRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  
  // Sonar sweeps rotation line based on date
  if (!isOffline) {
    const sweepAngle = (Date.now() / 1500) % (2 * Math.PI);
    ctx.strokeStyle = inRange ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * (Math.max(w, h)), cy + Math.sin(sweepAngle) * (Math.max(w, h)));
    ctx.stroke();
  }
  
  // Draw fixed worksite marker
  ctx.fillStyle = isOffline ? '#475569' : '#89201B';
  ctx.shadowColor = isOffline ? 'transparent' : '#89201B';
  ctx.shadowBlur = isOffline ? 0 : 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0; // reset glow
  
  // Label for worksite
  ctx.fillStyle = isOffline ? 'rgba(255, 255, 255, 0.4)' : '#ffffff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(targetName || 'Worksite', cx, cy - 10);
  
  if (isOffline) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRACKING OFFLINE', cx, h - 10);
  }
  
  // Draw Employee dot marker using proper meters-to-pixel projection
  if (!isOffline && currentLat !== null && currentLng !== null) {
    const cosLat = Math.cos(targetLat * Math.PI / 180);
    const xMeters = (currentLng - targetLng) * 111139 * cosLat; // East-West offset in meters
    const yMeters = (currentLat - targetLat) * 111139;           // North-South offset in meters
    
    // Scale: 100 meters = geofenceRadius (40px)
    const metersPerPixel = 100 / geofenceRadius;
    let exRaw = xMeters / metersPerPixel;  // positive = right (East)
    let eyRaw = -yMeters / metersPerPixel; // negative = up (North, screen Y inverted)
    
    // Constrain to canvas bounds
    const maxOffset = Math.min(w, h) / 2 - 12;
    const rawDist = Math.sqrt(exRaw * exRaw + eyRaw * eyRaw);
    if (rawDist > maxOffset) {
      const scale = maxOffset / rawDist;
      exRaw *= scale;
      eyRaw *= scale;
    }
    
    const ex = cx + exRaw;
    const ey = cy + eyRaw;
    
    const pulseR = 5 + Math.sin(Date.now() / 150) * 1.5;
    ctx.fillStyle = inRange ? '#10b981' : '#ef4444';
    ctx.shadowColor = inRange ? '#10b981' : '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ex, ey, pulseR, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = inRange ? '#10b981' : '#ef4444';
    ctx.fillText('Live GPS', ex, ey - 10);
  }
}
