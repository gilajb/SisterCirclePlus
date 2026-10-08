from django.contrib import admin

from .models import (
    AdminBypassAuditLog,
    CHWCode,
    CHWCodeRedemption,
    DoctorSubscription,
    InstitutionalLead,
    InstitutionalLicense,
    PaymentTransaction,
    Subscription,
    SubscriptionTier,
)


@admin.register(SubscriptionTier)
class SubscriptionTierAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "price_min_usd", "price_max_usd", "billing_cycle", "self_serve", "is_active")
    list_filter = ("self_serve", "is_active", "billing_cycle")
    search_fields = ("name", "code")


@admin.register(InstitutionalLicense)
class InstitutionalLicenseAdmin(admin.ModelAdmin):
    list_display = ("org_name", "cohort_tier", "cohort_size", "annual_price_kes", "contract_end", "is_active")
    list_filter = ("cohort_tier", "co_branding", "is_active")
    search_fields = ("org_name", "contact_email")


@admin.register(CHWCode)
class CHWCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "institutional_license", "created_by", "redemption_count", "max_redemptions", "expires_at", "is_active")
    list_filter = ("is_active", "unlocks_under_18")
    search_fields = ("code", "institutional_license__org_name", "created_by__username")


@admin.register(CHWCodeRedemption)
class CHWCodeRedemptionAdmin(admin.ModelAdmin):
    list_display = ("code", "user", "redeemed_at")
    search_fields = ("code__code", "user__username")


@admin.register(InstitutionalLead)
class InstitutionalLeadAdmin(admin.ModelAdmin):
    list_display = ("org_name", "email", "estimated_cohort_size", "created_at")
    search_fields = ("org_name", "email")


@admin.register(DoctorSubscription)
class DoctorSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "tier", "practitioner_count", "status", "price_usd", "current_period_end")
    list_filter = ("tier", "status")
    search_fields = ("user__username", "user__email")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "tier", "provider", "status", "current_period_end")
    list_filter = ("tier", "provider", "status")
    search_fields = ("user__username", "user__email")


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ("reference", "user", "provider", "purpose", "amount_usd", "status", "created_at")
    list_filter = ("provider", "purpose", "status")
    readonly_fields = ("raw_payload", "created_at")
    search_fields = ("reference", "user__username")


@admin.register(AdminBypassAuditLog)
class AdminBypassAuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "feature", "created_at")
    list_filter = ("feature",)
    readonly_fields = ("user", "feature", "created_at")
    search_fields = ("user__username", "feature")

    def has_add_permission(self, request):
        return False  # this log is written only by the access-control layer

    def has_change_permission(self, request, obj=None):
        return False
