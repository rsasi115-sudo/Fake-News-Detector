"""
Custom User model for TruthLens.

USERNAME_FIELD is ``mobile`` (digits-only, 10-15 chars).
Passwords are hashed via Django's default PBKDF2.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Manager for the custom User model."""

    def create_user(self, mobile: str, password: str | None = None, **extra_fields):
        if not mobile:
            raise ValueError("Mobile number is required.")
        extra_fields.setdefault("is_active", True)
        user = self.model(mobile=mobile, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(mobile, password, **extra_fields)


mobile_validator = RegexValidator(
    regex=r"^[a-zA-Z0-9_]{3,30}$",
    message="Username must be 3-30 characters (letters, digits, underscores).",
)


class User(AbstractBaseUser, PermissionsMixin):
    """TruthLens user — identified by username (stored in mobile field)."""

    mobile = models.CharField(
        max_length=30,
        unique=True,
        validators=[mobile_validator],
        help_text="3-30 character username (letters, digits, underscores).",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "mobile"
    REQUIRED_FIELDS: list[str] = []  # mobile is already required as USERNAME_FIELD

    class Meta:
        db_table = "accounts_user"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self) -> str:
        return self.mobile
