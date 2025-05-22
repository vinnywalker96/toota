import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import TripService from '../services/TripService';

// Create the context
const TripContext = createContext(null);

// Custom hook to use the trip context
export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};

export const TripProvider = ({ children }) => {
  const { getAccessToken, user } = useAuth();
  const { subscribe, createTrip: wsCreateTrip, updateTrip: wsUpdateTrip } = useWebSocket();
  
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bids, setBids] = useState([]);
  const [messages, setMessages] = useState([]);

  // Fetch all trips for the current user
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.getAllTrips(token);
      
      setTrips(response.data);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError('Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Fetch a specific trip by ID
  const fetchTripById = useCallback(async (tripId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.getTripById(tripId, token);
      
      setActiveTrip(response.data);
      return response.data;
    } catch (err) {
      console.error(`Error fetching trip ${tripId}:`, err);
      setError('Failed to load trip details. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Create a new trip
  const createTrip = useCallback(async (tripData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      
      // Try to create trip via WebSocket first for real-time updates
      const wsSuccess = wsCreateTrip(tripData);
      
      if (!wsSuccess) {
        // Fallback to REST API if WebSocket fails
        const response = await TripService.createTrip(tripData, token);
        setTrips(prevTrips => [...prevTrips, response.data]);
        return response.data;
      }
      
      return true;
    } catch (err) {
      console.error('Error creating trip:', err);
      setError('Failed to create trip. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, wsCreateTrip]);

  // Update an existing trip
  const updateTrip = useCallback(async (tripId, tripData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      
      // Try to update trip via WebSocket first for real-time updates
      const wsSuccess = wsUpdateTrip({ id: tripId, ...tripData });
      
      if (!wsSuccess) {
        // Fallback to REST API if WebSocket fails
        const response = await TripService.updateTrip(tripId, tripData, token);
        
        // Update trips state
        setTrips(prevTrips => 
          prevTrips.map(trip => 
            trip.id === tripId ? response.data : trip
          )
        );
        
        // Update active trip if it's the one being updated
        if (activeTrip && activeTrip.id === tripId) {
          setActiveTrip(response.data);
        }
        
        return response.data;
      }
      
      return true;
    } catch (err) {
      console.error(`Error updating trip ${tripId}:`, err);
      setError('Failed to update trip. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, wsUpdateTrip, activeTrip]);

  // Fetch bids for a trip
  const fetchBids = useCallback(async (tripId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.getBidsForTrip(tripId, token);
      
      setBids(response.data);
      return response.data;
    } catch (err) {
      console.error(`Error fetching bids for trip ${tripId}:`, err);
      setError('Failed to load bids. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Create a bid for a trip
  const createBid = useCallback(async (tripId, bidData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.createBid(tripId, bidData, token);
      
      // Update bids state
      setBids(prevBids => [...prevBids, response.data]);
      
      return response.data;
    } catch (err) {
      console.error(`Error creating bid for trip ${tripId}:`, err);
      setError('Failed to place bid. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Accept a bid
  const acceptBid = useCallback(async (tripId, bidId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.acceptBid(tripId, bidId, token);
      
      // Update bids state
      setBids(prevBids => 
        prevBids.map(bid => 
          bid.id === bidId ? { ...bid, is_accepted: true } : bid
        )
      );
      
      // Fetch updated trip details
      await fetchTripById(tripId);
      
      return response.data;
    } catch (err) {
      console.error(`Error accepting bid ${bidId} for trip ${tripId}:`, err);
      setError('Failed to accept bid. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, fetchTripById]);

  // Fetch chat messages for a trip
  const fetchMessages = useCallback(async (tripId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.getChatMessages(tripId, token);
      
      setMessages(response.data);
      return response.data;
    } catch (err) {
      console.error(`Error fetching messages for trip ${tripId}:`, err);
      setError('Failed to load messages. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Send a chat message
  const sendMessage = useCallback(async (tripId, messageData) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAccessToken();
      const response = await TripService.sendChatMessage(tripId, messageData, token);
      
      // Update messages state
      setMessages(prevMessages => [...prevMessages, response.data]);
      
      return response.data;
    } catch (err) {
      console.error(`Error sending message for trip ${tripId}:`, err);
      setError('Failed to send message. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Mark a message as read
  const markMessageAsRead = useCallback(async (tripId, messageId) => {
    try {
      const token = getAccessToken();
      await TripService.markMessageAsRead(tripId, messageId, token);
      
      // Update messages state
      setMessages(prevMessages => 
        prevMessages.map(message => 
          message.id === messageId ? { ...message, is_read: true } : message
        )
      );
      
      return true;
    } catch (err) {
      console.error(`Error marking message ${messageId} as read:`, err);
      return false;
    }
  }, [getAccessToken]);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    // Handle new trip events
    const tripCreatedUnsubscribe = subscribe('trip.created', (data) => {
      setTrips(prevTrips => {
        // Check if trip already exists
        const exists = prevTrips.some(trip => trip.id === data.id);
        if (exists) return prevTrips;
        return [...prevTrips, data];
      });
    });
    
    // Handle trip update events
    const tripUpdatedUnsubscribe = subscribe('trip.updated', (data) => {
      setTrips(prevTrips => 
        prevTrips.map(trip => 
          trip.id === data.id ? data : trip
        )
      );
      
      // Update active trip if it's the one being updated
      if (activeTrip && activeTrip.id === data.id) {
        setActiveTrip(data);
      }
    });
    
    // Handle new bid events
    const bidCreatedUnsubscribe = subscribe('bid.created', (data) => {
      setBids(prevBids => {
        // Check if bid already exists
        const exists = prevBids.some(bid => bid.id === data.bid.id);
        if (exists) return prevBids;
        return [...prevBids, data.bid];
      });
    });
    
    // Handle bid accepted events
    const bidAcceptedUnsubscribe = subscribe('bid.accepted', (data) => {
      setBids(prevBids => 
        prevBids.map(bid => 
          bid.id === data.bid.id ? data.bid : bid
        )
      );
      
      // Update trip if it's the active trip
      if (activeTrip && activeTrip.id === data.trip.id) {
        setActiveTrip(data.trip);
      }
    });
    
    // Handle new message events
    const messageReceivedUnsubscribe = subscribe('message.sent', (data) => {
      setMessages(prevMessages => {
        // Check if message already exists
        const exists = prevMessages.some(message => message.id === data.message.id);
        if (exists) return prevMessages;
        return [...prevMessages, data.message];
      });
    });
    
    // Cleanup subscriptions on unmount
    return () => {
      tripCreatedUnsubscribe();
      tripUpdatedUnsubscribe();
      bidCreatedUnsubscribe();
      bidAcceptedUnsubscribe();
      messageReceivedUnsubscribe();
    };
  }, [subscribe, activeTrip]);

  // Filter trips by status
  const getFilteredTrips = useCallback((status) => {
    return trips.filter(trip => trip.status === status);
  }, [trips]);

  // Get trips for the current user
  const userTrips = useMemo(() => {
    if (!user) return [];
    return trips.filter(trip => trip.user?.id === user.id);
  }, [trips, user]);

  // Get trips for the current driver
  const driverTrips = useMemo(() => {
    if (!user || user.role !== 'driver') return [];
    return trips.filter(trip => trip.driver?.id === user.id);
  }, [trips, user]);

  // Get available trips for drivers
  const availableTrips = useMemo(() => {
    if (!user || user.role !== 'driver') return [];
    return trips.filter(trip => 
      !trip.driver && 
      trip.status === 'REQUESTED' && 
      (trip.vehicle_type === user.vehicle_type || !trip.vehicle_type)
    );
  }, [trips, user]);

  // Value to be provided by the context
  const value = {
    trips,
    activeTrip,
    loading,
    error,
    bids,
    messages,
    fetchTrips,
    fetchTripById,
    createTrip,
    updateTrip,
    fetchBids,
    createBid,
    acceptBid,
    fetchMessages,
    sendMessage,
    markMessageAsRead,
    getFilteredTrips,
    userTrips,
    driverTrips,
    availableTrips,
    setActiveTrip
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
};

export default TripContext;

