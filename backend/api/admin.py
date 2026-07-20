from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import SymptomSubmission, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "age", "location", "tier", "is_chw", "is_admin_override", "is_staff")
    list_filter = ("tier", "is_chw", "is_admin_override", "is_settlement_verified", "is_staff", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        (
            "SisterCircle+ Profile",
            {
                "fields": (
                    "age",
                    "location",
                    "tier",
                    "institutional_license",
                    "is_chw",
                    "is_settlement_verified",
                    "is_admin_override",
                )
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "SisterCircle+ Profile",
            {"fields": ("age", "location", "is_chw")},
        ),
    )


@admin.register(SymptomSubmission)
class SymptomSubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "risk_tier", "pain_level", "created_at")
    list_filter = ("risk_tier",)
    readonly_fields = ("ai_result", "created_at")
    search_fields = ("user__username", "user__email")
