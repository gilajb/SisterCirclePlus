from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import SymptomSubmission, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "age", "location", "is_free_tier", "is_chw", "is_staff")
    list_filter = ("is_free_tier", "is_chw", "is_staff", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        (
            "SisterCircle+ Profile",
            {"fields": ("age", "location", "is_free_tier", "is_chw")},
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
