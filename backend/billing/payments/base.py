from abc import ABC, abstractmethod


class PaymentProvider(ABC):
    """Contract every payment rail must satisfy. Paystack is the only concrete
    implementation right now (see paystack.py) — Stripe/Flutterwave can be added later by
    implementing this same interface, without touching any business/access-control logic
    that depends on it.
    """

    @abstractmethod
    def initiate_checkout(self, *, user, tier_code, callback_url):
        """Start a checkout session for `user` subscribing to `tier_code`.

        Returns a dict with at least {"authorization_url": str, "reference": str}.
        """
        raise NotImplementedError

    @abstractmethod
    def verify_webhook_signature(self, request) -> bool:
        """Return True only if `request` is authentically from this provider."""
        raise NotImplementedError

    @abstractmethod
    def handle_webhook_event(self, payload: dict) -> None:
        """Process a verified webhook payload: activate/renew/fail the relevant
        Subscription or DoctorSubscription and record a PaymentTransaction.
        """
        raise NotImplementedError
