from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    """
    Anyone can read (GET/HEAD/OPTIONS).
    Only staff/admin can write (POST/PUT/PATCH/DELETE).
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)
