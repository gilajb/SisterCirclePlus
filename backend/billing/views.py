from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.throttles import CheckoutRateThrottle

from .access_control import requires_tier
from .models import (
    CHWCode,
    CHWCodeRedemption,
    DoctorSubscription,
    SubscriptionTier,
)
from .payments.paystack import PaystackProvider
from .serializers import (
    DoctorSubscriptionSerializer,
    InstitutionalLeadSerializer,
    SubscriptionTierSerializer,
)

# ---------------------------------------------------------------------------
# Public pricing catalog
# ---------------------------------------------------------------------------


class PricingView(generics.ListAPIView):
    """GET /api/billing/pricing/ — public, powers the /pricing page's user-tier cards."""

    serializer_class = SubscriptionTierSerializer
    permission_classes = [permissions.AllowAny]
    queryset = SubscriptionTier.objects.filter(is_active=True)


# ---------------------------------------------------------------------------
# Institutional licensing — sales-led, no self-serve checkout
# ---------------------------------------------------------------------------


class InstitutionalLeadView(generics.CreateAPIView):
    """POST /api/billing/institutional-lead/ — public 'Talk to us' contact form."""

    serializer_class = InstitutionalLeadSerializer
    permission_classes = [permissions.AllowAny]


# ---------------------------------------------------------------------------
# CHW code generation + redemption — the ONLY path to the under_18 tier
# ---------------------------------------------------------------------------


class CHWGenerateCodeView(generics.GenericAPIView):
    """POST /api/chw/generate-code/ — CHW-only. Persists a real, redeemable CHWCode tied
    to the CHW's institutional license (rewired from the old throwaway-string version)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        if not user.is_chw:
            return Response(
                {"detail": "Only Community Health Workers can generate access codes."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.email_verified:
            return Response(
                {"detail": "Please verify your email before generating access codes."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.institutional_license_id is None:
            return Response(
                {"detail": "Your account is not linked to an institutional license yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for _ in range(5):  # retry on the astronomically unlikely code collision
            code_value = CHWCode.generate_code()
            try:
                code = CHWCode.objects.create(
                    code=code_value,
                    institutional_license=user.institutional_license,
                    created_by=user,
                    expires_at=timezone.now() + timedelta(hours=24),
                )
                break
            except IntegrityError:
                continue
        else:
            return Response(
                {"detail": "Could not generate a unique code, please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"code": code.code}, status=status.HTTP_200_OK)


class CHWCodeRedeemView(generics.GenericAPIView):
    """POST /api/billing/redeem-code/ — authenticated. The only endpoint that can move a
    user's tier to under_18."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        raw_code = str(request.data.get("code", "")).strip().upper()
        if not raw_code:
            return Response({"detail": "A code is required."}, status=status.HTTP_400_BAD_REQUEST)

        code = CHWCode.objects.filter(code=raw_code).first()
        if code is None or not code.is_valid():
            return Response(
                {"detail": "This code is invalid, expired, or has been fully redeemed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            CHWCodeRedemption.objects.create(code=code, user=request.user)
        except IntegrityError:
            return Response(
                {"detail": "You have already redeemed this code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code.redemption_count += 1
        code.save(update_fields=["redemption_count"])

        user = request.user
        if code.unlocks_under_18:
            user.tier = user.TIER_UNDER_18
        user.institutional_license = code.institutional_license
        user.save(update_fields=["tier", "institutional_license"])

        return Response(
            {"tier": user.tier, "institutional_license": code.institutional_license_id},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Paystack checkout + webhook
# ---------------------------------------------------------------------------

_SELF_SERVE_USER_TIERS = {SubscriptionTier.TIER_STANDARD, SubscriptionTier.TIER_PREMIUM}


class CheckoutInitiateView(generics.GenericAPIView):
    """POST /api/billing/checkout/ — authenticated. Only standard/premium are ever
    purchasable here; under_18 and free can never reach a checkout session."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [CheckoutRateThrottle]
    throttle_scope = "checkout"

    def post(self, request, *args, **kwargs):
        tier_code = request.data.get("tier_code")
        callback_url = request.data.get("callback_url", "")

        if tier_code not in _SELF_SERVE_USER_TIERS:
            return Response(
                {"detail": "Only standard/premium tiers can be purchased through checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = PaystackProvider().initiate_checkout(
                user=request.user, tier_code=tier_code, callback_url=callback_url
            )
        except SubscriptionTier.DoesNotExist:
            return Response({"detail": "Unknown tier."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class DoctorCheckoutInitiateView(generics.GenericAPIView):
    """POST /api/billing/doctor-checkout/ — authenticated. Solo/clinic tiers are
    self-serve and go straight to Paystack, same as user checkout. Hospital/network is
    negotiable and sales-led — never reachable through this endpoint; those inquiries go
    through the institutional 'Talk to us' lead form instead."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [CheckoutRateThrottle]
    throttle_scope = "checkout"

    def post(self, request, *args, **kwargs):
        tier = request.data.get("tier")
        callback_url = request.data.get("callback_url", "")

        if tier == DoctorSubscription.TIER_HOSPITAL:
            return Response(
                {"detail": "Hospital/network pricing is negotiated — please use the contact form."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if tier not in (DoctorSubscription.TIER_SOLO, DoctorSubscription.TIER_CLINIC):
            return Response({"detail": "Unknown doctor tier."}, status=status.HTTP_400_BAD_REQUEST)

        practitioner_count = request.data.get("practitioner_count")
        try:
            result = PaystackProvider().initiate_doctor_checkout(
                user=request.user,
                doctor_tier=tier,
                practitioner_count=practitioner_count,
                callback_url=callback_url,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class DoctorSubscriptionMeView(APIView):
    """GET /api/billing/doctor-subscription/ — authenticated. Lets the frontend gate
    the Doctor Portal on real subscription status rather than guessing from a role flag;
    a user with no DoctorSubscription row at all (never checked out) gets a clean
    has_subscription: false rather than a 404."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        subscription = getattr(request.user, "doctor_subscription", None)
        if subscription is None:
            return Response({"has_subscription": False}, status=status.HTTP_200_OK)
        return Response(
            {"has_subscription": True, **DoctorSubscriptionSerializer(subscription).data},
            status=status.HTTP_200_OK,
        )


class PaystackWebhookView(APIView):
    """POST /api/billing/webhooks/paystack/ — public endpoint (Paystack can't send a JWT),
    but the very first thing it does is verify the request actually came from Paystack."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        provider = PaystackProvider()
        if not provider.verify_webhook_signature(request):
            return Response({"detail": "Invalid signature."}, status=status.HTTP_401_UNAUTHORIZED)

        provider.handle_webhook_event(request.data)
        return Response(status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Feature-gate stubs — prove server-side enforcement for features that live
# elsewhere / haven't been built yet. NOT real functionality; see plan notes.
# ---------------------------------------------------------------------------


@requires_tier("standard", feature="cycle_tracking")
class CycleTrackingView(APIView):
    def get(self, request, *args, **kwargs):
        return Response({"detail": "Cycle tracking access granted."}, status=status.HTTP_200_OK)


@requires_tier("premium", feature="doctor_callback")
class DoctorCallbackView(APIView):
    def post(self, request, *args, **kwargs):
        return Response({"detail": "Doctor callback request accepted."}, status=status.HTTP_200_OK)


@requires_tier("premium", feature="multi_profile")
class MultiProfileView(APIView):
    def get(self, request, *args, **kwargs):
        return Response({"detail": "Multi-profile access granted."}, status=status.HTTP_200_OK)
