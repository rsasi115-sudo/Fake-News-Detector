"""
Authentication business-logic layer.

Keeps views thin: views validate → services act → views respond.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

if TYPE_CHECKING:
    from accounts.models import User as UserType

User = get_user_model()
logger = logging.getLogger(__name__)


def create_user(*, mobile: str, password: str) -> tuple["UserType | None", dict | None]:
    """
    Create a new user.

    Returns (user, None) on success or (None, error_dict) on failure.
    """
    if User.objects.filter(mobile=mobile).exists():
        return None, {"code": "MOBILE_EXISTS", "message": "A user with this mobile number already exists."}

    user = User.objects.create_user(mobile=mobile, password=password)
    return user, None


def authenticate_user(*, mobile: str, password: str) -> tuple["UserType | None", dict | None]:
    """
    Authenticate by mobile + password.

    Returns (user, None) on success or (None, error_dict) on failure.
    """
    try:
        user = User.objects.get(mobile=mobile)
    except User.DoesNotExist:
        return None, {"code": "INVALID_CREDENTIALS", "message": "Invalid username or password."}

    if not user.check_password(password):
        return None, {"code": "INVALID_CREDENTIALS", "message": "Invalid username or password."}

    if not user.is_active:
        return None, {"code": "ACCOUNT_DISABLED", "message": "This account has been disabled."}

    return user, None


def get_tokens_for_user(user) -> dict[str, str]:
    """Generate a JWT access/refresh pair for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }
