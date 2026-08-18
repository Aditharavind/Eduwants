import os
import logging
from pathlib import Path
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .services.prep_service import PrepService

from .models import (
    University, Course, Semester, Module,
    Subject, DataBankDocument, PYQSession, PYQQuestion, PYQAnswer,
    QuestionPaper, QuestionBankQuestion
)
from .serializers import (
    UniversitySerializer, CourseSerializer, SemesterSerializer, ModuleSerializer,
    SubjectSerializer, DataBankDocumentSerializer,
    PYQSessionSerializer, PYQSessionListSerializer,
    PYQAnswerSerializer, PYQQuestionSerializer,
    QuestionPaperSerializer, QuestionBankQuestionSerializer
)
from .services.embedding_service import FAISSIndexService, PDFProcessor
from .services.question_service import QuestionGeneratorService, AnswerEvaluatorService
from .services.prep_service import PrepService
from ai.models import AIRequestLog

logger = logging.getLogger(__name__)


def log_databank_ai_usage(user, endpoint, result, input_text=""):
    """Helper to log AI request from databank app"""
    try:
        usage = result.get("usage", {})
        AIRequestLog.objects.create(
            user=user,
            endpoint=endpoint,
            input_text=input_text[:1000],
            output_text=str(result.get("result", ""))[:1000],
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            cost_usd=(usage.get("total_tokens", 0) / 1000) * 0.002,
            success=True
        )
    except Exception as e:
        logger.error(f"Failed to log databank AI request: {e}")

DATABANK_ROOT = getattr(settings, 'DATABANK_ROOT', Path(settings.BASE_DIR) / 'data-bank')


def ingest_and_index_pdf(pdf_file, university_slug, module_slug=None, subject_slug=None, module=None, subject=None):
    """Refactored helper for PDF ingestion and indexing."""
    slug = f"{university_slug}/{module_slug}" if module_slug else subject_slug
    if not slug:
        return None, "No slug provided for indexing"

    storage_dir = Path(DATABANK_ROOT) / slug
    storage_dir.mkdir(parents=True, exist_ok=True)
    file_path = storage_dir / pdf_file.name

    with open(file_path, 'wb') as f:
        for chunk in pdf_file.chunks():
            f.write(chunk)

    processor = PDFProcessor()
    page_count = processor.get_page_count(str(file_path))

    faiss_service = FAISSIndexService(slug)
    try:
        chunk_count = faiss_service.index_document(str(file_path))
        is_indexed = chunk_count > 0
    except Exception as e:
        logger.error(f"FAISS indexing failed: {e}")
        chunk_count = 0
        is_indexed = False

    doc = DataBankDocument.objects.create(
        subject=subject,
        module=module,
        filename=pdf_file.name,
        file_path=str(file_path.relative_to(DATABANK_ROOT)),
        page_count=page_count,
        chunk_count=chunk_count,
        is_indexed=is_indexed,
    )
    return doc, None


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'admin'


class UniversityViewSet(viewsets.ModelViewSet):
    queryset = University.objects.all()
    serializer_class = UniversitySerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '')
        # Ensure unique slug
        slug = slugify(name)
        base = slug
        counter = 1
        while University.objects.filter(slug=slug).exists():
            slug = f"{base}-{counter}"
            counter += 1
        serializer.save(slug=slug)

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '')
        slug = slugify(name)
        base = slug
        counter = 1
        while Course.objects.filter(slug=slug).exists():
            slug = f"{base}-{counter}"
            counter += 1
        serializer.save(slug=slug)

class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = Module.objects.all().select_related('semester__course')
        course_name = self.request.query_params.get('course_name')
        if course_name:
            # Filter modules by course name (case-insensitive partial match)
            queryset = queryset.filter(semester__course__name__icontains=course_name)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        name = serializer.validated_data.get('name', '')
        slug = slugify(name)
        base = slug
        counter = 1
        while Module.objects.filter(slug=slug).exists():
            slug = f"{base}-{counter}"
            counter += 1
            
        module = serializer.save(slug=slug)
        
        # Handle optional PDF upload
        pdf_file = request.FILES.get('pdf')
        if pdf_file:
            univ_slug = module.semester.course.university.slug
            ingest_and_index_pdf(pdf_file, university_slug=univ_slug, module_slug=module.slug, module=module)
            
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reindex_all(self, request, pk=None):
        """Re-index all documents associated with this module."""
        module = self.get_object()
        documents = module.documents.all()
        
        if not documents.exists():
            return Response({"error": "No documents found for this module"}, status=status.HTTP_400_BAD_REQUEST)
        
        university_slug = module.semester.course.university.slug
        module_slug = module.slug
        slug = f"{university_slug}/{module_slug}"
        
        faiss_service = FAISSIndexService(slug)
        success_count = 0
        
        for doc in documents:
            try:
                # Get absolute path
                abs_path = Path(DATABANK_ROOT) / doc.file_path
                if abs_path.exists():
                    chunk_count = faiss_service.index_document(str(abs_path))
                    doc.chunk_count = chunk_count
                    doc.is_indexed = chunk_count > 0
                    doc.save()
                    if doc.is_indexed:
                        success_count += 1
            except Exception as e:
                logger.error(f"Failed to re-index document {doc.id}: {e}")
                
        return Response({
            "message": f"Finished re-indexing. {success_count} of {documents.count()} documents successfully indexed.",
            "total": documents.count(),
            "success": success_count
        })


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '')
        slug = slugify(name)
        # Ensure unique slug
        base = slug
        counter = 1
        while Subject.objects.filter(slug=slug).exists():
            slug = f"{base}-{counter}"
            counter += 1
        serializer.save(slug=slug)


class DataBankDocumentViewSet(viewsets.ModelViewSet):
    queryset = DataBankDocument.objects.all()
    serializer_class = DataBankDocumentSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        subject_id = self.request.query_params.get('subject')
        module_id = self.request.query_params.get('module')
        if subject_id:
            return DataBankDocument.objects.filter(subject_id=subject_id)
        if module_id:
            return DataBankDocument.objects.filter(module_id=module_id)
        return DataBankDocument.objects.all()

    def create(self, request, *args, **kwargs):
        """Upload a PDF to a subject or module and index it into FAISS."""
        subject_id = request.data.get('subject')
        module_id = request.data.get('module')
        pdf_file = request.FILES.get('pdf')

        if not (subject_id or module_id) or not pdf_file:
            return Response({'error': 'subject or module and pdf are required'}, status=status.HTTP_400_BAD_REQUEST)

        module = None
        subject = None
        
        if module_id:
            try:
                module = Module.objects.select_related('semester__course__university').get(id=module_id)
                # For indexing/path purposes, we use module slug or hierarchy
                slug = f"{module.semester.course.university.slug}/{module.slug}"
            except Module.DoesNotExist:
                return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                subject = Subject.objects.get(id=subject_id)
                slug = subject.slug
            except Subject.DoesNotExist:
                return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        if not pdf_file.name.endswith('.pdf'):
            return Response({'error': 'Only PDF files are allowed'}, status=status.HTTP_400_BAD_REQUEST)

        if module:
            univ_slug = module.semester.course.university.slug
            doc, error = ingest_and_index_pdf(pdf_file, university_slug=univ_slug, module_slug=module.slug, module=module)
        else:
            doc, error = ingest_and_index_pdf(pdf_file, subject_slug=subject.slug, subject=subject)

        if error:
            return Response({'error': error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(DataBankDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reindex(self, request, pk=None):
        """Re-index a document."""
        doc = self.get_object()
        full_path = Path(DATABANK_ROOT) / doc.file_path
        if not full_path.exists():
            return Response({'error': 'File not found on disk'}, status=status.HTTP_404_NOT_FOUND)

        faiss_service = FAISSIndexService(doc.subject.slug)
        chunk_count = faiss_service.index_document(str(full_path))
        doc.chunk_count = chunk_count
        doc.is_indexed = chunk_count > 0
        doc.save()

        return Response({'message': f'Re-indexed {chunk_count} chunks', 'chunk_count': chunk_count})


class PYQSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PYQSessionListSerializer
        return PYQSessionSerializer

    def get_queryset(self):
        return PYQSession.objects.filter(user=self.request.user).prefetch_related('questions__answer')

    def create(self, request, *args, **kwargs):
        """Create a new PYQ session for a subject or module — generates 10 questions."""
        subject_id = request.data.get('subject')
        module_id = request.data.get('module')
        
        if not (subject_id or module_id):
            return Response({'error': 'subject or module is required'}, status=status.HTTP_400_BAD_REQUEST)

        module = None
        subject = None
        slug = None

        if module_id:
            try:
                module = Module.objects.select_related('semester__course__university').get(id=module_id)
                slug = f"{module.semester.course.university.slug}/{module.slug}"
            except Module.DoesNotExist:
                return Response({'error': 'Module not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                subject = Subject.objects.get(id=subject_id)
                slug = subject.slug
            except Subject.DoesNotExist:
                return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if indexed documents exist
        faiss_service = FAISSIndexService(slug)
        if not faiss_service.is_indexed():
            return Response(
                {'error': f'No indexed content found for {subject.name}. Admin needs to upload PDFs first.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        if not request.user.can_use_ai():
            return Response({'error': 'Daily AI limit reached.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Get diverse contexts from FAISS
        contexts = faiss_service.get_diverse_contexts(n=10)
        if not contexts:
            return Response({'error': 'No content in the databank for this subject'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        # Generate questions
        generator = QuestionGeneratorService()
        result = generator.generate_questions_batch(contexts, module.name if module else subject.name)
        question_data = result['questions']

        # Create session
        session = PYQSession.objects.create(user=request.user, subject=subject, module=module)

        # Create questions
        for qd in question_data:
            PYQQuestion.objects.create(
                session=session,
                question_text=qd['question_text'],
                options=qd.get('options', []),
                correct_answer=qd.get('correct_answer', ''),
                context_chunk=qd['context_chunk'],
                question_index=qd['question_index'],
            )

        # Count AI usage
        request.user.increment_ai_usage()
        
        # Log AI usage for stats
        log_databank_ai_usage(
            request.user, 
            'solve_pyq', 
            result,
            input_text=f"Subject: {subject.name}"
        )

        session_data = PYQSessionSerializer(session).data
        return Response(session_data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        session = self.get_object()
        return Response(PYQSessionSerializer(session).data)


class PYQAnswerViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        """Submit answer for a question — triggers AI evaluation."""
        question_id = request.data.get('question')
        student_answer = request.data.get('student_answer', '').strip()

        if not question_id or not student_answer:
            return Response({'error': 'question and student_answer are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            question = PYQQuestion.objects.select_related('session__subject', 'session__user').get(id=question_id)
        except PYQQuestion.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        if question.session.user != request.user:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Delete existing answer if re-submitting
        PYQAnswer.objects.filter(question=question).delete()

        # Evaluate with AI
        evaluator = AnswerEvaluatorService()
        result = evaluator.evaluate_answer(
            question=question.question_text,
            student_answer=student_answer,
            context=question.context_chunk,
            subject=question.session.subject.name,
            correct_answer=question.correct_answer,
        )

        answer = PYQAnswer.objects.create(
            question=question,
            student_answer=student_answer,
            ai_feedback=result.get('feedback', ''),
            score=result.get('score', 5.0),
            is_evaluated=True,
        )

        # Log AI evaluation usage
        log_databank_ai_usage(
            request.user,
            'solve_pyq',
            {'usage': result.get('usage', {}), 'result': f"Score: {answer.score}"},
            input_text=f"Q: {question.question_text[:200]} | A: {student_answer[:200]}"
        )

        # Check if all answers submitted — finalize session
        session = question.session
        all_questions = session.questions.count()
        answered = PYQAnswer.objects.filter(question__session=session).count()
        if answered >= all_questions:
            total = sum(
                a.score for a in PYQAnswer.objects.filter(question__session=session)
            )
            session.total_score = round(total, 2)
            session.completed = True
            session.completed_at = timezone.now()
            session.save()
            
            # Update user streak
            request.user.update_streak()

        return Response({
            'answer_id': answer.id,
            'score': answer.score,
            'feedback': answer.ai_feedback,
            'strengths': result.get('strengths', ''),
            'improvements': result.get('improvements', ''),
            'session_completed': session.completed,
            'total_score': session.total_score,
        })
class QuestionPaperViewSet(viewsets.ModelViewSet):
    queryset = QuestionPaper.objects.all().select_related('university', 'course', 'semester')
    serializer_class = QuestionPaperSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        qs = super().get_queryset()
        semester_id = self.request.query_params.get('semester')
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        return qs.order_by('-year', '-created_at')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'analyze']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Upload a question paper PDF."""
        pdf_file = request.FILES.get('file')
        if not pdf_file:
            return Response({'error': 'A PDF file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Update question paper metadata and optionally replace the PDF."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def analyze(self, request, pk=None):
        """Trigger AI analysis to extract questions and update repetition bank."""
        paper = self.get_object()
        service = PrepService()
        result = service.analyze_paper(paper.id)
        
        if "error" in result:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(result)

class QuestionBankViewSet(viewsets.ReadOnlyModelViewSet):
    """View repeated questions for the One-Night Prep feature."""
    queryset = QuestionBankQuestion.objects.all().select_related('semester__course')
    serializer_class = QuestionBankQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        # Explicit filter takes priority (e.g. admin or custom query)
        course_name = self.request.query_params.get('course_name')
        field_of_study = self.request.query_params.get('field_of_study')

        if course_name:
            qs = qs.filter(semester__course__name__icontains=course_name)
        elif field_of_study:
            qs = qs.filter(semester__course__name__icontains=field_of_study)
        else:
            # Auto-detect from user profile: prefer field_of_study > course_name
            user = self.request.user
            if hasattr(user, 'field_of_study') and user.field_of_study:
                qs = qs.filter(semester__course__name__icontains=user.field_of_study)
            elif hasattr(user, 'course_name') and user.course_name:
                qs = qs.filter(semester__course__name__icontains=user.course_name)

        # Only show questions that have appeared more than once (truly repeated)
        # Order by highest repetition count first (most repeated = most exam-critical)
        return qs.order_by('-repetition_count', '-relevance_score')

    @action(detail=False, methods=['get'])
    def insights(self, request):
        """Generate AI strategy and probabilities for the current course."""
        qs = self.get_queryset()
        # We need the raw data for AI processing
        serializer = self.get_serializer(qs[:30], many=True)
        
        course_name = request.query_params.get('course_name') or \
                      request.query_params.get('field_of_study') or \
                      (self.request.user.field_of_study if hasattr(self.request.user, 'field_of_study') else 'Your Course')

        service = PrepService()
        insights = service.generate_one_night_insights(course_name, serializer.data)
        return Response(insights)

