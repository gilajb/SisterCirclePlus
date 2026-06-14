from django.urls import path

from .views import (
    CHWAssessmentsView,
    CHWGenerateCodeView,
    LoginView,
    RefreshView,
    RegisterView,
    SymptomAnalyseView,
    SymptomDetailView,
    SymptomHistoryView,
    SymptomSaveView,
    SymptomSubmitView,
    UserDeleteView,
)

urlpatterns = [
    # Auth — public
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),

    # Symptoms — authenticated
    path("symptoms/submit/", SymptomSubmitView.as_view(), name="symptom-submit"),
    path("symptoms/analyse/", SymptomAnalyseView.as_view(), name="symptom-analyse"),
    path("symptoms/save/", SymptomSaveView.as_view(), name="symptom-save"),
    path("symptoms/history/", SymptomHistoryView.as_view(), name="symptom-history"),
    path("symptoms/<int:pk>/", SymptomDetailView.as_view(), name="symptom-detail"),

    # CHW — authenticated + is_chw
    path("chw/assessments/", CHWAssessmentsView.as_view(), name="chw-assessments"),
    path("chw/generate-code/", CHWGenerateCodeView.as_view(), name="chw-generate-code"),

    # Account
    path("user/delete/", UserDeleteView.as_view(), name="user-delete"),
]
