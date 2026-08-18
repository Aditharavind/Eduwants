from rest_framework import serializers
from .models import Subject, Module, Note, Flashcard, PYQ, MentorTask

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'description', 'academic_level',
            'icon_url', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ModuleSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = Module
        fields = [
            'id', 'subject', 'subject_name', 'title', 'description',
            'order_number', 'estimated_hours', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class NoteSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    module_title = serializers.CharField(source='module.title', read_only=True)
    
    class Meta:
        model = Note
        fields = [
            'id', 'user', 'user_name', 'module', 'module_title',
            'title', 'content', 'is_ai_generated', 'ai_model_used',
            'ai_metadata', 'tags', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_name', 'ai_model_used', 'created_at', 'updated_at']

class FlashcardSerializer(serializers.ModelSerializer):
    note_title = serializers.CharField(source='note.title', read_only=True)
    
    class Meta:
        model = Flashcard
        fields = [
            'id', 'note', 'note_title', 'question', 'answer',
            'difficulty', 'last_reviewed', 'review_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class PYQSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    module_title = serializers.CharField(source='module.title', read_only=True)
    
    class Meta:
        model = PYQ
        fields = [
            'id', 'university', 'subject', 'subject_name', 'module', 'module_title',
            'year', 'semester', 'question_text', 'solution', 'is_solved',
            'repetition_score', 'must_read_flag', 'ai_generated_solution',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MentorTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = MentorTask
        fields = ['id', 'user', 'description', 'is_completed', 'is_sticky', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

