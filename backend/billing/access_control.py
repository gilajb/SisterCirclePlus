from rest_framework.permissions import BasePermission

from .models import AdminBypassAuditLog

# Relative standing of each tier for feature-gating comparisons. under_18 ranks with
# standard — it's Standard-level access unlocked at a discounted, institutionally-gated
# price, not a separate feature tier (see plan notes).
TIER_RANK = {
    "free": 0,
    "under_18": 1,
    "standard": 1,
    "premium": 2,
}


def requires_tier(min_tier, feature=None):
    """Class decorator for DRF views. Gates access to users whose tier ranks at or above
    `min_tier`. An account with `is_admin_override=True` is checked FIRST and short-circuits
    to granted, before any subscription/tier logic runs — every such grant is logged to
    AdminBypassAuditLog for later audit.
    """

    def decorator(view_cls):
        gate_name = feature or view_cls.__name__

        class _TierPermission(BasePermission):
            message = f"A {min_tier}-tier subscription (or higher) is required for this feature."

            def has_permission(self, request, view):
                user = request.user
                if not user or not user.is_authenticated:
                    return False

                if user.is_admin_override:
                    AdminBypassAuditLog.objects.create(user=user, feature=gate_name)
                    return True

                return TIER_RANK.get(user.tier, 0) >= TIER_RANK.get(min_tier, 0)

        view_cls.permission_classes = list(getattr(view_cls, "permission_classes", [])) + [
            _TierPermission
        ]
        return view_cls

    return decorator
