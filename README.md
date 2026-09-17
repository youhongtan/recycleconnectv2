# RecycleConnect V2

A recycling education and gamification platform built for Malaysia.

V2 adds: eco-friendly school reward redemption, School Bulk Recycling pickup
requests (`/schools`) with nearest-centre matching, an admin School Requests
inbox with email replies, full EN/BM/中文 UI, and an AI assistant that answers
in the app language.

## Stack

- **Frontend:** Vite 6 + React 18 + React Router 6 + Tailwind CSS 3 + shadcn/ui
- **Backend:** Supabase (Database, Auth, Storage)
- **Hosting:** Vercel (static + serverless `/api` functions + daily keepalive cron)
- **AI:** Groq (Llama 3, GPT-OSS, Qwen vision) + Google Gemini, with automatic
  model fallback chains in `api/chat.js` and `api/scan.js`
- **Email:** Resend (admin notifications + school replies; free tier)

## Prerequisites

1. Node.js 18+
2. A Supabase project (create one at [supabase.com](https://supabase.com))
3. A Groq API key ([console.groq.com](https://console.groq.com)) and a Gemini API key
4. (Optional) A Resend API key for email replies

## Environment Variables

Create `.env.local` in the project root (never commit it):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GROQ_API_KEY=your-groq-key
VITE_GEMINI_API_KEY=your-gemini-key
```

`RESEND_API_KEY` (+ optional `RESEND_FROM`, `ADMIN_EMAIL`) is only needed as a
server env on Vercel for email sending.

## Database Setup

In your Supabase SQL Editor, run in order:

1. `supabase/migration.sql` — all tables, indexes, RLS policies, `uploads` bucket
2. `supabase/migration_school_pickup.sql` — school pickup requests table
   (if you ran an early copy of the school migration, also run
   `supabase/migration_school_pickup_v2.sql` for the newer columns)
3. `supabase/seed.sql` — real recycling centres, rewards, challenges

## Run Locally

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel (framework/build/output are pre-set in `vercel.json`)
3. Add the environment variables above in the Vercel dashboard (all environments)
4. Deploy, then add the Vercel URL under Supabase Auth → URL Configuration → Redirect URLs

## Project Structure

```
src/
  api/supabaseClient.js    - Supabase client instance
  lib/AuthContext.jsx      - Auth provider (Supabase Auth)
  lib/ecoProfile.js        - Profile get-or-create helper
  lib/i18n.jsx             - EN/MS/ZH translations
  lib/schoolPickup.js      - Bulk-pickup centre matching (local data)
  pages/                   - Route pages (incl. SchoolRecycling, admin/SchoolRequests)
  components/              - UI components (assistant, finder, profile, admin…)
api/                       - Vercel serverless functions (chat, scan, notify, keepalive)
supabase/                  - migration.sql, migration_school_pickup*.sql, seed.sql
```
