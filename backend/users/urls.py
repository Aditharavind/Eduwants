from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, AdminLoginView, AdminStatsView, AdminUserListView, AdminPasswordChangeView

router = DefaultRouter()
router.register('', UserViewSet, basename='users')

urlpatterns = router.urls + [
    path('admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/change-password/', AdminPasswordChangeView.as_view(), name='admin-change-password'),
]


