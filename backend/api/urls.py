from django.urls import path

from billing.views import CHWGenerateCodeView

from .views import (
    ChangePasswordView,
    CHWAssessmentsView,
    ClaimReferralView,
    ContactMessageCreateView,
    DoctorReferralInboxView,
    EmailVerificationConfirmView,
    EmailVerificationRequestView,
    GuardianConsentConfirmView,
    LoginView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RefreshView,
    RegisterView,
    ReleaseReferralView,
    ResolveReferralView,
    SymptomAnalyseView,
    SymptomDetailView,
    SymptomHistoryView,
    SymptomLatestView,
    SymptomSaveView,
    SymptomSubmitView,
    UserDataExportView,
    UserDeleteView,
)

urlpatterns = [
    # Auth — public
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("auth/verify-email/request/", EmailVerificationRequestView.as_view(), name="verify-email-request"),
    path("auth/verify-email/confirm/", EmailVerificationConfirmView.as_view(), name="verify-email-confirm"),
    path("auth/guardian-consent/confirm/", GuardianConsentConfirmView.as_view(), name="guardian-consent-confirm"),

    # Contact — public
    path("contact/", ContactMessageCreateView.as_view(), name="contact-create"),

    # Auth — authenticated
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),

    # Symptoms — authenticated
    path("symptoms/submit/", SymptomSubmitView.as_view(), name="symptom-submit"),
    path("symptoms/analyse/", SymptomAnalyseView.as_view(), name="symptom-analyse"),
    path("symptoms/save/", SymptomSaveView.as_view(), name="symptom-save"),
    path("symptoms/history/", SymptomHistoryView.as_view(), name="symptom-history"),
    path("symptoms/latest/", SymptomLatestView.as_view(), name="symptom-latest"),
    path("symptoms/<int:pk>/", SymptomDetailView.as_view(), name="symptom-detail"),

    # CHW — authenticated + is_chw
    path("chw/assessments/", CHWAssessmentsView.as_view(), name="chw-assessments"),
    path("chw/generate-code/", CHWGenerateCodeView.as_view(), name="chw-generate-code"),

    # Doctor — authenticated + active DoctorSubscription
    path("doctor/referrals/", DoctorReferralInboxView.as_view(), name="doctor-referrals"),
    path("doctor/referrals/<int:pk>/claim/", ClaimReferralView.as_view(), name="doctor-referral-claim"),
    path("doctor/referrals/<int:pk>/release/", ReleaseReferralView.as_view(), name="doctor-referral-release"),
    path("doctor/referrals/<int:pk>/resolve/", ResolveReferralView.as_view(), name="doctor-referral-resolve"),

    # Account
    path("user/delete/", UserDeleteView.as_view(), name="user-delete"),
    path("user/export/", UserDataExportView.as_view(), name="user-export"),
]
