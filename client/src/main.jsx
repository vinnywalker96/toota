import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { TripProvider } from './contexts/TripContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <TripProvider>
          <App />
        </TripProvider>
      </WebSocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
