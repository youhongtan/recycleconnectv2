# RecycleConnect V2

A recycling education and gamification platform built for Malaysia.

V2 adds: eco-friendly school reward redemption, School Bulk Recycling pickup
requests (`/schools`) with nearest-centre matching, and a new
`school_pickup_requests` table (see `supabase/migration_school_pickup.sql`).

## Stack

- **Frontend:** Vite 6 + React 18 + React Router 6 + Tailwind CSS 3 + shadcn/ui
- **Backend:** Supabase (Database, Auth, Storage)
- **Hosting:** Vercel
- **AI:** OpenAI (GPT-4o-mini) via Vercel Edge Functions

## Prerequisites

1. Node.js 18+
2. A Supabase project (create one at [supabase.com](https://supabase.com))
3. An OpenAI API key

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-key
```

## Database Setup

Run the migration in `supabase/migration.sql` in your Supabase SQL Editor. This creates all tables, indexes, and Row-Level Security policies.

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
2. Import repo in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
src/
  api/supabaseClient.js    - Supabase client instance
  lib/AuthContext.jsx      - Auth provider (Supabase Auth)
  lib/ecoProfile.js        - Profile get-or-create helper
  pages/                   - Route pages
  components/              - UI components
api/                       - Vercel serverless functions (chat, scan)
supabase/migration.sql     - Database schema
```
