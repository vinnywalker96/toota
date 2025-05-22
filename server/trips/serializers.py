from rest_framework import serializers
from .models import Trip, PickupLocation, DropoffLocation, Payment, Bid, ChatMessage
from authentication.serializers import UserSerializer, DriverSerializer
from authentication.models import Driver, User
from django.utils import timezone
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class PhoneNumberValidatorMixin:
    def validate_phone(self, phone_number):
        if phone_number is None or len(phone_number) != 10 or not phone_number.startswith('0'):
            logger.warning("Invalid phone number format.")
            raise serializers.ValidationError("Phone number must start with '0' and be exactly 10 digits long.")

class PickupLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickupLocation
        fields = '__all__'

class DropoffLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DropoffLocation
        fields = '__all__'

class BidSerializer(serializers.ModelSerializer):
    driver_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'trip', 'driver', 'amount', 'timestamp', 'is_accepted', 'driver_details']
        read_only_fields = ['id', 'timestamp', 'is_accepted']

    def get_driver_details(self, obj):
        return {
            'id': obj.driver.id,
            'full_name': obj.driver.full_name,
            'phone_number': obj.driver.phone_number,
            'vehicle_type': obj.driver.vehicle_type,
            'acceptance_rate': obj.driver.acceptance_rate
        }

    def validate(self, data):
        trip = data.get('trip')
        amount = data.get('amount')
        driver = data.get('driver')

        # Check if bidding is allowed for this trip
        if not trip.allow_bidding:
            raise serializers.ValidationError("Bidding is not allowed for this trip.")

        # Check if bidding end time has passed
        if trip.bidding_end_time and trip.bidding_end_time < timezone.now():
            raise serializers.ValidationError("Bidding period has ended for this trip.")

        # Check if bid amount is within allowed range
        if trip.min_bid > 0 and amount < trip.min_bid:
            raise serializers.ValidationError(f"Bid amount must be at least {trip.min_bid}.")
        if trip.max_bid > 0 and amount > trip.max_bid:
            raise serializers.ValidationError(f"Bid amount cannot exceed {trip.max_bid}.")

        # Check if driver has already placed a bid for this trip
        if Bid.objects.filter(trip=trip, driver=driver).exists():
            raise serializers.ValidationError("You have already placed a bid for this trip.")

        return data

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField(read_only=True)
    sender_type = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'trip', 'sender', 'content', 'timestamp', 'is_read', 'sender_name', 'sender_type']
        read_only_fields = ['id', 'timestamp']

    def get_sender_name(self, obj):
        return obj.sender.full_name

    def get_sender_type(self, obj):
        return 'driver' if hasattr(obj.sender, 'vehicle_type') else 'user'

class TripSerializer(serializers.ModelSerializer, PhoneNumberValidatorMixin):
    pickup_location = PickupLocationSerializer()
    dropoff_location = DropoffLocationSerializer()
    driver = DriverSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    bids = BidSerializer(many=True, read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = '__all__'
        read_only_fields = ['id', 'created', 'updated']
        
    def create(self, validated_data):
        pickup_location_data = validated_data.pop('pickup_location')
        dropoff_location_data = validated_data.pop('dropoff_location')
        
        pickup_location = PickupLocation.objects.create(**pickup_location_data)
        dropoff_location = DropoffLocation.objects.create(**dropoff_location_data)
        
        # Set default bidding end time if not provided
        if 'allow_bidding' in validated_data and validated_data['allow_bidding'] and 'bidding_end_time' not in validated_data:
            validated_data['bidding_end_time'] = timezone.now() + timedelta(hours=24)
        
        trip = Trip.objects.create(
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            **validated_data
        )
        return trip
    
    def update(self, instance, validated_data):
        if 'pickup_location' in validated_data:
            pickup_location_data = validated_data.pop('pickup_location')
            pickup_location = instance.pickup_location
            for attr, value in pickup_location_data.items():
                setattr(pickup_location, attr, value)
            pickup_location.save()
            
        if 'dropoff_location' in validated_data:
            dropoff_location_data = validated_data.pop('dropoff_location')
            dropoff_location = instance.dropoff_location
            for attr, value in dropoff_location_data.items():
                setattr(dropoff_location, attr, value)
            dropoff_location.save()
            
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        instance.save()
        return instance

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['id', 'payment_date', 'order_number', 'compensation_amount', 'net_amount']
