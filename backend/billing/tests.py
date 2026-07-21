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

from api.models import User

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
