import logging
import requests
from django.conf import settings
from asgiref.sync import sync_to_async
import os
from twilio.rest import Client
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

class SMSService:
    """
    Service for sending SMS notifications using Twilio.
    """
    @staticmethod
    def send_sms(phone_number, message):
        """
        Send an SMS message to the specified phone number.
        
        Args:
            phone_number (str): The recipient's phone number
            message (str): The message content
            
        Returns:
            bool: True if the message was sent successfully, False otherwise
        """
        try:
            # Get Twilio credentials from environment variables
            account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
            auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
            from_number = os.environ.get('TWILIO_PHONE_NUMBER')
            
            # If Twilio credentials are not set, log a warning and return
            if not all([account_sid, auth_token, from_number]):
                logger.warning("Twilio credentials not configured. SMS not sent.")
                return False
            
            # Format phone number to international format if it starts with '0'
            if phone_number.startswith('0'):
                phone_number = '+27' + phone_number[1:]
            
            # Initialize Twilio client
            client = Client(account_sid, auth_token)
            
            # Send the message
            message = client.messages.create(
                body=message,
                from_=from_number,
                to=phone_number
            )
            
            logger.info(f"SMS sent successfully to {phone_number}. SID: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
            return False

class NotificationService:
    """
    Service for sending various types of notifications.
    """
    @staticmethod
    def notify_new_trip(trip):
        """
        Notify all drivers about a new trip.
        
        Args:
            trip: The Trip instance
        """
        from authentication.models import Driver
        
        try:
            # Get all active drivers
            drivers = Driver.objects.filter(is_active=True)
            
            # Prepare the message
            message = (
                f"New trip request: {trip.pickup_location.location} to "
                f"{trip.dropoff_location.location}. Vehicle: {trip.vehicle_type}. "
                f"Pickup time: {trip.pickup_time.strftime('%Y-%m-%d %H:%M')}. "
                f"Check the app for details."
            )
            
            # Send SMS to each driver
            for driver in drivers:
                if driver.phone_number:
                    SMSService.send_sms(driver.phone_number, message)
            
            logger.info(f"Notifications sent for new trip {trip.id} to {drivers.count()} drivers")
        except Exception as e:
            logger.error(f"Failed to send new trip notifications: {str(e)}")
    
    @staticmethod
    def notify_bid_received(bid):
        """
        Notify the trip owner about a new bid.
        
        Args:
            bid: The Bid instance
        """
        try:
            trip = bid.trip
            user = trip.user
            
            if user and user.phone_number:
                message = (
                    f"New bid of R{bid.amount} received for your trip from "
                    f"{trip.pickup_location.location} to {trip.dropoff_location.location}. "
                    f"Driver: {bid.driver.full_name}. Check the app for details."
                )
                SMSService.send_sms(user.phone_number, message)
                
            logger.info(f"Bid notification sent to user {user.id} for trip {trip.id}")
        except Exception as e:
            logger.error(f"Failed to send bid notification: {str(e)}")
    
    @staticmethod
    def notify_bid_accepted(bid):
        """
        Notify the driver that their bid was accepted.
        
        Args:
            bid: The Bid instance
        """
        try:
            trip = bid.trip
            driver = bid.driver
            
            if driver and driver.phone_number:
                message = (
                    f"Your bid of R{bid.amount} for the trip from "
                    f"{trip.pickup_location.location} to {trip.dropoff_location.location} "
                    f"has been accepted. Pickup time: {trip.pickup_time.strftime('%Y-%m-%d %H:%M')}. "
                    f"Check the app for details."
                )
                SMSService.send_sms(driver.phone_number, message)
                
            logger.info(f"Bid acceptance notification sent to driver {driver.id} for trip {trip.id}")
        except Exception as e:
            logger.error(f"Failed to send bid acceptance notification: {str(e)}")
    
    @staticmethod
    def notify_new_message(message):
        """
        Notify the recipient about a new chat message.
        
        Args:
            message: The ChatMessage instance
        """
        try:
            trip = message.trip
            sender = message.sender
            
            # Determine the recipient
            if sender == trip.user:
                recipient = trip.driver
            else:
                recipient = trip.user
            
            if recipient and recipient.phone_number:
                notification = (
                    f"New message from {sender.full_name}: "
                    f"{message.content[:50]}{'...' if len(message.content) > 50 else ''} "
                    f"Check the app to respond."
                )
                SMSService.send_sms(recipient.phone_number, notification)
                
            logger.info(f"Message notification sent to {recipient.id} for trip {trip.id}")
        except Exception as e:
            logger.error(f"Failed to send message notification: {str(e)}")

# Async versions of notification methods for use in WebSocket consumers
notify_new_trip_async = sync_to_async(NotificationService.notify_new_trip)
notify_bid_received_async = sync_to_async(NotificationService.notify_bid_received)
notify_bid_accepted_async = sync_to_async(NotificationService.notify_bid_accepted)
notify_new_message_async = sync_to_async(NotificationService.notify_new_message)

