"""
Tests for the authentication endpoints.

Run with:  python manage.py test accounts.tests
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class AuthEndpointTests(TestCase):
    """Verify signup → login → me → refresh flow."""

    def setUp(self):
        self.client = APIClient()
        self.signup_url = "/api/auth/signup/"
        self.login_url = "/api/auth/login/"
        self.me_url = "/api/auth/me/"
        self.refresh_url = "/api/auth/refresh/"
        self.valid_payload = {"mobile": "9876543210", "password": "StrongPass1"}

    # ── signup ──────────────────────────────────────────────────────────

    def test_signup_success(self):
        resp = self.client.post(self.signup_url, self.valid_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data["success"])
        self.assertIn("access", resp.data["data"])
        self.assertIn("refresh", resp.data["data"])
        self.assertEqual(resp.data["data"]["user"]["mobile"], "9876543210")

    def test_signup_duplicate_mobile(self):
        self.client.post(self.signup_url, self.valid_payload, format="json")
        resp = self.client.post(self.signup_url, self.valid_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "MOBILE_EXISTS")

    def test_signup_invalid_mobile(self):
        # Username must be 3+ chars; "ab" is too short
        resp = self.client.post(self.signup_url, {"mobile": "ab", "password": "StrongPass1"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signup_short_password(self):
        resp = self.client.post(self.signup_url, {"mobile": "9876543210", "password": "short"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── login ───────────────────────────────────────────────────────────

    def test_login_success(self):
        self.client.post(self.signup_url, self.valid_payload, format="json")
        resp = self.client.post(self.login_url, self.valid_payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        self.assertIn("access", resp.data["data"])

    def test_login_wrong_password(self):
        self.client.post(self.signup_url, self.valid_payload, format="json")
        resp = self.client.post(self.login_url, {"mobile": "9876543210", "password": "Wrong123456"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp.data["error"]["code"], "INVALID_CREDENTIALS")

    def test_login_nonexistent_user(self):
        resp = self.client.post(self.login_url, {"mobile": "0000000000", "password": "Whatever1"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── me ──────────────────────────────────────────────────────────────

    def test_me_authenticated(self):
        resp = self.client.post(self.signup_url, self.valid_payload, format="json")
        token = resp.data["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.get(self.me_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["data"]["mobile"], "9876543210")

    def test_me_unauthenticated(self):
        resp = self.client.get(self.me_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── refresh ─────────────────────────────────────────────────────────

    def test_refresh_token(self):
        resp = self.client.post(self.signup_url, self.valid_payload, format="json")
        refresh = resp.data["data"]["refresh"]
        resp = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
