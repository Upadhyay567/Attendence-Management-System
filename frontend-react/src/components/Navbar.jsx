import React from 'react';

function Navbar({ user, onLogout, onRefresh, isRefreshing }) {
  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'hr':
      case 'admin':
        return 'badge-role-admin';
      case 'manager':
        return 'badge-role-manager';
      default:
        return 'badge-role-employee';
    }
  };

  const getRoleLabel = (role) => {
    switch (role?.toLowerCase()) {
      case 'hr':
      case 'admin':
        return 'HR Admin';
      case 'manager':
        return 'Manager';
      default:
        return 'Employee';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo-icon">👑</div>
        <div className="brand-text">
          <div className="brand-title">HOUSE OF SURYA</div>
          <div className="brand-subtitle">HRMS & Attendance Portal</div>
        </div>
      </div>

      <div className="navbar-actions">
        {onRefresh && (
          <button 
            type="button" 
            className="btn-refresh" 
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh database records"
          >
            <span className={`refresh-icon ${isRefreshing ? 'spin' : ''}`}>🔄</span>
            <span className="btn-text">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        )}

        <div className="user-profile-badge">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name || 'User'}</span>
            <div className="user-subtext">
              <span className="emp-id">{user?.employeeId || user?.username || ''}</span>
              <span className={`role-badge ${getRoleBadgeClass(user?.role)}`}>
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-logout" 
          onClick={onLogout}
          title="Sign out of portal"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
