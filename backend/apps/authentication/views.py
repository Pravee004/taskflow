"""Authentication views: register, login, profile, admin user management."""
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    AdminUserSerializer,
)
from taskflow.responses import success_response, error_response
from .permissions import IsAdmin

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — Create a new user account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_summary="Register a new user",
        responses={
            201: openapi.Response("User created", RegisterSerializer),
            400: "Validation error",
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error_response(serializer.errors)
        user = serializer.save()
        # Auto-generate tokens after registration
        refresh = RefreshToken.for_user(user)
        return success_response(
            data={
                'user': UserProfileSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            },
            message="Account created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — Login and receive JWT tokens."""
    serializer_class = CustomTokenObtainPairSerializer

    @swagger_auto_schema(operation_summary="Login and get JWT tokens")
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            return success_response(data=response.data, message="Login successful.")
        return response


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklist refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Logout (blacklist refresh token)",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['refresh'],
            properties={'refresh': openapi.Schema(type=openapi.TYPE_STRING)},
        )
    )
    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return success_response(message="Logged out successfully.")
        except Exception:
            return error_response("Invalid or expired token.")


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/profile/ — Authenticated user's profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    @swagger_auto_schema(operation_summary="Get current user profile")
    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return success_response(data=serializer.data)

    @swagger_auto_schema(operation_summary="Update current user profile")
    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            self.get_object(), data=request.data, partial=True
        )
        if not serializer.is_valid():
            return error_response(serializer.errors)
        serializer.save()
        return success_response(data=serializer.data, message="Profile updated.")


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/ — Change own password."""
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Change password",
        request_body=ChangePasswordSerializer,
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(serializer.errors)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return error_response("Old password is incorrect.", status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return success_response(message="Password changed successfully.")


# ─── Admin-only views ─────────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """GET /api/v1/auth/admin/users/ — List all users (admin only)."""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.all()

    @swagger_auto_schema(operation_summary="[Admin] List all users")
    def get(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return success_response(data=serializer.data)


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/v1/auth/admin/users/<id>/ — Manage a user (admin only)."""
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.all()

    @swagger_auto_schema(operation_summary="[Admin] Get user by ID")
    def get(self, request, *args, **kwargs):
        user = self.get_object()
        return success_response(data=self.get_serializer(user).data)

    @swagger_auto_schema(operation_summary="[Admin] Update user role or status")
    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(serializer.errors)
        serializer.save()
        return success_response(data=serializer.data, message="User updated.")

    @swagger_auto_schema(operation_summary="[Admin] Delete a user")
    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return success_response(message="User deleted.", status_code=status.HTTP_204_NO_CONTENT)
