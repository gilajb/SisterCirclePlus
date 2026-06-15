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
            "is_free_tier",
        )
        extra_kwargs = {
            "email": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        
        # Auto-set is_free_tier based on age — don't trust frontend
        age = validated_data.get("age")
        if age is not None and age <= 25:
            validated_data["is_free_tier"] = True
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds basic user info to the login response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "age": self.user.age,
            "location": self.user.location,
            "is_free_tier": self.user.is_free_tier,
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
