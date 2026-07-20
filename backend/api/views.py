import json
import os

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from billing.access_control import requires_tier

from .models import SymptomSubmission, User
from .sanitizers import sanitize_symptom_payload, sanitize_text
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    SymptomSubmissionCreateSerializer,
    SymptomSubmissionSerializer,
)
from .throttles import AnalyseRateThrottle, LoginRateThrottle

# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — public"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
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
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — public, rate-limited"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]


class RefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — public"""
    permission_classes = [permissions.AllowAny]


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

    def get_queryset(self):
        return SymptomSubmission.objects.filter(user=self.request.user)


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
            except Exception as e:
                import traceback
                traceback.print_exc()
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
        except Exception as e:
            import traceback
            traceback.print_exc()
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

    def get_queryset(self):
        if not self.request.user.is_chw:
            return SymptomSubmission.objects.none()
        return SymptomSubmission.objects.filter(user=self.request.user)


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
