# server/taxi/middleware.py

from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import jwt
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(token_key):
    try:
        # Decode the token
        decoded_token = jwt.decode(
            token_key,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
        
        # Get the user ID from the token
        user_id = decoded_token.get('user_id')
        if not user_id:
            logger.warning("No user_id found in token")
            return AnonymousUser()
        
        # Get the user from the database
        User = get_user_model()
        user = User.objects.get(id=user_id)
        logger.info(f"Authenticated WebSocket connection for user {user.id}")
        return user
    except (InvalidToken, TokenError, jwt.PyJWTError) as e:
        logger.error(f"Token validation error: {str(e)}")
        return AnonymousUser()
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"Unexpected error in token authentication: {str(e)}")
        return AnonymousUser()

class TokenAuthMiddleware:
    """
    Custom middleware for token-based authentication in WebSocket connections.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Get the query string from the scope
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        # Get the token from the query parameters
        token = query_params.get('token', [None])[0]
        
        if token:
            # Authenticate the user using the token
            scope['user'] = await get_user(token)
        else:
            # No token provided, set user as anonymous
            scope['user'] = AnonymousUser()
            logger.warning("No token provided for WebSocket connection")
        
        return await self.app(scope, receive, send)

def TokenAuthMiddlewareStack(inner):
    """
    Convenience function to wrap the middleware.
    """
    return TokenAuthMiddleware(inner)
