from django.db import models
from users.models import User


class University(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    location = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Course(models.Model):
    LEVEL_CHOICES = [('UG', 'Undergraduate'), ('PG', 'Postgraduate')]
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='courses')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    level = models.CharField(max_length=2, choices=LEVEL_CHOICES, default='UG')

    def __str__(self):
        return f"{self.name} ({self.level}) - {self.university.name}"

class Semester(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='semesters')
    semester_number = models.IntegerField()

    def __str__(self):
        return f"Sem {self.semester_number} - {self.course.name}"

class Module(models.Model):
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='modules')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    module_number = models.IntegerField(default=1)

    def __str__(self):
        return f"M{self.module_number}: {self.name} ({self.semester.course.name})"

class Subject(models.Model):
    # Subject is now mostly for legacy or backward compatibility, but we might want to keep it
    # as a "Module" equivalent if we don't want to break everything.
    # However, let's keep it for now but maybe link it to Module or vice versa.
    # For now, I'll keep Subject as-is but link DataBankDocument to Module.
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class DataBankDocument(models.Model):
    # Updated to follow hierarchy
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)  # Relative path under data-bank/
    page_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    is_indexed = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} ({self.module.name if self.module else self.subject.name if self.subject else 'Unlinked'})"


class PYQSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pyq_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='sessions', null=True, blank=True)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='sessions', null=True, blank=True)
    total_score = models.FloatField(null=True, blank=True)  # Set after evaluation
    max_score = models.IntegerField(default=100)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.subject.name} session"


class PYQQuestion(models.Model):
    session = models.ForeignKey(PYQSession, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    options = models.JSONField(default=list, blank=True)  # List of strings for MCQs
    correct_answer = models.CharField(max_length=255, blank=True)  # Store the correct option
    context_chunk = models.TextField(blank=True)  # Source text from vector DB
    question_index = models.IntegerField(default=0)  # 1-10

    def __str__(self):
        return f"Q{self.question_index}: {self.question_text[:60]}..."


class PYQAnswer(models.Model):
    question = models.OneToOneField(PYQQuestion, on_delete=models.CASCADE, related_name='answer')
    student_answer = models.TextField()
    ai_feedback = models.TextField(blank=True)
    score = models.FloatField(default=0)  # 0-10
    is_evaluated = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Answer to Q{self.question.question_index} - Score: {self.score}"

class QuestionPaper(models.Model):
    EXAM_TYPES = [('mid', 'Mid Semester'), ('end', 'End Semester'), ('supple', 'Supplementary')]
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name='question_papers')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='question_papers')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='question_papers')
    year = models.IntegerField()
    exam_type = models.CharField(max_length=10, choices=EXAM_TYPES, default='end')
    file = models.FileField(upload_to='question_papers/')
    is_analyzed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.course.name} - {self.year} ({self.exam_type})"

class QuestionBankQuestion(models.Model):
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='bank_questions')
    text = models.TextField()
    solution = models.TextField(blank=True)
    repetition_count = models.IntegerField(default=1)
    last_seen_years = models.JSONField(default=list)  # List of years [2022, 2023]
    relevance_score = models.FloatField(default=0.0) # AI predicted relevance
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.semester.course.name} - Repeated {self.repetition_count} times"
