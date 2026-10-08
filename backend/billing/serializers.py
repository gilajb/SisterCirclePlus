from rest_framework import serializers

from .models import CHWCode, DoctorSubscription, InstitutionalLead, SubscriptionTier


class SubscriptionTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionTier
        fields = (
            "code",
            "name",
            "price_min_kes",
            "price_max_kes",
            "price_min_usd",
            "price_max_usd",
            "billing_cycle",
            "self_serve",
            "features",
            "description",
        )


class InstitutionalLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionalLead
        fields = ("org_name", "contact_name", "email", "phone", "estimated_cohort_size", "message")


class CHWCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CHWCode
        fields = ("code", "unlocks_under_18", "max_redemptions", "expires_at", "created_at")
        read_only_fields = fields


class DoctorSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorSubscription
        fields = ("tier", "status", "practitioner_count", "price_usd", "current_period_end", "created_at")
        read_only_fields = fields
