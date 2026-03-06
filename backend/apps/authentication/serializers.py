"""Authentication serializers."""
import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'full_name', 'password', 'confirm_password', 'role')
        extra_kwargs = {
            'role': {'required': False},
            'full_name': {'required': False},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        return value

    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        # Prevent self-assigning admin role via API
        if data.get('role') == 'admin':
            data['role'] = 'user'
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'full_name', 'role', 'created_at', 'updated_at')
        read_only_fields = ('id', 'email', 'role', 'created_at', 'updated_at')


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Inject user info into JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token

    def validate(self, attrs):
        # Allow login with email (USERNAME_FIELD) — already handled
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.pk,
            'email': self.user.email,
            'username': self.user.username,
            'full_name': self.user.full_name,
            'role': self.user.role,
        }
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    """Admin-only: view and manage all users."""
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'full_name', 'role', 'is_active', 'created_at')
        read_only_fields = ('id', 'email', 'created_at')
