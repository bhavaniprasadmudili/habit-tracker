from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient


def create_user(phone: str, name: str = "test-user", device_id: str = "dev-1"):
    User = get_user_model()
    user, _ = User.objects.get_or_create(
        phone=phone,
        defaults={"name": name, "device_id": device_id, "otp_verified": True},
    )
    user.otp_verified = True
    user.is_active = True
    user.save()
    return user


def otp_login(client: APIClient, phone: str, device_id: str = "dev-1") -> str:
    # request otp
    resp = client.post(
        "/api/auth/request-otp/",
        {"phone": phone, "device_id": device_id},
        format="json",
    )
    assert resp.status_code in (200, 201), resp.content

    User = get_user_model()
    user = User.objects.get(phone=phone)
    assert user.otp_code, "OTP not set"

    resp2 = client.post(
        "/api/auth/verify-otp/",
        {"phone": phone, "otp": str(user.otp_code), "device_id": device_id},
        format="json",
    )
    assert resp2.status_code == 200, resp2.content
    tokens = resp2.json()
    access = tokens["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return access

