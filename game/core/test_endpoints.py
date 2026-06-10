from __future__ import annotations

from django.test import override_settings
from rest_framework.test import APIClient


def auth_header(access_token: str) -> dict:
    return {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}


def assert_status(resp, codes):
    if resp.status_code not in set(codes):
        raise AssertionError(
            f"Expected one of {set(codes)}, got {resp.status_code}. Body={getattr(resp, 'data', None) or resp.content}"
        )


def auth_client(client: APIClient, access_token: str):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    return client





def force_login(client: APIClient, token: str):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


