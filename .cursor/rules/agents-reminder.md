# Project Agent Rules - Adaptive Learning System

## Always read these local context files first

When starting a new session or receiving a new task, **ALWAYS** use the `Read` tool to load these files (in order) before doing anything else:

1. `AGENTS.md` — mandatory rules, project context, commit conventions
2. `PROJECT_KNOWLEDGE.md` — internal knowledge base (DB schema, API endpoints, BKT algorithm, etc.)

These files are in `.gitignore` and may contain sensitive context. Do NOT auto-read every line into every response — only load them on session start or when the task requires architectural context.

## Core rules (summary)

- **Do not commit on your own.** Prepare code, write a commit message, stop. User commits.
- **Delete old code when replacing it.** No dead code, no commented-out blocks, no "keep for compat" leftovers.
- **Grep all callers before deleting** a function/class/file.
- **Docs must match code 100%.** When you change architecture, update `AGENTS.md` section 2 + `PROJECT_KNOWLEDGE.md` to match reality.
- **Verify with compiler/type-check** after edits:
  - Backend: `python -m compileall -q backend/app`
  - Frontend: `npx tsc --noEmit` or `npm run build`
- **Report at end of task:** list of changed files (grouped by function), proposed commit message if asked, warnings about side-effects.
- **User writes in Vietnamese with typos** — understand intent, do not correct spelling.

## Project identity (quick reference)

- **Name:** Adaptive Learning System (web adaptive learning, BKT-based)
- **Stack:** FastAPI + PostgreSQL + SQLAlchemy 2.x + Alembic (backend) / React 19 + Vite 8 + TypeScript + Tailwind v3 (frontend)
- **DB:** 20 tables (17 models + 2 n-n junction + alembic_version). Bảng `practice_configurations` đã xoá.
- **API:** ~48 endpoints (Auth 4 + Content 8 + Enrollment 2 + Learning 6 + Admin 26 + Uploads 1)
- **BKT thresholds** hardcode in `backend/app/mastery/service.py`:
  - `LEVEL_UP_MASTERY = 0.85`
  - `COMPLETION_MASTERY = 0.90`
  - `REVIEW_MASTERY = 0.30`
  - `QUESTIONS_PER_SESSION = 8`
  - `STARTING_LEVEL = 1`
- **Admin default:** `admin@adaptive.com` / `Admin@123` (created by migration `a1b2c3d4e5f6`)
- **No CORS** — Vite proxy `/api/*` → `http://localhost:8000/*`
- **Vite config:** rewrite `/api/*` → `:8000/*` (xoá prefix `/api`)
- **FE baseURL** hardcode = `/api` trong `frontend/src/lib/api.ts` (KHÔNG đọc `.env.local`)

For full context, read `AGENTS.md` and `PROJECT_KNOWLEDGE.md`.
