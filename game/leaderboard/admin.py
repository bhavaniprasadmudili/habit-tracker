from django.contrib import admin
from .models import Leaderboard, Achievement, UserAchievement


@admin.register(Leaderboard)
class LeaderboardAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'leaderboard_type', 'score', 'rank']
    list_filter = ['leaderboard_type', 'category']
    search_fields = ['user__phone']
    readonly_fields = ['user', 'rank']


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['achievement_type', 'title', 'coins_reward']
    fieldsets = (
        ('Achievement Info', {
            'fields': ('achievement_type', 'title', 'description', 'icon_url')
        }),
        ('Reward', {
            'fields': ('coins_reward',)
        }),
    )


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ['user', 'achievement', 'earned_at']
    list_filter = ['achievement', 'earned_at']
    search_fields = ['user__phone']
    readonly_fields = ['earned_at']
