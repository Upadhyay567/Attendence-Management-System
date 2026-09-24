import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import EmployeeDashboard from './components/EmployeeDashboard.jsx';
import SchedulesView from './components/SchedulesView.jsx';
import AttendanceView from './components/AttendanceView.jsx';
import LeavesView from './components/LeavesView.jsx';
import StaffDirectoryView from './components/StaffDirectoryView.jsx';
import { api } from './services/api';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('jwt_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [dbState, setDbState] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalError, setGlobalError] = useState(null);

  // Sync token in api service and localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt_token', token);
      api.setToken(token);
    } else {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_session');
      api.setToken('');
    }
  }, [token]);

  // Load database state from server
  const loadDbState = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoadingDb(true);
    }
    setGlobalError(null);

    try {
      const data = await api.getDbState();
      setDbState(data);
    } catch (err) {
      console.error('Failed to fetch DB state:', err);
      setGlobalError(err.message || 'Unable to connect to server data.');
    } finally {
      setIsLoadingDb(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch data on login/mount
  useEffect(() => {
    if (token) {
      loadDbState(false);
    }
  }, [token, loadDbState]);

  const handleLoginSuccess = (userPayload, authToken) => {
    setToken(authToken);
    setUser(userPayload);
    try {
      localStorage.setItem('user_session', JSON.stringify(userPayload));
    } catch {
      // ignore storage failure
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setDbState(null);
    setActiveTab('dashboard');
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const userRole = (user?.role || 'employee').toLowerCase();
  const isAdminOrManager = ['hr', 'admin', 'manager'].includes(userRole);

  return (
    <div className="app-shell">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        onRefresh={() => loadDbState(true)}
        isRefreshing={isRefreshing}
      />

      <div className="app-body">
        <Sidebar 
          activeTab={activeTab} 
          onSelectTab={setActiveTab} 
          userRole={userRole} 
        />

        <main className="main-content">
          {globalError && (
            <div className="alert alert-danger mb-4">
              <span>⚠️ {globalError}</span>
              <button 
                type="button" 
                onClick={() => loadDbState(false)}
                className="btn btn-sm btn-outline ml-3"
              >
                Retry
              </button>
            </div>
          )}

          {isLoadingDb && !dbState ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading House of Surya Records...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                isAdminOrManager ? (
                  <AdminDashboard dbState={dbState} onNavigate={setActiveTab} />
                ) : (
                  <EmployeeDashboard 
                    user={user} 
                    dbState={dbState} 
                    onDataUpdated={() => loadDbState(true)} 
                  />
                )
              )}

              {activeTab === 'attendance' && (
                <AttendanceView 
                  dbState={dbState} 
                  currentUser={user} 
                />
              )}

              {activeTab === 'schedules' && (
                <SchedulesView 
                  dbState={dbState} 
                  onDataUpdated={() => loadDbState(true)} 
                />
              )}

              {activeTab === 'leaves' && (
                <LeavesView 
                  dbState={dbState} 
                  currentUser={user} 
                  onDataUpdated={() => loadDbState(true)} 
                />
              )}

              {activeTab === 'staff' && (
                <StaffDirectoryView dbState={dbState} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
