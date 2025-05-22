import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import webSocketService from '../services/WebSocketService';

// Create the context
const WebSocketContext = createContext(null);

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { user, getAccessToken, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    const connectToWebSocket = async () => {
      if (isAuthenticated() && !connected && !connecting) {
        try {
          setConnecting(true);
          setError(null);
          
          const token = getAccessToken();
          await webSocketService.connect(token);
          
          setConnected(true);
          console.log('WebSocket connected successfully');
        } catch (err) {
          console.error('WebSocket connection error:', err);
          setError('Failed to connect to real-time services');
        } finally {
          setConnecting(false);
        }
      }
    };

    connectToWebSocket();

    // Cleanup on unmount
    return () => {
      if (connected) {
        webSocketService.disconnect();
        setConnected(false);
      }
    };
  }, [isAuthenticated, connected, connecting, getAccessToken]);

  // Subscribe to WebSocket events
  const subscribe = useCallback((eventType, callback) => {
    webSocketService.on(eventType, callback);
    
    // Return unsubscribe function
    return () => {
      webSocketService.off(eventType, callback);
    };
  }, []);

  // Send WebSocket message
  const send = useCallback((type, data) => {
    if (!connected) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
    
    return webSocketService.send(type, data);
  }, [connected]);

  // Create trip via WebSocket
  const createTrip = useCallback((tripData) => {
    return webSocketService.createTrip(tripData);
  }, []);

  // Update trip via WebSocket
  const updateTrip = useCallback((tripData) => {
    return webSocketService.updateTrip(tripData);
  }, []);

  // Create bid via WebSocket
  const createBid = useCallback((tripId, amount, driverId) => {
    return webSocketService.createBid(tripId, amount, driverId);
  }, []);

  // Accept bid via WebSocket
  const acceptBid = useCallback((bidId) => {
    return webSocketService.acceptBid(bidId);
  }, []);

  // Send chat message via WebSocket
  const sendMessage = useCallback((tripId, senderId, content) => {
    return webSocketService.sendMessage(tripId, senderId, content);
  }, []);

  // Reconnect to WebSocket
  const reconnect = useCallback(async () => {
    if (connecting) return;
    
    try {
      setConnecting(true);
      setError(null);
      
      if (connected) {
        webSocketService.disconnect();
        setConnected(false);
      }
      
      const token = getAccessToken();
      await webSocketService.connect(token);
      
      setConnected(true);
      console.log('WebSocket reconnected successfully');
    } catch (err) {
      console.error('WebSocket reconnection error:', err);
      setError('Failed to reconnect to real-time services');
    } finally {
      setConnecting(false);
    }
  }, [connected, connecting, getAccessToken]);

  // Value to be provided by the context
  const value = {
    connected,
    connecting,
    error,
    subscribe,
    send,
    createTrip,
    updateTrip,
    createBid,
    acceptBid,
    sendMessage,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;

