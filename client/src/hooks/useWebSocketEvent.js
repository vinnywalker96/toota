import { useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

/**
 * Custom hook for subscribing to WebSocket events
 * @param {string} eventType - Type of event to subscribe to
 * @param {Function} callback - Callback function to execute when event is received
 * @param {Array} deps - Dependencies for the callback function
 */
const useWebSocketEvent = (eventType, callback, deps = []) => {
  const { subscribe, connected } = useWebSocket();

  // Memoize the callback to prevent unnecessary re-subscriptions
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    if (!connected || !eventType) return;

    // Subscribe to the event
    const unsubscribe = subscribe(eventType, memoizedCallback);

    // Cleanup subscription on unmount or when dependencies change
    return () => {
      unsubscribe();
    };
  }, [eventType, memoizedCallback, subscribe, connected]);
};

export default useWebSocketEvent;

