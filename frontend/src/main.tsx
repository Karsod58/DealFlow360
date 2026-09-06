import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);
