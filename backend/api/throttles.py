from rest_framework.throttling import ScopedRateThrottle


class LoginRateThrottle(ScopedRateThrottle):
    """5 attempts per 15 minutes per IP — brute-force protection on login."""
    scope = "login"


class AnalyseRateThrottle(ScopedRateThrottle):
    """10 requests per hour per authenticated user — cost control on Claude."""
    scope = "analyse"
