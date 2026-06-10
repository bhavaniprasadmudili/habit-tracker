from django.contrib import admin
from .models import FraudSignal, DeviceFingerprint, FraudCooldown


@admin.register(FraudSignal)
class FraudSignalAdmin(admin.ModelAdmin):
    list_display = ['user', 'signal_type', 'severity', 'is_resolved', 'created_at']
    list_filter = ['signal_type', 'severity', 'is_resolved', 'created_at']
    search_fields = ['user__phone', 'description']
    readonly_fields = ['user', 'created_at', 'resolved_at']
    fieldsets = (
        ('User & Signal', {
            'fields': ('user', 'signal_type', 'severity', 'description')
        }),
        ('Reference', {
            'fields': ('reference_type', 'reference_id')
        }),
        ('Resolution', {
            'fields': ('is_resolved', 'resolution_note', 'created_at', 'resolved_at')
        }),
    )
    date_hierarchy = 'created_at'


@admin.register(DeviceFingerprint)
class DeviceFingerprintAdmin(admin.ModelAdmin):
    list_display = ['user', 'device_name', 'os_type', 'last_seen']
    list_filter = ['os_type', 'first_seen']
    search_fields = ['user__phone', 'device_name', 'device_id']
    readonly_fields = ['first_seen', 'last_seen']


@admin.register(FraudCooldown)
class FraudCooldownAdmin(admin.ModelAdmin):
    list_display = ['user', 'reason', 'cooldown_until']
    list_filter = ['cooldown_until']
    search_fields = ['user__phone', 'reason']
    readonly_fields = ['created_at']
