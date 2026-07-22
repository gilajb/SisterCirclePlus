from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import SymptomSubmission, User


# ---------------------------------------------------------------------------
# Auth serializers
# ---------------------------------------------------------------------------


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
    )
    password2 = serializers.CharField(write_only=True, required=True)
    # Write-only, required — registration is rejected without it. `create()` stamps the
    # actual acceptance timestamp; this field itself is never persisted as-is.
    terms_accepted = serializers.BooleanField(write_only=True, required=True)
    # Only required when age < User.GUARDIAN_CONSENT_AGE_THRESHOLD — see validate().
    guardian_email = serializers.EmailField(required=False, allow_blank=True)
    # Bounded explicitly (the model field itself has no range constraint) — age now
    # drives the guardian-consent branch below, so a nonsense value like -5 or 999
    # shouldn't be able to feed into that logic silently.
    age = serializers.IntegerField(min_value=5, max_value=120)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "password2",
            "age",
            "location",
            "is_chw",
            "terms_accepted",
            "guardian_email",
        )
        extra_kwargs = {
            "email": {"required": True},
            # Required as of the guardian-consent gate — without a known age we can't
            # tell whether the under-16 consent flow applies.
            "age": {"required": True},
        }

    # `tier` is intentionally NOT in Meta.fields — it is never client-writable. Every new
    # user is created at the model default (`free`) and can only move to `under_18` via
    # CHW-code redemption or to `standard`/`premium` via a successful Paystack payment.

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the Terms of Service and Privacy Policy.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        if attrs["age"] < User.GUARDIAN_CONSENT_AGE_THRESHOLD and not attrs.get("guardian_email"):
            raise serializers.ValidationError(
                {"guardian_email": "A parent or guardian email is required for users under 16."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        validated_data.pop("terms_accepted")
        password = validated_data.pop("password")
        guardian_email = validated_data.pop("guardian_email", "")

        user = User(**validated_data)
        user.set_password(password)
        user.terms_accepted_at = timezone.now()

        if user.age < User.GUARDIAN_CONSENT_AGE_THRESHOLD:
            user.guardian_email = guardian_email
            user.guardian_consent_status = User.GUARDIAN_CONSENT_PENDING
            user.guardian_consent_requested_at = timezone.now()

        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs


class EmailVerificationConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    """For a logged-in user updating their own known password — distinct from
    PasswordResetConfirmSerializer, which is for someone locked out with no session at
    all and authenticates via an emailed token instead of a current password."""

    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs


class GuardianConsentConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    decision = serializers.ChoiceField(choices=["approve", "decline"])


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds basic user info to the login response, and bakes is_chw/tier into the JWT
    access token itself — the frontend's decodePayload() reads claims directly off the
    token, not the response body, so these must live on the token to be usable there.

    Login is by email, not username — the frontend never asks for a username at login.
    It used to fake it by deriving `email.split("@")[0]` client-side and sending that as
    `username`, which only worked because registration derived the exact same value the
    exact same way. Now that registration lets a user pick their own real username (which
    won't generally match their email's local part), that guess would just be wrong. This
    resolves the real username server-side from the submitted email instead."""

    email = serializers.EmailField(required=False, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # SimpleJWT's base serializer marks USERNAME_FIELD ("username") required by
        # default; validate() below fills it in from `email`, so relax that here.
        self.fields[self.username_field].required = False

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_chw"] = user.is_chw
        token["tier"] = user.tier
        return token

    def validate(self, attrs):
        email = attrs.pop("email", None)
        if email:
            user = User.objects.filter(email__iexact=email).first()
            attrs[self.username_field] = user.username if user else ""
        # Whatever combination of email/username was (or wasn't) submitted, the parent's
        # validate() indexes attrs[self.username_field] directly — leaving it entirely
        # absent (e.g. neither email nor username sent) would KeyError into a 500 instead
        # of a clean "invalid credentials" 401.
        attrs.setdefault(self.username_field, "")
        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "age": self.user.age,
            "location": self.user.location,
            "tier": self.user.tier,
            "is_chw": self.user.is_chw,
        }
        return data


# ---------------------------------------------------------------------------
# SymptomSubmission serializers
# ---------------------------------------------------------------------------


class SymptomSubmissionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SymptomSubmission
        exclude = ("user", "ai_result", "risk_tier", "created_at")

    def validate_pain_level(self, value):
        if not (0 <= value <= 10):
            raise serializers.ValidationError("Pain level must be between 0 and 10.")
        return value


class SymptomSubmissionSerializer(serializers.ModelSerializer):
    """Full read serializer — includes AI output and risk tier."""

    class Meta:
        model = SymptomSubmission
        fields = "__all__"
        read_only_fields = ("user", "ai_result", "risk_tier", "created_at")


class DoctorReferralSerializer(serializers.ModelSerializer):
    """Read-only serializer for the doctor referral inbox. Deliberately omits `user` —
    there is no patient-consent/assignment model yet, so a doctor sees the clinical
    picture (symptoms, AI triage) but not who submitted it or how to identify them.

    `claimed_by_me` is the only claim-related field exposed — the queryset behind this
    serializer only ever contains unclaimed cases or cases the requesting doctor claimed
    themselves (see DoctorReferralInboxView), so surfacing *which other* doctor claimed
    a case would leak information a doctor was never meant to see."""

    claimed_by_me = serializers.SerializerMethodField()

    class Meta:
        model = SymptomSubmission
        fields = (
            "id",
            "age",
            "location",
            "user_type",
            "cycle_length",
            "cycle_regularity",
            "bleeding_volume",
            "bleeding_days",
            "pain_level",
            "symptoms",
            "other_symptoms",
            "ai_result",
            "risk_tier",
            "created_at",
            "claimed_by_me",
        )
        read_only_fields = fields

    def get_claimed_by_me(self, obj):
        request = self.context.get("request")
        user_id = getattr(getattr(request, "user", None), "id", None)
        return obj.claimed_by_id is not None and obj.claimed_by_id == user_id
