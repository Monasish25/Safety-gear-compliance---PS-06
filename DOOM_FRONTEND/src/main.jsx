import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

import { getApiBase } from './config/api.js'

const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  const API_BASE = getApiBase();
  
  if (typeof url === 'string' && (url.startsWith(API_BASE) || url.startsWith('http') || url.startsWith('/api'))) {
    options = options || {};
    options.headers = {
      ...options.headers,
      'ngrok-skip-browser-warning': 'true'
    };
    
    if (url.startsWith(API_BASE) && !url.includes('/auth/token') && !url.includes('/auth/register')) {
      const token = localStorage.getItem('token');
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
