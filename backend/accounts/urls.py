from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterVendeurView, RegisterEntrepriseView,
    VerifyEmailView,     ResendVerificationView,
    LoginView,           LogoutView,
    MeView,              ChangePasswordView,
    VendeurProfileView,  EntrepriseProfileView,
    ForgotPasswordView,  ResetPasswordView,
)

urlpatterns = [
    # ── Inscription ──────────────────────────
    path('register/vendeur/',     RegisterVendeurView.as_view()),
    path('register/entreprise/',  RegisterEntrepriseView.as_view()),
    path('verify-email/',         VerifyEmailView.as_view()),
    path('resend-verification/',  ResendVerificationView.as_view()),

    # ── Authentification ─────────────────────
    path('login/',                LoginView.as_view()),
    path('logout/',               LogoutView.as_view()),
    path('token/refresh/',        TokenRefreshView.as_view()),

    # ── Profil personnel ─────────────────────
    path('me/',                   MeView.as_view()),              # GET + PATCH
    path('change-password/',      ChangePasswordView.as_view()),  # POST

    # ── Profil métier ────────────────────────
    path('me/vendeur/',           VendeurProfileView.as_view()),    # GET + PATCH
    path('me/entreprise/',        EntrepriseProfileView.as_view()), # GET + PATCH

    # ── Mot de passe oublié ──────────────────
    path('forgot-password/',      ForgotPasswordView.as_view()),
    path('reset-password/',       ResetPasswordView.as_view()),
]