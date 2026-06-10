from django.conf import settings
from django.db import models
from django.utils import timezone


class FraudSignal(models.Model):
    """Track fraud indicators for users"""
    
    SIGNAL_MULTI_ACCOUNT = 'MULTI_ACCOUNT'
    SIGNAL_DEVICE_SPOOFING = 'DEVICE_SPOOFING'
    SIGNAL_RAPID_CLICKS = 'RAPID_CLICKS'
    SIGNAL_SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN'
    SIGNAL_DUPLICATE_REFERRAL = 'DUPLICATE_REFERRAL'
    SIGNAL_MANUAL_FLAG = 'MANUAL_FLAG'
    
    SIGNAL_TYPES = [
        (SIGNAL_MULTI_ACCOUNT, 'Multiple Accounts'),
        (SIGNAL_DEVICE_SPOOFING, 'Device Spoofing'),
        (SIGNAL_RAPID_CLICKS, 'Rapid Clicks'),
        (SIGNAL_SUSPICIOUS_PATTERN, 'Suspicious Pattern'),
        (SIGNAL_DUPLICATE_REFERRAL, 'Duplicate Referral'),
        (SIGNAL_MANUAL_FLAG, 'Manual Flag'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fraud_signals')
    
    signal_type = models.CharField(max_length=30, choices=SIGNAL_TYPES)
    severity = models.PositiveSmallIntegerField(default=1)  # 1-10
    description = models.TextField()
    
    reference_type = models.CharField(max_length=60, blank=True, default='')
    reference_id = models.CharField(max_length=80, blank=True, default='')
    
    is_resolved = models.BooleanField(default=False)
    resolution_note = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_resolved']),
            models.Index(fields=['signal_type', 'created_at']),
        ]
    
    def __str__(self):
        return f'{self.user.phone} - {self.get_signal_type_display()} ({self.severity})'


class DeviceFingerprint(models.Model):
    """Track device info for fraud detection"""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='device_fingerprint')
    
    device_id = models.CharField(max_length=128, unique=True)
    device_name = models.CharField(max_length=120, blank=True, default='')
    os_type = models.CharField(max_length=20, blank=True, default='')  # iOS, Android, Web
    os_version = models.CharField(max_length=20, blank=True, default='')
    app_version = models.CharField(max_length=20, blank=True, default='')
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    first_seen = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Device Fingerprint'
        verbose_name_plural = 'Device Fingerprints'
    
    def __str__(self):
        return f'{self.user.phone} - {self.device_name}'


class FraudCooldown(models.Model):
    """Temporary cooldown for suspected fraud"""
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fraud_cooldown')
    
    reason = models.CharField(max_length=255)
    
    cooldown_until = models.DateTimeField()
    created_at = models.DateTimeField(default=timezone.now)
    
    def is_active(self):
        return timezone.now() < self.cooldown_until
    
    def __str__(self):
        return f'{self.user.phone} - cooldown until {self.cooldown_until}'
