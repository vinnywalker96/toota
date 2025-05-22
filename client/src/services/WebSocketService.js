/**
 * WebSocketService.js
 * 
 * Service for managing WebSocket connections and real-time communication
 * with the Toota backend. Handles connection management, event subscription,
 * and message sending for trips, bids, and chat functionality.
 */

class WebSocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.baseReconnectDelay = 1000; // Start with 1 second delay
  }

  /**
   * Initialize the WebSocket connection
   * @param {string} token - JWT authentication token
   * @returns {Promise} - Resolves when connection is established
   */
  connect(token) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.token = token;

    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = process.env.REACT_APP_API_HOST || window.location.host;
        const url = `${protocol}://${host}/ws/toota/?token=${token}`;

        console.log(`Connecting to WebSocket at ${url}`);
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            this._notifyListeners(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          this.isConnecting = false;
          
          // Don't attempt to reconnect if the connection was closed intentionally
          if (event.code !== 1000) {
            this._scheduleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect(this.token).catch(() => {
        // If reconnection fails, the onclose handler will schedule another attempt
      });
    }, delay);
  }

  /**
   * Disconnect the WebSocket connection
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      console.log('Closing WebSocket connection');
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }

    this.listeners = {};
    this.isConnecting = false;
  }

  /**
   * Subscribe to a WebSocket event
   * @param {string} eventType - Type of event to listen for
   * @param {function} callback - Function to call when event is received
   */
  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
    console.log(`Subscribed to event: ${eventType}`);
  }

  /**
   * Unsubscribe from a WebSocket event
   * @param {string} eventType - Type of event to stop listening for
   * @param {function} callback - Function to remove from listeners
   */
  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
      console.log(`Unsubscribed from event: ${eventType}`);
    }
  }

  /**
   * Notify all listeners of an event
   * @param {object} data - Event data
   */
  _notifyListeners(data) {
    const eventType = data.type;
    const eventData = data.data;

    // Handle nested event types (e.g., data.data.type)
    if (eventType === 'echo.message' && eventData && eventData.type) {
      if (this.listeners[eventData.type]) {
        this.listeners[eventData.type].forEach(callback => {
          try {
            callback(eventData);
          } catch (error) {
            console.error(`Error in listener for ${eventData.type}:`, error);
          }
        });
      }
    }

    // Handle top-level event types
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(eventData);
        } catch (error) {
          console.error(`Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Send a message through the WebSocket connection
   * @param {string} type - Message type
   * @param {object} data - Message data
   * @returns {boolean} - Whether the message was sent
   */
  send(type, data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        data
      });
      this.socket.send(message);
      console.log(`Sent WebSocket message: ${type}`);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Create a new trip
   * @param {object} tripData - Trip data
   * @returns {boolean} - Whether the message was sent
   */
  createTrip(tripData) {
    return this.send('create.trip', tripData);
  }

  /**
   * Update an existing trip
   * @param {object} tripData - Trip data with ID
   * @returns {boolean} - Whether the message was sent
   */
  updateTrip(tripData) {
    return this.send('update.trip', tripData);
  }

  /**
   * Create a new bid for a trip
   * @param {string} tripId - ID of the trip
   * @param {number} amount - Bid amount
   * @param {string} driverId - ID of the driver making the bid
   * @returns {boolean} - Whether the message was sent
   */
  createBid(tripId, amount, driverId) {
    return this.send('create.bid', {
      trip: tripId,
      driver: driverId,
      amount
    });
  }

  /**
   * Accept a bid for a trip
   * @param {string} bidId - ID of the bid to accept
   * @returns {boolean} - Whether the message was sent
   */
  acceptBid(bidId) {
    return this.send('accept.bid', {
      bid_id: bidId
    });
  }

  /**
   * Send a chat message
   * @param {string} tripId - ID of the trip
   * @param {string} senderId - ID of the message sender
   * @param {string} content - Message content
   * @returns {boolean} - Whether the message was sent
   */
  sendMessage(tripId, senderId, content) {
    return this.send('send.message', {
      trip: tripId,
      sender: senderId,
      content
    });
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;

