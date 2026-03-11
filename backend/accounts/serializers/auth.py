"""
Authentication serializers — signup, login, user profile.
"""

from rest_framework import serializers


class SignupSerializer(serializers.Serializer):
    """Validate signup payload."""

    mobile = serializers.RegexField(
        regex=r"^[a-zA-Z0-9_]{3,30}$",
        error_messages={"invalid": "Username must be 3-30 characters (letters, digits, underscores)."},
    )
    password = serializers.CharField(min_length=8, write_only=True)


class LoginSerializer(serializers.Serializer):
    """Validate login payload."""

    mobile = serializers.CharField()
    password = serializers.CharField(write_only=True)

class UserSerializer(serializers.Serializer):
    """Read-only representation of a user."""

    id = serializers.IntegerField(read_only=True)
    mobile = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
