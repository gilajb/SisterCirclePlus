from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Same signed-timestamp mechanism as Django's password-reset tokens, but the hash
    tracks `email_verified` (and `email`) instead of the password — so a verification
    link is invalidated the moment the account it targets actually gets verified (no
    replay), independent of any password-reset token issued for the same user. Reusing
    PasswordResetTokenGenerator directly would let a password-reset link double as an
    email-verification link and vice versa, which is confusing even if not a real hole —
    this keeps the two concerns' tokens from being interchangeable."""

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()


class GuardianConsentTokenGenerator(PasswordResetTokenGenerator):
    """Hash tracks `guardian_consent_status` rather than the password or email_verified,
    so this token family is independent of the other two, and — critically — a token is
    invalidated the moment the guardian actually responds (approve or decline), so the
    same emailed link can't be replayed to flip a resolved decision back to pending."""

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.guardian_email}{user.guardian_consent_status}{timestamp}"


guardian_consent_token = GuardianConsentTokenGenerator()
