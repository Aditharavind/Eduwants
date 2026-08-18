from rest_framework import serializers
from .models import (
    University, Course, Semester, Module,
    Subject, DataBankDocument, PYQSession, PYQQuestion, PYQAnswer,
    QuestionPaper, QuestionBankQuestion
)


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ['id', 'name', 'slug', 'location', 'created_at']
        read_only_fields = ['slug', 'created_at']

class CourseSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='university.name', read_only=True)
    
    class Meta:
        model = Course
        fields = ['id', 'university', 'university_name', 'name', 'slug', 'level']
        read_only_fields = ['slug']

class SemesterSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    
    class Meta:
        model = Semester
        fields = ['id', 'course', 'course_name', 'semester_number']

class ModuleSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    
    class Meta:
        model = Module
        fields = ['id', 'semester', 'semester_name', 'name', 'slug', 'module_number']
        read_only_fields = ['slug']


class SubjectSerializer(serializers.ModelSerializer):
    document_count = serializers.SerializerMethodField()
    is_indexed = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'name', 'slug', 'description', 'document_count', 'is_indexed', 'created_at']
        read_only_fields = ['slug', 'created_at']

    def get_document_count(self, obj):
        return obj.documents.count()

    def get_is_indexed(self, obj):
        return obj.documents.filter(is_indexed=True).exists()


class DataBankDocumentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = DataBankDocument
        fields = ['id', 'subject', 'subject_name', 'filename', 'page_count', 'chunk_count', 'is_indexed', 'uploaded_at']
        read_only_fields = ['filename', 'page_count', 'chunk_count', 'is_indexed', 'uploaded_at']


class PYQQuestionSerializer(serializers.ModelSerializer):
    answer = serializers.SerializerMethodField()

    class Meta:
        model = PYQQuestion
        fields = ['id', 'question_text', 'question_index', 'options', 'answer']

    def get_answer(self, obj):
        if hasattr(obj, 'answer'):
            return PYQAnswerSerializer(obj.answer).data
        return None


class PYQAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PYQAnswer
        fields = ['id', 'student_answer', 'ai_feedback', 'score', 'is_evaluated', 'submitted_at']
        read_only_fields = ['ai_feedback', 'score', 'is_evaluated', 'submitted_at']


class PYQSessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    questions = PYQQuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = PYQSession
        fields = ['id', 'subject', 'subject_name', 'total_score', 'max_score',
                  'completed', 'created_at', 'completed_at', 'questions', 'question_count']
        read_only_fields = ['total_score', 'max_score', 'completed', 'created_at', 'completed_at']

    def get_question_count(self, obj):
        return obj.questions.count()


class PYQSessionListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = PYQSession
        fields = ['id', 'subject', 'subject_name', 'total_score', 'max_score',
                  'completed', 'created_at', 'completed_at']

class QuestionPaperSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='university.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    semester_number = serializers.IntegerField(source='semester.semester_number', read_only=True)

    class Meta:
        model = QuestionPaper
        fields = [
            'id', 'university', 'university_name', 'course', 'course_name', 
            'semester', 'semester_number', 'year', 'exam_type', 'file', 
            'is_analyzed', 'created_at'
        ]
        read_only_fields = ['is_analyzed', 'created_at']

class QuestionBankQuestionSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='semester.course.name', read_only=True)
    semester_number = serializers.IntegerField(source='semester.semester_number', read_only=True)
    semester_details = serializers.SerializerMethodField()

    class Meta:
        model = QuestionBankQuestion
        fields = [
            'id', 'semester', 'course_name', 'semester_number',
            'semester_details',
            'text', 'solution', 'repetition_count', 'last_seen_years',
            'relevance_score', 'created_at', 'updated_at'
        ]

    def get_semester_details(self, obj):
        return {
            'semester_number': obj.semester.semester_number,
            'course_name': obj.semester.course.name,
        }
