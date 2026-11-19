# SkillGraph AI

**AI-Powered Skill Gap Analysis & Career Roadmap Engine**

SkillGraph AI is a full-stack student and early-career intelligence platform built as a single **Next.js App Router + TypeScript + Tailwind CSS + Supabase (Auth & PostgreSQL) + Gemini API** project designed for one-click deployment on **Vercel**.

---

## Key Features

- **Public Catalog & Methodology Preview (`/`, `/features`, `/careers`)**: Explore 15 structured engineering, data, AI/ML, cloud, security, and product roles with transparent skill weights, proficiency targets, and side-by-side career comparison.
- **Deterministic Weighted Skill Gap Engine (`/analysis`, `/analysis/[id]`)**: Calculates readiness percentages, skill gaps, priority levels, and weekly time estimates on the server first—paired with Gemini AI narrative insights, 30-day action plans, and PDF report export.
- **Personalized Learning Roadmaps (`/roadmap`)**: Generates 30, 60, 90-day, or custom learning plans across 5 structured phases with task CRUD, completion tracking, pause/resume, reordering, and timeline views.
- **Skills & Portfolio Tracking (`/skills`, `/projects`, `/portfolio`)**: Log 1–5 skill proficiencies linked to GitHub/live project evidence, receive AI portfolio complexity audits, and maintain a clean portfolio showcase.
- **Curated Resources & AI Career Coach (`/resources`, `/career-coach`)**: Bookmark verified official documentation and free courses, and chat with a context-aware AI career coach backed by your profile, skill gaps, and projects.
- **Progress Analytics (`/analytics`, `/dashboard`, `/settings`)**: Track weekly study hours, completed milestones, readiness history, and dark/light theme preferences.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server & Client Components, Node.js Route Handlers)
- **Language & Styling**: TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, jsPDF
- **Validation**: Zod
- **Database & Authentication**: Supabase (PostgreSQL + Row Level Security + Email/Password Auth)
- **AI Engine**: Google Gemini API (`@google/genai`, server-side only)
- **Deployment Target**: Vercel (single Next.js repository, zero external backend server required)

---

## Beginner Setup Guide (Local Development)

### 1. Prerequisites
- Node.js **20+** installed (`node -v`)
- A free [Supabase](https://supabase.com) account
- A [Google AI Studio Gemini API Key](https://aistudio.google.com/apikey)

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Supabase Database & Auth
1. Create a new project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of `supabase/schema.sql` and click **Run**.
   - This creates all 15 tables, automatic `profiles` onboarding triggers, strict Row Level Security (`auth.uid() = user_id`) policies, and seeds all 15 career roles, role skill weights, and curated resources.
4. In Supabase **Authentication -> Providers**, confirm **Email** sign-in is enabled.

### 4. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your four keys in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase **Project Settings -> API -> Project URL**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase **Project Settings -> API -> anon public key**
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase **Project Settings -> API -> service_role secret key** (never expose with `NEXT_PUBLIC_`)
- `GEMINI_API_KEY` — from Google AI Studio (server-side only; never exposed to browser clients)

### 5. Run Locally
```bash
npm run dev
```
Open `http://localhost:3000`.

### 6. Verify TypeScript, Tests, and Production Build
```bash
npm run lint
npx tsx tests/scoringEngine.test.ts
npx tsx tests/api.test.ts
npm run build
```

---

## Deploying to Vercel from GitHub

1. Push this repository to your GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Leave the framework preset as **Next.js** and root directory as `./`.
4. Add the 4 Environment Variables from `.env.example` under **Project Settings -> Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
5. In your Supabase dashboard under **Authentication -> URL Configuration**, add your Vercel deployment URL (e.g., `https://your-app.vercel.app`) to **Site URL** and **Redirect URLs**.
6. Click **Deploy**.
