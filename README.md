# SisterCircle+

**Medical Clarity through Clinical Warmth.**

SisterCircle+ is an AI-powered menstrual health triage and diagnosis-support platform built for adolescent girls and young women (AGYW) in Sub-Saharan Africa. It bridges the reproductive health diagnosis gap through accessible, culturally sensitive, clinical-grade triage — powered by Anthropic's Claude API.

Built for the **THRIVE Hackathon 2026 — Track C: Closing the Diagnosis Gap**.

---

## The Problem

Adolescent girls and young women in Kenya, Uganda, and Tanzania face a critical reproductive health diagnosis gap:

- **67% report dismissal** when seeking menstrual health care
- Average wait time to gynecological specialist: **4–6 months**
- Only **12% of CHWs** are trained in menstrual health triage
- Most diagnostic tools are designed for Western healthcare infrastructure (lab access, imaging, specialist referral networks)

## The Solution

SisterCircle+ provides:

- **AI-powered symptom triage** — structured intake → Claude analysis → risk tier output (monitor / refer / urgent)
- **Community Health Worker portal** — field assessment tools, access code generation, patient tracking
- **Free access for under-25s** — economic barriers removed for the most vulnerable demographic
- **Offline-resilient design** — mobile-first, low-bandwidth optimised

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Django 4.2, Django REST Framework |
| Auth | SimpleJWT (24-hour tokens, cookie-based storage) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Database | PostgreSQL (production), SQLite (development) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Project Structure

```
sistercircle-plus/
├── frontend/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── page.jsx            # Landing page
│   │   ├── signup/page.jsx     # Auth (login + register)
│   │   ├── symptom-check/      # 4-step symptom form
│   │   ├── results/            # AI triage results
│   │   ├── dashboard/          # User health history
│   │   ├── chw/                # Community Health Worker portal
│   │   └── layout.jsx          # Root layout + metadata
│   ├── lib/
│   │   ├── axios.js            # Axios instance with JWT interceptors
│   │   ├── auth.js             # Token storage (cookie-based)
│   │   └── sanitize.js         # Client-side input sanitization
│   ├── middleware.js            # Edge route protection + expiry check
│   ├── .env.local.example      # Required environment variables
│   ├── tailwind.config.js
│   ├── next.config.js
│   └── package.json
│
├── backend/                    # Django REST Framework
│   ├── api/
│   │   ├── models.py           # User (custom), SymptomSubmission
│   │   ├── views.py            # All API views incl. Claude integration
│   │   ├── serializers.py      # DRF serializers + validation
│   │   ├── urls.py             # API endpoint routing
│   │   ├── admin.py            # Django admin config
│   │   ├── throttles.py        # Login + analyse rate limiting
│   │   ├── sanitizers.py       # Backend input sanitization
│   │   └── migrations/
│   ├── sistercircle_backend/
│   │   ├── settings.py         # Secured Django settings
│   │   └── urls.py             # Root URL config
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example            # Required environment variables
│
├── SECURITY.md                 # Security and data privacy documentation
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register/` | Public | Create account, returns JWT |
| POST | `/api/auth/login/` | Public · Rate limited | Login, returns JWT |
| POST | `/api/auth/refresh/` | Public | Refresh access token |
| POST | `/api/symptoms/analyse/` | JWT · Rate limited | AI triage analysis |
| POST | `/api/symptoms/submit/` | JWT | Save raw submission |
| POST | `/api/symptoms/save/` | JWT | Confirm save to dashboard |
| GET | `/api/symptoms/history/` | JWT | All user submissions |
| GET | `/api/symptoms/<id>/` | JWT | Single submission |
| GET | `/api/chw/assessments/` | JWT + CHW | CHW patient list |
| POST | `/api/chw/generate-code/` | JWT + CHW | Generate patient access code |
| DELETE | `/api/user/delete/` | JWT | Permanent account deletion |

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Fill in SECRET_KEY, DATABASE_URL, ANTHROPIC_API_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
pnpm install
cp .env.local.example .env.local  # Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### Backend (`backend/.env`)

```env
SECRET_KEY=your-long-random-secret-key
DEBUG=False
ALLOWED_HOSTS=your-render-app.onrender.com
DATABASE_URL=postgres://user:password@host:5432/sistercircle
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
ANTHROPIC_API_KEY=sk-ant-your-key-here
REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> The Anthropic API key is **backend-only**. It must never appear in any `NEXT_PUBLIC_` variable.

---

## Security

See [SECURITY.md](./SECURITY.md) for full documentation on:
- Data collection and legal basis
- JWT token storage and protection
- Vulnerability reporting process
- Data retention policy
- GDPR / Kenya DPA 2019 compliance
- Responsible AI commitments

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Build command: `pip install -r requirements.txt && python manage.py migrate`
3. Start command: `gunicorn sistercircle_backend.wsgi:application`
4. Add all environment variables from `.env.example`
5. Add `gunicorn` to `requirements.txt`

### Frontend → Vercel

1. Import the `frontend/` directory into [Vercel](https://vercel.com)
2. Framework preset: **Next.js**
3. Add `NEXT_PUBLIC_API_URL` pointing to your Render backend URL
4. Set `CORS_ALLOWED_ORIGINS` in your Render backend to your Vercel URL

---

## Team

Built by **Joy Chepkorir Bett** — Co-Founder & CEO, WasteLoop | Co-Founder & Developer, JamiiAfya | Vice Chairperson, MobiGirlz.

GitHub: [github.com/gilajb](https://github.com/gilajb)

---

## License

© 2026 SisterCircle+. All rights reserved.  
Built for the THRIVE Hackathon 2026 — Track C: Closing the Diagnosis Gap.
