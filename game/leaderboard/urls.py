from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeaderboardViewSet, AchievementViewSet, UserAchievementViewSet

router = DefaultRouter()
router.register(r'leaderboards', LeaderboardViewSet, basename='leaderboard')
router.register(r'achievements', AchievementViewSet, basename='achievement')
router.register(r'my-achievements', UserAchievementViewSet, basename='user-achievement')

urlpatterns = [
    path('', include(router.urls)),
]
