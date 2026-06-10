from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.utils import timezone


def create_verified_user(phone: str, *, name: str = "test-user", device_id: str = "dev-1"):
    User = get_user_model()
    user, _ = User.objects.get_or_create(
        phone=phone,
        defaults={"name": name, "device_id": device_id, "otp_verified": True},
    )
    if hasattr(user, "otp_verified"):
        user.otp_verified = True
    if hasattr(user, "is_active"):
        user.is_active = True
    user.updated_at = timezone.now()
    user.save()
    return user

