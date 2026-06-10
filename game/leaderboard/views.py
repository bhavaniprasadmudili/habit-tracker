from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from .models import Leaderboard, Achievement, UserAchievement
from .serializers import LeaderboardSerializer, UserAchievementSerializer


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """View leaderboards"""
    serializer_class = LeaderboardSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Get today for daily leaderboard
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        leaderboard_type = self.request.query_params.get('type', 'DAILY')
        category = self.request.query_params.get('category', 'COINS')
        
        return Leaderboard.objects.filter(
            leaderboard_type=leaderboard_type,
            category=category
        ).order_by('rank')[:100]
    
    @action(detail=False, methods=['get'])
    def my_rank(self, request):
        """Get user's rank"""
        leaderboard_type = request.query_params.get('type', 'DAILY')
        category = request.query_params.get('category', 'COINS')
        
        try:
            entry = Leaderboard.objects.get(
                user=request.user,
                leaderboard_type=leaderboard_type,
                category=category
            )
        except Leaderboard.DoesNotExist:
            return Response({'rank': 0, 'score': 0})
        
        serializer = self.get_serializer(entry)
        return Response(serializer.data)


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    """View achievements"""
    queryset = Achievement.objects.all()
    serializer_class = LeaderboardSerializer  # Placeholder
    permission_classes = [IsAuthenticated]


class UserAchievementViewSet(viewsets.ReadOnlyModelViewSet):
    """View user's achievements"""
    serializer_class = UserAchievementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserAchievement.objects.filter(user=self.request.user).order_by('-earned_at')
