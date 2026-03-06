"""Custom DRF permissions for role-based access control."""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to users with role='admin'."""
    message = "You do not have admin privileges."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsOwnerOrAdmin(BasePermission):
    """Allow access to the object owner or an admin."""
    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # obj should have a `user` FK or `owner` FK
        owner = getattr(obj, 'user', None) or getattr(obj, 'owner', None)
        return owner == request.user
