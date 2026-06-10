from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


class AdminDashboardAPITests(APITestCase):
    def make_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def create_admin(self, phone="admin@example.com"):
        User = get_user_model()
        user = User.objects.create(
            phone=phone,
            name="Admin User",
            otp_verified=True,
            role="ADMIN",
            is_active=True,
        )
        return user

    def create_user(self, phone="player@example.com"):
        User = get_user_model()
        user = User.objects.create(
            phone=phone,
            name="Player User",
            otp_verified=True,
            role="USER",
            is_active=True,
        )
        return user

    def test_admin_overview_requires_admin_role(self):
        user = self.create_user()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.make_token(user)}")

        response = self.client.get(reverse("admin-overview"))

        self.assertEqual(response.status_code, 403)

    def test_admin_overview_returns_dashboard_payload(self):
        user = self.create_admin()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.make_token(user)}")

        response = self.client.get(reverse("admin-overview"))

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("summary", payload)
        self.assertIn("users", payload["summary"])

    def test_admin_user_status_update(self):
        admin = self.create_admin("admin-1@example.com")
        target = self.create_user("player-1@example.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.make_token(admin)}")

        response = self.client.post(
            reverse("admin-user-status", kwargs={"user_id": target.id}),
            {"action": "suspend"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        target.refresh_from_db()
        self.assertFalse(target.is_active)

    def test_admin_can_create_quiz(self):
        admin = self.create_admin("admin-2@example.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.make_token(admin)}")

        response = self.client.post(
            reverse("admin-quiz-list"),
            {
                "category": "GK",
                "question": "What is the capital of India?",
                "option1": "Delhi",
                "option2": "Mumbai",
                "option3": "Bangalore",
                "option4": "Chennai",
                "correct_answer": "Delhi",
                "reward_coins": 5,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["question"], "What is the capital of India?")
