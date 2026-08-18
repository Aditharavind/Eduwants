from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AIViewSet

router = DefaultRouter()
router.register('', AIViewSet, basename='ai')

urlpatterns = router.urls

