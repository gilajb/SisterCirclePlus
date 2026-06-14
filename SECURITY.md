# Security & Data Privacy — SisterCircle+

**Version:** 1.0  
**Last updated:** June 2026  
**Contact:** security@sistercircleplus.com  
**Platform:** SisterCircle+ — AI-powered menstrual health triage for adolescent girls and young women in Sub-Saharan Africa

---

## Table of Contents

1. [What Data We Collect and Why](#1-what-data-we-collect-and-why)
2. [How JWT Tokens Are Stored and Protected](#2-how-jwt-tokens-are-stored-and-protected)
3. [How to Report a Security Vulnerability](#3-how-to-report-a-security-vulnerability)
4. [Data Retention Policy](#4-data-retention-policy)
5. [How to Request Data Deletion](#5-how-to-request-data-deletion)
6. [AI and Claude API Data Handling](#6-ai-and-claude-api-data-handling)
7. [Technical Security Controls](#7-technical-security-controls)
8. [Third-Party Services](#8-third-party-services)
9. [Responsible AI Commitments](#9-responsible-ai-commitments)

---

## 1. What Data We Collect and Why

SisterCircle+ is built on the principle of **minimum necessary data**. We collect only what is clinically required to generate a triage assessment and nothing more.

### 1.1 Account Data

| Field | Purpose | Required |
|-------|---------|----------|
| Username | Account identification | Yes |
| Email address | Login and account recovery | Yes |
| Age | Determine free-tier eligibility (≤25); clinical context | Yes |
| Location (city/country) | Regional health profile context for AI triage | No |
| Password (hashed via Django PBKDF2-SHA256) | Authentication | Yes |
| `is_chw` flag | Unlock Community Health Worker portal | No |
| `is_free_tier` flag | Gate premium features | Auto-set |

We do **not** collect: national ID numbers, phone numbers, photographs, biometric data, or precise GPS coordinates.

### 1.2 Symptom Submission Data

Each time a user completes a symptom check, we store:

| Field | Purpose |
|-------|---------|
| Last period date | Cycle baseline for AI context |
| Cycle length and regularity | Hormonal pattern assessment |
| Bleeding volume and duration | Clinical triage input |
| Pain level (0–10 self-reported) | Symptom severity tracking |
| Selected symptoms (structured list) | AI condition matching |
| Free-text notes (`other_symptoms`) | Additional clinical context |
| AI result (`risk_tier`, conditions, next steps) | Displayed to user; stored for health history |
| Submission timestamp | Health history timeline |

### 1.3 What We Do NOT Collect

- Real-time location tracking
- Device identifiers or fingerprinting data
- Third-party advertising or analytics cookies
- Social media profile data
- Payment information (free-tier users pay nothing; paid tiers TBD)

### 1.4 Legal Basis for Processing

SisterCircle+ processes data under the following bases:

- **Consent** — users explicitly agree to our Terms before submitting symptom data
- **Legitimate interest** — improving triage accuracy for underserved populations
- **Vital interest** — urgent triage results may be necessary to protect life

We comply with Kenya's **Data Protection Act 2019**, Uganda's **Data Protection and Privacy Act 2019**, and align with GDPR principles for users in regions where it applies.

---

## 2. How JWT Tokens Are Stored and Protected

### 2.1 Token Architecture

SisterCircle+ uses **JSON Web Tokens (JWT)** issued by Django REST Framework SimpleJWT. We implement a two-token system:

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access token | 24 hours | Browser cookie |
| Refresh token | 7 days | Browser cookie |

### 2.2 Cookie Security

Tokens are stored in browser cookies, **not** in `localStorage`. This is a deliberate security decision:

- **`localStorage` is readable by any JavaScript** on the page, making it vulnerable to Cross-Site Scripting (XSS) attacks
- **Cookies with `SameSite=Lax`** are not sent on cross-origin form submissions, protecting against Cross-Site Request Forgery (CSRF)
- In production (HTTPS), cookies are set with the **`Secure` flag**, ensuring they are never transmitted over plain HTTP
- Cookie attributes applied: `path=/; SameSite=Lax; Secure` (production)

### 2.3 Token Expiry Enforcement

Token expiry is checked at **two independent layers**:

1. **Next.js Edge Middleware** — decodes the JWT `exp` claim on every request to a protected route before the page renders. Expired tokens are cleared from cookies and the user is redirected to `/signup`
2. **Client-side (`lib/auth.js`)** — `isTokenExpired()` checks expiry with a 30-second clock-skew buffer on every `requireAuth()` call inside protected pages
3. **Django backend** — SimpleJWT validates token signature and expiry on every authenticated API request. A 401 response triggers automatic token clearance and redirect on the frontend

### 2.4 Token Invalidation on Logout

On logout, `removeToken()` in `lib/auth.js`:
- Sets both cookie `max-age` values to `0` (immediate deletion)
- Works across all tabs via the cookie mechanism

### 2.5 What Tokens Contain

JWT payloads contain: `user_id`, `username`, `is_chw`, `is_free_tier`, `exp` (expiry), `iat` (issued at). They do **not** contain passwords, email addresses, or symptom data.

---

## 3. How to Report a Security Vulnerability

We take security vulnerabilities seriously. SisterCircle+ handles sensitive reproductive health data for vulnerable populations, and responsible disclosure protects real users.

### 3.1 Reporting Process

**Please do not report security vulnerabilities via public GitHub issues.**

To report a vulnerability:

1. **Email:** security@sistercircleplus.com
2. **Subject line:** `[SECURITY] Brief description`
3. **Include in your report:**
   - Description of the vulnerability and its potential impact
   - Steps to reproduce (proof of concept if available)
   - Affected component (frontend, backend, AI layer, auth)
   - Your name/handle for acknowledgement (optional)

### 3.2 What to Expect

| Timeframe | Action |
|-----------|--------|
| Within 48 hours | Acknowledgement of your report |
| Within 7 days | Initial assessment and severity classification |
| Within 30 days | Patch deployed or remediation plan communicated |
| After patch | Public disclosure (coordinated with reporter) |

### 3.3 Scope

**In scope:**
- Authentication and authorisation bypass
- JWT token leakage or manipulation
- SQL injection or data exposure
- XSS vulnerabilities in any page
- Privilege escalation (accessing another user's symptom data)
- Prompt injection attacks on the Claude AI layer
- CORS misconfiguration

**Out of scope:**
- Denial of service attacks
- Social engineering of team members
- Issues in third-party services we do not control (Anthropic API, Vercel, Render)
- Vulnerabilities requiring physical device access

### 3.4 Safe Harbour

We commit to not pursuing legal action against researchers who:
- Report vulnerabilities in good faith
- Do not access, modify, or delete real user data
- Do not publicly disclose before we have had 30 days to respond

---

## 4. Data Retention Policy

### 4.1 Symptom Submissions

| Status | Retention Period |
|--------|-----------------|
| Active account | Indefinitely (forms the user's health history) |
| Inactive account (no login for 24 months) | Flagged for deletion; user notified by email |
| After account deletion | Permanently deleted within 30 days |
| AI result stored in `ai_result` field | Same as submission — deleted with submission |

### 4.2 Account Data

Retained for the lifetime of the account plus 30 days after deletion to allow recovery window.

### 4.3 Server Logs

Our logging configuration is hardened to **never record symptom data or AI responses**. Server-level logs record:
- HTTP method, path, and status code (not request body)
- Error stack traces (sanitized — no patient data)
- Authentication events (login/logout — not credentials)

Log retention: **14 days** on Render (production), then automatically purged.

### 4.4 Anthropic API

Symptom data is sent to Anthropic's Claude API to generate triage results. Anthropic's data handling for API calls is governed by their [Privacy Policy](https://www.anthropic.com/privacy) and [API Terms](https://www.anthropic.com/terms). We do not send names, email addresses, or account identifiers to the Claude API — only anonymised clinical symptom data.

---

## 5. How to Request Data Deletion

### 5.1 Self-Service Deletion (Recommended)

Users can permanently delete their account and all associated data via the API:

```
DELETE /api/user/delete/
Authorization: Bearer <your_access_token>
```

This single endpoint:
- Permanently deletes the user account
- Cascades to delete **all** `SymptomSubmission` records linked to that account
- Cannot be undone
- Takes effect immediately

A UI button for this will be added to the account settings page before production launch.

### 5.2 Manual Deletion Request

If you cannot access your account, email **privacy@sistercircleplus.com** with:

- The email address associated with your account
- Subject line: `Data Deletion Request`
- Proof of account ownership (email you registered with is sufficient)

We will process manual deletion requests within **14 days** and confirm by email when complete.

### 5.3 Partial Data Deletion

To delete individual symptom submissions without closing your account, contact privacy@sistercircleplus.com specifying which submissions to remove (by date or submission ID visible in your dashboard).

### 5.4 CHW-Generated Data

Community Health Workers who log patient assessments are responsible for ensuring those patients are informed. Patient records logged by CHWs can be deleted by contacting us with the CHW's institution name and approximate submission date.

---

## 6. AI and Claude API Data Handling

### 6.1 What Is Sent to Claude

Only anonymised clinical data is sent to the Claude API:

```
Age, location (city/country), user type (Patient/CHW),
cycle data, bleeding data, pain level, symptom list,
free-text notes
```

**Never sent to Claude:** username, email, user ID, account creation date, IP address.

### 6.2 Prompt Injection Protection

User-supplied text fields are sanitized before being inserted into the Claude prompt:

- HTML tags stripped
- Script injection patterns removed
- Prompt injection phrases (`ignore previous instructions`, `system:`, etc.) replaced with `[removed]`
- All text fields truncated at defined maximum lengths
- Sanitization applied at both the frontend (`lib/sanitize.js`) and backend (`api/sanitizers.py`) — defence in depth

### 6.3 AI Result Reliability

Claude's triage output is:
- Validated to contain only `monitor`, `refer`, or `urgent` as `risk_tier` values
- Capped at `max_tokens=1000` to prevent runaway responses
- Wrapped in `try/except` — any Claude API failure returns a predefined safe fallback response; raw error details are never exposed to the client

**Important:** SisterCircle+ AI analysis is for **informational and triage support purposes only**. It does not constitute medical advice, diagnosis, or treatment. Users are always directed to consult qualified healthcare providers.

### 6.4 Responsible AI Commitments

- AI triage is a decision-support tool, not a decision-maker
- Risk tiers use conservative defaults (failing to `refer` rather than `monitor` on uncertainty)
- No AI output is stored without being explicitly linked to the user who generated it
- CHW access codes are cryptographically random — real patient names are never used as identifiers

---

## 7. Technical Security Controls

### 7.1 Backend (Django)

| Control | Implementation |
|---------|---------------|
| XSS protection | `SECURE_BROWSER_XSS_FILTER = True` |
| Content sniffing | `SECURE_CONTENT_TYPE_NOSNIFF = True` |
| Clickjacking | `X_FRAME_OPTIONS = "DENY"` |
| HTTPS enforcement | `SECURE_SSL_REDIRECT = True` (production) |
| HSTS | 1 year, including subdomains, preload |
| CSRF | Django `CsrfViewMiddleware` on all state-changing endpoints |
| Password hashing | PBKDF2-SHA256 (Django default) |
| Rate limiting | Login: 5/15min · Analyse: 10/hour (per-user) |
| Input validation | DRF serializers + custom `api/sanitizers.py` |
| Row-level security | All symptom queries filtered by `user=request.user` |
| Secret management | All secrets via environment variables; `SECRET_KEY` hard-fails if missing |

### 7.2 Frontend (Next.js)

| Control | Implementation |
|---------|---------------|
| Token storage | Cookies (`SameSite=Lax; Secure`) — not localStorage |
| Route protection | Next.js Edge Middleware + client-side `requireAuth()` |
| Token expiry | Checked at Edge + client on every render |
| Input sanitization | `lib/sanitize.js` before every API call |
| No API keys in browser | `ANTHROPIC_API_KEY` is backend-only; never in `NEXT_PUBLIC_` |
| CORS | Locked to `CORS_ALLOWED_ORIGINS` env variable |

---

## 8. Third-Party Services

| Service | Purpose | Data shared |
|---------|---------|-------------|
| **Anthropic Claude API** | AI triage analysis | Anonymised symptom data (no PII) |
| **Vercel** | Frontend hosting | Encrypted HTTPS traffic only |
| **Render** | Backend hosting | Encrypted HTTPS traffic; env vars secured |
| **PostgreSQL (Render)** | Database | All user and submission data (encrypted at rest) |

SisterCircle+ does not use advertising networks, social media pixels, or analytics services that share data with third parties.

---

## 9. Responsible AI Commitments

SisterCircle+ was built for the THRIVE Hackathon under Track C: Closing the Diagnosis Gap. Our responsible AI principles:

**Transparency** — Users are always informed that triage results are AI-generated and not a substitute for professional medical advice.

**Equity** — Free access for users aged 25 and under ensures economic barriers do not prevent young women from accessing health triage support.

**Minimisation** — We request only clinical data required for triage. No behavioural tracking, no advertising.

**Human oversight** — The CHW portal is designed to keep a human health worker in the loop for vulnerable populations without reliable internet or self-advocacy capacity.

**Fail safe** — If the Claude API fails for any reason, the system returns a conservative `refer` fallback — directing the user to seek professional care rather than providing a false `monitor` result.

**No re-identification** — CHW patient reference codes are cryptographically random (e.g. `SC-4721`). We do not link CHW assessments to identifiable patient records in our database.

---

*This document is maintained by the SisterCircle+ engineering team. For questions about data handling, email privacy@sistercircleplus.com. For security vulnerabilities, email security@sistercircleplus.com.*

*© 2026 SisterCircle+. Medical Clarity through Clinical Warmth.*
