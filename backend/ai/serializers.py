from rest_framework import serializers
from .models import AIRequestLog, AIModelConfig

class AIRequestLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRequestLog
        fields = [
            'id', 'user', 'endpoint', 'input_text', 'output_text',
            'input_tokens', 'output_tokens', 'total_tokens', 'cost_usd',
            'response_time_ms', 'success', 'error_message', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class AIModelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModelConfig
        fields = [
            'id', 'model_name', 'description', 'is_active',
            'cost_per_1k_tokens', 'max_tokens', 'temperature', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

