from django.contrib import admin
from .models import Subject, DataBankDocument, PYQSession, PYQQuestion, PYQAnswer


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(DataBankDocument)
class DataBankDocumentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'subject', 'page_count', 'chunk_count', 'is_indexed', 'uploaded_at']
    list_filter = ['subject', 'is_indexed']


@admin.register(PYQSession)
class PYQSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'subject', 'total_score', 'completed', 'created_at']
    list_filter = ['subject', 'completed']


@admin.register(PYQQuestion)
class PYQQuestionAdmin(admin.ModelAdmin):
    list_display = ['question_index', 'session', 'question_text']


@admin.register(PYQAnswer)
class PYQAnswerAdmin(admin.ModelAdmin):
    list_display = ['question', 'score', 'is_evaluated', 'submitted_at']
