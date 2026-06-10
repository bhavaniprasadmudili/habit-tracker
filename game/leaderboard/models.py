from django.conf import settings
from django.db import models
from django.utils import timezone


class Leaderboard(models.Model):
    """Track scores for leaderboards"""
    
    TYPE_DAILY = 'DAILY'
    TYPE_WEEKLY = 'WEEKLY'
    TYPE_MONTHLY = 'MONTHLY'
    TYPE_ALL_TIME = 'ALL_TIME'
    
    TYPES = [
        (TYPE_DAILY, 'Daily'),
        (TYPE_WEEKLY, 'Weekly'),
        (TYPE_MONTHLY, 'Monthly'),
        (TYPE_ALL_TIME, 'All Time'),
    ]
    
    CATEGORY_QUIZ = 'QUIZ'
    CATEGORY_GUESS = 'GUESS'
    CATEGORY_COINS = 'COINS'
    CATEGORY_REFERRALS = 'REFERRALS'
    
    CATEGORIES = [
        (CATEGORY_QUIZ, 'Quiz'),
        (CATEGORY_GUESS, 'Guess Answer'),
        (CATEGORY_COINS, 'Coins Earned'),
        (CATEGORY_REFERRALS, 'Referrals'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='global_leaderboard_entries')
    
    leaderboard_type = models.CharField(max_length=20, choices=TYPES)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    
    score = models.PositiveBigIntegerField(default=0)
    rank = models.PositiveIntegerField(default=0)
    
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'leaderboard_type', 'category', 'period_start')
        indexes = [
            models.Index(fields=['leaderboard_type', 'category', '-score']),
            models.Index(fields=['period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f'{self.user.phone} - {self.get_category_display()} ({self.get_leaderboard_type_display()})'


class Achievement(models.Model):
    """User achievements/badges"""
    
    ACHIEVEMENT_FIRST_LOGIN = 'FIRST_LOGIN'
    ACHIEVEMENT_QUIZ_MASTER = 'QUIZ_MASTER'
    ACHIEVEMENT_COIN_COLLECTOR = 'COIN_COLLECTOR'
    ACHIEVEMENT_REFERRAL_KING = 'REFERRAL_KING'
    ACHIEVEMENT_SPIN_LUCKY = 'SPIN_LUCKY'
    ACHIEVEMENT_STREAK_7 = 'STREAK_7'
    ACHIEVEMENT_STREAK_30 = 'STREAK_30'
    
    TYPES = [
        (ACHIEVEMENT_FIRST_LOGIN, 'First Login'),
        (ACHIEVEMENT_QUIZ_MASTER, 'Quiz Master'),
        (ACHIEVEMENT_COIN_COLLECTOR, 'Coin Collector'),
        (ACHIEVEMENT_REFERRAL_KING, 'Referral King'),
        (ACHIEVEMENT_SPIN_LUCKY, 'Spin Lucky'),
        (ACHIEVEMENT_STREAK_7, '7-Day Streak'),
        (ACHIEVEMENT_STREAK_30, '30-Day Streak'),
    ]
    
    achievement_type = models.CharField(max_length=30, unique=True, choices=TYPES)
    title = models.CharField(max_length=120)
    description = models.TextField()
    icon_url = models.URLField(blank=True, default='')
    
    coins_reward = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'
    
    def __str__(self):
        return self.title


class UserAchievement(models.Model):
    """Track user's earned achievements"""
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    
    earned_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('user', 'achievement')
    
    def __str__(self):
        return f'{self.user.phone} - {self.achievement.title}'
