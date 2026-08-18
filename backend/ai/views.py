from rest_framework.decorators import api_view, permission_classes, parser_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.conf import settings

from .services.ai_service import AIService, VisionOCRService
from .models import AIRequestLog, AIModelConfig
from .serializers import AIRequestLogSerializer, AIModelConfigSerializer


def log_ai_request(user, endpoint, result, input_text=""):
    """Helper to log AI request to database for stats"""
    try:
        usage = result.get("usage", {})
        AIRequestLog.objects.create(
            user=user,
            endpoint=endpoint,
            input_text=input_text[:1000],  # Truncate if too long
            output_text=str(result.get("result", ""))[:1000],
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            cost_usd=(usage.get("total_tokens", 0) / 1000) * 0.002,  # Rough estimate $0.002 per 1k
            success=result.get("success", False),
            error_message=result.get("error", "")
        )
    except Exception as e:
        print(f"Failed to log AI request: {e}")


class AIViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get user's AI usage statistics"""
        from datetime import date
        
        # Reset daily usage if new day
        if request.user.last_ai_reset != date.today():
            request.user.daily_ai_usage = 0
            request.user.last_ai_reset = date.today()
            request.user.save()
        
        return Response({
            "daily_usage": request.user.daily_ai_usage,
            "daily_limit": settings.DAILY_AI_LIMIT,
            "monthly_usage": request.user.monthly_ai_usage,
            "remaining_today": max(0, settings.DAILY_AI_LIMIT - request.user.daily_ai_usage),
            "user_type": request.user.user_type,
            "current_streak": request.user.current_streak
        })
    
    def create(self, request):
        """Handle AI service requests based on action parameter"""
        action_type = request.data.get('action', 'summarize')  # Renamed to avoid shadowing
        
        if not request.user.can_use_ai():
            return Response(
                {"error": "Daily AI limit reached. Upgrade for more."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        ai_service = AIService()
        
        if action_type == 'summarize':
            text = request.data.get('text', '')
            length = request.data.get('length', 'medium')
            if not text:
                return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)
            result = ai_service.summarize(text, length, request.user)
            # Normalize response for frontend
            if result["success"]:
                result["result"] = result.pop("summary")
        
        elif action_type == 'flashcards':
            text = request.data.get('text', '')
            count = request.data.get('count', 5)
            if not text:
                return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)
            result = ai_service.generate_flashcards(text, count, request.user)
            # Normalize response for frontend
            if result["success"]:
                result["result"] = result.pop("flashcards")
        
        elif action_type == 'solve_pyq':
            question = request.data.get('question', '')
            if not question:
                return Response({"error": "Question is required"}, status=status.HTTP_400_BAD_REQUEST)
            result = ai_service.solve_pyq(question, request.user)
            # Normalize response for frontend
            if result["success"]:
                result["result"] = result.pop("solution")
        
        elif action_type == 'one_night_prep':
            topic = request.data.get('topic', '')
            if not topic:
                return Response({"error": "Topic is required"}, status=status.HTTP_400_BAD_REQUEST)
            result = ai_service.generate_study_plan(topic, "intermediate", 1, request.user)
            # Normalize response for frontend
            if result["success"]:
                result["result"] = result.pop("plan")
        
        else:
            return Response({"error": f"Unknown action: {action_type}"}, status=status.HTTP_400_BAD_REQUEST)
        
        if result["success"]:
            # Increment usage counters
            request.user.increment_ai_usage()
            log_ai_request(request.user, action_type, result, input_text=text if 'text' in locals() else topic if 'topic' in locals() else question if 'question' in locals() else "")
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def ocr(self, request):
        """Upload image for text extraction with Vision API"""
        from rest_framework.parsers import MultiPartParser, FormParser
        from rest_framework.decorators import parser_classes
        
        if not request.user.can_use_ai():
            return Response(
                {"error": "Daily AI limit reached"},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        image_file = request.FILES.get('image')
        
        if not image_file:
            return Response({"error": "Image file is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate image size (max 20MB)
        if image_file.size > 20 * 1024 * 1024:
            return Response({"error": "Image too large. Max 20MB."}, status=status.HTTP_400_BAD_REQUEST)
        
        vision_service = VisionOCRService()
        detail = request.data.get('detail', 'high')
        result = vision_service.extract_text(image_file, request.user, detail)
        
        if result["success"]:
            # Normalize for frontend (frontend expects result or extracted_text)
            result["result"] = result.get("text")
            result["extracted_text"] = result.get("text")
            # Increment usage counters
            request.user.increment_ai_usage()
            log_ai_request(request.user, 'ocr', result, input_text=f"Image: {image_file.name}")
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def image_to_notes(self, request):
        """Convert image directly to organized notes"""
        if not request.user.can_use_ai():
            return Response(
                {"error": "Daily AI limit reached"},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        image_file = request.FILES.get('image')
        
        if not image_file:
            return Response({"error": "Image file is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        vision_service = VisionOCRService()
        result = vision_service.process_image_to_notes(image_file, request.user)
        
        if result["success"]:
            # Normalize for frontend
            result["result"] = result.get("notes")
            # Increment usage counters
            request.user.increment_ai_usage()
            log_ai_request(request.user, 'image_to_notes', result, input_text=f"Image: {image_file.name}")
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def mentor_chat(self, request):
        """Handle Manavalan Mentor chat requests"""
        if not request.user.can_use_ai():
            return Response(
                {"error": "Daily AI limit reached"},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        message = request.data.get('message', '')
        history = request.data.get('history', [])
        
        if not message:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        ai_service = AIService()
        result = ai_service.mentor_chat(message, history, request.user)
        
        if result["success"]:
            # Normalize for frontend
            result["result"] = result.get("content")
            # Increment usage counters
            request.user.increment_ai_usage()
            log_ai_request(request.user, 'mentor_chat', result, input_text=message)
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIModelConfigViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIModelConfig.objects.filter(is_active=True)
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsAuthenticated]


class AIRequestLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIRequestLog.objects.all()
    serializer_class = AIRequestLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AIRequestLog.objects.filter(user=self.request.user)

