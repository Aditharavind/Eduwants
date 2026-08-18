from django.db import models
from users.models import User

class Subject(models.Model):
    ACADEMIC_LEVELS = [
        ('+2', '+2 Level'),
        ('UG', 'Undergraduate'),
        ('PG', 'Postgraduate'),
        ('ENTRANCE', 'Entrance Exam'),
    ]
    
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    academic_level = models.CharField(max_length=20, choices=ACADEMIC_LEVELS)
    icon_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Module(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order_number = models.IntegerField(default=1)
    estimated_hours = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order_number']
        unique_together = ['subject', 'order_number']
    
    def __str__(self):
        return f"{self.subject.name} - {self.title}"


class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    module = models.ForeignKey(Module, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_ai_generated = models.BooleanField(default=False)
    ai_model_used = models.CharField(max_length=50, blank=True)
    ai_metadata = models.JSONField(default=dict, blank=True)  # Store AI generation details
    tags = models.JSONField(default=list, blank=True)  # Store as JSON array
    is_public = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"


class Flashcard(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='flashcards')
    question = models.TextField()
    answer = models.TextField()
    difficulty = models.CharField(max_length=10, choices=[
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ], default='medium')
    last_reviewed = models.DateTimeField(null=True, blank=True)
    review_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class PYQ(models.Model):
    university = models.CharField(max_length=200)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='pyqs')
    module = models.ForeignKey(Module, on_delete=models.SET_NULL, null=True, blank=True, related_name='pyqs')
    year = models.IntegerField()
    semester = models.CharField(max_length=20, blank=True)
    question_text = models.TextField()
    solution = models.TextField(blank=True)
    is_solved = models.BooleanField(default=False)
    repetition_score = models.FloatField(default=0.0)
    must_read_flag = models.BooleanField(default=False)
    ai_generated_solution = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-year', 'university']
        verbose_name = 'Previous Year Question'
        verbose_name_plural = 'Previous Year Questions'
    
    def __str__(self):
        return f"{self.university} - {self.subject.name} ({self.year})"


class MentorTask(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mentor_tasks')
    description = models.CharField(max_length=500)
    is_completed = models.BooleanField(default=False)
    is_sticky = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.description[:30]}"