import json
import logging
import os

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from billing.access_control import requires_tier
from billing.models import DoctorSubscription

from .models import SymptomSubmission, User
from .pagination import StandardResultsPagination
from .sanitizers import sanitize_symptom_payload, sanitize_text
from .serializers import (
    ChangePasswordSerializer,
    ContactMessageSerializer,
    CustomTokenObtainPairSerializer,
    DoctorReferralSerializer,
    EmailVerificationConfirmSerializer,
    GuardianConsentConfirmSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    SymptomSubmissionCreateSerializer,
    SymptomSubmissionSerializer,
)
from .throttles import (
    AnalyseRateThrottle,
    ContactRateThrottle,
    EmailVerificationRateThrottle,
    LoginRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)
from .tokens import email_verification_token, guardian_consent_token

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------


def _send_verification_email(user):
    """Shared by registration and the resend endpoint. fail_silently=True matches the
    password-reset send — a transient SMTP hiccup here shouldn't 500 the request that
    triggered it; the user can always hit resend again."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    verify_url = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject="Verify your SisterCircle+ email",
        message=(
            f"Welcome to SisterCircle+! Please verify your email address:\n\n"
            f"{verify_url}\n\n"
            f"If you didn't create this account, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def _send_guardian_consent_email(user):
    """Sent immediately at registration for any account under
    User.GUARDIAN_CONSENT_AGE_THRESHOLD. The guardian's decision doesn't gate the minor's
    access to triage (see the GUARDIAN_CONSENT_* field comments on User for the legal
    basis) — it only resolves the pending flag surfaced to the minor and, eventually,
    whether the account can keep operating past a documented review point."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = guardian_consent_token.make_token(user)
    base_url = f"{settings.FRONTEND_URL}/guardian-consent?uid={uid}&token={token}"
    send_mail(
        subject="Consent requested: SisterCircle+ account for a young person in your care",
        message=(
            f"A SisterCircle+ account was just created using this email address as the "
            f"parent/guardian contact for a user under {User.GUARDIAN_CONSENT_AGE_THRESHOLD}.\n\n"
            f"SisterCircle+ provides confidential menstrual and reproductive health triage "
            f"support. To review and respond to this request:\n\n"
            f"Approve: {base_url}&decision=approve\n"
            f"Decline: {base_url}&decision=decline\n\n"
            f"If you did not expect this email, you can decline or simply ignore it — no "
            f"further action is taken without your response."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.guardian_email],
        fail_silently=True,
    )


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — public, rate-limited"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterRateThrottle]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _send_verification_email(user)
        if user.guardian_consent_status == User.GUARDIAN_CONSENT_PENDING:
            _send_guardian_consent_email(user)
        # Mint via CustomTokenObtainPairSerializer.get_token so is_chw/tier land on the
        # access token's own claims, same as the login path — a raw RefreshToken.for_user()
        # here would silently omit them.
        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "age": user.age,
                    "location": user.location,
                    "tier": user.tier,
                    "is_chw": user.is_chw,
                    "email_verified": user.email_verified,
                    "guardian_consent_status": user.guardian_consent_status,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — public, rate-limited"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]
    throttle_scope = "login"  # ScopedRateThrottle reads this off the view, not the throttle class


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — public"""
    permission_classes = [permissions.AllowAny]


class PasswordResetRequestView(generics.GenericAPIView):
    """POST /api/auth/password-reset/request/ — public, rate-limited. Always returns the
    same response whether or not the email is registered, so this endpoint can't be used
    to enumerate accounts. The reset link embeds Django's own PasswordResetTokenGenerator
    output, which is time-limited and invalidated the moment the password actually
    changes — no separate token table to manage or clean up."""

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]
    throttle_scope = "password_reset"

    _GENERIC_RESPONSE = {"detail": "If an account exists for that email, a reset link has been sent."}

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = PasswordResetTokenGenerator().make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="Reset your SisterCircle+ password",
                message=(
                    f"Someone requested a password reset for this SisterCircle+ account.\n\n"
                    f"Reset your password: {reset_url}\n\n"
                    f"This link expires soon and can only be used once. If you didn't request "
                    f"this, you can safely ignore this email — your password won't change."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )

        return Response(self._GENERIC_RESPONSE, status=status.HTTP_200_OK)


class PasswordResetConfirmView(generics.GenericAPIView):
    """POST /api/auth/password-reset/confirm/ — public. Validates the uid/token pair from
    the emailed link and sets the new password."""

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None

        if user is None or not PasswordResetTokenGenerator().check_token(user, data["token"]):
            return Response(
                {"detail": "This reset link is invalid or has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Your password has been reset. You can now log in."}, status=status.HTTP_200_OK)


class EmailVerificationRequestView(generics.GenericAPIView):
    """POST /api/auth/verify-email/request/ — authenticated resend. Registration already
    sends one automatically; this covers it landing in spam, expiring, or the user just
    wanting a fresh link."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [EmailVerificationRateThrottle]
    throttle_scope = "email_verification"

    def post(self, request, *args, **kwargs):
        user = request.user
        if user.email_verified:
            return Response({"detail": "Your email is already verified."}, status=status.HTTP_200_OK)
        _send_verification_email(user)
        return Response({"detail": "Verification email sent."}, status=status.HTTP_200_OK)


class EmailVerificationConfirmView(generics.GenericAPIView):
    """POST /api/auth/verify-email/confirm/ — public (the emailed link may be opened in a
    browser session that was never logged in on this device)."""

    serializer_class = EmailVerificationConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None

        if user is None or not email_verification_token.check_token(user, data["token"]):
            return Response(
                {"detail": "This verification link is invalid or has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])
        return Response({"detail": "Your email has been verified."}, status=status.HTTP_200_OK)


class GuardianConsentConfirmView(generics.GenericAPIView):
    """POST /api/auth/guardian-consent/confirm/ — public. The guardian is never a
    SisterCircle+ account, so this can't be an authenticated endpoint; the signed
    uid/token pair in the emailed link is the only proof of identity, same pattern as
    password reset and email verification."""

    serializer_class = GuardianConsentConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None

        if user is None or not guardian_consent_token.check_token(user, data["token"]):
            return Response(
                {"detail": "This consent link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.guardian_consent_status != User.GUARDIAN_CONSENT_PENDING:
            return Response(
                {"detail": "This request has already been resolved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.guardian_consent_status = (
            User.GUARDIAN_CONSENT_APPROVED if data["decision"] == "approve" else User.GUARDIAN_CONSENT_DECLINED
        )
        user.guardian_consent_resolved_at = timezone.now()
        user.save(update_fields=["guardian_consent_status", "guardian_consent_resolved_at"])

        return Response(
            {"detail": "Thank you — your decision has been recorded.", "decision": data["decision"]},
            status=status.HTTP_200_OK,
        )


class MeView(generics.GenericAPIView):
    """GET /api/auth/me/ — authenticated. Source of truth for fields that can change
    without a new login/token refresh — e.g. email_verified flips soon after signup while
    the 24h access token is still baking in whatever was true at login time."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "age": user.age,
                "location": user.location,
                "tier": user.tier,
                "is_chw": user.is_chw,
                "email_verified": user.email_verified,
                "guardian_consent_status": user.guardian_consent_status,
            }
        )


class ChangePasswordView(generics.GenericAPIView):
    """POST /api/auth/change-password/ — authenticated. For a logged-in user who knows
    their current password and wants to update it, as distinct from the password-reset
    flow (PasswordResetRequestView/PasswordResetConfirmView), which exists for someone
    locked out with no session at all."""

    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        if not user.check_password(data["current_password"]):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Your password has been changed."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Symptom submission views
# ---------------------------------------------------------------------------


class SymptomSubmitView(generics.CreateAPIView):
    """POST /api/symptoms/submit/ — saves raw submission"""
    serializer_class = SymptomSubmissionCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "id": serializer.instance.id,
                "created_at": serializer.instance.created_at,
                "risk_tier": serializer.instance.risk_tier,
            },
            status=status.HTTP_201_CREATED,
        )


@requires_tier("standard", feature="triage_history")
class SymptomHistoryView(generics.ListAPIView):
    """GET /api/symptoms/history/ — own submissions only. Standard tier+ (or admin
    override) required for the unlimited history log."""
    serializer_class = SymptomSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return SymptomSubmission.objects.filter(user=self.request.user)


class SymptomLatestView(generics.GenericAPIView):
    """GET /api/symptoms/latest/ — authenticated, no tier gate. The Dashboard used to call
    the tier-gated SymptomHistoryView unconditionally for every user; a free-tier user's
    request 403'd, the frontend silently swallowed it, and the Dashboard rendered "No
    analyses yet" forever regardless of how many real submissions existed. This endpoint
    gives every user their single most recent submission and their true total count — a
    teaser, not the history feature itself — so the Dashboard can show something real and
    prompt an upgrade instead of lying about an empty account."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        submissions = SymptomSubmission.objects.filter(user=request.user)
        latest = submissions.first()  # model Meta.ordering = ["-created_at"]
        return Response(
            {
                "latest": SymptomSubmissionSerializer(latest).data if latest else None,
                "total_count": submissions.count(),
            }
        )


class SymptomDetailView(generics.RetrieveAPIView):
    """GET /api/symptoms/<id>/ — own submission only"""
    serializer_class = SymptomSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Row-level security: user can only fetch their own records
        return SymptomSubmission.objects.filter(user=self.request.user)


# ---------------------------------------------------------------------------
# AI Analysis view — sanitized, rate-limited, safe fallback
# ---------------------------------------------------------------------------

_FALLBACK_RESPONSE = {
    "risk_tier": "refer",
    "conditions": [
        {
            "name": "Unable to Complete Analysis",
            "confidence": 0,
            "description": "Our AI service is temporarily unavailable. Please consult a healthcare provider for a clinical assessment.",
            "tags": ["service-unavailable"],
        }
    ],
    "next_steps": [
        "Visit your nearest clinic or community health worker.",
        "Note your symptoms and when they started.",
        "Return to SisterCircle+ to try again shortly.",
    ],
    "team_note": "We're sorry for the inconvenience. Your health matters — please seek in-person care if your symptoms are severe.",
}

_SYSTEM_PROMPT = """You are a clinical menstrual health triage assistant for SisterCircle+, \
a digital health platform serving women and girls aged 10–24 in Sub-Saharan Africa.

CONTEXT:
- Users have NO access to lab tests, imaging (ultrasound/MRI), or specialist consultations at time of assessment.
- Triage based on self-reported data only. Be clinically rigorous but write in plain language.
- You are assessing menstrual/reproductive health conditions only.

TRIAGE TIERS:
- monitor: Symptoms manageable at home; track for 1–2 more cycles.
- refer: Symptoms warrant GP or clinic visit within 1–2 weeks.
- urgent: Symptoms require clinical attention within 24–48 hours.

OUTPUT FORMAT — respond ONLY with valid JSON. No markdown, no preamble, no explanation outside the JSON:
{
  "risk_tier": "monitor" | "refer" | "urgent",
  "conditions": [
    {
      "name": "<condition name>",
      "confidence": <integer 0-100>,
      "description": "<1-2 sentence clinical description>",
      "tags": ["<symptom tag>"]
    }
  ],
  "next_steps": ["<step 1>", "<step 2>", "<step 3>"],
  "team_note": "<1-2 sentence empathetic closing note>"
}

Return 1–3 conditions ordered by confidence descending.
If no specific condition can be identified, return one entry with name "General Cycle Irregularity"."""


class SymptomAnalyseView(generics.GenericAPIView):
    """POST /api/symptoms/analyse/ — sanitized, rate-limited, safe fallback"""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AnalyseRateThrottle]
    throttle_scope = "analyse"

    def post(self, request, *args, **kwargs):
        # 1. Sanitize all incoming data — never trust raw client input
        clean = sanitize_symptom_payload(request.data)

        if clean["age"] is None and request.data.get("age"):
            return Response(
                {"detail": "Age must be a number between 10 and 80."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Build the user message from sanitized data only
        symptoms_list = clean["symptoms"]
        user_message = (
            f"Age: {clean['age'] or 'Not provided'}\n"
            f"Location: {clean['location'] or 'Not provided'}\n"
            f"User type: {clean['user_type']}\n\n"
            f"CYCLE INFORMATION:\n"
            f"- Last period: {clean['last_period'] or 'Not provided'}\n"
            f"- Cycle length: {clean['cycle_length'] or 'Not provided'}\n"
            f"- Regularity: {clean['cycle_regularity'] or 'Not provided'}\n"
            f"- Bleeding volume: {clean['bleeding_volume'] or 'Not provided'}\n"
            f"- Bleeding duration: {clean['bleeding_days'] or 'Not provided'}\n\n"
            f"SYMPTOMS:\n"
            f"- Pain level: {clean['pain_level']}/10\n"
            f"- Selected symptoms: {', '.join(symptoms_list) if symptoms_list else 'None'}\n"
            f"- Additional notes: {clean['other_symptoms'] or 'None'}\n"
        )

        # 3. Call Claude — every error returns a safe fallback, never the raw exception
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            ai_result = _FALLBACK_RESPONSE.copy()
        else:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=api_key)
                message = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1000,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_message}],
                )
                raw = message.content[0].text.strip()
                # Strip markdown fences if present
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                ai_result = json.loads(raw.strip())
            except json.JSONDecodeError:
                ai_result = _FALLBACK_RESPONSE.copy()
            except Exception:
                logger.exception("Claude API call failed during symptom analysis")
                ai_result = _FALLBACK_RESPONSE.copy()

        # 4. Validate risk_tier from Claude response
        risk_tier = ai_result.get("risk_tier", "refer")
        if risk_tier not in ("monitor", "refer", "urgent"):
            risk_tier = "refer"

        # 5. Persist — do NOT log ai_result or symptom data to console
        try:
            submission = SymptomSubmission.objects.create(
                user=request.user,
                age=clean["age"],
                location=clean["location"],
                user_type=clean["user_type"],
                last_period=clean["last_period"] or None,
                cycle_length=clean["cycle_length"],
                cycle_regularity=clean["cycle_regularity"],
                bleeding_volume=clean["bleeding_volume"],
                bleeding_days=clean["bleeding_days"],
                pain_level=clean["pain_level"],
                symptoms=symptoms_list,
                other_symptoms=clean["other_symptoms"],
                ai_result=ai_result,
                risk_tier=risk_tier,
            )
        except Exception:
            logger.exception("Failed to persist SymptomSubmission")
            return Response(
                {"detail": "Could not save assessment. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"submission_id": submission.id, **ai_result},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Save / confirm view
# ---------------------------------------------------------------------------


class SymptomSaveView(generics.GenericAPIView):
    """POST /api/symptoms/save/ — confirms a submission belongs to the user"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        submission_id = request.data.get("submission_id")
        if submission_id:
            try:
                submission = SymptomSubmission.objects.get(
                    id=int(submission_id), user=request.user
                )
                return Response(
                    {"saved": True, "submission_id": submission.id},
                    status=status.HTTP_200_OK,
                )
            except (SymptomSubmission.DoesNotExist, ValueError, TypeError):
                pass
        return Response({"saved": True}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# CHW views
# ---------------------------------------------------------------------------


class CHWAssessmentsView(generics.ListAPIView):
    """GET /api/chw/assessments/ — CHW-only: all their logged submissions"""
    serializer_class = SymptomSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        if not self.request.user.is_chw:
            return SymptomSubmission.objects.none()
        return SymptomSubmission.objects.filter(user=self.request.user)


# ---------------------------------------------------------------------------
# Doctor views
# ---------------------------------------------------------------------------


class IsActiveDoctor(permissions.BasePermission):
    message = (
        "An active doctor/clinic subscription and a verified email are required "
        "to view the referral inbox."
    )

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, "is_admin_override", False):
            return True
        if not user.email_verified:
            return False
        subscription = getattr(user, "doctor_subscription", None)
        return subscription is not None and subscription.status == DoctorSubscription.STATUS_ACTIVE


class DoctorReferralInboxView(generics.ListAPIView):
    """GET /api/doctor/referrals/ — active-doctor-subscription-only. A shared pool of
    'refer'/'urgent' triage cases: any case nobody has claimed yet, plus any case *this*
    doctor has claimed (so their own in-progress cases stay visible). A case claimed by a
    different doctor, or already resolved, drops out of view — see ClaimReferralView for
    how claiming is made race-safe."""

    serializer_class = DoctorReferralSerializer
    permission_classes = [permissions.IsAuthenticated, IsActiveDoctor]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        return SymptomSubmission.objects.filter(
            risk_tier__in=["refer", "urgent"], resolved=False
        ).filter(Q(claimed_by__isnull=True) | Q(claimed_by=self.request.user))


class ClaimReferralView(APIView):
    """POST /api/doctor/referrals/<id>/claim/ — claims an unclaimed case. The update is a
    single atomic UPDATE ... WHERE claimed_by IS NULL, so if two doctors click claim on
    the same case at once, exactly one row-count=1 succeeds and the other gets 409 —
    there's no read-then-write window for both to win."""

    permission_classes = [permissions.IsAuthenticated, IsActiveDoctor]

    def post(self, request, pk, *args, **kwargs):
        get_object_or_404(SymptomSubmission, pk=pk, risk_tier__in=["refer", "urgent"])
        updated = SymptomSubmission.objects.filter(
            pk=pk, resolved=False, claimed_by__isnull=True
        ).update(claimed_by=request.user, claimed_at=timezone.now())
        if not updated:
            return Response(
                {"detail": "This case has already been claimed or resolved by another provider."},
                status=status.HTTP_409_CONFLICT,
            )
        submission = SymptomSubmission.objects.get(pk=pk)
        return Response(DoctorReferralSerializer(submission, context={"request": request}).data)


class ReleaseReferralView(APIView):
    """POST /api/doctor/referrals/<id>/release/ — puts a case a doctor claimed back into
    the shared pool, e.g. if they can no longer follow up on it."""

    permission_classes = [permissions.IsAuthenticated, IsActiveDoctor]

    def post(self, request, pk, *args, **kwargs):
        get_object_or_404(SymptomSubmission, pk=pk, risk_tier__in=["refer", "urgent"])
        updated = SymptomSubmission.objects.filter(pk=pk, claimed_by=request.user).update(
            claimed_by=None, claimed_at=None
        )
        if not updated:
            return Response({"detail": "You haven't claimed this case."}, status=status.HTTP_400_BAD_REQUEST)
        submission = SymptomSubmission.objects.get(pk=pk)
        return Response(DoctorReferralSerializer(submission, context={"request": request}).data)


class ResolveReferralView(APIView):
    """POST /api/doctor/referrals/<id>/resolve/ — marks a case as handled. Only the doctor
    who claimed it can resolve it, and a resolved case drops out of the inbox for
    everyone (see DoctorReferralInboxView's resolved=False filter)."""

    permission_classes = [permissions.IsAuthenticated, IsActiveDoctor]

    def post(self, request, pk, *args, **kwargs):
        get_object_or_404(SymptomSubmission, pk=pk, risk_tier__in=["refer", "urgent"])
        updated = SymptomSubmission.objects.filter(pk=pk, claimed_by=request.user).update(
            resolved=True, resolved_at=timezone.now()
        )
        if not updated:
            return Response(
                {"detail": "You must claim this case before you can resolve it."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Case marked as resolved."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Account deletion
# ---------------------------------------------------------------------------


class UserDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/user/delete/
    Permanently removes the authenticated user and ALL their data.
    Cascades to SymptomSubmission via FK on_delete=CASCADE.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        user = request.user
        # Hard delete — no soft-delete, GDPR-compliant permanent removal
        user.delete()
        return Response(
            {"detail": "Your account and all associated data have been permanently deleted."},
            status=status.HTTP_200_OK,
        )


class UserDataExportView(generics.GenericAPIView):
    """GET /api/user/export/ — authenticated. Self-serve "right to access": everything
    UserDeleteView would otherwise permanently destroy, so a user can get a copy without
    emailing privacy@ and waiting on the manual process SECURITY.md describes as the
    fallback. Deliberately unpaginated — a personal export needs to be complete, not
    bounded, and is inherently scoped to one person's own data rather than an
    ever-growing shared pool."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        submissions = SymptomSubmission.objects.filter(user=user)
        return Response(
            {
                "exported_at": timezone.now(),
                "account": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "age": user.age,
                    "location": user.location,
                    "tier": user.tier,
                    "is_chw": user.is_chw,
                    "email_verified": user.email_verified,
                    "date_joined": user.date_joined,
                    "terms_accepted_at": user.terms_accepted_at,
                    "guardian_email": user.guardian_email,
                    "guardian_consent_status": user.guardian_consent_status,
                },
                "symptom_submissions": SymptomSubmissionSerializer(submissions, many=True).data,
            }
        )


# ---------------------------------------------------------------------------
# Contact form
# ---------------------------------------------------------------------------


class ContactMessageCreateView(generics.CreateAPIView):
    """POST /api/contact/ — public, rate-limited. Persists the message (so nothing is lost
    if the notification email bounces or SMTP isn't configured yet) and best-effort emails
    CONTACT_EMAIL — fail_silently=True matches every other transactional send in this app;
    a submitter shouldn't get a 500 just because the notification hop failed."""

    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ContactRateThrottle]
    throttle_scope = "contact"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact_message = serializer.save()

        send_mail(
            subject=f"[SisterCircle+ Contact] {contact_message.get_topic_display()} — {contact_message.name}",
            message=(
                f"From: {contact_message.name} <{contact_message.email}>\n"
                f"Topic: {contact_message.get_topic_display()}\n\n"
                f"{contact_message.message}"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.CONTACT_EMAIL],
            fail_silently=True,
        )

        return Response(
            {"detail": "Thanks for reaching out — we'll get back to you soon."},
            status=status.HTTP_201_CREATED,
        )
