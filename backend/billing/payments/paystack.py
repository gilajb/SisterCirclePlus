import hashlib
import hmac

import requests
from django.conf import settings
from django.utils import timezone

from ..models import DoctorSubscription, PaymentTransaction, Subscription, SubscriptionTier
from .base import PaymentProvider

PAYSTACK_BASE_URL = "https://api.paystack.co"

# Events that mean "the subscription is now good" / "the subscription is no longer good".
_SUCCESS_EVENTS = {"charge.success", "subscription.create"}
_FAILURE_EVENTS = {"invoice.payment_failed", "subscription.disable"}

# Doctor/clinic tiers are a flat platform-access fee (never per-patient or
# referral-commission based). Charged at the midpoint of the published range.
# Hospital/network is negotiable and sales-led — never self-serve checkout.
DOCTOR_TIER_PRICES_KES = {
    DoctorSubscription.TIER_SOLO: 2000,
    DoctorSubscription.TIER_CLINIC: 5500,
}


class PaystackProvider(PaymentProvider):
    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY

    # -- checkout ------------------------------------------------------------------

    def initiate_checkout(self, *, user, tier_code, callback_url):
        tier = SubscriptionTier.objects.get(code=tier_code, is_active=True)
        if not tier.self_serve:
            raise ValueError(f"Tier '{tier_code}' is not available for self-serve checkout.")

        # Charge the floor of the tier's KES range; amount is in the smallest currency
        # unit (cents) as required by Paystack.
        amount_kes = tier.price_min_kes or 0
        data = self._initialize_transaction(
            email=user.email,
            amount_kes=amount_kes,
            callback_url=callback_url,
            metadata={"user_id": user.id, "tier_code": tier_code},
        )

        PaymentTransaction.objects.create(
            user=user,
            provider="paystack",
            reference=data["reference"],
            amount_kes=amount_kes,
            purpose=PaymentTransaction.PURPOSE_SUBSCRIPTION,
            status=PaymentTransaction.STATUS_PENDING,
            raw_payload={"tier_code": tier_code},
        )

        return {"authorization_url": data["authorization_url"], "reference": data["reference"]}

    def initiate_doctor_checkout(self, *, user, doctor_tier, practitioner_count, callback_url):
        if doctor_tier not in DOCTOR_TIER_PRICES_KES:
            raise ValueError(f"Doctor tier '{doctor_tier}' is not available for self-serve checkout.")

        amount_kes = DOCTOR_TIER_PRICES_KES[doctor_tier]
        data = self._initialize_transaction(
            email=user.email,
            amount_kes=amount_kes,
            callback_url=callback_url,
            metadata={"user_id": user.id, "doctor_tier": doctor_tier},
        )

        PaymentTransaction.objects.create(
            user=user,
            provider="paystack",
            reference=data["reference"],
            amount_kes=amount_kes,
            purpose=PaymentTransaction.PURPOSE_DOCTOR_SUBSCRIPTION,
            status=PaymentTransaction.STATUS_PENDING,
            raw_payload={"doctor_tier": doctor_tier, "practitioner_count": practitioner_count},
        )

        return {"authorization_url": data["authorization_url"], "reference": data["reference"]}

    def _initialize_transaction(self, *, email, amount_kes, callback_url, metadata):
        response = requests.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers={"Authorization": f"Bearer {self.secret_key}"},
            json={
                "email": email,
                "amount": int(amount_kes * 100),
                "currency": "KES",
                "callback_url": callback_url,
                "metadata": metadata,
            },
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["data"]

    # -- webhook ---------------------------------------------------------------------

    def verify_webhook_signature(self, request) -> bool:
        signature = request.headers.get("x-paystack-signature", "")
        if not signature:
            return False
        computed = hmac.new(
            self.secret_key.encode("utf-8"), request.body, hashlib.sha512
        ).hexdigest()
        return hmac.compare_digest(computed, signature)

    def handle_webhook_event(self, payload: dict) -> None:
        event = payload.get("event", "")
        data = payload.get("data", {})
        reference = data.get("reference") or data.get("subscription_code", "")

        transaction = PaymentTransaction.objects.filter(reference=reference).first()
        if transaction is None:
            # Nothing we initiated (or already processed under a different reference) —
            # ignore rather than guess.
            return

        # Idempotent: a second delivery of an already-resolved transaction is a no-op.
        if transaction.status != PaymentTransaction.STATUS_PENDING:
            return

        transaction.raw_payload = {**transaction.raw_payload, "webhook": payload}

        if event in _SUCCESS_EVENTS:
            transaction.status = PaymentTransaction.STATUS_SUCCESS
            transaction.save(update_fields=["status", "raw_payload"])
            self._activate(transaction)
        elif event in _FAILURE_EVENTS:
            transaction.status = PaymentTransaction.STATUS_FAILED
            transaction.save(update_fields=["status", "raw_payload"])
            self._mark_past_due(transaction)
        else:
            transaction.save(update_fields=["raw_payload"])

    # -- internal --------------------------------------------------------------------

    def _activate(self, transaction: PaymentTransaction):
        if transaction.purpose == PaymentTransaction.PURPOSE_DOCTOR_SUBSCRIPTION:
            self._activate_doctor_subscription(transaction)
        else:
            self._activate_subscription(transaction)

    def _activate_subscription(self, transaction: PaymentTransaction):
        tier_code = transaction.raw_payload.get("tier_code")
        tier = SubscriptionTier.objects.filter(code=tier_code).first()
        if tier is None or transaction.user is None:
            return

        Subscription.objects.update_or_create(
            user=transaction.user,
            defaults={
                "tier": tier,
                "provider": "paystack",
                "status": Subscription.STATUS_ACTIVE,
                "current_period_end": None,
            },
        )
        transaction.user.tier = tier_code
        transaction.user.save(update_fields=["tier"])

    def _activate_doctor_subscription(self, transaction: PaymentTransaction):
        doctor_tier = transaction.raw_payload.get("doctor_tier")
        if doctor_tier is None or transaction.user is None:
            return

        DoctorSubscription.objects.update_or_create(
            user=transaction.user,
            defaults={
                "tier": doctor_tier,
                "practitioner_count": transaction.raw_payload.get("practitioner_count"),
                "status": DoctorSubscription.STATUS_ACTIVE,
                "price_kes": transaction.amount_kes,
            },
        )

    def _mark_past_due(self, transaction: PaymentTransaction):
        if transaction.user is None:
            return
        if transaction.purpose == PaymentTransaction.PURPOSE_DOCTOR_SUBSCRIPTION:
            DoctorSubscription.objects.filter(user=transaction.user).update(
                status=DoctorSubscription.STATUS_PAST_DUE
            )
        else:
            Subscription.objects.filter(user=transaction.user).update(
                status=Subscription.STATUS_PAST_DUE, updated_at=timezone.now()
            )
