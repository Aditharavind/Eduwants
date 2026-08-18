from django.db import models
from users.models import User

class AIRequestLog(models.Model):
    ENDPOINT_CHOICES = [
        ('summarize', 'Summarize'),
        ('flashcards', 'Generate Flashcards'),
        ('solve_pyq', 'Solve PYQ'),
        ('one_night_prep', 'One Night Prep'),
        ('ocr', 'OCR Extraction'),
        ('image_to_notes', 'Image to Notes'),
        ('solve_image', 'Solve Question from Image'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='ai_requests')
    endpoint = models.CharField(max_length=50, choices=ENDPOINT_CHOICES)
    input_text = models.TextField(blank=True)  # Original input
    output_text = models.TextField(blank=True)  # AI response
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    response_time_ms = models.IntegerField(default=0)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['endpoint', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email if self.user else 'Anonymous'} - {self.endpoint}"


class AIModelConfig(models.Model):
    model_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    cost_per_1k_tokens = models.DecimalField(max_digits=10, decimal_places=6)
    max_tokens = models.IntegerField(default=4096)
    temperature = models.FloatField(default=0.7)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.model_name