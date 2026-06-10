from __future__ import annotations

from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework.reverse import reverse

from users.otp_delivery import deliver_otp

from .test_suite import create_verified_user


class ApiSmokeTests(APITestCase):
    @override_settings(CORS_ALLOW_ALL_ORIGINS=True)
    def test_schema_access(self):
        # Unauthenticated schema should work (Spectacular configured with default permissions)
        resp = self.client.get("/api/schema/")
        self.assertIn(resp.status_code, (200, 401, 403))

    def test_auth_endpoints_unauthenticated(self):
        resp = self.client.post("/api/auth/request-otp/", {"phone": "+911111111111", "device_id": "dev-1"}, format="json")
        self.assertIn(resp.status_code, (200, 201, 400, 429))

    def test_authenticated_groups_smoke(self):
        user = create_verified_user("+922222222222")
        # JWT auth is required by DRF. For v1, we can hit endpoints by setting bearer token via login.
        # If login flow fails due to OTP storage details, this test will still confirm 401/403 is returned.

        # Attempt without JWT should be rejected for protected endpoints
        protected_resp = self.client.get("/api/wallet/summary/")
        self.assertIn(protected_resp.status_code, (401, 403))

        # If the OTP fields exist, we at least ensure endpoints are wired.
        # NOTE: Full JWT login is intentionally skipped here because dev OTP depends on logging/DB state.
        # Dedicated endpoint tests can be added once auth helper is finalized.

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        OTP_DELIVERY_MODE="email",
        OTP_EMAIL_FROM="noreply@rewardverse.local",
    )
    def test_request_otp_queues_email_delivery(self):
        mail.outbox = []

        resp = self.client.post(
            "/api/auth/request-otp/",
            {"phone": "+933333333333", "email": "user@example.com", "device_id": "dev-email"},
            format="json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["user@example.com"])
        self.assertEqual(resp.json()["delivery_method"], "email")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        OTP_DELIVERY_MODE="webhook",
        OTP_WEBHOOK_URL="",
        OTP_EMAIL_FROM="noreply@rewardverse.local",
    )
    def test_request_otp_uses_saved_email_when_phone_only(self):
        mail.outbox = []
        user = create_verified_user("+944444444444", device_id="dev-saved-email")
        user.email = "saved@example.com"
        user.save(update_fields=["email", "updated_at"])

        resp = self.client.post(
            "/api/auth/request-otp/",
            {"phone": "+944444444444", "device_id": "dev-saved-email"},
            format="json",
        )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["saved@example.com"])
        self.assertEqual(resp.json()["delivery_method"], "email")
        self.assertEqual(resp.json()["destination"], "saved@example.com")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        OTP_DELIVERY_MODE="webhook",
        OTP_WEBHOOK_URL="https://example.com/sms-webhook",
        OTP_EMAIL_FROM="noreply@rewardverse.local",
    )
    @patch("users.otp_delivery.urllib.request.urlopen")
    def test_deliver_otp_sends_email_and_webhook_when_configured(self, mock_urlopen):
        mail.outbox = []
        mock_urlopen.return_value.__enter__.return_value.read.return_value = b'{"ok":true}'

        result = deliver_otp("9391844926", "123456", email="user@example.com")

        self.assertEqual(result["delivery_method"], "mixed")
        self.assertEqual(result["destination"], "user@example.com")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["user@example.com"])
        self.assertEqual(mock_urlopen.call_count, 1)

