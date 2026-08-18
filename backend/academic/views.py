from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Subject, Module, Note, Flashcard, PYQ, MentorTask
from .serializers import (
    SubjectSerializer, ModuleSerializer, NoteSerializer, 
    FlashcardSerializer, PYQSerializer, MentorTaskSerializer
)
from databank.models import Module as DataBankModule, DataBankDocument
from databank.views import IsAdminUser
import os
from django.conf import settings
from pathlib import Path

# ... (Previous ViewSets) ...

class MentorTaskViewSet(viewsets.ModelViewSet):
    queryset = MentorTask.objects.all()
    serializer_class = MentorTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MentorTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        task = self.get_object()
        task.is_completed = not task.is_completed
        task.save()
        return Response({'status': 'task updated', 'is_completed': task.is_completed})

    @action(detail=True, methods=['post'])
    def toggle_sticky(self, request, pk=None):
        task = self.get_object()
        task.is_sticky = not task.is_sticky
        task.save()
        return Response({'status': 'task updated', 'is_sticky': task.is_sticky})

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Subject.objects.all()
        academic_level = self.request.query_params.get('academic_level')
        if academic_level:
            queryset = queryset.filter(academic_level=academic_level)
        return queryset


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Module.objects.all()
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset.filter(is_active=True)


class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Note.objects.all()
        user = self.request.user
        
        # Filter by user if authenticated
        if user.is_authenticated:
            queryset = queryset.filter(user=user) | queryset.filter(is_public=True)
        
        module_id = self.request.query_params.get('module')
        if module_id:
            queryset = queryset.filter(module_id=module_id)
        
        is_public = self.request.query_params.get('is_public')
        if is_public:
            queryset = queryset.filter(is_public=is_public == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            raise serializers.ValidationError({"error": "Authentication required to create notes"})
    
    @action(detail=False, methods=['get'])
    def my_notes(self, request):
        """Get notes created by current user"""
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        notes = Note.objects.filter(user=request.user)
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def verify(self, request, pk=None):
        """Verify a note (admin only)"""
        note = self.get_object()
        note.is_verified = True
        note.save()
        return Response({'message': 'Note verified successfully'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def promote_to_databank(self, request, pk=None):
        """Verify and promote a note to DataBank hierarchy (admin only)"""
        note = self.get_object()
        module_id = request.data.get('module_id') # DataBank Module ID
        
        if not module_id:
            return Response({'error': 'module_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            db_module = DataBankModule.objects.select_related('semester__course__university').get(id=module_id)
        except DataBankModule.DoesNotExist:
            return Response({'error': 'DataBank Module not found'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Mark as verified
        note.is_verified = True
        note.save()

        # 2. Convert note to PDF or just save as text? 
        # User said "passed to the databank", and databank is PDF-based.
        # I'll save it as a .txt file for now or a simple PDF if possible, but txt is easier.
        # However, DataBank indexed logic expects PDF currently.
        # Let's save it as a .pdf file using a simple text-to-pdf if available, or just a .txt and update databank to support it.
        # Actually, let's just save it as a .txt and see. 
        # Wait, the current databank logic uses PDFProcessor which uses fitz (PyMuPDF).
        
        slug = f"{db_module.semester.course.university.slug}/{db_module.slug}"
        storage_dir = Path(settings.DATABANK_ROOT) / slug
        storage_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"note_{note.id}_{note.title.replace(' ', '_')}.txt"
        file_path = storage_dir / filename
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(f"Title: {note.title}\n")
            f.write(f"Author: {note.user.email}\n")
            f.write(f"Content:\n{note.content}\n")

        # Create DataBankDocument (will not be indexed by PDF processor but we can add text support later)
        doc = DataBankDocument.objects.create(
            module=db_module,
            filename=filename,
            file_path=str(file_path.relative_to(settings.DATABANK_ROOT)),
            page_count=1, # Estimated for text
            is_indexed=False, # Text indexing not yet implemented in main service
        )

        return Response({
            'message': 'Note promoted to DataBank',
            'document_id': doc.id
        })


class FlashcardViewSet(viewsets.ModelViewSet):
    queryset = Flashcard.objects.all()
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Flashcard.objects.all()
        note_id = self.request.query_params.get('note')
        if note_id:
            queryset = queryset.filter(note_id=note_id)
        return queryset


class PYQViewSet(viewsets.ModelViewSet):
    queryset = PYQ.objects.all()
    serializer_class = PYQSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = PYQ.objects.all()
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        university = self.request.query_params.get('university')
        if university:
            queryset = queryset.filter(university__icontains=university)
        
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=year)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def one_night_prep(self, request):
        """Get PYQs for one-night prep (high repetition score)"""
        subject_id = request.query_params.get('subject')
        if not subject_id:
            return Response({"error": "Subject ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        pyqs = PYQ.objects.filter(
            subject_id=subject_id,
            repetition_score__gte=0.7
        ).order_by('-repetition_score', '-year')[:20]
        
        serializer = PYQSerializer(pyqs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def must_read(self, request):
        """Get must-read PYQs"""
        subject_id = request.query_params.get('subject')
        queryset = PYQ.objects.filter(must_read_flag=True)
        
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        
        serializer = PYQSerializer(queryset, many=True)
        return Response(serializer.data)


from .services import PersonalizedFlashcardService

class DashboardInsightViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def personalized_flashcards(self, request):
        """Generate personalized flashcards based on user profile interests."""
        user = request.user
        
        service = PersonalizedFlashcardService()
        # Prefer user-level fields moved to User model
        career_path = user.career_path or user.field_of_study
        exams = user.upcoming_exams or []
        subjects = user.interested_subjects or []
        
        flashcards = service.generate_personalized_flashcards(
            career_path=career_path,
            exams=exams,
            subjects=subjects
        )
        
        return Response(flashcards)

