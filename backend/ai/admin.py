from django.contrib import admin
from .models import AIRequestLog, AIModelConfig


@admin.register(AIRequestLog)
class AIRequestLogAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'endpoint',
        'success',
        'total_tokens',
        'cost_usd',
        'response_time_ms',
        'created_at',
    )
    list_filter = (
        'endpoint',
        'success',
        'created_at',
    )
    search_fields = (
        'user__email',
        'endpoint',
        'input_text',
        'output_text',
        'error_message',
    )
    readonly_fields = (
        'created_at',
        'total_tokens',
    )
    ordering = ('-created_at',)

    fieldsets = (
        ('Request Info', {
            'fields': ('user', 'endpoint', 'success', 'error_message')
        }),
        ('Input / Output', {
            'fields': ('input_text', 'output_text')
        }),
        ('Usage Metrics', {
            'fields': (
                'input_tokens',
                'output_tokens',
                'total_tokens',
                'cost_usd',
                'response_time_ms',
            )
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )


@admin.register(AIModelConfig)
class AIModelConfigAdmin(admin.ModelAdmin):
    list_display = (
        'model_name',
        'is_active',
        'cost_per_1k_tokens',
        'max_tokens',
        'temperature',
        'created_at',
    )
    list_filter = ('is_active',)
    search_fields = ('model_name', 'description')
    ordering = ('model_name',)
    readonly_fields = ('created_at',)
