import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Service for managing trips, bids, and related functionality
 */
class TripService {
  /**
   * Get all trips
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to trips data
   */
  getAllTrips(token) {
    return axios.get(`${API_URL}/trips/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * Get a specific trip by ID
   * @param {string} tripId - Trip ID
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to trip data
   */
  getTripById(tripId, token) {
    return axios.get(`${API_URL}/trips/${tripId}/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * Create a new trip
   * @param {object} tripData - Trip data
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to created trip
   */
  createTrip(tripData, token) {
    return axios.post(`${API_URL}/trips/`, tripData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Update an existing trip
   * @param {string} tripId - Trip ID
   * @param {object} tripData - Updated trip data
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to updated trip
   */
  updateTrip(tripId, tripData, token) {
    return axios.put(`${API_URL}/trips/${tripId}/`, tripData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all bids for a trip
   * @param {string} tripId - Trip ID
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to bids data
   */
  getBidsForTrip(tripId, token) {
    return axios.get(`${API_URL}/trips/${tripId}/bids/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * Create a new bid for a trip
   * @param {string} tripId - Trip ID
   * @param {object} bidData - Bid data
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to created bid
   */
  createBid(tripId, bidData, token) {
    return axios.post(`${API_URL}/trips/${tripId}/bids/`, bidData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Accept a bid for a trip
   * @param {string} tripId - Trip ID
   * @param {string} bidId - Bid ID
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to updated trip
   */
  acceptBid(tripId, bidId, token) {
    return axios.post(`${API_URL}/trips/${tripId}/bids/${bidId}/accept/`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get chat messages for a trip
   * @param {string} tripId - Trip ID
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to messages data
   */
  getChatMessages(tripId, token) {
    return axios.get(`${API_URL}/trips/${tripId}/messages/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  /**
   * Send a chat message for a trip
   * @param {string} tripId - Trip ID
   * @param {object} messageData - Message data
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to created message
   */
  sendChatMessage(tripId, messageData, token) {
    return axios.post(`${API_URL}/trips/${tripId}/messages/`, messageData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Mark a chat message as read
   * @param {string} tripId - Trip ID
   * @param {string} messageId - Message ID
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Promise resolving to updated message
   */
  markMessageAsRead(tripId, messageId, token) {
    return axios.patch(`${API_URL}/trips/${tripId}/messages/${messageId}/`, {
      is_read: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

export default new TripService();
