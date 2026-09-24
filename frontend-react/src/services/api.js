// frontend-react/src/services/api.js - Unified React API Service
const API_BASE = '';

export const api = {
  getToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
      sessionStorage.removeItem('jwt_token');
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}: Request failed`);
    }
    return data;
  },

  async login(username, password, role) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getDbState() {
    return this.request('/api/db-state?v=' + Date.now());
  },

  async mutateGranular(type, key, payload, query = null, updates = null) {
    return this.request('/api/mutate-granular', {
      method: 'POST',
      body: JSON.stringify({ type, key, payload, query, updates })
    });
  },

  async uploadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.onload = async () => {
        try {
          const res = await this.request('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              filename: file.name,
              fileData: reader.result
            })
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  }
};
