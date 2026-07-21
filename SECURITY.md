# Security & Data Privacy — SisterCircle+

**Version:** 2.0
**Last updated:** July 2026
**Contact:** security@sistercircleplus.com
**Platform:** SisterCircle+ — AI-powered menstrual health triage for adolescent girls and young women in Sub-Saharan Africa

---

## Table of Contents

1. [What Data We Collect and Why](#1-what-data-we-collect-and-why)
2. [Authentication and Token Storage](#2-authentication-and-token-storage)
3. [Account Verification and Recovery](#3-account-verification-and-recovery)
4. [How to Report a Security Vulnerability](#4-how-to-report-a-security-vulnerability)
5. [Data Retention Policy](#5-data-retention-policy)
6. [Self-Service Data Access and Deletion](#6-self-service-data-access-and-deletion)
7. [AI and Claude API Data Handling](#7-ai-and-claude-api-data-handling)
8. [CHW and Doctor Referral Data Handling](#8-chw-and-doctor-referral-data-handling)
9. [Technical Security Controls](#9-technical-security-controls)
10. [Third-Party Services](#10-third-party-services)
11. [Responsible AI Commitments](#11-responsible-ai-commitments)
12. [Known Limitations](#12-known-limitations)

---

## 1. What Data We Collect and Why

SisterCircle+ is built on the principle of **minimum necessary data**. We collect only what is clinically or operationally required, and nothing more.

### 1.1 Account Data

| Field | Purpose | Required |
|-------|---------|----------|
| Username | Account identification | Yes |
| Email address | Login, password reset, verification | Yes |
| Age | Determine free-tier eligibility; clinical context | No |
| Location (city/country) | Regional health profile context for AI triage | No |
| Password (hashed via Django PBKDF2-SHA256) | Authentication | Yes |
| `is_chw` flag | Unlocks the Community Health Worker portal | Auto-set at signup, never client-writable after |
| `email_verified` flag | Gates CHW code generation and the doctor referral inbox (see §3) | Auto-set |
| `tier` (`free` / `under_18` / `standard` / `premium`) | Feature gating and pricing | Auto-set, server-derived only — never accepted from the client on registration or any other request |

We do **not** collect: national ID numbers, phone numbers, photographs, biometric data, or precise GPS coordinates.

### 1.2 Symptom Submission Data

Each time a user completes a symptom check, we store:

| Field | Purpose |
|-------|---------|
| Last period date, cycle length/regularity | Hormonal pattern assessment |
| Bleeding volume and duration | Clinical triage input |
| Pain level (0–10 self-reported) | Symptom severity tracking |
| Selected symptoms (structured list) | AI condition matching |
| Free-text notes (`other_symptoms`) | Additional clinical context |
| AI result (`risk_tier`, conditions, next steps) | Displayed to user; stored for health history |
| Submission timestamp | Health history timeline |
| Claim state (`claimed_by`, `resolved`) | Set only if the submission is `refer`/`urgent`-tier and a doctor picks it up — see §8 |

Every submission is stored and retained the same way regardless of tier — what differs by tier is **retrieval**. `GET /api/symptoms/history/` (the full, paginated history log) requires Standard tier or higher; a free-tier user instead gets `GET /api/symptoms/latest/`, an ungated endpoint returning only their single most recent submission plus their true total count, so the Dashboard can show something real and prompt an upgrade rather than an empty state that doesn't reflect their actual data.

### 1.3 What We Do NOT Collect

- Real-time location tracking or device fingerprinting
- Third-party advertising or analytics cookies
- Social media profile data
- Raw payment card details (Paystack handles card data directly; we store only a transaction reference, amount, and status)

### 1.4 Legal Basis for Processing

- **Consent** — users check a required box agreeing to our [Terms of Service](/terms) and [Privacy Policy](/privacy) at registration, timestamped on the account (`terms_accepted_at`) so we can prove when consent was given if the documents later change
- **Legitimate interest** — improving triage accuracy for underserved populations
- **Vital interest** — urgent triage results may be necessary to protect life; this is also the basis we rely on to give under-16 users immediate triage access ahead of guardian consent — see §3.4

We aim to comply with Kenya's **Data Protection Act 2019**, Uganda's **Data Protection and Privacy Act 2019**, and to align with GDPR principles for users in regions where it applies.

---

## 2. Authentication and Token Storage

### 2.1 Token Architecture

SisterCircle+ uses **JSON Web Tokens (JWT)** issued by Django REST Framework SimpleJWT.

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access token | 24 hours | Browser `localStorage` |
| Refresh token | 7 days (configurable via `REFRESH_TOKEN_LIFETIME_DAYS`) | Browser `localStorage` |

Refresh tokens rotate on use (`ROTATE_REFRESH_TOKENS=True`); the old refresh token is not currently blacklisted after rotation (`BLACKLIST_AFTER_ROTATION=False` — see §12).

### 2.2 Why `localStorage`, Not Cookies

This is a deliberate choice, documented directly in `frontend/src/lib/auth.js`: the frontend is a client-only SPA with no server-rendered routes to protect, and the Django backend never sets an `httpOnly` session cookie itself. A cookie written from JavaScript is exactly as readable by an XSS payload as `localStorage` is — so switching storage mechanisms alone would not have improved XSS resistance without also moving cookie-setting to the backend (which would be a larger architecture change). Given that, `localStorage` was chosen for simplicity, with the mitigation effort put into *preventing* XSS in the first place (see §9) rather than into a storage mechanism that offers no real advantage without backend cookie issuance.

### 2.3 Token Expiry Enforcement

1. **Client-side (`lib/auth.js`)** — `isTokenExpired()` checks the JWT `exp` claim with a 30-second clock-skew buffer on every `requireAuth()` call inside protected pages, clearing the token and redirecting to `/signup` if expired.
2. **Django backend** — SimpleJWT validates token signature and expiry on every authenticated API request. A `401` response triggers automatic token clearance and redirect via the frontend's axios response interceptor (`lib/axios.js`).

### 2.4 What Tokens Contain

The access token's own claims carry `user_id`, `username`, `is_chw`, `tier`, `exp`, `iat`. Fields that can change without a new login — notably `email_verified` — are **not** baked into the token, since that would go stale for up to 24 hours; the frontend fetches those fresh via `GET /api/auth/me/` instead. Tokens never contain passwords, symptom data, or AI results.

### 2.5 Token Invalidation on Logout or Deletion

- **Logout** clears both tokens from `localStorage`.
- **Account deletion** (`DELETE /api/user/delete/`) hard-deletes the user row immediately. A still-unexpired access token issued before deletion is rejected on the next request — SimpleJWT's authentication looks the user up by ID on every request, and a deleted user fails that lookup.

---

## 3. Account Verification and Recovery

### 3.1 Email Verification

Registration sends a verification email automatically (a signed, time-limited link — Django's `PasswordResetTokenGenerator` pattern, adapted so the token's validity is tied to `email_verified` state rather than the password, which keeps verification and password-reset tokens from being interchangeable for the same account).

Verification is **deliberately non-blocking** for core triage access — an unverified user can still log in, complete a symptom check, and view their history. The whole point of the free tier is removing barriers for vulnerable users, and a lost verification email should never be the thing standing between someone and a triage result.

It **does** gate the two actions that carry real-world trust:
- Generating a CHW access code (`POST /api/chw/generate-code/`)
- Viewing the doctor referral inbox (`GET /api/doctor/referrals/`)

A user can resend the verification email from **Account Settings** (`POST /api/auth/verify-email/request/`, rate-limited to 5/hour).

### 3.2 Password Reset

`POST /api/auth/password-reset/request/` (rate-limited to 5/hour per IP) always returns the same generic response regardless of whether the email exists, so the endpoint cannot be used to enumerate registered accounts. `POST /api/auth/password-reset/confirm/` validates the emailed token and sets the new password; the token is automatically invalidated the moment the password actually changes, so it cannot be reused.

### 3.3 Email Delivery

Both flows send real email via SMTP once `EMAIL_HOST_USER`/`EMAIL_HOST_PASSWORD` are configured. With no SMTP credentials set, emails are printed to the server console instead of silently dropped or erroring — this keeps local development functional without requiring a mail provider.

### 3.4 Age Verification and Guardian Consent

Age is required at registration (`age` is a mandatory field, bounded to 5–120 to keep nonsense values out of the logic below). SisterCircle+ uses **16** as a single global consent-age threshold, rather than maintaining a different line per region — it's GDPR Article 8's default, which is stricter than COPPA's 13 and stricter than Kenya's and Uganda's DPA provisions, so meeting it tends to satisfy lighter regimes too.

**Under 16:** registration requires a parent/guardian email. We immediately email that address a signed, time-limited consent link (`POST /api/auth/guardian-consent/confirm/`, same token pattern as §3.1/§3.2 — invalidated the moment the guardian actually responds, so the link can't be replayed to flip a resolved decision). Critically, **the minor's access to triage is never delayed by a pending or absent guardian response** — this rests on the same "vital interest" legal basis in §1.4 that already justified urgent triage independent of consent, on the view that a young person in a health-related moment of need shouldn't wait on an email. The account is flagged `guardian_consent_status: pending` until the guardian responds, surfaced to the user as a non-blocking notice.

**16 and over:** no guardian involvement; `guardian_consent_status` is `not_required`.

This is intentionally a narrower fix than a full parental-control system — see §12 for what it does not yet do (automated enforcement if a guardian declines or never responds).

---

## 4. How to Report a Security Vulnerability

We take security vulnerabilities seriously. SisterCircle+ handles sensitive reproductive health data for vulnerable populations, and responsible disclosure protects real users.

### 4.1 Reporting Process

**Please do not report security vulnerabilities via public GitHub issues.**

1. **Email:** security@sistercircleplus.com
2. **Subject line:** `[SECURITY] Brief description`
3. **Include in your report:**
   - Description of the vulnerability and its potential impact
   - Steps to reproduce (proof of concept if available)
   - Affected component (frontend, backend, AI layer, auth, billing)
   - Your name/handle for acknowledgement (optional)

### 4.2 What to Expect

| Timeframe | Action |
|-----------|--------|
| Within 48 hours | Acknowledgement of your report |
| Within 7 days | Initial assessment and severity classification |
| Within 30 days | Patch deployed or remediation plan communicated |
| After patch | Public disclosure (coordinated with reporter) |

### 4.3 Scope

**In scope:**
- Authentication and authorisation bypass
- JWT token leakage or manipulation
- SQL injection or data exposure
- XSS vulnerabilities in any page
- Privilege escalation (accessing another user's symptom data, another doctor's claimed case, etc.)
- Prompt injection attacks on the Claude AI layer
- CORS misconfiguration
- Paystack webhook signature bypass

**Out of scope:**
- Denial of service attacks
- Social engineering of team members
- Issues in third-party services we do not control (Anthropic, Paystack, Sentry, Vercel, Render)
- Vulnerabilities requiring physical device access

### 4.4 Safe Harbour

We commit to not pursuing legal action against researchers who:
- Report vulnerabilities in good faith
- Do not access, modify, or delete real user data
- Do not publicly disclose before we have had 30 days to respond

---

## 5. Data Retention Policy

### 5.1 Symptom Submissions and Account Data

| Status | Retention |
|--------|-----------|
| Active account | Indefinitely (forms the user's health history) |
| After self-service or manual account deletion | **Immediate and permanent.** `DELETE /api/user/delete/` performs a hard delete with no recovery window — there is no soft-delete or 30-day grace period for account data. This cascades to every `SymptomSubmission` row via the database foreign key. |

### 5.2 Server Logs

Our logging configuration (`LOGGING` in `settings.py`) is scoped to never record symptom data or AI responses:
- HTTP method, path, and status code (not request body)
- Exceptions from the AI-triage and submission-save code paths, routed through Python's `logging` module rather than printed directly, so they're bound by this same policy
- Authentication events (login/logout — not credentials)

Log retention: **14 days** on Render (production), then automatically purged. If `SENTRY_DSN` is configured (see §10), error-level events additionally flow to Sentry with `send_default_pii=False` and stack-frame local variables excluded — deliberately, since a traceback inside the triage code could otherwise carry symptom text in scope.

### 5.3 Anthropic API

Symptom data is sent to Anthropic's Claude API to generate triage results, governed by their [Privacy Policy](https://www.anthropic.com/privacy) and [API Terms](https://www.anthropic.com/terms). We do not send names, email addresses, or account identifiers to the Claude API — only clinical symptom data (see §7).

---

## 6. Self-Service Data Access and Deletion

### 6.1 Data Export

Users can download a copy of their account details and every symptom submission they've made from **Account Settings**, or directly via:

```
GET /api/user/export/
Authorization: Bearer <your_access_token>
```

This returns a JSON document with the account record and the full, unpaginated list of the requester's own `SymptomSubmission` rows (a personal export needs to be complete, unlike the paginated list views elsewhere in the app — see §9). The export is scoped to exactly what account deletion would otherwise destroy; it does not currently include CHW-generated codes, doctor-subscription billing history, or payment transaction records (see §12).

### 6.2 Self-Service Deletion

Users can permanently delete their account and all associated data from **Account Settings** (requires typing a confirmation phrase before the action is enabled), or directly via:

```
DELETE /api/user/delete/
Authorization: Bearer <your_access_token>
```

This single endpoint permanently deletes the user account, cascades to delete **all** `SymptomSubmission` records linked to that account, and cannot be undone. It takes effect immediately — see §5.1.

### 6.3 Manual Deletion Request

If you cannot access your account, email **privacy@sistercircleplus.com** with the email address associated with your account and the subject line `Data Deletion Request`. We will process manual deletion requests within **14 days** and confirm by email when complete.

### 6.4 CHW-Generated Data

Community Health Workers who log patient assessments in the field are responsible for ensuring those patients are informed. Patient records logged by CHWs can be deleted by contacting us with the CHW's institution name and approximate submission date.

---

## 7. AI and Claude API Data Handling

### 7.1 What Is Sent to Claude

Only clinical data is sent to the Claude API:

```
Age, location (city/country), user type (Patient/CHW),
cycle data, bleeding data, pain level, symptom list,
free-text notes
```

**Never sent to Claude:** username, email, user ID, account creation date, IP address.

### 7.2 Prompt Injection Protection

User-supplied text fields are sanitized before being inserted into the Claude prompt:

- HTML tags stripped, script injection patterns removed
- Prompt injection phrases (`ignore previous instructions`, `system:`, etc.) replaced with `[removed]`
- All text fields truncated at defined maximum lengths
- Sanitization applied at both the frontend (`lib/sanitize.js`) and backend (`api/sanitizers.py`) — defence in depth

### 7.3 AI Result Reliability

Claude's triage output is:
- Validated to contain only `monitor`, `refer`, or `urgent` as `risk_tier` values
- Capped at `max_tokens=1000` to prevent runaway responses
- Wrapped in `try/except` — any Claude API failure returns a predefined safe fallback response (defaulting to `refer`); raw error details are never exposed to the client, though the exception itself is logged server-side (see §5.2)

**Important:** SisterCircle+ AI analysis is for **informational and triage support purposes only**. It does not constitute medical advice, diagnosis, or treatment. Users are always directed to consult qualified healthcare providers.

---

## 8. CHW and Doctor Referral Data Handling

### 8.1 CHW Access Codes

A verified CHW tied to an institutional license can generate a single-use access code (`POST /api/chw/generate-code/`) to grant a patient the discounted `under_18` tier. Codes are cryptographically random, tied to the issuing institution, and **expire 24 hours after generation** — enforced server-side on the `CHWCode.expires_at` field, matching what the CHW-facing UI tells patients. A code can only be redeemed once per user (`CHWCodeRedemption` has a unique constraint on `(code, user)`), and redemption is the *only* code path in the entire codebase that can move a user to the `under_18` tier.

### 8.2 Doctor Referral Inbox

Doctors and clinics with an **active, paid subscription** and a **verified email** can view a shared inbox of `refer`/`urgent`-tier symptom submissions (`GET /api/doctor/referrals/`). This inbox deliberately omits the submitting user's identity — no name, email, or user ID reaches a doctor through this endpoint, only the clinical picture (symptoms, AI triage output, age, location).

To prevent two doctors from working — or silently dropping — the same case, a doctor must explicitly **claim** a case before it's considered theirs; a claimed case drops out of every other doctor's view of the inbox until released or resolved. Claiming is implemented as a single atomic database update, so two doctors attempting to claim the same case simultaneously cannot both succeed.

### 8.3 What This Does Not Do

There is currently no patient-consent or per-doctor-assignment model — see §12.

---

## 9. Technical Security Controls

### 9.1 Backend (Django)

| Control | Implementation |
|---------|---------------|
| XSS protection | `SECURE_BROWSER_XSS_FILTER = True` |
| Content sniffing | `SECURE_CONTENT_TYPE_NOSNIFF = True` |
| Clickjacking | `X_FRAME_OPTIONS = "DENY"` |
| HTTPS enforcement | `SECURE_SSL_REDIRECT = True` (production only — disabled under `DEBUG` and under the test runner) |
| HSTS | 1 year, including subdomains, preload (production only) |
| Password hashing | PBKDF2-SHA256 (Django default) |
| Rate limiting | Login: 5/15min · Registration: 10/hour · Analyse: 10/hour · Password reset request: 5/hour · Email verification resend: 5/hour (all per-IP except Analyse and the resend, which are per-user) |
| Input validation | DRF serializers + custom `api/sanitizers.py` |
| Row-level security | All symptom queries filtered by `user=request.user`; doctor/CHW list views additionally filtered by role and, for the doctor inbox, claim state |
| List pagination | `SymptomHistoryView`, `CHWAssessmentsView`, and `DoctorReferralInboxView` are paginated (20/page, 100 max) so a single request can't return an unbounded, ever-growing result set — most load-bearing for the doctor inbox, a shared pool with no natural per-user cap |
| Payment webhook integrity | Paystack webhook payloads are verified via HMAC-SHA512 signature before being trusted; processing is idempotent against replayed deliveries |
| Secret management | All secrets via environment variables; `SECRET_KEY` hard-fails at startup if missing |
| Structured error tracking | Optional Sentry integration, inert unless `SENTRY_DSN` is set; `send_default_pii=False` and local stack-frame variables excluded (see §5.2, §10) |

### 9.2 Frontend (React / Vite)

| Control | Implementation |
|---------|---------------|
| Token storage | `localStorage` — see §2.2 for why, and the trade-off this implies |
| Route protection | Client-side `requireAuth()` on every protected page, backed by the backend rejecting expired/invalid tokens regardless |
| Token expiry | Checked on every protected-page mount; a `401` from any request also triggers immediate token clearance via the axios response interceptor |
| Input sanitization | `lib/sanitize.js` before every API call |
| No API keys in browser | `ANTHROPIC_API_KEY` and `PAYSTACK_SECRET_KEY` are backend-only; only `PAYSTACK_PUBLIC_KEY` (designed to be public) and the API base URL are ever exposed to the frontend build |
| CORS | Locked to `CORS_ALLOWED_ORIGINS` env variable; `CORS_ALLOW_ALL_ORIGINS` is explicitly `False` |

---

## 10. Third-Party Services

| Service | Purpose | Data shared |
|---------|---------|-------------|
| **Anthropic Claude API** | AI triage analysis | Clinical symptom data only — no PII (see §7.1) |
| **Paystack** | Payment processing for Standard/Premium/Doctor subscriptions | Card data is handled entirely by Paystack; we store only a transaction reference, amount, and status |
| **Sentry** *(optional)* | Structured error tracking | Error events and their context, with PII and local variables explicitly excluded. Fully inert with no account or DSN configured — this is opt-in infrastructure, not a default-on data flow |
| **Vercel** | Frontend hosting | Encrypted HTTPS traffic only |
| **Render** | Backend hosting | Encrypted HTTPS traffic; env vars secured |
| **PostgreSQL (Render)** | Database | All user and submission data (encrypted at rest) |

SisterCircle+ does not use advertising networks, social media pixels, or analytics services that share data with third parties.

---

## 11. Responsible AI Commitments

SisterCircle+ was built for the THRIVE Hackathon under Track C: Closing the Diagnosis Gap. Our responsible AI principles:

**Transparency** — Users are always informed that triage results are AI-generated and not a substitute for professional medical advice.

**Equity** — A free tier ensures economic barriers do not prevent young women from accessing health triage support; discounted `under_18` access is available through a verified CHW/institutional program, never paywalled behind self-serve checkout.

**Minimisation** — We request only clinical data required for triage. No behavioural tracking, no advertising.

**Human oversight** — The CHW portal keeps a human health worker in the loop for vulnerable populations without reliable internet or self-advocacy capacity. The doctor referral inbox extends that principle to clinical follow-up on `refer`/`urgent` cases, with a claim workflow (see §8.2) so a case is worked by one accountable clinician, not silently dropped between several.

**Fail safe** — If the Claude API fails for any reason, the system returns a conservative `refer` fallback — directing the user to seek professional care rather than providing a false `monitor` result.

**No re-identification in the referral inbox** — The doctor referral inbox never exposes patient identity; see §8.2.

---

## 12. Known Limitations

This section exists because a security document that only describes what's been built, without naming what hasn't, invites misplaced confidence. These are open items, not oversights we're unaware of:

- **No patient-consent or per-doctor-assignment model.** The doctor referral inbox (§8.2) is a shared pool visible to *any* doctor with an active subscription and verified email — there's no mechanism for a patient to consent to (or opt out of) clinical follow-up, and no assignment logic beyond first-come-first-claimed. Before this handles real patients at scale, that gap should close.
- **Refresh tokens are not blacklisted after rotation** (`BLACKLIST_AFTER_ROTATION=False`). A leaked refresh token remains usable until its own expiry even after being rotated once.
- **Data export is scoped to account + symptom submissions only** (§6.1) — it does not include CHW-generated codes, doctor-subscription billing history, or payment transaction records, even though those are also linked to the user.
- **No two-factor authentication.** Password + email verification is the full authentication surface today.
- **No admin-facing tooling to force-revoke a compromised account's tokens** short of deleting the account outright.
- **No automated enforcement of a declined or unresolved guardian-consent request.** §3.4 flags the account as `declined` or leaves it `pending`, but nothing currently restricts the account or its data on that basis, and there's no scheduled task in this codebase to review or act on requests that go unanswered. Today that review is manual, the same as any other data-deletion request in §6.3.

---

*This document is maintained by the SisterCircle+ engineering team. For questions about data handling, email privacy@sistercircleplus.com. For security vulnerabilities, email security@sistercircleplus.com.*

*© 2026 SisterCircle+. Medical Clarity through Clinical Warmth.*
