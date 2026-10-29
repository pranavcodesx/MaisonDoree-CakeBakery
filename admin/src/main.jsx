import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/legacy.css';
import './styles/index.css';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AlertsProvider } from './context/AlertsContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}><ToastProvider><AuthProvider><AlertsProvider><App /></AlertsProvider></AuthProvider></ToastProvider></BrowserRouter>
  </React.StrictMode>,
);
