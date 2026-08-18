from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class User(AbstractUser):
    USER_TYPES = [
        ('student', 'Student'),
        ('mentor', 'Mentor'),
        ('admin', 'Admin'),
        ('ambassador', 'College Ambassador'),
    ]
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='student')
    phone = models.CharField(max_length=15, blank=True)
    profile_image = models.URLField(blank=True)
    
    # Academic preferences
    academic_level = models.CharField(max_length=50, blank=True)
    field_of_study = models.CharField(max_length=100, blank=True)
    interested_subjects = models.JSONField(default=list, blank=True)  # Store as JSON array
    career_path = models.CharField(max_length=200, blank=True)
    upcoming_exams = models.JSONField(default=list, blank=True)  # Store as JSON array
    course_name = models.CharField(max_length=200, blank=True)
    
    # AI usage tracking
    daily_ai_usage = models.IntegerField(default=0)
    monthly_ai_usage = models.IntegerField(default=0)
    last_ai_reset = models.DateField(auto_now_add=True)
    
    # Streak tracking
    current_streak = models.IntegerField(default=0)
    last_streak_date = models.DateField(null=True, blank=True)
    
    # Admin management
    is_blacklisted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'users'
    
    def can_use_ai(self):
        """Check if user can make AI requests"""
        if self.user_type in ['admin', 'mentor']:
            return True
        return self.daily_ai_usage < settings.DAILY_AI_LIMIT
    
    def increment_ai_usage(self):
        """Increment AI usage counter"""
        self.daily_ai_usage += 1
        self.monthly_ai_usage += 1
        self.save()

    def update_streak(self):
        """Update user streak based on PYQ completion"""
        from datetime import date, timedelta
        today = date.today()
        
        if self.last_streak_date == today:
            # Already completed today, streak remains same
            return
            
        if self.last_streak_date == today - timedelta(days=1):
            # Completed yesterday, increment streak
            self.current_streak += 1
        else:
            # Missed a day or first time, reset to 1
            self.current_streak = 1
            
        self.last_streak_date = today
        self.save()


class AcademicProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='academic_profile')
    goals = models.JSONField(default=list, blank=True)  # Store as JSON array
    current_semester = models.IntegerField(null=True, blank=True)
    university = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email}'s Academic Profile"
