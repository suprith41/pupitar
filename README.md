# Pupitar

Minimal scaffold for Pupitar with a Next.js 14 frontend and FastAPI backend.

## Frontend

Install dependencies and run the App Router frontend:

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

Copy `.env.example` or `.env.frontend.example` to `.env.local` and fill in the values when needed:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

## Backend

From the backend directory, create an environment, install dependencies, and run FastAPI:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

Health check:

```bash
curl http://localhost:8000/health
```

Copy `.env.backend.example` or `backend/.env.example` to `backend/.env` and fill in the same service values when needed.

## Design Baseline

Pupitar starts in dark mode with a near-black background, restrained muted violet accents, generous spacing, no gradients, no drop shadows, and corners capped at 8px. UI text uses Inter, while code and prompt surfaces use JetBrains Mono.
