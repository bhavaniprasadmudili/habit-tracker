from __future__ import annotations

from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient


@dataclass(frozen=True)
class Tokens:
    access: str
    refresh: str


class JWTTestClient(APIClient):
    """Test client helper.

    Auth uses OTP endpoints (dev mode):
    - POST /api/auth/request-otp/
    - POST /api/auth/verify-otp/

    Then it sets Authorization: Bearer <access>.
    """

    def request_otp(self, phone: str, device_id: str = "dev-1"):
        return self.post(
            "/api/auth/request-otp/",
            {"phone": phone, "device_id": device_id},
            format="json",
        )

    def login_with_otp(self, phone: str, device_id: str = "dev-1") -> Tokens:
        User = get_user_model()
        user = User.objects.get(phone=phone)
        assert user.otp_code, "OTP code missing; request OTP first"

        resp = self.post(
            "/api/auth/verify-otp/",
            {"phone": phone, "otp": str(user.otp_code), "device_id": device_id},
            format="json",
        )
        assert resp.status_code == 200, resp.content
        data = resp.json()
        tokens = Tokens(access=data["access"], refresh=data["refresh"])
        self.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens.access}")
        return tokens

    def ensure_user(self, phone: str, name: str = "test-user", device_id: str = "dev-1"):
        User = get_user_model()
        user, _ = User.objects.get_or_create(
            phone=phone,
            defaults={"name": name, "device_id": device_id, "otp_verified": True},
        )
        # make sure verified (some endpoints gate by is_verified/is_active)
        if hasattr(user, "otp_verified"):
            if not user.otp_verified:
                user.otp_verified = True
        if hasattr(user, "is_active") and user.is_active is False:
            user.is_active = True
        user.updated_at = timezone.now()
        user.save()
        return user

