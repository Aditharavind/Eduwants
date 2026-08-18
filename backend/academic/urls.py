from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet, ModuleViewSet, NoteViewSet, 
    PYQViewSet, FlashcardViewSet, MentorTaskViewSet,
    DashboardInsightViewSet
)

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subjects')
router.register(r'modules', ModuleViewSet, basename='modules')
router.register(r'notes', NoteViewSet, basename='notes')
router.register(r'pyqs', PYQViewSet, basename='pyqs')
router.register(r'flashcards', FlashcardViewSet, basename='flashcards')
router.register(r'mentor-tasks', MentorTaskViewSet, basename='mentor-tasks')
router.register(r'dashboard-insights', DashboardInsightViewSet, basename='dashboard-insights')

urlpatterns = router.urls

