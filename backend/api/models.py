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

    # Set once the user clicks the link from their verification email. Deliberately does
    # NOT block core triage access (login, symptom check) — the whole point of the free
    # tier is removing barriers for vulnerable users. It DOES gate the two actions that
    # carry real-world trust: generating CHW access codes and viewing the doctor referral
    # inbox (see CHWGenerateCodeView / IsActiveDoctor).
    email_verified = models.BooleanField(default=False)

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

    # Set at registration once the user checks "I agree to the Terms of Service and
    # Privacy Policy" — RegisterSerializer rejects registration without it. Timestamped
    # (not just a boolean) so we can prove *when* consent was given if the documents
    # change later.
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    # Guardian consent age threshold — see the field block below for rationale.
    GUARDIAN_CONSENT_AGE_THRESHOLD = 16

    # Guardian consent — GDPR Art. 8 uses 16 as its default age-of-consent threshold,
    # which is also stricter than COPPA (13) and Kenya/Uganda's DPA provisions, so it's
    # used as the single global line rather than maintaining separate per-region ages.
    # Under-16 registration requires a guardian_email; the account gets immediate full
    # triage access regardless (GDPR Art. 6(1)(d) "vital interests" — the same basis
    # already used to justify emergency triage independent of consent), but is flagged
    # pending until a guardian responds to the emailed consent request.
    GUARDIAN_CONSENT_NOT_REQUIRED = "not_required"
    GUARDIAN_CONSENT_PENDING = "pending"
    GUARDIAN_CONSENT_APPROVED = "approved"
    GUARDIAN_CONSENT_DECLINED = "declined"
    GUARDIAN_CONSENT_CHOICES = [
        (GUARDIAN_CONSENT_NOT_REQUIRED, "Not required (16+)"),
        (GUARDIAN_CONSENT_PENDING, "Pending"),
        (GUARDIAN_CONSENT_APPROVED, "Approved"),
        (GUARDIAN_CONSENT_DECLINED, "Declined"),
    ]
    guardian_email = models.EmailField(blank=True)
    guardian_consent_status = models.CharField(
        max_length=20, choices=GUARDIAN_CONSENT_CHOICES, default=GUARDIAN_CONSENT_NOT_REQUIRED
    )
    guardian_consent_requested_at = models.DateTimeField(null=True, blank=True)
    guardian_consent_resolved_at = models.DateTimeField(null=True, blank=True)

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

    # Doctor referral-inbox claim/resolve — keeps a 'refer'/'urgent' case from being
    # worked simultaneously (or silently dropped) by two different subscribed doctors
    # who have no other way to coordinate. Claiming is a single atomic UPDATE (see
    # ClaimReferralView) so two concurrent claims can't both succeed.
    claimed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="claimed_referrals"
    )
    claimed_at = models.DateTimeField(null=True, blank=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        # `-id` is a tiebreaker, not decoration: `created_at` has no guaranteed
        # resolution finer than the DB's clock, so two submissions created in quick
        # succession (a tight test loop, or just a fast real request) can tie exactly —
        # without a secondary key, "newest first" ordering becomes non-deterministic
        # exactly when SymptomLatestView's "give me the single most recent submission"
        # needs it to not be. `id` is a monotonically increasing PK, so it reflects true
        # insertion order even when timestamps can't.
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.user.username} — {self.risk_tier} — {self.created_at:%Y-%m-%d}"