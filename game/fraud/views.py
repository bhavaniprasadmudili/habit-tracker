from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import FraudSignal
from .serializers import FraudSignalSerializer


class FraudSignalViewSet(viewsets.ReadOnlyModelViewSet):
    """View fraud signals (admin only)"""
    queryset = FraudSignal.objects.all()
    serializer_class = FraudSignalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only admin can view all signals
        if self.request.user.is_staff:
            return FraudSignal.objects.all()
        # Regular users see only their own
        return FraudSignal.objects.filter(user=self.request.user)
