from rest_framework.throttling import ScopedRateThrottle

# NOTE: ScopedRateThrottle.allow_request() reads the scope off `view.throttle_scope`,
# not off a `scope` attribute on the throttle subclass — a `scope = "..."` set here would
# be silently ignored (found the hard way: LoginRateThrottle and AnalyseRateThrottle were
# both no-ops until the matching view also declared `throttle_scope = "..."`). Every view
# using one of these MUST set `throttle_scope` to the matching DEFAULT_THROTTLE_RATES key.


class LoginRateThrottle(ScopedRateThrottle):
    """5 attempts per 15 minutes per IP — brute-force protection on login. DRF's built-in
    rate-string parser only understands whole s/m/h/d units, not '15min' — the
    DEFAULT_THROTTLE_RATES value of "5/15min" was crashing with KeyError('1') the moment
    this throttle started actually running (see module note above: it never had before)."""

    def parse_rate(self, rate):
        num, period = rate.split("/")
        if period.endswith("min") and period[:-3].isdigit():
            return int(num), int(period[:-3]) * 60
        return super().parse_rate(rate)


class AnalyseRateThrottle(ScopedRateThrottle):
    """10 requests per hour per authenticated user — cost control on Claude."""


class PasswordResetRateThrottle(ScopedRateThrottle):
    """5 requests per hour per IP — the endpoint is unauthenticated and public, so
    without this it doubles as an email-bombing and account-enumeration-by-timing tool."""


class EmailVerificationRateThrottle(ScopedRateThrottle):
    """5 requests per hour per user — resend is authenticated (not enumerable), but still
    shouldn't allow flooding a real inbox."""


class RegisterRateThrottle(ScopedRateThrottle):
    """10 accounts per hour per IP. Registration had no throttle at all — open to mass
    account creation (spam, credential-stuffing setup, or just burning through the free
    triage tier). 10/hour is generous enough for a shared school/CHW-program computer
    signing up several students in a row, while still bounding a scripted attack."""


class CheckoutRateThrottle(ScopedRateThrottle):
    """10 requests per hour per user. CheckoutInitiateView and DoctorCheckoutInitiateView
    had no throttle of their own — each call creates a pending PaymentTransaction row and
    an outbound call to Paystack's API, so an authenticated user hammering this endpoint
    can pile up unresolved rows and burn Paystack API quota with no benefit to anyone.
    Server-derived pricing means there's no tampering vector, just this cost/DB-bloat
    one — 10/hour is well above any real user's checkout attempts."""
