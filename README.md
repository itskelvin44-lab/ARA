# ARA Hub — Adaptive Reasoning Architecture Collaboration Platform

The private collaboration workspace for the ARA Cognitives team building the Adaptive Reasoning Architecture. A real-time group chat, notice board, member directory, project repository, and document sharing — all backed by Supabase and deployed on Cloudflare Pages.

**Live site:** [https://ara-cognitives.pages.dev](https://ara-cognitives.pages.dev)

---

## Architecture Overview

```
Browser (SPA)
    │
    ├── Supabase Auth (Google OAuth)
    │       └── profiles table
    │
    ├── Supabase Database (Postgres)
    │       ├── messages         (group chat — Realtime-enabled)
    │       ├── notices          (notice board posts)
    │       ├── notice_reactions (likes + pins)
    │       ├── resources        (project notes / links)
    │       └── uploads          (file metadata)
    │
    ├── Supabase Storage
    │       ├── chat-attachments (files shared in chat)
    │       └── project-uploads  (documents uploaded to notes)
    │
    └── Supabase Realtime
            ├── Postgres Changes → messages table (live chat)
            └── Presence → online user tracking
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Plain HTML, CSS, JavaScript — no framework, no build tool |
| **Auth** | Supabase Auth with Google OAuth 2.0 |
| **Database** | Postgres (via Supabase) with Row Level Security |
| **Real-time** | Supabase Realtime (WebSocket) |
| **Storage** | Supabase Storage (S3-compatible) |
| **Deployment** | Cloudflare Pages — static files, auto-deploy on push |

---

## Features

- **🔐 Google Sign-In** — One-click authentication. New users complete a profile onboarding flow; returning users go straight in.
- **💬 Group Chat** — Real-time messaging via Supabase Realtime. Messages persist in Postgres and appear instantly for all connected members. Offline members receive them on next sign-in.
- **📋 Notice Board** — Post announcements, updates, questions, and ideas. Like and pin notices. Pinned and urgent notices surface on the Dashboard.
- **👥 Member Directory** — See all workspace members, their roles, skills, and online status (via Supabase Presence). Filter by name, role, or skill. Direct message from member cards.
- **🔗 Repository Page** — Project README, architecture overview, contribution cheatsheet, and GitHub link.
- **📚 Project Notes** — Add resource links (papers, books, documents) and upload files. All metadata stored in Postgres; files stored in Supabase Storage.
- **📱 Responsive** — Full mobile support with collapsible sidebar, adaptive grids, and touch-friendly UI.

---

## File Structure

```
ara-hub/
├── index.html                # SPA shell — all panels, modals, auth screens
├── know-more.html            # Public landing page (no auth required)
├── css/
│   ├── main.css              # App styles (from ara_hub_v4.html)
│   └── know-more.css         # Landing page styles (from ARA_redesigned.html)
├── js/
│   ├── supabase-client.js    # Supabase client initialisation
│   ├── auth.js               # Google OAuth, session handling, onboarding
│   ├── app.js                # State management, navigation, modals, toasts
│   ├── chat.js               # Messages: load, send, file attach, Realtime subscribe
│   ├── notices.js            # Notices: load, post, react (like/pin)
│   ├── members.js            # Members: load, filter, render, Presence subscribe
│   └── notes.js              # Resources & file uploads: load, add, upload
├── supabase/
│   ├── schema.sql            # All table definitions, triggers, indexes
│   ├── policies.sql          # Row Level Security + storage policies
│   └── seed.sql              # Initial notices (run after first sign-in)
├── _redirects                # Cloudflare Pages SPA routing
├── .env.example              # Credential template
├── .gitignore
└── README.md
```

**16 files. No `node_modules`. No `package.json`. No build step.**

---

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `profiles` | One row per user | `id` (PK, references `auth.users`), `name`, `role`, `bio`, `skills[]`, `color`, `onboarding_complete` |
| `messages` | Group chat messages | `id`, `sender_id` (FK → profiles), `type` (text\|file), `content`, `file_name`, `file_url` |
| `notices` | Notice board posts | `id`, `author_id` (FK → profiles), `title`, `body`, `category` (info\|urgent\|update\|question\|idea) |
| `notice_reactions` | Likes and pins | `notice_id`, `user_id`, `type` (like\|pin), UNIQUE constraint for toggle |
| `resources` | Project notes/links | `id`, `author_id`, `title`, `type` (paper\|book\|doc\|link\|other), `description` |
| `uploads` | File metadata | `id`, `uploaded_by`, `file_name`, `file_url`, `file_size` |

### Security

- **Row Level Security** enabled on all tables
- Authenticated users can read all rows
- Users can only INSERT rows with their own `auth.uid()`
- Users can only UPDATE/DELETE their own rows
- Storage buckets are private; access controlled by RLS policies

---

## Realtime

| Channel | Type | Purpose |
|---------|------|---------|
| `group-chat` | Postgres Changes | Watches `messages` table for INSERT events — delivers new messages to all connected clients |
| `online-users` | Presence | Tracks which users are currently connected — powers the green online dots on member cards |

Offline delivery is handled by the database: when a user signs in, `loadMessages()` fetches all rows including those sent while they were offline.

---

## Local Development

### Prerequisites

- A Supabase project (free tier works)
- Google OAuth credentials (Client ID + Secret)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/itskelvin44-lab/ARA.git
   cd ara-hub
   ```

2. **Configure Supabase credentials**
   Edit `js/supabase-client.js` with your Supabase URL and anon key:
   ```js
   const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'
   const SUPABASE_ANON = 'your-anon-key'
   ```

3. **Serve locally**
   ```bash
   python3 -m http.server 3000
   # or: npx serve .
   ```

4. **Open** `http://localhost:3000`

5. **Ensure OAuth redirect URIs include** `http://localhost:3000` in both:
   - Supabase → Authentication → URL Configuration
   - Google Cloud Console → OAuth client

---

## Deployment

The project deploys automatically on every push to `main` via Cloudflare Pages.

**Build settings:**
- Framework preset: **None**
- Build command: *(empty)*
- Output directory: **`/`**

**Post-deployment:** Add the Pages URL to Supabase and Google OAuth redirect URIs.

---

## First-Time Supabase Setup

Run these in the Supabase SQL Editor, in order:

1. `supabase/schema.sql` — creates all tables, triggers, indexes
2. `supabase/policies.sql` — enables RLS, creates access policies
3. Create storage buckets: `chat-attachments` + `project-uploads` (both private)
4. Enable Realtime on the `messages` table (Database → Replication → toggle ON)
5. Configure Google OAuth provider in Authentication → Providers
6. After first user signs in, optionally run `supabase/seed.sql`

---

## The Demo Files

The original demo files (`ara_hub_v4.html` and `ARA_redesigned.html`) are the visual specification this project was extracted from. They contain all the CSS, HTML structure, and UX patterns preserved in the split file structure. They are kept for reference but are not served by the deployed app.

---

## License

Private workspace for ARA Cognitives contributors. Not licensed for redistribution.

#by Devs- kelvin

