import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Pricing catalog — admin-editable, source of truth for /pricing page prices
# ---------------------------------------------------------------------------


class SubscriptionTier(models.Model):
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

    BILLING_ONE_TIME = "one_time"
    BILLING_MONTHLY = "monthly"
    BILLING_CYCLE_CHOICES = [
        (BILLING_ONE_TIME, "One-time"),
        (BILLING_MONTHLY, "Monthly"),
    ]

    code = models.CharField(max_length=20, choices=TIER_CHOICES, unique=True)
    name = models.CharField(max_length=100)

    price_min_kes = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_max_kes = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_min_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_max_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default=BILLING_MONTHLY)

    # False only for under_18 — the flag that keeps it out of any self-serve signup path.
    self_serve = models.BooleanField(default=True)

    features = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price_min_usd"]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Institutional / NGO / CHW-program licensing
# ---------------------------------------------------------------------------


class InstitutionalLicense(models.Model):
    COHORT_PILOT = "pilot"
    COHORT_MID = "mid"
    COHORT_LARGE = "large"
    COHORT_NATIONAL = "national"
    COHORT_CHOICES = [
        (COHORT_PILOT, "Pilot/small (≤500)"),
        (COHORT_MID, "Mid-size (501-2,000)"),
        (COHORT_LARGE, "Large/multi-site (2,001-10,000)"),
        (COHORT_NATIONAL, "National/gov (10,000+)"),
    ]

    org_name = models.CharField(max_length=255)
    cohort_tier = models.CharField(max_length=20, choices=COHORT_CHOICES)
    cohort_size = models.PositiveIntegerField()

    annual_price_kes = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    per_beneficiary_rate_kes = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    contract_start = models.DateField()
    contract_end = models.DateField()
    co_branding = models.BooleanField(default=False)

    contact_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.org_name} ({self.get_cohort_tier_display()})"


class CHWCode(models.Model):
    code = models.CharField(max_length=12, unique=True)
    institutional_license = models.ForeignKey(
        InstitutionalLicense, on_delete=models.CASCADE, related_name="chw_codes"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_codes",
    )
    unlocks_under_18 = models.BooleanField(default=True)
    max_redemptions = models.PositiveIntegerField(null=True, blank=True)  # null = unlimited
    redemption_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @staticmethod
    def generate_code():
        return secrets.token_urlsafe(4)[:6].upper()

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        if self.max_redemptions is not None and self.redemption_count >= self.max_redemptions:
            return False
        return True

    def __str__(self):
        return self.code


class CHWCodeRedemption(models.Model):
    code = models.ForeignKey(CHWCode, on_delete=models.CASCADE, related_name="redemptions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="code_redemptions"
    )
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("code", "user")

    def __str__(self):
        return f"{self.user} redeemed {self.code}"


class InstitutionalLead(models.Model):
    """Captures 'Talk to us' contact-form submissions from the institutional pricing
    section — this tier is sales-led/negotiated, never self-serve checkout."""

    org_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    estimated_cohort_size = models.PositiveIntegerField(null=True, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.org_name} <{self.email}>"


# ---------------------------------------------------------------------------
# Doctor / clinic subscriptions — flat platform-access fee, never per-patient
# or referral-commission based (Kenyan fee-splitting regulatory constraint)
# ---------------------------------------------------------------------------


class DoctorSubscription(models.Model):
    TIER_SOLO = "solo"
    TIER_CLINIC = "clinic"
    TIER_HOSPITAL = "hospital"
    TIER_CHOICES = [
        (TIER_SOLO, "Solo practitioner"),
        (TIER_CLINIC, "Clinic (2-10)"),
        (TIER_HOSPITAL, "Hospital/network"),
    ]

    STATUS_PENDING = "pending"
    STATUS_ACTIVE = "active"
    STATUS_PAST_DUE = "past_due"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAST_DUE, "Past due"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_subscription"
    )
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)
    practitioner_count = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} — {self.get_tier_display()} ({self.status})"


# ---------------------------------------------------------------------------
# User-tier (Standard/Premium) paid subscriptions + payment audit trail
# ---------------------------------------------------------------------------


class Subscription(models.Model):
    PROVIDER_PAYSTACK = "paystack"
    PROVIDER_CHOICES = [(PROVIDER_PAYSTACK, "Paystack")]

    STATUS_ACTIVE = "active"
    STATUS_PAST_DUE = "past_due"
    STATUS_CANCELLED = "cancelled"
    STATUS_INCOMPLETE = "incomplete"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_PAST_DUE, "Past due"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_INCOMPLETE, "Incomplete"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription"
    )
    tier = models.ForeignKey(SubscriptionTier, on_delete=models.PROTECT, related_name="subscriptions")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default=PROVIDER_PAYSTACK)
    provider_customer_id = models.CharField(max_length=255, blank=True)
    provider_subscription_code = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_INCOMPLETE)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user} — {self.tier.code} ({self.status})"


class PaymentTransaction(models.Model):
    PURPOSE_SUBSCRIPTION = "subscription"
    PURPOSE_DOCTOR_SUBSCRIPTION = "doctor_subscription"
    PURPOSE_CHOICES = [
        (PURPOSE_SUBSCRIPTION, "User subscription"),
        (PURPOSE_DOCTOR_SUBSCRIPTION, "Doctor subscription"),
    ]

    STATUS_PENDING = "pending"
    STATUS_SUCCESS = "success"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCESS, "Success"),
        (STATUS_FAILED, "Failed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="payment_transactions",
    )
    provider = models.CharField(max_length=20, default="paystack")
    reference = models.CharField(max_length=255, unique=True)  # idempotency key
    amount_usd = models.DecimalField(max_digits=10, decimal_places=2)
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES, default=PURPOSE_SUBSCRIPTION)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.status}"


# ---------------------------------------------------------------------------
# Admin bypass audit trail
# ---------------------------------------------------------------------------


class AdminBypassAuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="admin_bypass_logs"
    )
    feature = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} — {self.feature} @ {self.created_at:%Y-%m-%d %H:%M}"
