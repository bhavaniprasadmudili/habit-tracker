from rest_framework.permissions import BasePermission, SAFE_METHODS

from .constants import (
    ROLE_ADMIN,
    ROLE_FINANCE,
    ROLE_MODERATOR,
    ROLE_QUIZ_MANAGER,
)


def _role(obj) -> str:
    return getattr(obj, "role", "USER")


class IsVerifiedUser(BasePermission):
    """Allows only verified (otp_verified) and not banned users."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, "is_banned", False):
            return False
        return bool(getattr(request.user, "is_verified", False))


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _role(request.user) == ROLE_ADMIN)


class IsQuizManager(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _role(request.user) in (ROLE_QUIZ_MANAGER, ROLE_ADMIN)
        )


class IsFinance(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _role(request.user) in (ROLE_FINANCE, ROLE_ADMIN)
        )


class IsModerator(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _role(request.user) in (ROLE_MODERATOR, ROLE_ADMIN)
        )

