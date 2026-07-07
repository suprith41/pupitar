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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by browser-side Supabase Auth. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

After changing `.env.local`, restart `npm run dev` so Next.js and middleware pick up the new values.

## Backend

From the backend directory, create an environment, install dependencies, and run FastAPI:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

If you start Uvicorn from the repository root instead, use `uvicorn main:app --reload` there as well; the root-level [main.py](main.py) now forwards to [backend/main.py](backend/main.py).

Run `source .venv/bin/activate` as one command. If virtual environment creation is interrupted, remove the partial `backend/.venv` directory and run `python3 -m venv .venv` again.

The backend runs at `http://localhost:8000`.

Health check:

```bash
curl http://localhost:8000/health
```

Copy `.env.backend.example` or `backend/.env.example` to `backend/.env` and fill in the same service values when needed.

## Design Baseline

Pupitar starts in dark mode with a near-black background, restrained muted violet accents, generous spacing, no gradients, no drop shadows, and corners capped at 8px. UI text uses Inter, while code and prompt surfaces use JetBrains Mono.
