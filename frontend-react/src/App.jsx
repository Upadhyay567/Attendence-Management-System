import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  }, [token]);

  const handleLoginSuccess = (userPayload, authToken) => {
    setToken(authToken);
    setUser(userPayload);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <div className="app-container">
      {!token ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '50px auto', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <h2 style={{ color: '#ef4444' }}>Welcome to HS Group Delhi</h2>
          <p>Logged in user: <strong>{user?.name || 'Administrator'}</strong></p>
          <p>Role: <code>{user?.role}</code></p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>This React frontend template sets up the directory structure and authentication logic for migrating views from the vanilla single-page application.</p>
          <button 
            onClick={handleLogout}
            style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
