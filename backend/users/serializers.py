from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AcademicProfile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'phone', 'profile_image', 'academic_level',
            'field_of_study', 'interested_subjects', 'career_path', 'upcoming_exams', 'course_name', 'daily_ai_usage',
            'monthly_ai_usage', 'last_ai_reset', 'current_streak'
        ]
        read_only_fields = ['id', 'email', 'daily_ai_usage', 'monthly_ai_usage', 'last_ai_reset', 'current_streak']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'user_type', 'phone',
            'academic_level', 'field_of_study', 'interested_subjects'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            user_type=validated_data.get('user_type', 'student'),
            phone=validated_data.get('phone', ''),
            academic_level=validated_data.get('academic_level', ''),
            field_of_study=validated_data.get('field_of_study', ''),
            interested_subjects=validated_data.get('interested_subjects', [])
        )
        return user

class AcademicProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicProfile
        fields = ['id', 'user', 'goals', 'current_semester', 'university', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

