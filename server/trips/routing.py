from django.urls import path

from .consumers import TootaConsumer

websocket_urlpatterns = [
    path('ws/toota/', TootaConsumer.as_asgi()),
]

