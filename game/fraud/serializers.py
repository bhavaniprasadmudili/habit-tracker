from rest_framework import serializers
from .models import FraudSignal, DeviceFingerprint


class FraudSignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FraudSignal
        fields = ['id', 'signal_type', 'severity', 'description', 'created_at']
        read_only_fields = fields


class DeviceFingerprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceFingerprint
        fields = ['device_id', 'device_name', 'os_type', 'os_version', 'app_version', 'last_seen']
        read_only_fields = fields
