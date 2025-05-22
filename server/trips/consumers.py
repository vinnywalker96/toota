from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
import logging
from django.db.models import Q

from trips.models import Trip, Bid, ChatMessage
from trips.serializers import TripSerializer, BidSerializer, ChatMessageSerializer
from .services import notify_new_trip_async, notify_bid_received_async, notify_bid_accepted_async, notify_new_message_async

logger = logging.getLogger(__name__)

# WebSocket event types
CREATE_TRIP = 'create.trip'
UPDATE_TRIP = 'update.trip'
CREATE_BID = 'create.bid'
ACCEPT_BID = 'accept.bid'
SEND_MESSAGE = 'send.message'
ECHO_MESSAGE = 'echo.message'

class TootaConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for handling real-time communication in the Toota app.
    Supports trip creation/updates, bidding, and chat messaging.
    """
    
    @database_sync_to_async
    def _create_trip(self, data):
        """Create a new trip from the provided data."""
        serializer = TripSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        trip = serializer.create(serializer.validated_data)
        return trip

    @database_sync_to_async
    def _get_trip_data(self, trip):
        """Get serialized trip data."""
        return TripSerializer(trip).data

    @database_sync_to_async
    def _get_trip_ids(self, user):
        """Get IDs of active trips for the user."""
        user_groups = user.groups.values_list('name', flat=True)
        if 'driver' in user_groups:
            trip_ids = user.trips_as_driver.exclude(
                status=Trip.COMPLETED
            ).only('id').values_list('id', flat=True)
        else:
            trip_ids = user.trips_as_user.exclude(
                status=Trip.COMPLETED
            ).only('id').values_list('id', flat=True)
        return map(str, trip_ids)

    @database_sync_to_async
    def _get_user_group(self, user):
        """Get the user's group (driver or user)."""
        return user.groups.first().name if user.groups.exists() else None

    @database_sync_to_async
    def _update_trip(self, data):
        """Update an existing trip with the provided data."""
        instance = Trip.objects.get(id=data.get('id'))
        serializer = TripSerializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        return serializer.update(instance, serializer.validated_data)
    
    @database_sync_to_async
    def _create_bid(self, data):
        """Create a new bid from the provided data."""
        serializer = BidSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        bid = serializer.save()
        return bid
    
    @database_sync_to_async
    def _get_bid_data(self, bid):
        """Get serialized bid data."""
        return BidSerializer(bid).data
    
    @database_sync_to_async
    def _accept_bid(self, bid_id):
        """Accept a bid and update the associated trip."""
        bid = Bid.objects.get(id=bid_id)
        
        # Update the bid
        bid.is_accepted = True
        bid.save()
        
        # Update the trip
        trip = bid.trip
        trip.driver = bid.driver
        trip.bid = bid.amount
        trip.is_accepted = True
        trip.status = Trip.ACCEPTED
        trip.save()
        
        # Update driver's acceptance rate
        driver = bid.driver
        driver.accepted_trips += 1
        driver.total_trips += 1
        driver.update_acceptance_rate()
        
        return bid
    
    @database_sync_to_async
    def _create_message(self, data):
        """Create a new chat message from the provided data."""
        serializer = ChatMessageSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return message
    
    @database_sync_to_async
    def _get_message_data(self, message):
        """Get serialized message data."""
        return ChatMessageSerializer(message).data

    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope['user']
        if user.is_anonymous:
            await self.close()
        else:
            # Add user to appropriate groups based on their role
            user_group = await self._get_user_group(user)
            
            if user_group == 'driver':
                await self.channel_layer.group_add(
                    group='drivers',
                    channel=self.channel_name
                )
                logger.info(f"Driver {user.id} connected to WebSocket")
            else:
                logger.info(f"User {user.id} connected to WebSocket")

            # Add user to groups for their active trips
            for trip_id in await self._get_trip_ids(user):
                await self.channel_layer.group_add(
                    group=trip_id,
                    channel=self.channel_name
                )
                logger.info(f"User {user.id} added to trip group {trip_id}")

            await self.accept()
            logger.info(f"WebSocket connection accepted for user {user.id}")

    async def create_trip(self, message):
        """Handle trip creation event."""
        data = message.get('data')
        
        # Create the trip in the database
        trip = await self._create_trip(data)
        trip_data = await self._get_trip_data(trip)
        
        # Send notification to all drivers
        await notify_new_trip_async(trip)

        # Send rider requests to all drivers
        await self.channel_layer.group_send(
            group='drivers', 
            message={
                'type': 'echo.message',
                'data': trip_data
            }
        )
        logger.info(f"Trip creation broadcast to drivers: {trip.id}")

        # Add rider to trip group
        await self.channel_layer.group_add(
            group=f'{trip.id}',
            channel=self.channel_name
        )
        logger.info(f"User added to trip group: {trip.id}")

        # Send confirmation to the creator
        await self.send_json({
            'type': 'echo.message',
            'data': trip_data,
        })
        logger.info(f"Trip creation confirmation sent to user: {trip.id}")

    async def update_trip(self, message):
        """Handle trip update event."""
        data = message.get('data')
        
        # Update the trip in the database
        trip = await self._update_trip(data)
        trip_id = f'{trip.id}'
        trip_data = await self._get_trip_data(trip)

        # Send update to all users in the trip group
        await self.channel_layer.group_send(
            group=trip_id,
            message={
                'type': 'echo.message',
                'data': trip_data,
            }
        )
        logger.info(f"Trip update broadcast to group: {trip_id}")

        # Add user to the trip group if not already in it
        await self.channel_layer.group_add(
            group=trip_id,
            channel=self.channel_name
        )

        # Send confirmation to the updater
        await self.send_json({
            'type': 'echo.message',
            'data': trip_data
        })
        logger.info(f"Trip update confirmation sent: {trip_id}")
    
    async def create_bid(self, message):
        """Handle bid creation event."""
        data = message.get('data')
        
        # Create the bid in the database
        bid = await self._create_bid(data)
        bid_data = await self._get_bid_data(bid)
        trip_id = f'{bid.trip.id}'
        
        # Send notification to trip owner
        await notify_bid_received_async(bid)
        
        # Send bid to all users in the trip group
        await self.channel_layer.group_send(
            group=trip_id,
            message={
                'type': 'echo.message',
                'data': {
                    'type': 'bid.created',
                    'bid': bid_data
                }
            }
        )
        logger.info(f"Bid creation broadcast to trip group: {trip_id}")
        
        # Send confirmation to the bidder
        await self.send_json({
            'type': 'echo.message',
            'data': {
                'type': 'bid.created',
                'bid': bid_data
            }
        })
        logger.info(f"Bid creation confirmation sent: {bid.id}")
    
    async def accept_bid(self, message):
        """Handle bid acceptance event."""
        bid_id = message.get('data', {}).get('bid_id')
        
        # Accept the bid and update the trip
        bid = await self._accept_bid(bid_id)
        bid_data = await self._get_bid_data(bid)
        trip_data = await self._get_trip_data(bid.trip)
        trip_id = f'{bid.trip.id}'
        
        # Send notification to the driver
        await notify_bid_accepted_async(bid)
        
        # Send update to all users in the trip group
        await self.channel_layer.group_send(
            group=trip_id,
            message={
                'type': 'echo.message',
                'data': {
                    'type': 'bid.accepted',
                    'bid': bid_data,
                    'trip': trip_data
                }
            }
        )
        logger.info(f"Bid acceptance broadcast to trip group: {trip_id}")
        
        # Send confirmation to the accepter
        await self.send_json({
            'type': 'echo.message',
            'data': {
                'type': 'bid.accepted',
                'bid': bid_data,
                'trip': trip_data
            }
        })
        logger.info(f"Bid acceptance confirmation sent: {bid.id}")
    
    async def send_message(self, message):
        """Handle chat message event."""
        data = message.get('data')
        
        # Create the message in the database
        chat_message = await self._create_message(data)
        message_data = await self._get_message_data(chat_message)
        trip_id = f'{chat_message.trip.id}'
        
        # Send notification to the recipient
        await notify_new_message_async(chat_message)
        
        # Send message to all users in the trip group
        await self.channel_layer.group_send(
            group=trip_id,
            message={
                'type': 'echo.message',
                'data': {
                    'type': 'message.sent',
                    'message': message_data
                }
            }
        )
        logger.info(f"Message broadcast to trip group: {trip_id}")
        
        # Send confirmation to the sender
        await self.send_json({
            'type': 'echo.message',
            'data': {
                'type': 'message.sent',
                'message': message_data
            }
        })
        logger.info(f"Message confirmation sent: {chat_message.id}")

    async def disconnect(self, code):
        """Handle WebSocket disconnection."""
        user = self.scope['user']
        if user.is_anonymous:
            await self.close()
        else:
            # Remove user from appropriate groups
            user_group = await self._get_user_group(user)
            if user_group == 'driver':
                await self.channel_layer.group_discard(
                    group='drivers',
                    channel=self.channel_name
                )
                logger.info(f"Driver {user.id} disconnected from WebSocket")

            # Remove user from trip groups
            for trip_id in await self._get_trip_ids(user):
                await self.channel_layer.group_discard(
                    group=trip_id,
                    channel=self.channel_name
                )
                logger.info(f"User {user.id} removed from trip group {trip_id}")

        await super().disconnect(code)
        logger.info(f"WebSocket connection closed for user {user.id if not user.is_anonymous else 'anonymous'}")

    async def echo_message(self, message):
        """Echo a message back to the client."""
        await self.send_json(message)

    async def receive_json(self, content, **kwargs):
        """Handle incoming WebSocket messages."""
        message_type = content.get('type')
        logger.info(f"Received WebSocket message of type: {message_type}")
        
        try:
            if message_type == CREATE_TRIP:
                await self.create_trip(content)
            elif message_type == UPDATE_TRIP:
                await self.update_trip(content)
            elif message_type == CREATE_BID:
                await self.create_bid(content)
            elif message_type == ACCEPT_BID:
                await self.accept_bid(content)
            elif message_type == SEND_MESSAGE:
                await self.send_message(content)
            elif message_type == ECHO_MESSAGE:
                await self.echo_message(content)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send_json({
                    'type': 'error',
                    'data': {'message': f'Unknown message type: {message_type}'}
                })
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {str(e)}")
            await self.send_json({
                'type': 'error',
                'data': {'message': str(e)}
            })
