"""
Accounts URL configuration — authentication endpoints.
"""

from django.urls import path

from accounts.views import (
    CustomTokenRefreshView,
    LoginView,
    MeView,
    SignupView,
)

app_name = "accounts"

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
]
