from __future__ import annotations

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient


class CoreSmokeTest(APITestCase):
    def test_smoke(self):
        resp = self.client.get("/api/schema/")
        self.assertIn(resp.status_code, (200, 401, 403))

