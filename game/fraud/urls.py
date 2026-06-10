from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FraudSignalViewSet

router = DefaultRouter()
router.register(r'signals', FraudSignalViewSet, basename='fraud-signal')

urlpatterns = [
    path('', include(router.urls)),
]
