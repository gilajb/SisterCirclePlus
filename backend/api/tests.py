from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from .models import SymptomSubmission, User
from .tokens import email_verification_token, guardian_consent_token


class PasswordResetTests(APITestCase):
    def setUp(self):
        # Throttle counters live in the cache backend and would otherwise leak between
        # test methods within the same run.
        cache.clear()
        self.user = User.objects.create_user(
            username="resetme", email="resetme@example.com", password="OldPassw0rd!23"
        )

    def _request(self, email):
        return self.client.post(reverse("password-reset-request"), {"email": email}, format="json")

    def _confirm(self, uid, token, password="NewPassw0rd!45", password2=None):
        return self.client.post(
            reverse("password-reset-confirm"),
            {"uid": uid, "token": token, "password": password, "password2": password2 or password},
            format="json",
        )

    def _valid_uid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = PasswordResetTokenGenerator().make_token(self.user)
        return uid, token

    def test_request_for_existing_email_sends_mail(self):
        response = self._request("resetme@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("resetme@example.com", mail.outbox[0].to)
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)

    def test_request_for_unknown_email_sends_no_mail_but_same_response(self):
        known = self._request("resetme@example.com")
        cache.clear()
        unknown = self._request("nobody@example.com")

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)
        # Only the known-email request should have triggered a send
        self.assertEqual(len(mail.outbox), 1)

    def test_confirm_with_valid_token_changes_password(self):
        uid, token = self._valid_uid_token()
        response = self._confirm(uid, token)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassw0rd!45"))
        self.assertFalse(self.user.check_password("OldPassw0rd!23"))

    def test_confirm_with_bogus_token_rejected(self):
        uid, _ = self._valid_uid_token()
        response = self._confirm(uid, "not-a-real-token")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPassw0rd!23"))

    def test_confirm_with_tampered_uid_rejected(self):
        _, token = self._valid_uid_token()
        response = self._confirm("not-a-real-uid", token)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_cannot_be_reused_after_password_already_changed(self):
        uid, token = self._valid_uid_token()
        first = self._confirm(uid, token, password="NewPassw0rd!45")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self._confirm(uid, token, password="AnotherPassw0rd!67")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassw0rd!45"))

    def test_confirm_rejects_mismatched_passwords(self):
        uid, token = self._valid_uid_token()
        response = self._confirm(uid, token, password="NewPassw0rd!45", password2="Different!89")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_request_endpoint_is_rate_limited(self):
        for _ in range(5):
            response = self._request("resetme@example.com")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        sixth = self._request("resetme@example.com")
        self.assertEqual(sixth.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class LoginThrottleTests(APITestCase):
    """Regression guard for the ScopedRateThrottle footgun found while adding password
    reset: `scope` set on the throttle subclass does nothing — DRF reads
    `view.throttle_scope` instead. LoginRateThrottle was a silent no-op (no brute-force
    protection at all) until LoginView also declared throttle_scope = "login"."""

    def setUp(self):
        cache.clear()
        User.objects.create_user(username="throttleme", email="throttleme@example.com", password="CorrectPass1!")

    def _attempt(self):
        return self.client.post(
            reverse("auth-login"), {"username": "throttleme", "password": "WrongPass!"}, format="json"
        )

    def test_login_is_rate_limited_after_five_attempts(self):
        for _ in range(5):
            response = self._attempt()
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        sixth = self._attempt()
        self.assertEqual(sixth.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class LoginByEmailTests(APITestCase):
    """Login used to only work because the frontend guessed `username` as
    email.split("@")[0] — identical to how registration derived it. Now that
    registration lets a user pick a real, distinct username, that guess breaks. Login
    resolves the real username from the submitted email server-side instead."""

    def setUp(self):
        cache.clear()
        User.objects.create_user(
            username="sunshine_grace", email="grace@example.com", password="CorrectPass1!"
        )

    def test_login_by_email_with_distinct_username_succeeds(self):
        response = self.client.post(
            reverse("auth-login"), {"email": "grace@example.com", "password": "CorrectPass1!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["user"]["username"], "sunshine_grace")

    def test_login_by_email_is_case_insensitive(self):
        response = self.client.post(
            reverse("auth-login"), {"email": "Grace@Example.com", "password": "CorrectPass1!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

    def test_unknown_email_fails_cleanly_not_500(self):
        response = self.client.post(
            reverse("auth-login"), {"email": "nobody@example.com", "password": "CorrectPass1!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_neither_email_nor_username_fails_cleanly_not_500(self):
        response = self.client.post(reverse("auth-login"), {"password": "CorrectPass1!"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_raw_username_login_still_works(self):
        """Backward-compatible: sending `username` directly (no `email`) still works —
        e.g. for the seed_admin account, or any direct API caller."""
        response = self.client.post(
            reverse("auth-login"), {"username": "sunshine_grace", "password": "CorrectPass1!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)


class EmailVerificationTests(APITestCase):
    def setUp(self):
        cache.clear()

    def _register(self, username="newgirl"):
        return self.client.post(
            reverse("auth-register"),
            {
                "username": username,
                "email": f"{username}@example.com",
                "password": "S0meStrongPass!23",
                "password2": "S0meStrongPass!23",
                "age": 25,
                "terms_accepted": True,
            },
            format="json",
        )

    def _uid_token(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        return uid, token

    def _confirm(self, uid, token):
        return self.client.post(
            reverse("verify-email-confirm"), {"uid": uid, "token": token}, format="json"
        )

    def test_registration_sends_verification_email_and_starts_unverified(self):
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(response.data["user"]["email_verified"])

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("newgirl@example.com", mail.outbox[0].to)
        self.assertIn("/verify-email?uid=", mail.outbox[0].body)

    def test_confirm_with_valid_token_verifies_email(self):
        self._register()
        user = User.objects.get(username="newgirl")
        self.assertFalse(user.email_verified)

        uid, token = self._uid_token(user)
        response = self._confirm(uid, token)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        user.refresh_from_db()
        self.assertTrue(user.email_verified)

    def test_confirm_with_bogus_token_rejected(self):
        self._register()
        user = User.objects.get(username="newgirl")
        uid, _ = self._uid_token(user)
        response = self._confirm(uid, "not-a-real-token")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.email_verified)

    def test_token_cannot_be_reused_after_already_verified(self):
        self._register()
        user = User.objects.get(username="newgirl")
        uid, token = self._uid_token(user)

        first = self._confirm(uid, token)
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self._confirm(uid, token)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_sends_a_new_email_while_unverified(self):
        self._register()
        user = User.objects.get(username="newgirl")
        self.client.force_authenticate(user)

        response = self.client.post(reverse("verify-email-request"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)  # one from registration, one from resend

    def test_resend_is_a_no_op_once_verified(self):
        self._register()
        user = User.objects.get(username="newgirl")
        uid, token = self._uid_token(user)
        self._confirm(uid, token)
        user.refresh_from_db()

        self.client.force_authenticate(user)
        response = self.client.post(reverse("verify-email-request"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)  # only the original registration email

    def test_resend_requires_authentication(self):
        response = self.client.post(reverse("verify-email-request"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resend_is_rate_limited(self):
        self._register()
        user = User.objects.get(username="newgirl")
        self.client.force_authenticate(user)

        for _ in range(5):
            response = self.client.post(reverse("verify-email-request"))
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        sixth = self.client.post(reverse("verify-email-request"))
        self.assertEqual(sixth.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class RegistrationThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()

    def _register(self, i):
        return self.client.post(
            reverse("auth-register"),
            {
                "username": f"throttlereg{i}",
                "email": f"throttlereg{i}@example.com",
                "password": "S0meStrongPass!23",
                "password2": "S0meStrongPass!23",
                "age": 25,
                "terms_accepted": True,
            },
            format="json",
        )

    def test_registration_is_rate_limited_after_ten_accounts(self):
        for i in range(10):
            response = self._register(i)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        eleventh = self._register(10)
        self.assertEqual(eleventh.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertFalse(User.objects.filter(username="throttlereg10").exists())


class MeViewTests(APITestCase):
    def test_me_reflects_email_verified_without_needing_a_new_token(self):
        user = User.objects.create_user(username="meuser", email="meuser@example.com", password="pw12345!")
        self.client.force_authenticate(user)

        before = self.client.get(reverse("auth-me"))
        self.assertFalse(before.data["email_verified"])

        user.email_verified = True
        user.save(update_fields=["email_verified"])

        after = self.client.get(reverse("auth-me"))
        self.assertTrue(after.data["email_verified"])


class AccountDeletionTests(APITestCase):
    def test_delete_removes_user_and_cascades_symptom_submissions(self):
        user = User.objects.create_user(username="deleteme", email="deleteme@example.com", password="pw12345!")
        SymptomSubmission.objects.create(user=user, risk_tier="monitor")
        SymptomSubmission.objects.create(user=user, risk_tier="refer")
        self.client.force_authenticate(user)

        response = self.client.delete(reverse("user-delete"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.assertFalse(User.objects.filter(username="deleteme").exists())
        self.assertEqual(SymptomSubmission.objects.filter(user_id=user.id).count(), 0)

    def test_delete_requires_authentication(self):
        response = self.client.delete(reverse("user-delete"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_stops_working_after_account_deleted(self):
        User.objects.create_user(username="deleteme2", email="deleteme2@example.com", password="pw12345!")
        login = self.client.post(
            reverse("auth-login"), {"username": "deleteme2", "password": "pw12345!"}, format="json"
        )
        access = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        delete_response = self.client.delete(reverse("user-delete"))
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)

        # Same still-unexpired token, now-deleted user — must be rejected, not silently
        # authenticated as a user that no longer exists.
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserDataExportTests(APITestCase):
    def test_export_requires_authentication(self):
        response = self.client.get(reverse("user-export"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_export_includes_account_and_own_submissions(self):
        user = User.objects.create_user(
            username="exportme", email="exportme@example.com", password="pw12345!", age=22, location="Nairobi",
        )
        SymptomSubmission.objects.create(user=user, risk_tier="urgent", symptoms=["severe pain"])
        SymptomSubmission.objects.create(user=user, risk_tier="monitor", symptoms=["mild cramps"])
        self.client.force_authenticate(user)

        response = self.client.get(reverse("user-export"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.assertEqual(response.data["account"]["username"], "exportme")
        self.assertEqual(response.data["account"]["email"], "exportme@example.com")
        self.assertEqual(response.data["account"]["age"], 22)

        submissions = response.data["symptom_submissions"]
        self.assertEqual(len(submissions), 2)
        tiers = {s["risk_tier"] for s in submissions}
        self.assertEqual(tiers, {"urgent", "monitor"})

    def test_export_never_includes_another_users_submissions(self):
        user = User.objects.create_user(username="exportme2", email="em2@example.com", password="pw12345!")
        other = User.objects.create_user(username="someoneelse", email="oe@example.com", password="pw12345!")
        SymptomSubmission.objects.create(user=other, risk_tier="urgent")
        self.client.force_authenticate(user)

        response = self.client.get(reverse("user-export"))
        self.assertEqual(response.data["symptom_submissions"], [])


class RegistrationConsentTests(APITestCase):
    """Terms-of-service acceptance and the under-16 guardian-consent gate, both added
    at registration time (see RegisterSerializer)."""

    def setUp(self):
        cache.clear()

    def _payload(self, **overrides):
        payload = {
            "username": "consenttest",
            "email": "consenttest@example.com",
            "password": "S0meStrongPass!23",
            "password2": "S0meStrongPass!23",
            "age": 25,
            "terms_accepted": True,
        }
        payload.update(overrides)
        return payload

    def _register(self, **overrides):
        return self.client.post(reverse("auth-register"), self._payload(**overrides), format="json")

    def test_registration_requires_terms_accepted(self):
        payload = self._payload()
        del payload["terms_accepted"]
        response = self.client.post(reverse("auth-register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_rejects_terms_accepted_false(self):
        response = self._register(terms_accepted=False)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_requires_age(self):
        payload = self._payload()
        del payload["age"]
        response = self.client.post(reverse("auth-register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_adult_registration_succeeds_without_guardian_email(self):
        response = self._register(age=25)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["user"]["guardian_consent_status"], "not_required")

        user = User.objects.get(username="consenttest")
        self.assertIsNotNone(user.terms_accepted_at)
        self.assertEqual(user.guardian_consent_status, User.GUARDIAN_CONSENT_NOT_REQUIRED)

    def test_exactly_16_does_not_require_guardian(self):
        response = self._register(age=16)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["user"]["guardian_consent_status"], "not_required")

    def test_under_16_registration_requires_guardian_email(self):
        response = self._register(age=15)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_under_16_registration_with_guardian_email_succeeds(self):
        response = self._register(age=15, guardian_email="parent@example.com")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["user"]["guardian_consent_status"], "pending")

        user = User.objects.get(username="consenttest")
        self.assertEqual(user.guardian_email, "parent@example.com")
        self.assertEqual(user.guardian_consent_status, User.GUARDIAN_CONSENT_PENDING)
        self.assertIsNotNone(user.guardian_consent_requested_at)

        # Two emails: one to the minor (verification), one to the guardian (consent request)
        self.assertEqual(len(mail.outbox), 2)
        recipients = {tuple(m.to) for m in mail.outbox}
        self.assertIn(("consenttest@example.com",), recipients)
        self.assertIn(("parent@example.com",), recipients)

    def test_under_16_user_gets_full_immediate_account_access(self):
        """The guardian-consent gate is deliberately non-blocking for the minor — see the
        User.GUARDIAN_CONSENT_* field comment and SECURITY.md §3.1 for the 'vital interests'
        rationale. A pending guardian decision must not prevent login or use of the app."""
        self._register(age=15, guardian_email="parent2@example.com")
        login = self.client.post(
            reverse("auth-login"), {"username": "consenttest", "password": "S0meStrongPass!23"}, format="json"
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)


class GuardianConsentConfirmTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client.post(
            reverse("auth-register"),
            {
                "username": "guardedminor",
                "email": "guardedminor@example.com",
                "password": "S0meStrongPass!23",
                "password2": "S0meStrongPass!23",
                "age": 14,
                "terms_accepted": True,
                "guardian_email": "guardian@example.com",
            },
            format="json",
        )
        self.user = User.objects.get(username="guardedminor")

    def _uid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = guardian_consent_token.make_token(self.user)
        return uid, token

    def _confirm(self, uid, token, decision):
        return self.client.post(
            reverse("guardian-consent-confirm"),
            {"uid": uid, "token": token, "decision": decision},
            format="json",
        )

    def test_approve_sets_status_and_resolved_timestamp(self):
        uid, token = self._uid_token()
        response = self._confirm(uid, token, "approve")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.guardian_consent_status, User.GUARDIAN_CONSENT_APPROVED)
        self.assertIsNotNone(self.user.guardian_consent_resolved_at)

    def test_decline_sets_status(self):
        uid, token = self._uid_token()
        response = self._confirm(uid, token, "decline")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.guardian_consent_status, User.GUARDIAN_CONSENT_DECLINED)

    def test_bogus_token_rejected(self):
        uid, _ = self._uid_token()
        response = self._confirm(uid, "not-a-real-token", "approve")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertEqual(self.user.guardian_consent_status, User.GUARDIAN_CONSENT_PENDING)

    def test_token_cannot_be_reused_after_resolved(self):
        uid, token = self._uid_token()
        first = self._confirm(uid, token, "approve")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self._confirm(uid, token, "decline")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertEqual(self.user.guardian_consent_status, User.GUARDIAN_CONSENT_APPROVED)

    def test_invalid_decision_choice_rejected(self):
        uid, token = self._uid_token()
        response = self._confirm(uid, token, "maybe")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeViewGuardianConsentTests(APITestCase):
    def test_me_reflects_guardian_consent_status(self):
        self.client.post(
            reverse("auth-register"),
            {
                "username": "meguardian",
                "email": "meguardian@example.com",
                "password": "S0meStrongPass!23",
                "password2": "S0meStrongPass!23",
                "age": 13,
                "terms_accepted": True,
                "guardian_email": "guardian3@example.com",
            },
            format="json",
        )
        user = User.objects.get(username="meguardian")
        self.client.force_authenticate(user)

        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.data["guardian_consent_status"], "pending")


class SymptomDetailViewTests(APITestCase):
    """No coverage existed for this endpoint before Results.jsx started using it to let
    a user open a past submission's full report from Dashboard history — worth locking
    down the row-level security it's now relied on for."""

    def setUp(self):
        self.owner = User.objects.create_user(username="detailowner", email="do@example.com", password="pw12345!")
        self.submission = SymptomSubmission.objects.create(
            user=self.owner,
            risk_tier="refer",
            symptoms=["cramping"],
            ai_result={"risk_tier": "refer", "conditions": [{"name": "Test Condition"}], "next_steps": ["Rest"], "team_note": "Take care"},
        )

    def test_owner_can_view_own_submission(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(reverse("symptom-detail", kwargs={"pk": self.submission.id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.submission.id)
        self.assertEqual(response.data["ai_result"]["conditions"][0]["name"], "Test Condition")

    def test_other_user_cannot_view_someone_elses_submission(self):
        other = User.objects.create_user(username="detailother", email="doth@example.com", password="pw12345!")
        self.client.force_authenticate(other)
        response = self.client.get(reverse("symptom-detail", kwargs={"pk": self.submission.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_blocked(self):
        response = self.client.get(reverse("symptom-detail", kwargs={"pk": self.submission.id}))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="pwchanger", email="pwchanger@example.com", password="OldPassw0rd!23"
        )

    def _change(self, current="OldPassw0rd!23", new="NewPassw0rd!45", new2=None):
        return self.client.post(
            reverse("auth-change-password"),
            {"current_password": current, "new_password": new, "new_password2": new2 or new},
            format="json",
        )

    def test_change_password_requires_authentication(self):
        response = self._change()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_succeeds_and_new_password_works_for_login(self):
        self.client.force_authenticate(self.user)
        response = self._change()
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPassw0rd!45"))
        self.assertFalse(self.user.check_password("OldPassw0rd!23"))

        # A real login with the new password must work end to end, not just the hash check
        self.client.force_authenticate(user=None)
        login = self.client.post(
            reverse("auth-login"), {"username": "pwchanger", "password": "NewPassw0rd!45"}, format="json"
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_wrong_current_password_rejected(self):
        self.client.force_authenticate(self.user)
        response = self._change(current="TotallyWrong!1")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPassw0rd!23"))  # unchanged

    def test_mismatched_confirmation_rejected(self):
        self.client.force_authenticate(self.user)
        response = self._change(new="NewPassw0rd!45", new2="Different!89")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_new_password_rejected(self):
        self.client.force_authenticate(self.user)
        response = self._change(new="password", new2="password")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPassw0rd!23"))  # unchanged
