from django.contrib.auth.password_validation import validate_password
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
        )
        extra_kwargs = {
            "email": {"required": True},
        }

    # `tier` is intentionally NOT in Meta.fields — it is never client-writable. Every new
    # user is created at the model default (`free`) and can only move to `under_18` via
    # CHW-code redemption or to `standard`/`premium` via a successful Paystack payment.

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds basic user info to the login response, and bakes is_chw/tier into the JWT
    access token itself — the frontend's decodePayload() reads claims directly off the
    token, not the response body, so these must live on the token to be usable there."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_chw"] = user.is_chw
        token["tier"] = user.tier
        return token

    def validate(self, attrs):
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
