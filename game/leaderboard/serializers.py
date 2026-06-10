from rest_framework import serializers
from .models import Leaderboard, Achievement, UserAchievement


class LeaderboardSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = Leaderboard
        fields = ['user', 'user_phone', 'user_name', 'score', 'rank', 'leaderboard_type', 'category']
        read_only_fields = fields


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'achievement_type', 'title', 'description', 'icon_url', 'coins_reward']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement_title = serializers.CharField(source='achievement.title', read_only=True)
    achievement_icon = serializers.URLField(source='achievement.icon_url', read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'achievement_title', 'achievement_icon', 'earned_at']
        read_only_fields = fields
