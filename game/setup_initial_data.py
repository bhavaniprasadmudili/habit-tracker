#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mbp_rewards_backend.settings')
django.setup()

from django.contrib.auth import get_user_model

from tasks.models import DailyTask
from payouts.models import CoinToCashConversion
from leaderboard.models import Achievement

# Set admin password
User = get_user_model()
admin = User.objects.get(phone='admin') if User.objects.filter(phone='admin').exists() else None
if admin is None:
    admin = User.objects.create(phone='admin', name='admin', otp_verified=True, role='ADMIN', is_active=True)
else:
    admin.role = 'ADMIN'
    admin.is_active = True
    admin.otp_verified = True
    admin.save(update_fields=['role', 'is_active', 'otp_verified', 'updated_at'])
# NOTE: custom User model here is OTP-based; no Django password auth available.
print("✓ Admin user ensured (OTP-based).")

# Create daily tasks
daily_tasks = [
    {
        'task_type': DailyTask.TASK_TYPE_LOGIN,
        'title': 'Daily Login',
        'description': 'Log in to the app',
        'coins_reward': 20,
        'cash_reward': 0,
    },
    {
        'task_type': DailyTask.TASK_TYPE_WATCH_AD,
        'title': 'Watch Advertisement',
        'description': 'Watch a rewarded advertisement',
        'coins_reward': 2,
        'cash_reward': 0,
    },
    {
        'task_type': DailyTask.TASK_TYPE_PLAY_QUIZ,
        'title': 'Play Quiz',
        'description': 'Play one quiz',
        'coins_reward': 5,
        'cash_reward': 0,
    },
    {
        'task_type': DailyTask.TASK_TYPE_SPIN_WHEEL,
        'title': 'Spin Wheel',
        'description': 'Participate in the Saturday Spin',
        'coins_reward': 0,
        'cash_reward': 0,
    },
]

for task_data in daily_tasks:
    task, created = DailyTask.objects.get_or_create(
        task_type=task_data['task_type'],
        defaults=task_data
    )
    status = "✓ Created" if created else "✓ Already exists"
    print(f"{status}: {task.title}")

# Create coin conversion rate
conversion, created = CoinToCashConversion.objects.get_or_create(
    defaults={
        'coins_per_rupee': 100,  # 100 coins = ₹1
        'min_withdrawal_coins': 1000,  # Minimum ₹10
        'max_withdrawal_coins': 100000,  # Maximum ₹1000
    }
)
print(f"✓ Conversion rate: 100 coins = ₹1")

# Create achievements
achievements = [
    {
        'achievement_type': Achievement.ACHIEVEMENT_FIRST_LOGIN,
        'title': 'Welcome Bonus',
        'description': 'Complete your first login',
        'coins_reward': 50,
    },
    {
        'achievement_type': Achievement.ACHIEVEMENT_QUIZ_MASTER,
        'title': 'Quiz Master',
        'description': 'Answer 10 quizzes correctly',
        'coins_reward': 100,
    },
    {
        'achievement_type': Achievement.ACHIEVEMENT_COIN_COLLECTOR,
        'title': 'Coin Collector',
        'description': 'Earn 1000 coins',
        'coins_reward': 200,
    },
    {
        'achievement_type': Achievement.ACHIEVEMENT_REFERRAL_KING,
        'title': 'Referral King',
        'description': 'Refer 5 friends',
        'coins_reward': 500,
    },
    {
        'achievement_type': Achievement.ACHIEVEMENT_STREAK_7,
        'title': '7-Day Streak',
        'description': 'Login 7 days in a row',
        'coins_reward': 300,
    },
    {
        'achievement_type': Achievement.ACHIEVEMENT_STREAK_30,
        'title': '30-Day Streak',
        'description': 'Login 30 days in a row',
        'coins_reward': 1000,
    },
]

for ach_data in achievements:
    ach, created = Achievement.objects.get_or_create(
        achievement_type=ach_data['achievement_type'],
        defaults=ach_data
    )
    status = "✓ Created" if created else "✓ Already exists"
    print(f"{status}: {ach.title}")

print("\n✓ Initial data setup complete!")
print("\n" + "="*50)
print("ADMIN CREDENTIALS")
print("="*50)
print("Username: admin")
print("Password: Admin@123")
print("URL: http://127.0.0.1:8000/admin/")
print("="*50)
