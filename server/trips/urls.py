from django.urls import path
from .views import (
    TripListCreateView, TripDetailView, TripUpdateView, 
    TripCancelView, TripCompleteView, BidListCreateView, 
    BidDetailView, BidAcceptView, ChatMessageListCreateView, 
    ChatMessageDetailView
)

app_name = 'trip'

urlpatterns = [
    path('trip/all/', TripListCreateView.as_view(), name='trip-list-create'),
    path('trip/<uuid:trip_id>/', TripDetailView.as_view(), name='trip-detail'),
    path('trip/<uuid:trip_id>/update/', TripUpdateView.as_view(), name='trip-update'),
    path('trip/<uuid:trip_id>/cancel/', TripCancelView.as_view(), name='trip-cancel'),
    path('trip/<uuid:trip_id>/complete/', TripCompleteView.as_view(), name='trip-complete'),
    
    # Bid endpoints
    path('trips/<uuid:trip_id>/bids/', BidListCreateView.as_view(), name='bid-list-create'),
    path('trips/<uuid:trip_id>/bids/<uuid:bid_id>/', BidDetailView.as_view(), name='bid-detail'),
    path('trips/<uuid:trip_id>/bids/<uuid:bid_id>/accept/', BidAcceptView.as_view(), name='bid-accept'),
    
    # Chat message endpoints
    path('trips/<uuid:trip_id>/messages/', ChatMessageListCreateView.as_view(), name='message-list-create'),
    path('trips/<uuid:trip_id>/messages/<uuid:message_id>/', ChatMessageDetailView.as_view(), name='message-detail'),
]
