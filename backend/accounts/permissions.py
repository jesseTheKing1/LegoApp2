from rest_framework.permissions import BasePermission

# this is a custom permissions class for DRF
# this checks if the user has permission
class IsVerifiedAndApproved(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated
            and getattr(u, "is_verified", True)
            and getattr(u, "is_approved", True)
        )