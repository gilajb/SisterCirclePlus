import hashlib
import hmac
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import SymptomSubmission, User

from .models import (
    AdminBypassAuditLog,
    CHWCode,
    CHWCodeRedemption,
    DoctorSubscription,
    InstitutionalLicense,
    PaymentTransaction,
    Subscription,
    SubscriptionTier,
)
from .payments.paystack import PaystackProvider


class BaseBillingTestCase(APITestCase):
    def setUp(self):
        # Throttle counters live in the cache backend and would otherwise leak between
        # test methods within the same run.
        cache.clear()


def make_license(**overrides):
    defaults = dict(
        org_name="Test NGO",
        cohort_tier=InstitutionalLicense.COHORT_PILOT,
        cohort_size=100,
        contract_start=timezone.now().date(),
        contract_end=timezone.now().date() + timedelta(days=365),
    )
    defaults.update(overrides)
    return InstitutionalLicense.objects.create(**defaults)


# ---------------------------------------------------------------------------
# Under-18 unreachable via any self-serve/public endpoint
# ---------------------------------------------------------------------------


class Under18UnreachableTests(BaseBillingTestCase):
    def test_register_ignores_client_supplied_tier(self):
        url = reverse("auth-register")
        payload = {
            "username": "girl17",
            "email": "girl17@example.com",
            "password": "S0meStrongPass!23",
            "password2": "S0meStrongPass!23",
            "age": 17,
            "terms_accepted": True,
            "tier": "under_18",  # not a real serializer field — must be silently ignored
            "is_admin_override": True,  # also must be silently ignored
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        user = User.objects.get(username="girl17")
        self.assertEqual(user.tier, User.TIER_FREE)
        self.assertFalse(user.is_admin_override)

    def test_only_code_redemption_can_set_under_18(self):
        license_ = make_license()
        code = CHWCode.objects.create(code="ABC123", institutional_license=license_)
        user = User.objects.create_user(username="teen", email="teen@example.com", password="pw12345!")

        self.client.force_authenticate(user)
        response = self.client.post(
            reverse("billing-redeem-code"), {"code": "ABC123"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        user.refresh_from_db()
        self.assertEqual(user.tier, User.TIER_UNDER_18)
        self.assertEqual(user.institutional_license_id, license_.id)


# ---------------------------------------------------------------------------
# CHW code validity
# ---------------------------------------------------------------------------


class CHWCodeRedemptionTests(BaseBillingTestCase):
    def setUp(self):
        super().setUp()
        self.license = make_license()
        self.user = User.objects.create_user(username="redeemer", email="r@example.com", password="pw12345!")
        self.client.force_authenticate(self.user)

    def _redeem(self, code):
        return self.client.post(reverse("billing-redeem-code"), {"code": code}, format="json")

    def test_expired_code_rejected(self):
        code = CHWCode.objects.create(
            code="EXPIRD",
            institutional_license=self.license,
            expires_at=timezone.now() - timedelta(days=1),
        )
        response = self._redeem(code.code)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.tier, User.TIER_FREE)

    def test_exhausted_code_rejected(self):
        code = CHWCode.objects.create(
            code="MAXED1",
            institutional_license=self.license,
            max_redemptions=1,
            redemption_count=1,
        )
        response = self._redeem(code.code)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_code_rejected(self):
        code = CHWCode.objects.create(code="OFFCOD", institutional_license=self.license, is_active=False)
        response = self._redeem(code.code)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_code_rejected(self):
        response = self._redeem("NOPE99")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_redemption_rejected(self):
        code = CHWCode.objects.create(code="ONCEOK", institutional_license=self.license)
        first = self._redeem(code.code)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        second = self._redeem(code.code)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# CHW code generation
# ---------------------------------------------------------------------------


class CHWGenerateCodeViewTests(BaseBillingTestCase):
    def setUp(self):
        super().setUp()
        self.license = make_license()
        self.chw = User.objects.create_user(
            username="chw1",
            email="chw1@example.com",
            password="pw12345!",
            is_chw=True,
            email_verified=True,
            institutional_license=self.license,
        )
        self.client.force_authenticate(self.chw)

    def test_generated_code_valid_now_but_expires_after_24_hours(self):
        response = self.client.post(reverse("chw-generate-code"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        code = CHWCode.objects.get(code=response.data["code"])
        self.assertIsNotNone(code.expires_at)
        self.assertTrue(code.is_valid())

        future = timezone.now() + timedelta(hours=24, seconds=1)
        with patch("billing.models.timezone.now", return_value=future):
            self.assertFalse(code.is_valid())

    def test_non_chw_cannot_generate_code(self):
        user = User.objects.create_user(username="notchw", email="nc@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.post(reverse("chw-generate-code"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_chw_without_institutional_license_blocked(self):
        chw2 = User.objects.create_user(
            username="chw2", email="chw2@example.com", password="pw12345!",
            is_chw=True, email_verified=True,
        )
        self.client.force_authenticate(chw2)
        response = self.client.post(reverse("chw-generate-code"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unverified_chw_blocked(self):
        chw3 = User.objects.create_user(
            username="chw3", email="chw3@example.com", password="pw12345!",
            is_chw=True, institutional_license=self.license,
        )
        self.client.force_authenticate(chw3)
        response = self.client.post(reverse("chw-generate-code"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Doctor subscription "me" endpoint
# ---------------------------------------------------------------------------


class DoctorSubscriptionMeViewTests(BaseBillingTestCase):
    def test_no_subscription_returns_has_subscription_false(self):
        user = User.objects.create_user(username="nodoc", email="nodoc@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.get(reverse("billing-doctor-subscription"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"has_subscription": False})

    def test_active_subscription_returns_its_details(self):
        user = User.objects.create_user(username="hasdoc", email="hasdoc@example.com", password="pw12345!")
        DoctorSubscription.objects.create(
            user=user, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_ACTIVE
        )
        self.client.force_authenticate(user)
        response = self.client.get(reverse("billing-doctor-subscription"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_subscription"])
        self.assertEqual(response.data["tier"], "solo")
        self.assertEqual(response.data["status"], "active")


# ---------------------------------------------------------------------------
# Doctor referral inbox
# ---------------------------------------------------------------------------


class DoctorReferralInboxTests(BaseBillingTestCase):
    def setUp(self):
        super().setUp()
        patient = User.objects.create_user(
            username="patient1", email="patient1@example.com", password="pw12345!"
        )
        SymptomSubmission.objects.create(user=patient, risk_tier="urgent", symptoms=["severe pain"])
        SymptomSubmission.objects.create(user=patient, risk_tier="refer", symptoms=["irregular bleeding"])
        SymptomSubmission.objects.create(user=patient, risk_tier="monitor", symptoms=["mild cramps"])

    def test_unauthenticated_blocked(self):
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_non_doctor_blocked(self):
        user = User.objects.create_user(username="rando", email="rando@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_with_pending_subscription_blocked(self):
        doc = User.objects.create_user(
            username="pendingdoc", email="pd@example.com", password="pw12345!", email_verified=True
        )
        DoctorSubscription.objects.create(
            user=doc, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_PENDING
        )
        self.client.force_authenticate(doc)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unverified_doctor_with_active_subscription_blocked(self):
        doc = User.objects.create_user(username="unverifieddoc", email="uvd@example.com", password="pw12345!")
        DoctorSubscription.objects.create(
            user=doc, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_ACTIVE
        )
        self.client.force_authenticate(doc)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_active_doctor_sees_only_refer_and_urgent_cases(self):
        doc = User.objects.create_user(
            username="activedoc", email="ad@example.com", password="pw12345!", email_verified=True
        )
        DoctorSubscription.objects.create(
            user=doc, tier=DoctorSubscription.TIER_CLINIC, status=DoctorSubscription.STATUS_ACTIVE
        )
        self.client.force_authenticate(doc)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        tiers = {row["risk_tier"] for row in response.data["results"]}
        self.assertEqual(tiers, {"urgent", "refer"})

    def test_referral_inbox_never_exposes_patient_identity(self):
        doc = User.objects.create_user(
            username="privacydoc", email="pdoc@example.com", password="pw12345!", email_verified=True
        )
        DoctorSubscription.objects.create(
            user=doc, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_ACTIVE
        )
        self.client.force_authenticate(doc)
        response = self.client.get(reverse("doctor-referrals"))
        for row in response.data["results"]:
            self.assertNotIn("user", row)

    def test_admin_override_can_view_inbox_without_subscription(self):
        admin = User.objects.create_user(
            username="adminview", email="av@example.com", password="pw12345!", is_admin_override=True
        )
        self.client.force_authenticate(admin)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Doctor referral claim / release / resolve
# ---------------------------------------------------------------------------


class DoctorReferralClaimTests(BaseBillingTestCase):
    def setUp(self):
        super().setUp()
        patient = User.objects.create_user(
            username="patient2", email="patient2@example.com", password="pw12345!"
        )
        self.case = SymptomSubmission.objects.create(
            user=patient, risk_tier="urgent", symptoms=["severe pain"]
        )
        self.doc1 = User.objects.create_user(
            username="doc_a", email="doca@example.com", password="pw12345!", email_verified=True
        )
        DoctorSubscription.objects.create(
            user=self.doc1, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_ACTIVE
        )
        self.doc2 = User.objects.create_user(
            username="doc_b", email="docb@example.com", password="pw12345!", email_verified=True
        )
        DoctorSubscription.objects.create(
            user=self.doc2, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_ACTIVE
        )

    def _claim(self, user, case_id=None):
        self.client.force_authenticate(user)
        return self.client.post(reverse("doctor-referral-claim", kwargs={"pk": case_id or self.case.id}))

    def test_claim_succeeds(self):
        response = self._claim(self.doc1)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["claimed_by_me"])
        self.case.refresh_from_db()
        self.assertEqual(self.case.claimed_by, self.doc1)
        self.assertIsNotNone(self.case.claimed_at)

    def test_second_doctor_cannot_claim_already_claimed_case(self):
        first = self._claim(self.doc1)
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self._claim(self.doc2)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
        self.case.refresh_from_db()
        self.assertEqual(self.case.claimed_by, self.doc1)  # unchanged — doc2's claim never landed

    def test_claimed_case_disappears_from_other_doctors_inbox(self):
        self._claim(self.doc1)

        self.client.force_authenticate(self.doc2)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(self.case.id, [row["id"] for row in response.data["results"]])

    def test_claimed_case_still_visible_to_claiming_doctor(self):
        self._claim(self.doc1)

        self.client.force_authenticate(self.doc1)
        response = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = next(r for r in response.data["results"] if r["id"] == self.case.id)
        self.assertTrue(row["claimed_by_me"])

    def test_release_returns_case_to_shared_pool(self):
        self._claim(self.doc1)

        self.client.force_authenticate(self.doc1)
        release = self.client.post(reverse("doctor-referral-release", kwargs={"pk": self.case.id}))
        self.assertEqual(release.status_code, status.HTTP_200_OK, release.data)
        self.case.refresh_from_db()
        self.assertIsNone(self.case.claimed_by)

        # Now doc2 can claim it
        second = self._claim(self.doc2)
        self.assertEqual(second.status_code, status.HTTP_200_OK)

    def test_cannot_release_a_case_you_never_claimed(self):
        self._claim(self.doc1)

        self.client.force_authenticate(self.doc2)
        response = self.client.post(reverse("doctor-referral-release", kwargs={"pk": self.case.id}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolve_requires_claim_first(self):
        self.client.force_authenticate(self.doc1)
        response = self.client.post(reverse("doctor-referral-resolve", kwargs={"pk": self.case.id}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolve_removes_case_from_inbox_for_everyone(self):
        self._claim(self.doc1)
        self.client.force_authenticate(self.doc1)
        resolve = self.client.post(reverse("doctor-referral-resolve", kwargs={"pk": self.case.id}))
        self.assertEqual(resolve.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.doc1)
        inbox_owner = self.client.get(reverse("doctor-referrals"))
        self.assertNotIn(self.case.id, [row["id"] for row in inbox_owner.data["results"]])

        self.client.force_authenticate(self.doc2)
        inbox_other = self.client.get(reverse("doctor-referrals"))
        self.assertNotIn(self.case.id, [row["id"] for row in inbox_other.data["results"]])

    def test_claim_nonexistent_case_404s(self):
        response = self._claim(self.doc1, case_id=999999)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# List pagination — bounds every request to a fixed page size instead of returning an
# unbounded, ever-growing result set in one shot (the doctor referral inbox in
# particular has no natural per-user cap the way a person's own history does).
# ---------------------------------------------------------------------------


class PaginationTests(BaseBillingTestCase):
    def test_symptom_history_is_paginated(self):
        user = User.objects.create_user(
            username="prolificuser", email="prolific@example.com",
            password="pw12345!", tier=User.TIER_STANDARD,
        )
        for _ in range(25):
            SymptomSubmission.objects.create(user=user, risk_tier="monitor")
        self.client.force_authenticate(user)

        page1 = self.client.get(reverse("symptom-history"))
        self.assertEqual(page1.status_code, status.HTTP_200_OK)
        self.assertEqual(page1.data["count"], 25)
        self.assertEqual(len(page1.data["results"]), 20)  # page_size
        self.assertIsNotNone(page1.data["next"])
        self.assertIsNone(page1.data["previous"])

        page2 = self.client.get(reverse("symptom-history"), {"page": 2})
        self.assertEqual(len(page2.data["results"]), 5)
        self.assertIsNone(page2.data["next"])

    def test_doctor_referral_inbox_is_paginated(self):
        patient = User.objects.create_user(
            username="manypatients", email="manypatients@example.com", password="pw12345!"
        )
        for _ in range(25):
            SymptomSubmission.objects.create(user=patient, risk_tier="urgent")

        doc = User.objects.create_user(
            username="busydoc", email="busydoc@example.com", password="pw12345!", email_verified=True
        )
        DoctorSubscription.objects.create(
            user=doc, tier=DoctorSubscription.TIER_SOLO, status=DoctorSubscription.STATUS_ACTIVE
        )
        self.client.force_authenticate(doc)

        page1 = self.client.get(reverse("doctor-referrals"))
        self.assertEqual(page1.data["count"], 25)
        self.assertEqual(len(page1.data["results"]), 20)
        self.assertIsNotNone(page1.data["next"])

        page2 = self.client.get(reverse("doctor-referrals"), {"page": 2})
        self.assertEqual(len(page2.data["results"]), 5)
        self.assertIsNone(page2.data["next"])

    def test_chw_assessments_is_paginated(self):
        license_ = make_license()
        chw = User.objects.create_user(
            username="busychw", email="busychw@example.com", password="pw12345!",
            is_chw=True, email_verified=True, institutional_license=license_,
        )
        for _ in range(25):
            SymptomSubmission.objects.create(user=chw, risk_tier="monitor")
        self.client.force_authenticate(chw)

        page1 = self.client.get(reverse("chw-assessments"))
        self.assertEqual(page1.data["count"], 25)
        self.assertEqual(len(page1.data["results"]), 20)

        page2 = self.client.get(reverse("chw-assessments"), {"page": 2})
        self.assertEqual(len(page2.data["results"]), 5)


# ---------------------------------------------------------------------------
# Symptom "latest" teaser — free-tier Dashboard support without the full,
# tier-gated history feature. See SymptomLatestView for why this exists: the
# Dashboard used to call the gated SymptomHistoryView unconditionally, a
# free-tier user's request 403'd, and the frontend silently rendered an empty
# state forever regardless of real submissions.
# ---------------------------------------------------------------------------


class SymptomLatestViewTests(BaseBillingTestCase):
    def test_free_user_gets_latest_and_total_count_without_tier_gate(self):
        user = User.objects.create_user(username="freehist", email="freehist@example.com", password="pw12345!")
        self.assertEqual(user.tier, User.TIER_FREE)
        SymptomSubmission.objects.create(user=user, risk_tier="monitor")
        SymptomSubmission.objects.create(user=user, risk_tier="refer")
        newest = SymptomSubmission.objects.create(user=user, risk_tier="urgent")

        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-latest"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["total_count"], 3)
        self.assertEqual(response.data["latest"]["id"], newest.id)
        self.assertEqual(response.data["latest"]["risk_tier"], "urgent")

    def test_free_user_still_blocked_from_full_history(self):
        """The teaser endpoint is intentionally not a backdoor around the tier gate —
        SymptomHistoryView itself must still reject a free-tier user."""
        user = User.objects.create_user(username="freehist2", email="freehist2@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-history"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_no_submissions_returns_null_latest_and_zero_count(self):
        user = User.objects.create_user(username="nohist", email="nohist@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-latest"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["latest"])
        self.assertEqual(response.data["total_count"], 0)

    def test_latest_never_includes_another_users_submissions(self):
        user = User.objects.create_user(username="latestme", email="latestme@example.com", password="pw12345!")
        other = User.objects.create_user(username="latestother", email="latestother@example.com", password="pw12345!")
        SymptomSubmission.objects.create(user=other, risk_tier="urgent")
        self.client.force_authenticate(user)

        response = self.client.get(reverse("symptom-latest"))
        self.assertIsNone(response.data["latest"])
        self.assertEqual(response.data["total_count"], 0)


# ---------------------------------------------------------------------------
# Admin bypass
# ---------------------------------------------------------------------------


class AdminBypassTests(BaseBillingTestCase):
    def test_admin_override_grants_access_with_zero_payment_calls(self):
        user = User.objects.create_user(
            username="bypass", email="bypass@example.com", password="pw12345!", is_admin_override=True
        )
        self.assertEqual(user.tier, User.TIER_FREE)  # never upgraded, never paid

        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-history"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.assertEqual(Subscription.objects.filter(user=user).count(), 0)
        self.assertEqual(PaymentTransaction.objects.filter(user=user).count(), 0)

        log = AdminBypassAuditLog.objects.filter(user=user).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.feature, "triage_history")

    def test_is_admin_override_not_settable_via_register(self):
        url = reverse("auth-register")
        payload = {
            "username": "sneaky",
            "email": "sneaky@example.com",
            "password": "S0meStrongPass!23",
            "password2": "S0meStrongPass!23",
            "age": 25,
            "terms_accepted": True,
            "is_admin_override": True,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(username="sneaky")
        self.assertFalse(user.is_admin_override)


# ---------------------------------------------------------------------------
# Tier gating
# ---------------------------------------------------------------------------


class TierGatingTests(BaseBillingTestCase):
    def test_free_user_blocked_from_standard_gated_view(self):
        user = User.objects.create_user(username="freeuser", email="f@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-history"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_standard_user_passes_gated_view(self):
        user = User.objects.create_user(
            username="standarduser", email="s@example.com", password="pw12345!", tier=User.TIER_STANDARD
        )
        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-history"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_under_18_ranks_with_standard(self):
        user = User.objects.create_user(
            username="teenpaid", email="t@example.com", password="pw12345!", tier=User.TIER_UNDER_18
        )
        self.client.force_authenticate(user)
        response = self.client.get(reverse("symptom-history"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_standard_user_blocked_from_premium_gated_view(self):
        user = User.objects.create_user(
            username="standard2", email="s2@example.com", password="pw12345!", tier=User.TIER_STANDARD
        )
        self.client.force_authenticate(user)
        response = self.client.get(reverse("billing-multi-profile"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_premium_user_passes_premium_gated_view(self):
        user = User.objects.create_user(
            username="premiumuser", email="p@example.com", password="pw12345!", tier=User.TIER_PREMIUM
        )
        self.client.force_authenticate(user)
        response = self.client.get(reverse("billing-multi-profile"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Existing free triage flow — regression guard, must stay unchanged
# ---------------------------------------------------------------------------


class ExistingFreeFlowUnchangedTests(BaseBillingTestCase):
    def test_free_user_can_still_submit_and_analyse_symptoms(self):
        user = User.objects.create_user(username="triageuser", email="tu@example.com", password="pw12345!")
        self.client.force_authenticate(user)

        submit_response = self.client.post(
            reverse("symptom-submit"),
            {"age": 22, "pain_level": 3, "symptoms": []},
            format="json",
        )
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED, submit_response.data)

        analyse_response = self.client.post(
            reverse("symptom-analyse"),
            {"age": 22, "pain_level": 3, "symptoms": []},
            format="json",
        )
        self.assertEqual(analyse_response.status_code, status.HTTP_200_OK, analyse_response.data)


# ---------------------------------------------------------------------------
# Pricing catalog
# ---------------------------------------------------------------------------


class PricingCatalogTests(BaseBillingTestCase):
    def test_pricing_endpoint_is_public_and_returns_seeded_tiers(self):
        response = self.client.get(reverse("billing-pricing"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = {row["code"] for row in response.data}
        self.assertEqual(codes, {"free", "under_18", "standard", "premium"})

        under_18 = next(row for row in response.data if row["code"] == "under_18")
        self.assertFalse(under_18["self_serve"])


# ---------------------------------------------------------------------------
# Paystack provider
# ---------------------------------------------------------------------------


@override_settings(PAYSTACK_SECRET_KEY="sk_test_dummysecret")
class PaystackProviderTests(BaseBillingTestCase):
    def test_webhook_signature_valid(self):
        provider = PaystackProvider()
        body = b'{"event": "charge.success"}'
        signature = hmac.new(b"sk_test_dummysecret", body, hashlib.sha512).hexdigest()
        fake_request = SimpleNamespace(body=body, headers={"x-paystack-signature": signature})
        self.assertTrue(provider.verify_webhook_signature(fake_request))

    def test_webhook_signature_invalid(self):
        provider = PaystackProvider()
        fake_request = SimpleNamespace(
            body=b'{"event": "charge.success"}', headers={"x-paystack-signature": "bogus"}
        )
        self.assertFalse(provider.verify_webhook_signature(fake_request))

    def test_webhook_missing_signature_rejected(self):
        provider = PaystackProvider()
        fake_request = SimpleNamespace(body=b"{}", headers={})
        self.assertFalse(provider.verify_webhook_signature(fake_request))

    def test_checkout_only_allows_standard_or_premium(self):
        user = User.objects.create_user(username="buyer", email="buyer@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.post(
            reverse("billing-checkout"), {"tier_code": "under_18"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("billing.payments.paystack.requests.post")
    def test_checkout_initiates_and_records_pending_transaction(self, mock_post):
        mock_post.return_value = SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {
                "data": {
                    "authorization_url": "https://checkout.paystack.com/abc123",
                    "reference": "ref_abc123",
                }
            },
        )
        user = User.objects.create_user(username="buyer2", email="buyer2@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.post(
            reverse("billing-checkout"), {"tier_code": "standard"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["reference"], "ref_abc123")

        txn = PaymentTransaction.objects.get(reference="ref_abc123")
        self.assertEqual(txn.status, PaymentTransaction.STATUS_PENDING)
        self.assertEqual(txn.user, user)

    def test_webhook_activates_subscription_and_upgrades_tier(self):
        tier = SubscriptionTier.objects.get(code="standard")
        user = User.objects.create_user(username="payer", email="payer@example.com", password="pw12345!")
        PaymentTransaction.objects.create(
            user=user,
            reference="ref_success1",
            amount_usd=2.99,
            raw_payload={"tier_code": "standard"},
        )

        provider = PaystackProvider()
        provider.handle_webhook_event(
            {"event": "charge.success", "data": {"reference": "ref_success1"}}
        )

        user.refresh_from_db()
        self.assertEqual(user.tier, "standard")
        sub = Subscription.objects.get(user=user)
        self.assertEqual(sub.status, Subscription.STATUS_ACTIVE)
        self.assertEqual(sub.tier, tier)

        txn = PaymentTransaction.objects.get(reference="ref_success1")
        self.assertEqual(txn.status, PaymentTransaction.STATUS_SUCCESS)

    def test_doctor_checkout_rejects_hospital_tier(self):
        user = User.objects.create_user(username="doc1", email="doc1@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.post(
            reverse("billing-doctor-checkout"), {"tier": "hospital"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(DoctorSubscription.objects.filter(user=user).exists())

    def test_doctor_checkout_rejects_unknown_tier(self):
        user = User.objects.create_user(username="doc2", email="doc2@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.post(
            reverse("billing-doctor-checkout"), {"tier": "not-a-real-tier"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("billing.payments.paystack.requests.post")
    def test_doctor_checkout_initiates_for_solo(self, mock_post):
        mock_post.return_value = SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {
                "data": {
                    "authorization_url": "https://checkout.paystack.com/doc123",
                    "reference": "ref_doc123",
                }
            },
        )
        user = User.objects.create_user(username="doc3", email="doc3@example.com", password="pw12345!")
        self.client.force_authenticate(user)
        response = self.client.post(
            reverse("billing-doctor-checkout"), {"tier": "solo"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["reference"], "ref_doc123")

        txn = PaymentTransaction.objects.get(reference="ref_doc123")
        self.assertEqual(txn.purpose, PaymentTransaction.PURPOSE_DOCTOR_SUBSCRIPTION)
        self.assertEqual(txn.status, PaymentTransaction.STATUS_PENDING)

    def test_doctor_webhook_activates_doctor_subscription(self):
        user = User.objects.create_user(username="doc4", email="doc4@example.com", password="pw12345!")
        PaymentTransaction.objects.create(
            user=user,
            reference="ref_doc_success1",
            amount_usd=69.99,
            purpose=PaymentTransaction.PURPOSE_DOCTOR_SUBSCRIPTION,
            raw_payload={"doctor_tier": "clinic", "practitioner_count": 4},
        )

        provider = PaystackProvider()
        provider.handle_webhook_event(
            {"event": "charge.success", "data": {"reference": "ref_doc_success1"}}
        )

        sub = DoctorSubscription.objects.get(user=user)
        self.assertEqual(sub.tier, "clinic")
        self.assertEqual(sub.practitioner_count, 4)
        self.assertEqual(sub.status, DoctorSubscription.STATUS_ACTIVE)

        # A user's own free/standard/premium tier is untouched by a doctor purchase.
        user.refresh_from_db()
        self.assertEqual(user.tier, User.TIER_FREE)

    def test_webhook_is_idempotent_for_repeated_reference(self):
        user = User.objects.create_user(username="payer2", email="payer2@example.com", password="pw12345!")
        PaymentTransaction.objects.create(
            user=user,
            reference="ref_success2",
            amount_usd=2.99,
            raw_payload={"tier_code": "standard"},
        )
        provider = PaystackProvider()
        event = {"event": "charge.success", "data": {"reference": "ref_success2"}}
        provider.handle_webhook_event(event)
        provider.handle_webhook_event(event)  # second delivery — must not double-apply

        self.assertEqual(Subscription.objects.filter(user=user).count(), 1)

    @patch("billing.payments.paystack.requests.post")
    def test_checkout_initiate_is_rate_limited(self, mock_post):
        call_count = {"n": 0}

        def make_response(*args, **kwargs):
            call_count["n"] += 1
            return SimpleNamespace(
                raise_for_status=lambda: None,
                json=lambda: {
                    "data": {
                        "authorization_url": "https://checkout.paystack.com/x",
                        "reference": f"ref_throttle_{call_count['n']}",
                    }
                },
            )

        mock_post.side_effect = make_response
        user = User.objects.create_user(username="throttlebuyer", email="tb@example.com", password="pw12345!")
        self.client.force_authenticate(user)

        for _ in range(10):
            response = self.client.post(reverse("billing-checkout"), {"tier_code": "standard"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        eleventh = self.client.post(reverse("billing-checkout"), {"tier_code": "standard"}, format="json")
        self.assertEqual(eleventh.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
