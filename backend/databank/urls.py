from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UniversityViewSet, CourseViewSet, SemesterViewSet, ModuleViewSet,
    SubjectViewSet, DataBankDocumentViewSet, PYQSessionViewSet, PYQAnswerViewSet,
    QuestionPaperViewSet, QuestionBankViewSet
)

router = DefaultRouter()
router.register(r'universities', UniversityViewSet, basename='university')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'semesters', SemesterViewSet, basename='semester')
router.register(r'modules', ModuleViewSet, basename='module')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'documents', DataBankDocumentViewSet, basename='databankdocument')
router.register(r'sessions', PYQSessionViewSet, basename='pyqsession')
router.register(r'question-papers', QuestionPaperViewSet, basename='questionpaper')
router.register(r'question-bank', QuestionBankViewSet, basename='questionbank')

urlpatterns = [
    path('', include(router.urls)),
    path('answers/', PYQAnswerViewSet.as_view({'post': 'create'}), name='pyq-answer'),
]
