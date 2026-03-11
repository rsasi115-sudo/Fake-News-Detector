"""
Accounts views — signup, login, me, token-refresh.
"""

import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.serializers.auth import LoginSerializer, SignupSerializer, UserSerializer
from accounts.services.auth import create_user, authenticate_user, get_tokens_for_user

logger = logging.getLogger(__name__)


# ── helpers ────────────────────────────────────────────────────────────────
def _ok(data, status_code=status.HTTP_200_OK):
    return Response({"success": True, "data": data}, status=status_code)


def _err(code: str, message: str, status_code=status.HTTP_400_BAD_REQUEST):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=status_code,
    )


# ── rate-limiter for login ─────────────────────────────────────────────────
class LoginRateThrottle(AnonRateThrottle):
    rate = "5/minute"


# ── views ──────────────────────────────────────────────────────────────────
class SignupView(APIView):
    """POST /api/auth/signup — register a new user."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if not serializer.is_valid():
            return _err("VALIDATION_ERROR", serializer.errors)

        mobile = serializer.validated_data["mobile"]
        password = serializer.validated_data["password"]

        user, error = create_user(mobile=mobile, password=password)
        if error:
            return _err(error["code"], error["message"], status.HTTP_409_CONFLICT)

        tokens = get_tokens_for_user(user)
        logger.info("User signed up: %s", mobile)
        return _ok({"user": UserSerializer(user).data, **tokens}, status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login — authenticate and return JWT pair."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return _err("VALIDATION_ERROR", serializer.errors)

        mobile = serializer.validated_data["mobile"]
        password = serializer.validated_data["password"]

        user, error = authenticate_user(mobile=mobile, password=password)
        if error:
            return _err(error["code"], error["message"], status.HTTP_401_UNAUTHORIZED)

        tokens = get_tokens_for_user(user)
        logger.info("User logged in: %s", mobile)
        return _ok({"user": UserSerializer(user).data, **tokens})


class MeView(APIView):
    """GET /api/auth/me — return the current authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _ok(UserSerializer(request.user).data)


class CustomTokenRefreshView(TokenRefreshView):
    """POST /api/auth/refresh — wrapper so responses stay consistent."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
