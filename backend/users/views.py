from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.db.models import Sum, Count
from .models import AcademicProfile
from .serializers import UserSerializer, UserRegistrationSerializer, AcademicProfileSerializer

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]  # Allow registration without auth

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return User.objects.all()
        elif user.is_authenticated:
            return User.objects.filter(id=user.id)
        return User.objects.none()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user's academic profile"""
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        profile, created = AcademicProfile.objects.get_or_create(user=request.user)
        serializer = AcademicProfileSerializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'])
    def profile(self, request):
        """Update current user's academic profile and user details"""
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        # Fields to update on the User model
        user_fields = [
            'first_name', 'last_name', 'phone', 'academic_level', 
            'field_of_study', 'career_path', 'upcoming_exams', 'course_name'
        ]
        
        user_updated = False
        for field in user_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                user_updated = True
        
        if user_updated:
            user.save()
            
        profile, created = AcademicProfile.objects.get_or_create(user=user)
        serializer = AcademicProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Return combined data
            user_serializer = UserSerializer(user)
            return Response(user_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def usage(self, request):
        """Get current user's AI usage statistics"""
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        from datetime import date
        user = request.user
        if user.last_ai_reset != date.today():
            user.daily_ai_usage = 0
            user.last_ai_reset = date.today()
            user.save()
        from django.conf import settings
        return Response({
            "daily_usage": user.daily_ai_usage,
            "daily_limit": settings.DAILY_AI_LIMIT,
            "monthly_usage": user.monthly_ai_usage,
            "remaining_today": max(0, settings.DAILY_AI_LIMIT - user.daily_ai_usage),
            "user_type": user.user_type,
            "current_streak": user.current_streak
        })


# ---------------------------------------------------------------------------
# Admin Panel Endpoints
# ---------------------------------------------------------------------------

class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        if user.user_type != 'admin':
            return Response({'error': 'Admin access only'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
            }
        })


class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access only'}, status=status.HTTP_403_FORBIDDEN)

        from ai.models import AIRequestLog
        from databank.models import Subject, DataBankDocument, PYQSession

        total_users = User.objects.exclude(user_type='admin').count()
        total_tokens = AIRequestLog.objects.aggregate(total=Sum('total_tokens'))['total'] or 0
        total_requests = AIRequestLog.objects.count()
        total_cost = AIRequestLog.objects.aggregate(total=Sum('cost_usd'))['total'] or 0

        # Daily breakdown (last 7 days)
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models.functions import TruncDate

        seven_days_ago = timezone.now() - timedelta(days=7)
        daily_requests = (
            AIRequestLog.objects
            .filter(created_at__gte=seven_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'), tokens=Sum('total_tokens'))
            .order_by('date')
        )

        # Per-endpoint breakdown
        endpoint_stats = (
            AIRequestLog.objects
            .values('endpoint')
            .annotate(count=Count('id'), tokens=Sum('total_tokens'))
            .order_by('-count')
        )

        # Subject stats
        subjects_count = Subject.objects.count()
        docs_count = DataBankDocument.objects.count()
        sessions_count = PYQSession.objects.count()

        return Response({
            'total_users': total_users,
            'total_tokens_used': total_tokens,
            'total_ai_requests': total_requests,
            'total_cost_usd': float(total_cost),
            'daily_breakdown': list(daily_requests),
            'endpoint_stats': list(endpoint_stats),
            'databank': {
                'subjects': subjects_count,
                'documents': docs_count,
                'pyq_sessions': sessions_count,
            }
        })


class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access only'}, status=status.HTTP_403_FORBIDDEN)

        from ai.models import AIRequestLog
        from django.db.models import Sum, Count

        users = User.objects.exclude(user_type='admin').order_by('-date_joined')

        user_data = []
        for u in users:
            total_tokens = AIRequestLog.objects.filter(user=u).aggregate(t=Sum('total_tokens'))['t'] or 0
            total_requests = AIRequestLog.objects.filter(user=u).count()
            user_data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'user_type': u.user_type,
                'daily_ai_usage': u.daily_ai_usage,
                'monthly_ai_usage': u.monthly_ai_usage,
                'total_tokens_used': total_tokens,
                'total_requests': total_requests,
                'date_joined': u.date_joined,
                'last_login': u.last_login,
                'is_active': u.is_active,
                'is_blacklisted': u.is_blacklisted,
            })

        return Response({'users': user_data, 'total': len(user_data)})

    def post(self, request):
        """Toggle blacklist or delete user"""
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access only'}, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        action = request.data.get('action') # 'blacklist', 'whitelist', 'delete'

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'blacklist':
            target_user.is_blacklisted = True
            target_user.save()
            return Response({'message': 'User blacklisted'})
        elif action == 'whitelist':
            target_user.is_blacklisted = False
            target_user.save()
            return Response({'message': 'User whitelisted'})
        elif action == 'delete':
            target_user.delete()
            return Response({'message': 'User deleted'})
        
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


class AdminPasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.user_type != 'admin':
            return Response({'error': 'Admin access only'}, status=status.HTTP_403_FORBIDDEN)

        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response({'error': 'current_password and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully'})

