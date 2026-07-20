from django.urls import path

from .views import (
    CheckoutInitiateView,
    CHWCodeRedeemView,
    CycleTrackingView,
    DoctorCallbackView,
    DoctorCheckoutInitiateView,
    InstitutionalLeadView,
    MultiProfileView,
    PaystackWebhookView,
    PricingView,
)

# Note: CHWGenerateCodeView lives in billing/views.py but is routed from api/urls.py at
# its original path (/api/chw/generate-code/) so the existing frontend call site
# (CHW.jsx) needs no change — it's not mounted here under /api/billing/.

urlpatterns = [
    # Pricing catalog — public
    path("pricing/", PricingView.as_view(), name="billing-pricing"),

    # Institutional licensing — sales-led lead capture
    path("institutional-lead/", InstitutionalLeadView.as_view(), name="billing-institutional-lead"),

    # Redemption is the only under_18 unlock path
    path("redeem-code/", CHWCodeRedeemView.as_view(), name="billing-redeem-code"),

    # Paystack checkout + webhook
    path("checkout/", CheckoutInitiateView.as_view(), name="billing-checkout"),
    path("doctor-checkout/", DoctorCheckoutInitiateView.as_view(), name="billing-doctor-checkout"),
    path("webhooks/paystack/", PaystackWebhookView.as_view(), name="billing-paystack-webhook"),

    # Feature-gate stubs
    path("cycle-tracking/", CycleTrackingView.as_view(), name="billing-cycle-tracking"),
    path("doctor-callback/", DoctorCallbackView.as_view(), name="billing-doctor-callback"),
    path("multi-profile/", MultiProfileView.as_view(), name="billing-multi-profile"),
]
