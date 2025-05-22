# Toota Transportation Platform

Toota is a digital platform for transportation services, connecting users with drivers for delivery and transportation needs.

## Features

- User and driver authentication
- Trip creation and management
- Real-time bidding system
- In-app chat messaging
- SMS notifications
- Payment processing

## Technology Stack

### Backend
- Django REST Framework
- Django Channels for WebSockets
- PostgreSQL/SQLite database
- Redis for WebSocket channel layer
- Twilio for SMS notifications

### Frontend
- React.js
- Tailwind CSS
- WebSocket API for real-time communication

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- Redis server (for WebSockets)
- Twilio account (for SMS notifications)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/toota.git
   cd toota/server
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env` and update the values
   - Set up your Twilio credentials for SMS functionality

5. Run migrations:
   ```bash
   python manage.py migrate
   ```

6. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

7. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd ../client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` and update the values

4. Start the development server:
   ```bash
   npm run dev
   ```

## WebSocket API

The WebSocket API enables real-time communication for bidding and chat features.

### Connection

Connect to the WebSocket server with your authentication token:
```javascript
const socket = new WebSocket(`ws://localhost:8000/ws/toota/?token=${authToken}`);
```

### Event Types

- `create.trip` - Create a new trip
- `update.trip` - Update an existing trip
- `create.bid` - Create a new bid for a trip
- `accept.bid` - Accept a bid for a trip
- `send.message` - Send a chat message

### Example Usage

```javascript
// Connect to WebSocket
const socket = new WebSocket(`ws://localhost:8000/ws/toota/?token=${authToken}`);

// Listen for events
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send a bid
socket.send(JSON.stringify({
  type: 'create.bid',
  data: {
    trip: 'trip-uuid',
    driver: 'driver-uuid',
    amount: 100.00
  }
}));
```

## REST API Endpoints

### Authentication
- `POST /api/auth/register/` - Register a new user
- `POST /api/auth/login/` - Login and get tokens
- `POST /api/auth/refresh/` - Refresh access token

### Trips
- `GET /api/trips/` - List all trips
- `POST /api/trips/` - Create a new trip
- `GET /api/trips/{id}/` - Get trip details
- `PUT /api/trips/{id}/` - Update a trip
- `POST /api/trips/{id}/cancel/` - Cancel a trip
- `POST /api/trips/{id}/complete/` - Complete a trip

### Bidding
- `GET /api/trips/{id}/bids/` - List all bids for a trip
- `POST /api/trips/{id}/bids/` - Create a new bid
- `POST /api/trips/{id}/bids/{bid_id}/accept/` - Accept a bid

### Chat
- `GET /api/trips/{id}/messages/` - Get chat messages for a trip
- `POST /api/trips/{id}/messages/` - Send a new message
- `PATCH /api/trips/{id}/messages/{message_id}/` - Mark a message as read

## License

This project is licensed under the MIT License - see the LICENSE file for details.

