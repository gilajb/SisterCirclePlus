from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    TIER_FREE = "free"
    TIER_UNDER_18 = "under_18"
    TIER_STANDARD = "standard"
    TIER_PREMIUM = "premium"
    TIER_CHOICES = [
        (TIER_FREE, "Free"),
        (TIER_UNDER_18, "Under-18 (discounted)"),
        (TIER_STANDARD, "Standard"),
        (TIER_PREMIUM, "Premium"),
    ]

    age = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_chw = models.BooleanField(default=False)

    # Pricing tier — server-derived only. Never writable from RegisterSerializer or any
    # other public-facing serializer. Only two paths may change it: successful Paystack
    # payment (-> standard/premium) or CHW/institutional code redemption (-> under_18).
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, default=TIER_FREE)

    # Nullable: set for CHW users tied to an institution's youth program (who generate
    # codes on its behalf) and for under_18 users who redeemed one of those codes.
    institutional_license = models.ForeignKey(
        "billing.InstitutionalLicense",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
    )

    # Privileged bypass flag — grants full Premium-equivalent access with no active
    # subscription and no payment provider call. Settable only via Django admin or the
    # seed_admin management command; deliberately absent from every public serializer.
    is_admin_override = models.BooleanField(default=False)

    # Placeholder for the "verified low-income-settlement" free-tier exemption. Not yet
    # enforced anywhere — the verification process itself hasn't been defined — but the
    # field exists so that flow can be wired in without another schema change.
    is_settlement_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username


class SymptomSubmission(models.Model):
    RISK_TIER_CHOICES = [
        ("monitor", "Monitor"),
        ("refer", "Refer"),
        ("urgent", "Urgent"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="symptom_submissions"
    )

    age = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    user_type = models.CharField(max_length=100, blank=True)

    last_period = models.DateField(null=True, blank=True)
    cycle_length = models.CharField(max_length=50, blank=True)
    cycle_regularity = models.CharField(max_length=50, blank=True)

    bleeding_volume = models.CharField(max_length=50, blank=True)
    bleeding_days = models.CharField(max_length=50, blank=True)

    pain_level = models.IntegerField(default=0)

    symptoms = models.JSONField(default=list, blank=True)
    other_symptoms = models.TextField(blank=True)

    ai_result = models.JSONField(default=dict, blank=True)
    risk_tier = models.CharField(
        max_length=10, choices=RISK_TIER_CHOICES, default="monitor"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} — {self.risk_tier} — {self.created_at:%Y-%m-%d}"