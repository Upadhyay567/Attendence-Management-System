import React from 'react';

function Sidebar({ activeTab, onSelectTab, userRole }) {
  const isAdminOrManager = ['hr', 'admin', 'manager'].includes(userRole?.toLowerCase());

  const navItems = isAdminOrManager
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'attendance', label: 'Live Attendance', icon: '⏱️' },
        { id: 'schedules', label: 'Shift Schedules', icon: '📅' },
        { id: 'leaves', label: 'Leave Approvals', icon: '📝' },
        { id: 'staff', label: 'Staff Directory', icon: '👥' },
      ]
    : [
        { id: 'dashboard', label: 'My Dashboard', icon: '⏰' },
        { id: 'attendance', label: 'My Attendance', icon: '📋' },
        { id: 'leaves', label: 'My Leaves', icon: '🌴' },
      ];

  return (
    <aside className="sidebar">
      <div className="sidebar-section-title">NAVIGATION</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="portal-version-tag">
          <span>Surya HRMS v2.4 (React)</span>
          <span className="system-status-indicator" title="Connected to Backend">● Live</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
