from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin view for the custom User model."""

    list_display = ("mobile", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff")
    search_fields = ("mobile",)
    ordering = ("-date_joined",)

    fieldsets = (
        (None, {"fields": ("mobile", "password")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("date_joined", "last_login")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("mobile", "password1", "password2"),
        }),
    )
