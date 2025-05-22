from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Sum, Count
from datetime import datetime, timedelta
import logging

from .models import Trip, Payment, Bid, ChatMessage
from .serializers import TripSerializer, PaymentSerializer, BidSerializer, ChatMessageSerializer
from .services import NotificationService
from authentication.models import Driver, User

logger = logging.getLogger(__name__)

# Trip views
class TripListCreateView(generics.ListCreateAPIView):
    """
    List all trips or create a new trip
    """
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'vehicle_type'):  # Driver
            return Trip.objects.filter(
                Q(driver=user) | 
                Q(driver__isnull=True, status=Trip.REQUESTED)
            ).order_by('-created')
        else:  # Regular user
            return Trip.objects.filter(user=user).order_by('-created')

    def perform_create(self, serializer):
        trip = serializer.save(user=self.request.user)
        # Send SMS notification to all drivers
        NotificationService.notify_new_trip(trip)

class TripDetailView(generics.RetrieveAPIView):
    """
    Retrieve a trip
    """
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'trip_id'

    def get_queryset(self):
        return Trip.objects.all()

class TripUpdateView(generics.UpdateAPIView):
    """
    Update a trip
    """
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'trip_id'

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'vehicle_type'):  # Driver
            return Trip.objects.filter(driver=user)
        else:  # Regular user
            return Trip.objects.filter(user=user)

class TripCancelView(APIView):
    """
    Cancel a trip
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        
        # Check if user is authorized to cancel this trip
        user = request.user
        if not (trip.user == user or trip.driver == user):
            return Response(
                {"detail": "You are not authorized to cancel this trip."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if trip can be cancelled
        if trip.status in [Trip.COMPLETED, Trip.CANCELLED]:
            return Response(
                {"detail": f"Cannot cancel a trip that is already {trip.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update trip status
        trip.status = Trip.CANCELLED
        trip.save()
        
        return Response(
            {"detail": "Trip cancelled successfully."},
            status=status.HTTP_200_OK
        )

class TripCompleteView(APIView):
    """
    Complete a trip
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        
        # Check if user is authorized to complete this trip
        user = request.user
        if not (trip.user == user or trip.driver == user):
            return Response(
                {"detail": "You are not authorized to complete this trip."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if trip can be completed
        if trip.status != Trip.IN_PROGRESS:
            return Response(
                {"detail": "Only in-progress trips can be completed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update trip status
        trip.status = Trip.COMPLETED
        trip.save()
        
        # Update driver stats if completed by user
        if trip.driver and user == trip.user:
            driver = trip.driver
            driver.total_trips += 1
            driver.accepted_trips += 1
            driver.update_acceptance_rate()
        
        return Response(
            {"detail": "Trip completed successfully."},
            status=status.HTTP_200_OK
        )

# Bid views
class BidListCreateView(generics.ListCreateAPIView):
    """
    List all bids for a trip or create a new bid
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs.get('trip_id')
        return Bid.objects.filter(trip_id=trip_id).order_by('-timestamp')

    def perform_create(self, serializer):
        trip_id = self.kwargs.get('trip_id')
        trip = get_object_or_404(Trip, id=trip_id)
        
        # Check if user is a driver
        user = self.request.user
        if not hasattr(user, 'vehicle_type'):
            raise permissions.PermissionDenied("Only drivers can place bids.")
        
        # Create the bid
        bid = serializer.save(trip=trip, driver=user)
        
        # Send notification to trip owner
        NotificationService.notify_bid_received(bid)

class BidDetailView(generics.RetrieveAPIView):
    """
    Retrieve a bid
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'bid_id'

    def get_queryset(self):
        trip_id = self.kwargs.get('trip_id')
        return Bid.objects.filter(trip_id=trip_id)

class BidAcceptView(APIView):
    """
    Accept a bid
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, trip_id, bid_id):
        trip = get_object_or_404(Trip, id=trip_id)
        bid = get_object_or_404(Bid, id=bid_id, trip=trip)
        
        # Check if user is the trip owner
        if trip.user != request.user:
            return Response(
                {"detail": "Only the trip owner can accept bids."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if trip is still open for bidding
        if not trip.allow_bidding:
            return Response(
                {"detail": "This trip is not open for bidding."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if bidding end time has passed
        if trip.bidding_end_time and trip.bidding_end_time < timezone.now():
            return Response(
                {"detail": "Bidding period has ended for this trip."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Accept the bid
        bid.is_accepted = True
        bid.save()
        
        # Update the trip
        trip.driver = bid.driver
        trip.bid = bid.amount
        trip.is_accepted = True
        trip.status = Trip.ACCEPTED
        trip.allow_bidding = False
        trip.save()
        
        # Update driver's acceptance rate
        driver = bid.driver
        driver.accepted_trips += 1
        driver.total_trips += 1
        driver.update_acceptance_rate()
        
        # Send notification to the driver
        NotificationService.notify_bid_accepted(bid)
        
        return Response(
            {"detail": "Bid accepted successfully."},
            status=status.HTTP_200_OK
        )

# Chat message views
class ChatMessageListCreateView(generics.ListCreateAPIView):
    """
    List all messages for a trip or create a new message
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        trip_id = self.kwargs.get('trip_id')
        return ChatMessage.objects.filter(trip_id=trip_id).order_by('timestamp')

    def perform_create(self, serializer):
        trip_id = self.kwargs.get('trip_id')
        trip = get_object_or_404(Trip, id=trip_id)
        
        # Check if user is authorized to send messages for this trip
        user = self.request.user
        if not (trip.user == user or (trip.driver and trip.driver == user)):
            raise permissions.PermissionDenied("You are not authorized to send messages for this trip.")
        
        # Create the message
        message = serializer.save(trip=trip, sender=user)
        
        # Send notification to the recipient
        NotificationService.notify_new_message(message)

class ChatMessageDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update a message (for marking as read)
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'message_id'

    def get_queryset(self):
        trip_id = self.kwargs.get('trip_id')
        return ChatMessage.objects.filter(trip_id=trip_id)
    
    def perform_update(self, serializer):
        # Only allow updating the is_read field
        serializer.save(content=serializer.instance.content)
