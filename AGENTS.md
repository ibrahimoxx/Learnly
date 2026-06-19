# AGENTS.md — Skillforge

> Online learning marketplace SaaS — Udemy-class platform.
> Project-specific context only. Global rules (security, git, workflow, testing, code quality) live in `~/.Codex/AGENTS.md`.

## Autonomous Execution — Full Trust

Codex has full autonomous execution rights in this project. Execute any Edit/Write/Bash/PowerShell tool without asking confirmation. Create, modify, delete any file under `d:\Learnly\` freely. Run builds, migrations, tests, package installs without asking. Never ask "should I proceed?" or "is this okay?" — just execute. Only exceptions: `git push`, dropping production database, or changes that incur direct billing.

---

## Project Context

| Field | Value |
|---|---|
| Project | **Learnly** |
| Type | Multi-tenant SaaS — online learning marketplace |
| Reference | Udemy (feature parity goal) |
| Approach | **Local-first, production-ready architecture** — swap infra via env vars only |
| Phases | ✅ Phase 0 → ✅ Phase 1 → ✅ Phase 2 → ✅ Phase 3 → ✅ Phase 3.5 → ✅ Phase 4 (4.1→4.8 done, 4.9 deferred post-deploy) → **🟧 Phase 5 (seed data — CURRENT)** → 🟥 Phase 6 (deploy) |
| Owner | Ibrahim Stouri |

---

## Stack — Local First, Production Ready

> **Code is identical between local and production. Only environment variables change.**

### Frontend

| Layer | Tech | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router) | RSC, streaming, SEO-critical for course pages |
| UI Library | **shadcn/ui + Radix** | Composable, ownable components, no lock-in |
| Styling | **Tailwind CSS v4** | Design tokens via CSS variables |
| State (server) | **TanStack Query v5** | Data fetching, caching, optimistic updates |
| State (client) | **Zustand** | UI state only — never auth or server data |
| Forms | **React Hook Form + Zod** | Schema-first validation |
| Video Player | **Vidstack** | HLS support, custom skin, accessibility built-in |
| Icons | **Lucide React** | Consistent with shadcn/ui |
| Dates | **date-fns** | Tree-shakeable, no moment.js |
| Tables | **TanStack Table v8** | Headless, fully customizable |
| Notifications | **Sonner** | Toast notifications |
| Markdown | **MDX + react-markdown** | Course content rendering |

### Backend

| Layer | Tech | Notes |
|---|---|---|
| Framework | **FastAPI** (Python 3.13) | Async-first, OpenAPI auto-gen |
| ORM | **SQLAlchemy 2.0** (async) | Type-safe queries |
| Migrations | **Alembic** | Versioned schema |
| Validation | **Pydantic v2** | Request/response models |
| Auth integration | **Clerk Backend SDK** | JWT verification, webhooks sync |
| Job queue | **ARQ** (async Redis queue) | Video encoding, emails, certificates |
| Background scheduler | **APScheduler** | Cron-like tasks |
| HTTP client | **httpx** | Async, retries, timeouts |
| PDF generation | **WeasyPrint** | HTML → PDF certificates |
| Email rendering | **Jinja2** | Email templates |
| Logging | **structlog** | JSON structured logs |
| Testing | **pytest + pytest-asyncio** | Async test support |

### Infrastructure — Local (Phase 1-3)

| Layer | Local Service | Container |
|---|---|---|
| Database | **PostgreSQL 16** | `postgres:16-alpine` |
| Cache / Queue broker | **Redis 7** | `redis:7-alpine` |
| Object storage | **MinIO** (S3-compatible) | `minio/minio:latest` |
| Search engine | **Meilisearch** | `getmeili/meilisearch:latest` |
| Email catcher | **Mailhog** | `mailhog/mailhog:latest` |
| Reverse proxy (optional) | **Caddy** | `caddy:2-alpine` |

### Infrastructure — Production (Phase 5 swap)

| Layer | Production Service | Swap mechanism |
|---|---|---|
| Frontend hosting | **Vercel** | Deploy from GitHub |
| Backend hosting | **Railway** | Docker deploy |
| Database | **Neon** (PostgreSQL serverless) | `DATABASE_URL` env |
| Cache / Queue | **Upstash Redis** | `REDIS_URL` env |
| Object storage | **Cloudflare R2** | `S3_*` env vars (S3 SDK compatible) |
| Search engine | **Meilisearch Cloud** or self-host VPS | `MEILI_URL` env |
| Email | **Resend** | `EMAIL_PROVIDER=resend` env |
| Video streaming | **Cloudflare Stream** | `VIDEO_PROVIDER=stream` env |
| CDN / Proxy / WAF | **Cloudflare** | DNS + Page Rules |
| Auth | **Clerk** (production keys) | Same SDK, different keys |
| Payments | **Stripe** (live mode) | Same SDK, different keys |
| Analytics | **PostHog Cloud** | `POSTHOG_KEY` env |
| Error monitoring | **Sentry** | `SENTRY_DSN` env |

### Auth & Payments (same in local and prod — test/dev mode locally)

| Layer | Tech | Notes |
|---|---|---|
| Auth | **Clerk** | Multi-tenant orgs, OAuth, webhooks |
| Payments | **Stripe Connect** | Marketplace splits for instructors |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                       BROWSER                            │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS
        ┌────────────▼────────────┐
        │   Next.js 15 (Vercel)   │  ← Server Components, ISR, Edge
        │   App Router            │
        └────┬───────────────┬────┘
             │ REST          │ Webhooks (Clerk, Stripe)
        ┌────▼───────────────▼─────┐
        │   FastAPI (Railway)      │
        │   ARQ Workers            │
        └─┬──────┬──────┬──────┬───┘
          │      │      │      │
     ┌────▼┐ ┌──▼──┐ ┌─▼──┐ ┌─▼────┐
     │ PG  │ │Redis│ │ R2 │ │Meili │
     │Neon │ │Upst.│ │CF  │ │Cloud │
     └─────┘ └─────┘ └────┘ └──────┘
```

---

## Project Phases & Validation Checklists

> At the end of each phase, Codex MUST confirm with Ibrahim that all checklist items pass before moving to the next phase.

---

### 🟦 Phase 0 — Foundation Setup

**Goal:** Repo structure, Docker Compose, env management, CI baseline.

**Tasks:**
1. Initialize monorepo: `apps/web` (Next.js), `apps/api` (FastAPI), `packages/shared-types`
2. Create `docker-compose.yml` with: postgres, redis, minio, meilisearch, mailhog
3. Create `.env.example` with ALL variables documented
4. Configure `Makefile` or `justfile` for common commands
5. Setup pre-commit hooks (ruff, prettier, eslint, type-check)
6. Initialize Alembic migrations folder
7. Setup base FastAPI app with health check `/health`
8. Setup Next.js 15 base with shadcn/ui initialized

**✅ Validation Checklist (Ibrahim must verify):**
- [ ] `docker compose up` starts all 5 services without error
- [ ] `http://localhost:9001` opens MinIO console
- [ ] `http://localhost:7700` returns Meilisearch healthy
- [ ] `http://localhost:8025` opens Mailhog UI
- [ ] `http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] `http://localhost:3000` shows Next.js homepage
- [ ] `pre-commit run --all-files` passes with zero warnings
- [ ] `.env.example` has every variable used in code, with comments
- [ ] No secrets committed to git (verify with `git log -p`)

---

### 🟩 Phase 1 — MVP Core (Local)

**Goal:** A student can sign up, browse courses, enroll, watch videos, complete a course, get a certificate.

**Features:**
- Clerk auth integration (student / instructor / admin roles)
- Course CRUD (instructor side)
- Section + Lesson management (video, text, quiz)
- Video upload → MinIO → async encoding (mock encoder for now using FFmpeg local)
- Course catalog page (public, SSR for SEO)
- Course detail page (description, curriculum, instructor, reviews)
- Free enrollment flow
- Video player (Vidstack) with progress saved per lesson
- Student dashboard (My Learning)
- Instructor dashboard (My Courses, basic analytics)
- Certificate PDF generation on 100% completion (WeasyPrint)
- Search via Meilisearch (sync on course publish)
- Email via Mailhog (welcome, enrollment, completion)

**Pages to build (Udemy parity):**
- `/` — Homepage with featured courses
- `/courses` — Catalog with filters
- `/courses/[slug]` — Course detail
- `/learn/[courseId]/[lessonId]` — Player
- `/dashboard` — Student dashboard
- `/instructor/courses` — Instructor course list
- `/instructor/courses/[id]/edit` — Course editor (sections, lessons)
- `/instructor/analytics` — Basic stats
- `/profile` — User profile
- `/sign-in` `/sign-up` — Clerk components

**✅ Validation Checklist:**
- [ ] User can sign up via Clerk (Google + Email)
- [ ] User role correctly synced from Clerk webhook to DB
- [ ] Instructor can create course → upload video → publish
- [ ] Video file lands in MinIO bucket `videos/`
- [ ] ARQ worker logs the encoding job
- [ ] Student can enroll in free course
- [ ] Player plays video, progress saves every 10 seconds
- [ ] On 100% completion, certificate PDF generated and downloadable
- [ ] Search returns results in < 100ms with typo tolerance
- [ ] All emails appear in Mailhog UI
- [ ] No `any` in TypeScript code
- [ ] All FastAPI endpoints have Pydantic request + response models
- [ ] Alembic migration runs cleanly on fresh DB
- [ ] All routes have proper loading + error states

---

### ✅ Phase 2 — SaaS Layer (Local) — COMPLETE

**Goal:** Multi-tenant, paid courses, marketplace economics, reviews.

**Features:**
- Stripe test mode integration
- Paid course enrollment (one-time payment)
- Stripe Connect for instructor payouts (test mode)
- Coupons / promo codes
- Course reviews & ratings (5-star + comment)
- Q&A section per lesson
- Wishlist
- Multi-language UI (i18n with next-intl): EN, FR
- Multi-tenant orgs via Clerk Organizations (B2B private learning)
- Sub-domain routing for org tenants (`acme.skillforge.app`)
- Admin panel (course moderation, user management, payouts)
- Notifications system (in-app + email)
- Email templates with React Email

**Pages added:**
- `/checkout/[courseId]` — Stripe checkout
- `/instructor/payouts` — Payout dashboard
- `/admin/*` — Admin section
- `/wishlist`
- `/notifications`
- `/orgs/[slug]/*` — Tenant pages

**✅ Validation Checklist:**
- [x] Stripe test card `4242 4242 4242 4242` completes checkout
- [x] Stripe webhook updates enrollment in DB
- [x] Instructor sees Connect onboarding flow (test mode)
- [x] Coupon code reduces price correctly
- [x] Review system enforces "must be enrolled" rule
- [x] Multi-tenant: data isolated by `organization_id` in every query
- [x] Sub-domain routing works locally via `/etc/hosts` (`acme.localhost:3000`)
- [x] i18n switches between EN/FR without page reload
- [x] Admin can suspend a user / unpublish a course
- [x] All financial calculations use `Decimal`, never `float`
- [x] Stripe webhook signature verified on every event
- [x] Idempotency keys used on all Stripe API calls

---

### 🟩 Phase 3 — Growth Features (Local) — COMPLETE (PostHog deferred to Phase 5)

**Goal:** Engagement, retention, scale-ready features.

**Features — ✅ DONE:**
- ✅ Learning paths / course bundles
- ✅ Quizzes with auto-grading + retake logic
- ✅ Coding exercises (Judge0 self-hosted — `learnly_judge0_server` on port 2358)
- ✅ Live sessions (LiveKit self-hosted — `learnly_livekit` on ports 7880/7881)
- ✅ Discussion forums per course
- ✅ Course preview / sample lessons
- ✅ Mobile-first responsive overhaul + PWA (manifest + service worker + offline fallback)
- ✅ Gamification (badges, streaks, XP) — `gamification.py` table, `/achievements` page in student nav
- ✅ AI course recommendations (pgvector, 768-dim embeddings) — `embeddings.py`, `recommendations.py`, `recommendations-section.tsx`
- ✅ Affiliate program with referral tracking — instructor `/instructor/affiliate` + admin `/admin/affiliates` pages
- ✅ Drip content (lessons unlock over time) — `unlock_at` column on lessons, locked in player sidebar
- ✅ Real-time progress sync via SSE — `/api/sse/[enrollmentId]` proxy, replaces polling
- ✅ Push notifications (Web Push API) — VAPID, tested end-to-end (Test 7 passed)

**Deferred to Phase 5:**
- Analytics deep dive (PostHog self-hosted local) — see `project_posthog_defer.md` memory, verify on Vercel before prod launch

**New Docker services (added in this phase):**

| Container | Image | Port | Purpose |
|---|---|---|---|
| `learnly_judge0_server` | `judge0/judge0:1.13.1` | 2358 | Code execution API |
| `learnly_judge0_worker` | `judge0/judge0:1.13.1` | — | Code execution worker |
| `learnly_livekit` | `livekit/livekit-server:latest` | 7880/7881 | WebRTC video/audio |

**New Python packages (Phase 3):**
- `livekit-api>=1.0` — token generation. Import: `from livekit.api import AccessToken, VideoGrants`. v1.x uses `.with_identity(id).with_grants(grants)` — NOT `.identity=` or `.add_grant()`.

**Key gotchas:**
- LiveKit UDP port range `50000-60000` removed — conflicts with Windows ephemeral ports. TCP only for local dev.
- `@livekit/components-styles` has no `"style"` export condition → Tailwind v4 PostCSS can't resolve it. CSS copied to `apps/web/public/livekit-styles.css`, injected via `document.createElement("link")` in `useEffect`.
- Monaco editor: `next/dynamic` with `{ ssr: false }` required.
- npm workspace: packages hoist to root `d:\Learnly\node_modules`, not `apps/web/node_modules`.

**Latest Alembic migration:** `o1p2q3r4s5t6` (live_sessions) — all applied.

**✅ Validation Checklist:**
- [x] Web Push works on Chrome desktop (Test 7 — confirmed on real device)
- [x] SSE delivers progress events without polling (Test 9 — confirmed, EventStream live)
- [ ] Quiz auto-grades correctly across all question types
- [ ] Code submission runs in Judge0 sandbox and returns result
- [ ] Live session works between 2 browser tabs locally
- [ ] pgvector returns relevant course recommendations
- [ ] Affiliate link tracks conversion to revenue split
- [ ] PWA installable on mobile (manifest + service worker)
- [ ] PostHog dashboard shows user funnel — **deferred to Phase 5**
- [ ] Lighthouse score: Performance ≥ 90, Accessibility ≥ 95

> Remaining unchecked items were validated as built/working in earlier dev sessions but not re-confirmed in this final test pass. Run them before Phase 4 kickoff if a regression is suspected.

---

### ✅ Phase 3.5 — Premium Design & UX Overhaul — COMPLETE

> ⛔ **DANGER RULE — DESIGN ONLY. ZERO EXCEPTIONS.**
> Phase 3.5 is **visual restyle of pages that already exist**. NOTHING else.
> - ❌ Do NOT add, remove, or change any logic, data fetching, props, state, routing, or behavior.
> - ❌ Do NOT create any new page, route, endpoint, or feature.
> - ❌ Do NOT touch backend, API calls, hooks logic, server actions, or DB.
> - ✅ ONLY touch: `className`, markup layout/structure for visual hierarchy, design tokens (CSS), styling, CSS/Tailwind animation, shadcn component visuals, static visual assets.
> - Every page must look + behave **functionally identical** after restyle — only the visual skin changes.
> - **Missing pages (Udemy has, Learnly doesn't) are SKIPPED here** → deferred to **Phase 4** (build from scratch in the same design language, sub-phases 4.1→4.9). See Phase 4 below.

**Goal:** Match Udemy UX 100% as baseline, then exceed it. Target: visibly premium design, color, animation, and UX vs Udemy — tailored to Skillforge as a learning platform (not generic SaaS), applied to **every page that already exists**.

**Process — per page:**
1. `auto-browser` MCP: open Udemy equivalent + current Skillforge page side-by-side, screenshot both
2. Diff list: layout, spacing, typography, color depth, states (hover/empty/loading/error), micro-interactions
3. Match Udemy 100% first
4. Push polish past Udemy — animations, shadows, gradients, glass effects, course-specific touches (progress rings, streak badges, completion celebrations, etc.)
5. Media assets (course thumbnails, hero art, instructor avatars, promo banners): generate via Higgsfield (`higgsfield-generate`, `higgsfield-product-photoshoot`, `higgsfield-marketplace-cards`, `higgsfield-soul-id`). If Higgsfield can't produce what's needed → write a Codex prompt for it instead
6. **Pilot page first: course detail (`/courses/[slug]`)** — prove the pattern, get Ibrahim's approval, before rolling out to remaining pages
7. Once pattern locked on pilot: bulk mechanical restyle of remaining pages → delegate to Codex (terminal mode, per Codex Delegation table)
8. Skills/agents in use: `frontend-design`, `design-system`, `liquid-glass-design`, `ui-ux-pro-max`, `a11y-architect` agent, `auto-browser` MCP, Higgsfield skills

**Scope:** every **already-built** page in the **UI/UX Reference — Udemy Feature Parity Audit** table below (public, student, instructor, admin, org pages). Pages marked MISSING in the audit (`tasks/phase35-audit.md`) are NOT in scope — they go to Phase 4.

**Prerequisites (Ibrahim, before starting):**
- Start auto-browser: `cd ~/.Codex/tools/auto-browser && docker compose up`
- Confirm Higgsfield is configured (API key in `.env.local`) — verify before first asset generation

**✅ Validation Checklist:**
- [x] Pilot page (course detail) approved by Ibrahim — matches Udemy + visibly premium
- [x] Pattern documented (tokens, components, animation set) for reuse — `tasks/phase35-design-system.md`
- [x] All public pages restyled + approved
- [x] All student pages restyled + approved
- [x] All instructor pages restyled + approved
- [x] All admin pages restyled + approved
- [x] Org/tenant pages restyled + approved
- [x] Lighthouse Accessibility ≥ 95 maintained on every restyled page
- [x] No regressions — re-run relevant Phase 1-3 smoke tests on restyled pages

---

### 🟧 Phase 4 — Build Missing Pages (sub-phases 4.1 → 4.9) (CURRENT — 4.1/4.2 built, testing)

> Renumbered from old "Phase 3.9". Deploy is now **Phase 5**.

**Goal:** Build the ~28 pages Udemy has that Learnly does not yet have — from scratch — using the **exact design language locked in Phase 3.5** (same tokens, components, animation set). Skipped in 3.5 because design-only could not touch them (no UI existed to restyle; building = feature work).

> Start **only after Phase 3.5 is approved**, so the design system is locked and every new page is built premium-first, not restyled later.

**Source of truth for what's missing:** `tasks/phase35-audit.md` — every `MISSING` row (and `STUB` rows that need a real dedicated page).

#### ⛔ NON-REGRESSION HARD RULE — applies to EVERY sub-phase (4.1 → 4.9)
The existing app is **100% working today**. Every sub-phase is **PURELY ADDITIVE**. After each sub-phase the app must still build, run, and behave exactly as before — zero regression, not 1%.
- ✅ ADD new routes, pages, components, endpoints, models, migrations.
- ✅ You MAY update existing code ONLY to make it compatible with a new addition (add a nav link, extend a type with an optional field, add an optional prop) — and ONLY in a backward-compatible way.
- ❌ NEVER change or remove existing behavior, props, fetch contracts, routes, or DB columns that current pages depend on.
- ❌ NEVER make an existing feature stop working to enable a new one.
- Every new DB column/table is nullable or additive, with a reversible Alembic migration. No destructive migration.
- Each sub-phase ENDS with: `npm run build` green + existing smoke routes still 200/307 + new page reachable by click.

#### Sub-phase breakdown (build → test → approve one at a time, in order)
- **4.1 — Public commerce flow:** `/cart`, `/payment/checkout` (real Stripe checkout page), `/payment/checkout/gift`, `/pricing`. (Stripe already wired in Phase 2 — reuse, don't rebuild.) ✅ DONE — includes multi-item checkout (one Stripe payment for N courses, `Gift.batch_id` grouping), multi-item gifting (one recipient, one payment, grouped `MultiGiftCard` on `/gifts` sent+received), and animated cart selection (`/cart` checkboxes drive `?courseId=`/`?courseIds=` on checkout). Tests 1-4 passed (single buy, single gift, multi-buy, multi-gift). Non-regression confirmed.
- **4.2 — Public discovery:** `/user/[username]` (instructor public profile), `/topic/[topic]` (topic landing, SEO).
- **4.3 — Student account:** `/user/edit-profile` + sub-pages `privacy`, `payment-methods`, `purchase-history`, `subscriptions`, `messages`.
- **4.4 — Student learning extras:** `/home/my-courses/notes` (global notes), dedicated completed/certificates page, dedicated route pages for quiz / assignment / coding-exercise (components exist, routes don't).
- **4.5 — Instructor course-manage suite:** `goals`, `captions`, `accessibility`, `pricing`, `communications/welcome`, `review/submit`.
- **4.6 — Instructor performance suite:** `overview`, `students`, `reviews`, `engagement`, `traffic`.
- **4.7 — Instructor comms + tools + finances:** `announcements`, `direct-messages`, `assignments`, `tools/test-video`, `tools/marketplace-insights`, `finances/revenue-report`, co-instructor settings.
- **4.8 — Admin suite:** `categories`, `payouts`, `revenue`, `orgs`, `flags`, `support`, `announcements`.
- **4.9 — Org/tenant:** `admin/activity`, `admin/paths`, dedicated `admin/settings`.

**Rules for Phase 4 (building IS allowed, unlike 3.5):**
- Full stack allowed: routes, data fetching, Pydantic/SQLAlchemy if backend gaps, logic — all normal Phase 1-3 standards apply.
- Every new page MUST ship already wearing the Phase 3.5 design system — no "build ugly, restyle later". Codex gets creative license on layout/visuals **within** the locked token system.
- Reuse existing services/components first; build new only where genuinely missing.
- Tenant isolation, auth, Decimal money, signed-URL uploads — all global + project rules in force.
- Per-sub-phase workflow: Codex writes Codex prompt → Ibrahim runs in Codex → Codex reviews diff (non-regression check) + build → Ibrahim tests → approve → next sub-phase.
- **Workflow buttons rule (mandatory, every page):** every route — normal, empty, success, error state — must show a clear CTA/workflow button guiding the user to the next step (e.g. "Proceed to checkout", "Back to cart", "Browse courses", "Continue", "Go to course"). No dead-end pages with only text. Applies on top of the click-reachability rule below.

**✅ Validation Checklist (per sub-phase + overall):**
- [ ] App still 100% working — zero regression on existing pages (build green, smoke routes pass)
- [ ] Every MISSING page from `tasks/phase35-audit.md` now has a real route + UI
- [ ] Each new page uses the locked Phase 3.5 tokens/components/animations
- [ ] Each new page reachable by click (nav added — no URL-only routes)
- [ ] Each new page has workflow/CTA buttons in every state (normal/empty/success/error)
- [ ] All new backend endpoints have Pydantic request/response models + tenant isolation
- [ ] All new migrations reversible + non-destructive
- [ ] Lighthouse Accessibility ≥ 95 on every new page
- [ ] Phase 1-3 standards (no `any`, Decimal money, auth) met on all new code

---

### 🟧 Phase 5 — Real Seed Data Population (sub-phases 5.1 → 5.7) — CURRENT

> Goal: replace all demo/placeholder content with rich, real-world course data. Platform must look live-ready before deploy. All seed files live at `seed-data/` (project root). Seed scripts go in `seed-data/scripts/` — **never committed to git** (add to `.gitignore`).

#### Schema reference (what we populate)

| Table | Key fields |
|---|---|
| `users` | clerk_id (fake for seeds), email, first_name, last_name, image_url, role=instructor, bio, website |
| `categories` | name, slug, parent_id (supports tree) |
| `courses` | slug, title, subtitle, description, image_url, level, language, status=published, is_free, price_in_cents, learning_objectives[], prerequisites[], target_audience[], welcome_message, completion_message, rating, enrollment_count, instructor_id, category_id |
| `sections` | course_id, title, objective, position |
| `lessons` | section_id, title, type (video/article/quiz/coding_exercise), content, video_url, duration_seconds, position, is_free_preview |
| `quiz_questions` | lesson_id, question_text, options (JSONB array of strings), correct_index, explanation, position |

#### ⛔ Seed data rules
- Fake `clerk_id` format: `seed_instructor_001` → `seed_instructor_010` (never collide with real Clerk IDs)
- All seeded users: `role = instructor`, `is_active = true`, `is_profile_public = true`
- All seeded courses: `status = published`, `organization_id = null`
- `price_in_cents` in EUR cents (e.g. 1999 = €19.99). Free courses = 0 + `is_free = true`
- `video_url` = real YouTube embed URLs (e.g. `https://www.youtube.com/embed/VIDEO_ID`) — no upload needed locally
- `embedding = null` — skip for seed (vector search not critical for seed phase)
- Seed script path: `seed-data/scripts/seed_db.py` — in `.gitignore`, never committed

---

#### 5.1 — Course list curation

**Goal:** Decide the 25 courses to seed. Topics must cover Learnly's main categories. Each course needs a real, recognizable source (free/open content from YouTube, CS50, The Odin Project, freeCodeCamp, MDN, etc.).

**Deliverable:** `seed-data/course-list.json` — array of 25 course entries with:
```json
{
  "working_title": "...",
  "topic": "...",
  "category": "...",
  "level": "beginner|intermediate|expert",
  "is_free": true|false,
  "price_eur": 0-199,
  "source_url": "...",
  "youtube_playlist_or_channel": "...",
  "notes": "..."
}
```

**Target mix (25 courses across 5 categories):**
- Programming & Dev: 10 courses (JS, Python, React, Node, SQL, TypeScript, Git, algorithms, REST API, Docker)
- Design & UI: 4 courses (Figma, CSS/HTML, Tailwind, UX fundamentals)
- Data Science & AI: 4 courses (Python ML, pandas, LLM intro, data viz)
- Business & Productivity: 4 courses (Excel, project management, public speaking, startup fundamentals)
- Personal Dev: 3 courses (time management, writing, mental productivity)

**✅ Done when:** `seed-data/course-list.json` exists with 25 entries, Ibrahim approves the list.

---

#### 5.2 — Raw data collection

**Goal:** For each of the 25 courses, collect full structured content and save as individual raw JSON files. Use real open-source syllabi, real YouTube videos, real article content.

**Sources to mine:**
- freeCodeCamp YouTube: full courses with timestamps = sections + lessons
- CS50 (Harvard): full syllabus, lecture videos on YouTube
- The Odin Project: full curriculum available as JSON/HTML (open source)
- MDN Web Docs: article content for HTML/CSS/JS lessons
- Microsoft Learn / Google Skillshop: structured modules

**Deliverable:** `seed-data/raw/[course-slug].json` per course. Schema:
```json
{
  "title": "...",
  "subtitle": "...",
  "description": "...",
  "level": "...",
  "language": "en",
  "source_url": "...",
  "sections": [
    {
      "title": "Section name",
      "objective": "...",
      "lessons": [
        {
          "title": "Lesson name",
          "type": "video|article|quiz|coding_exercise",
          "youtube_video_id": "...",
          "duration_seconds": 0,
          "content": "article markdown content or null",
          "is_free_preview": false,
          "quiz_questions": [
            {
              "question_text": "...",
              "options": ["A", "B", "C", "D"],
              "correct_index": 0,
              "explanation": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

**Rules:**
- Every course must have ≥ 4 sections
- Every section must have ≥ 3 lessons
- Every course must have ≥ 1 quiz lesson with ≥ 5 questions
- At least 1 coding_exercise lesson per dev course
- video lessons: real YouTube video IDs only (no dead links)
- article lessons: real markdown content (min 300 words)

**✅ Done when:** 25 `seed-data/raw/[slug].json` files exist, all passing schema validation.

---

#### 5.3 — Schema normalization

**Goal:** Transform raw JSON → schema-aligned JSON ready for DB insertion. Strip any field not in our schema. Synthesize any required field missing from raw data.

**Synthesis rules for missing fields:**
| Field | If missing → generate |
|---|---|
| `slug` | kebab-case from title |
| `learning_objectives` | extract 4-6 bullets from description |
| `prerequisites` | infer from level + topic |
| `target_audience` | 2-3 sentences from topic + level |
| `welcome_message` | short welcoming paragraph |
| `completion_message` | short congratulations paragraph |
| `image_url` | placeholder from `https://placehold.co/800x450?text=[slug]` or real course thumbnail |
| `price_in_cents` | from course-list.json × 100 |
| `total_duration_seconds` | sum of all lesson `duration_seconds` |
| `total_lessons` | count of all lessons |
| `rating` | realistic random between 4.2–4.9 |
| `review_count` | realistic random 50–3000 |
| `enrollment_count` | realistic random 500–50000 |
| `image_alt_text` | `"{title} course thumbnail"` |

**Deliverable:** `seed-data/normalized/[course-slug].json` — exact schema shape, ready for insert.

**✅ Done when:** 25 normalized JSON files, each validated against schema fields, no extra keys, no null on required fields.

---

#### 5.4 — Instructor profiles

**Goal:** Create 10 realistic instructor seed records and distribute the 25 courses across them (2-3 courses each).

**Deliverable:** `seed-data/instructors.json` — array of 10 instructor objects:
```json
{
  "clerk_id": "seed_instructor_001",
  "email": "instructor001@learnly-seed.dev",
  "first_name": "...",
  "last_name": "...",
  "image_url": "https://randomuser.me/api/portraits/[men|women]/[N].jpg",
  "role": "instructor",
  "bio": "...",
  "website": "https://...",
  "is_active": true,
  "is_profile_public": true,
  "courses": ["course-slug-1", "course-slug-2", "course-slug-3"]
}
```

**Rules:**
- 10 instructors: mix of domains (5 dev, 2 design, 2 data, 1 business/personal)
- Realistic bios (200-400 chars): mention real skills, years of experience, teaching style
- `randomuser.me` for avatars (real photos, no upload needed)
- Courses distributed: 2-3 per instructor, matched to their domain
- Specializations align with assigned courses

**✅ Done when:** `seed-data/instructors.json` with 10 entries, all 25 courses assigned, Ibrahim approves instructor profiles.

---

#### 5.5 — Category tree

**Goal:** Build the category + subcategory seed data for all 25 courses.

**Deliverable:** `seed-data/categories.json`:
```json
[
  { "name": "Development", "slug": "development", "parent_slug": null,
    "children": [
      { "name": "Web Development", "slug": "web-development" },
      { "name": "Programming Languages", "slug": "programming-languages" },
      { "name": "Databases", "slug": "databases" }
    ]
  },
  { "name": "Design", "slug": "design", "parent_slug": null, "children": [...] },
  { "name": "Data Science", "slug": "data-science", "parent_slug": null, "children": [...] },
  { "name": "Business", "slug": "business", "parent_slug": null, "children": [...] },
  { "name": "Personal Development", "slug": "personal-development", "parent_slug": null, "children": [...] }
]
```

Each course in `normalized/[slug].json` gets a `category_slug` pointing to a subcategory.

**✅ Done when:** `seed-data/categories.json` exists, all 25 courses have a valid `category_slug`.

---

#### 5.6 — Seed script

**Goal:** Python script that reads all seed JSON files and inserts into local PostgreSQL via SQLAlchemy. Idempotent (upsert, not duplicate-insert). Runs in < 60 seconds.

**Script:** `seed-data/scripts/seed_db.py` — **in `.gitignore`, never committed**

**Insert order (respect FK constraints):**
1. Categories (parents first, then children)
2. Users (instructors)
3. Courses (with instructor_id + category_id resolved from slugs)
4. Sections (per course, in position order)
5. Lessons (per section, in position order)
6. QuizQuestions (per quiz lesson)

**Upsert strategy:**
- Categories: `ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`
- Users: `ON CONFLICT (clerk_id) DO UPDATE SET ...`
- Courses: `ON CONFLICT (slug) DO UPDATE SET ...`
- Sections/Lessons/Questions: delete + reinsert per course (simpler than upsert on position)

**✅ Done when:** Script runs without error on fresh local DB, all tables populated, counts match expectations.

---

#### 5.7 — Verification

**Goal:** Confirm every seeded course looks great on every page that displays it.

**Test sequence (one at a time, Ibrahim confirms each):**
1. Homepage → featured courses section shows real titles + thumbnails
2. `/courses` catalog → 25 courses visible with real data, filters work
3. `/courses/[slug]` → full course detail with sections/lessons curriculum visible
4. `/instructor/[username]` → instructor profile shows their courses
5. `/courses/search/?q=javascript` → returns relevant results from Meilisearch (after reindex)
6. Any quiz lesson page → questions render correctly
7. Any article lesson page → markdown renders correctly

**Meilisearch reindex after seed:**
```bash
# Run after seed script
python apps/api/app/management/reindex_courses.py
```

**✅ Done when:** All 7 tests pass, Ibrahim confirms each. Platform looks live-ready with real content.

---

### 🟥 Phase 6 — Production Deployment

> Previously Phase 5. Renumbered to make room for Phase 5 seed data population.

**Goal:** Swap local infra for cloud production. **Zero code change** — only env vars.

**Migration map:**

| Local | → | Production | Action |
|---|---|---|---|
| `postgres` container | → | Neon | Update `DATABASE_URL` |
| `redis` container | → | Upstash | Update `REDIS_URL` |
| `minio` container | → | Cloudflare R2 | Update `S3_ENDPOINT`, `S3_KEY`, `S3_SECRET`, `S3_BUCKET` |
| `meilisearch` container | → | Meilisearch Cloud | Update `MEILI_URL`, `MEILI_KEY` |
| `mailhog` | → | Resend | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` |
| Local FFmpeg encoder | → | Cloudflare Stream | `VIDEO_PROVIDER=stream`, `CF_STREAM_TOKEN` |
| Clerk dev keys | → | Clerk prod keys | Replace `CLERK_*` env |
| Stripe test keys | → | Stripe live keys | Replace `STRIPE_*` env |
| `localhost` URLs | → | Production domains | Replace `NEXT_PUBLIC_API_URL` etc. |

**Tasks:**
1. Domain purchase + Cloudflare DNS setup
2. Create production secrets in Vercel + Railway
3. Setup Sentry projects (frontend + backend)
4. Setup PostHog Cloud project
5. Configure CI/CD pipelines (GitHub Actions)
6. Database backup strategy (Neon point-in-time recovery)
7. Setup monitoring + alerts (UptimeRobot)
8. Run smoke tests against production
9. Setup production Stripe webhook endpoint + verify signatures
10. Update Clerk allowed origins + redirect URLs

**✅ Validation Checklist:**
- [ ] Production frontend loads at custom domain with valid SSL
- [ ] Production API responds to `/health` from custom domain
- [ ] User can sign up with real email on production
- [ ] Real Stripe payment processes successfully (test with $1)
- [ ] Video uploads to R2 via signed URLs from frontend
- [ ] Cloudflare Stream encoding completes within 5 min for 100MB video
- [ ] Search queries hit Meilisearch Cloud and return < 200ms
- [ ] Real email arrives in inbox (test on Gmail, Outlook)
- [ ] Sentry receives a forced error from frontend and backend
- [ ] PostHog dashboard shows real session
- [ ] Lighthouse Production score: Performance ≥ 90 on 4G mobile
- [ ] Cloudflare WAF rules active
- [ ] Rate limiting tested on auth endpoints
- [ ] All env vars documented and rotated from dev values
- [ ] Database backups confirmed running daily
- [ ] No `console.log` or debug code in production bundle
- [ ] CSP headers configured correctly

---

## Folder Structure

```
skillforge/
├── apps/
│   ├── web/                    # Next.js 15
│   │   ├── app/
│   │   │   ├── (marketing)/    # Public pages — homepage, courses, etc.
│   │   │   ├── (auth)/         # Sign-in, sign-up
│   │   │   ├── (student)/      # Student dashboard, learning
│   │   │   ├── (instructor)/   # Instructor dashboard
│   │   │   ├── (admin)/        # Admin panel
│   │   │   ├── api/            # Route handlers (webhooks only)
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── features/       # Feature-specific components
│   │   │   └── shared/         # Cross-feature components
│   │   ├── lib/
│   │   │   ├── api.ts          # Backend client (typed)
│   │   │   ├── clerk.ts        # Clerk helpers
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── types/              # Generated from OpenAPI
│   │   └── middleware.ts       # Auth + tenant routing
│   │
│   └── api/                    # FastAPI
│       ├── app/
│       │   ├── api/v1/         # Route definitions
│       │   ├── core/           # Config, security, deps
│       │   ├── db/             # SQLAlchemy models, session
│       │   ├── schemas/        # Pydantic models
│       │   ├── services/       # Business logic
│       │   ├── workers/        # ARQ tasks
│       │   ├── integrations/   # Stripe, Clerk, S3, Meili
│       │   └── main.py
│       ├── alembic/
│       ├── tests/
│       └── pyproject.toml
│
├── packages/
│   └── shared-types/           # OpenAPI-generated TS types
│
├── docker-compose.yml
├── docker-compose.prod.yml     # Production reference (not used to deploy)
├── .env.example
├── Makefile
└── README.md
```

---

## Stack-Specific Rules

### Next.js 15
- **Server Components by default.** Add `"use client"` only when interactivity is required.
- **Never fetch in Client Components.** Use Server Components or Route Handlers.
- **`fetch()` in RSC** for backend API calls — leverages Next.js cache.
- **No `useEffect` for data fetching.** Use TanStack Query if client-side, RSC otherwise.
- **Generate types from OpenAPI** — never hand-write API response types.
- **All forms use React Hook Form + Zod.** No raw `useState` for form state.
- **Loading.tsx and error.tsx required** for every route segment.
- **Metadata API** for every public page (SEO critical for course pages).

### FastAPI
- **All endpoints async.** No sync `def` for routes.
- **Pydantic v2 for every request and response.** No raw dicts.
- **Use `Depends()` for auth, DB session, rate limit.** Never inline.
- **All financial values are `Decimal`,** never `float`.
- **Stripe webhook signature verified** on every event.
- **Idempotency keys** for all Stripe API write operations.
- **Use SQLAlchemy 2.0 select() syntax.** No legacy `Query` API.
- **Tenant isolation:** every query filtered by `organization_id` via dependency injection. Verify in tests.

### Database
- **No raw SQL** unless it's a migration or a complex aggregation. Use ORM.
- **Every migration reversible** (proper `downgrade()`).
- **No destructive migrations** without explicit Ibrahim approval.
- **Indexes on every FK and every WHERE filter column.**
- **Use UUIDs (v7) for public-facing IDs,** auto-increment for internal.

### Storage (MinIO local / R2 prod)
- **Frontend never uploads directly to MinIO/R2.** Always via signed URL from backend.
- **Bucket structure:** `videos/`, `images/`, `documents/`, `certificates/`, `attachments/`
- **Public assets** go through CDN. **Private assets** require signed URL with TTL.

### Auth (Clerk)
- **Never trust frontend role claims.** Verify role server-side via Clerk JWT.
- **Webhook handlers must be idempotent** (use Clerk event ID).
- **User sync:** Clerk user → local DB user via webhook only. Never create users from frontend.

### Payments (Stripe)
- **Test mode locally.** Live keys only in production env.
- **Webhook endpoint signed.** Reject any event without valid signature.
- **Use Stripe Connect** for instructor payouts.
- **Refund logic** must update enrollment status atomically.

### Search (Meilisearch)
- **Index sync via background job,** not in HTTP request flow.
- **Reindex full corpus** as a CLI command (Makefile target).
- **Filterable attributes** declared at index creation.

---

## Naming Conventions

- **API routes:** kebab-case (`/api/v1/course-reviews`)
- **DB tables:** snake_case plural (`course_enrollments`)
- **DB columns:** snake_case (`created_at`)
- **Pydantic models:** PascalCase, suffix by purpose (`CourseCreate`, `CourseRead`, `CourseUpdate`)
- **SQLAlchemy models:** PascalCase singular (`Course`, `Enrollment`)
- **TS types:** PascalCase (`CourseDTO`, `EnrollmentStatus`)
- **React components:** PascalCase (`CourseCard.tsx`)
- **Hooks:** `use` prefix (`useCourse`, `useEnrollment`)
- **Server Actions:** verb-noun (`createCourse`, `updateLesson`)
- **Env vars:** SCREAMING_SNAKE_CASE
- **Feature flags:** `feature_<name>` lowercase

---

## Environment Variables

> All variables required in `.env.local`. Document every key here. Real values only in `.env.local` (gitignored). `.env.example` has empty placeholders.

```bash
# === Application ===
NODE_ENV=                          # development | production
APP_URL=                           # http://localhost:3000 | https://skillforge.app
API_URL=                           # http://localhost:8000 | https://api.skillforge.app

# === Database ===
DATABASE_URL=                      # postgresql+asyncpg://user:pass@host:port/db

# === Redis ===
REDIS_URL=                         # redis://localhost:6379/0

# === Auth (Clerk) ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= # pk_test_... | pk_live_...
CLERK_SECRET_KEY=                  # sk_test_... | sk_live_...
CLERK_WEBHOOK_SECRET=              # whsec_...

# === Object Storage (MinIO local / R2 prod) ===
S3_ENDPOINT=                       # http://localhost:9000 | https://<acc>.r2.cloudflarestorage.com
S3_REGION=                         # us-east-1 | auto
S3_ACCESS_KEY=                     #
S3_SECRET_KEY=                     #
S3_BUCKET=                         # skillforge-media
S3_PUBLIC_URL=                     # http://localhost:9000 | https://cdn.skillforge.app

# === Search ===
MEILI_URL=                         # http://localhost:7700
MEILI_MASTER_KEY=                  #

# === Email ===
EMAIL_PROVIDER=                    # mailhog | resend
SMTP_HOST=                         # localhost (mailhog) | smtp.resend.com
SMTP_PORT=                         # 1025 | 465
RESEND_API_KEY=                    # re_... (production only)
EMAIL_FROM=                        # noreply@skillforge.app

# === Payments (Stripe) ===
STRIPE_SECRET_KEY=                 # sk_test_... | sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=# pk_test_... | pk_live_...
STRIPE_WEBHOOK_SECRET=             # whsec_...
STRIPE_CONNECT_CLIENT_ID=          # ca_...

# === Video (local FFmpeg / Cloudflare Stream prod) ===
VIDEO_PROVIDER=                    # local | cloudflare_stream
CF_STREAM_ACCOUNT_ID=              # production only
CF_STREAM_API_TOKEN=               # production only

# === Analytics ===
NEXT_PUBLIC_POSTHOG_KEY=           #
NEXT_PUBLIC_POSTHOG_HOST=          # https://app.posthog.com

# === Monitoring ===
SENTRY_DSN_FRONTEND=               # production only
SENTRY_DSN_BACKEND=                # production only

# === Feature Flags ===
FEATURE_LIVE_SESSIONS=             # true | false
FEATURE_AFFILIATE=                 # true | false
```

---

## What NOT To Do In This Project

- ❌ **Don't write any SaaS feature without `organization_id` filter.** Every query is tenant-scoped.
- ❌ **Don't store Stripe amounts as `float`.** Always `Decimal` in Python, integer cents in DB.
- ❌ **Don't trust webhook payloads without signature verification** (Clerk + Stripe).
- ❌ **Don't upload files directly from frontend to S3/R2.** Backend issues signed URL.
- ❌ **Don't call Meilisearch from HTTP request handlers.** Background job only.
- ❌ **Don't put business logic in Server Actions or Route Handlers.** Goes in `services/` (backend) or `lib/` (frontend).
- ❌ **Don't create new shadcn components by hand.** Run the CLI: `npx shadcn@latest add <component>`.
- ❌ **Don't add `useEffect` to fetch data.** RSC or TanStack Query.
- ❌ **Don't bypass the type generation pipeline.** API types come from OpenAPI, not hand-written.
- ❌ **Don't run migrations against production manually.** Always via CI or Alembic CLI with explicit confirmation.
- ❌ **Don't expose internal IDs.** Public APIs use UUIDs.
- ❌ **Don't hardcode role strings.** Use enums (`UserRole.STUDENT`).
- ❌ **Don't deploy without running the full validation checklist for the current phase.**
- ❌ **Don't refactor multiple phases at once.** Finish + validate phase N before starting N+1.

---

## Workflow With Codex

1. **Always work in plan mode first** for any task touching > 1 file.
2. **UI/UX — mandatory browser protocol before writing any component** (see full protocol below).
3. **Reference this AGENTS.md** at every phase transition.
4. **Run the validation checklist** at end of each phase. Report results to Ibrahim before proceeding.
5. **Update `lessons.md`** when you discover a non-obvious gotcha.
6. **Update `todo.md`** as the source of truth for in-progress work.

## Testing Protocol — Non-Negotiable

**After completing every phase (or significant feature block):**

1. Give Ibrahim **one test at a time** — never dump a list
2. Wait for result ("good" / "next" = pass, screenshot/error = investigate and fix)
3. Fix any failure immediately before moving to next test
4. Only move to next phase after **all tests pass**
5. Never skip a test or mark it passed without Ibrahim confirming

Pattern:
> Codex: "Test N — [what to do] → Expected: [what to see]. Tell me what you see."
> Ibrahim: "good" or "next" → Codex gives Test N+1
> Ibrahim: [screenshot/error] → Codex fixes, re-tests same step

---

## UI/UX Browser Protocol — MANDATORY

> This protocol is **non-negotiable**. Before writing a single line of UI code for any page or component, Codex MUST execute the steps below. No exceptions.

### Rule

**Codex must ALWAYS visit the corresponding Udemy page with the browser tool before building any UI.** The goal is pixel-accurate UX parity — spacing, layout, interactions, micro-animations, empty states, loading states, error states, responsive behavior.

---

### Protocol — Step by Step

Every time Codex is about to build a page or component:

**Step 1 — Identify the Udemy equivalent**
Look up the page in the UI/UX Reference section of this file. Find the exact Udemy URL.

**Step 2 — Visit Udemy with browser tool**
```
browser_tool → navigate to https://www.udemy.com/[page-url]
```
Observe and document:
- Overall layout (grid, sidebar, full-width, split-pane)
- Component hierarchy (distinct UI blocks)
- Typography scale (headings, body, labels, captions)
- Spacing rhythm (gaps, padding, margins)
- Color usage (primary CTA, secondary, muted, destructive)
- Interactive states (hover, focus, active, disabled)
- Loading states (skeletons, spinners, placeholders)
- Empty states (no courses, no reviews, no results)
- Error states (failed video, payment error, 404)
- Responsive breakpoints (narrow viewport too)
- Micro-interactions (accordion, toast, tooltip)

**Step 3 — Visit related sub-states**
For complex pages (course player, curriculum builder, checkout), also visit:
- Mobile version: resize browser to 375px width
- Hover/interaction states: hover over cards, buttons, nav items
- Expanded states: open curriculum sections, open dropdowns, open modals

**Step 4 — Build from scratch with Skillforge stack**
Translate what you observed into Next.js 15 + shadcn/ui + Tailwind. Never copy Udemy's HTML or CSS. Build clean, componentized code with Skillforge conventions.

**Step 5 — Self-review before committing**
After building, open your own localhost in the browser. Ask yourself:
- Does the visual hierarchy feel the same as Udemy?
- Are all interactive states implemented (hover, focus, loading, empty, error)?
- Is it responsive (mobile + desktop)?
- Does the behavior match the feature documentation in the UI/UX Reference section below?

---

### Udemy Browser Targets — Per Phase

#### Phase 1
| Page | URL to visit |
|---|---|
| Homepage | `https://www.udemy.com/` |
| Course catalog | `https://www.udemy.com/courses/development/` |
| Course detail | `https://www.udemy.com/course/the-complete-javascript-course/` |
| Search results | `https://www.udemy.com/courses/search/?q=javascript` |
| Instructor public profile | `https://www.udemy.com/user/andrei-neagoie/` |
| Course player | `https://www.udemy.com/course/*/learn/` (needs login — use fallback) |
| Student dashboard | `https://www.udemy.com/home/my-courses/` (needs login — use fallback) |
| Instructor course list | `https://www.udemy.com/instructor/courses/` (needs login — use fallback) |
| Curriculum builder | `https://www.udemy.com/course/*/manage/curriculum/` (needs login — use fallback) |
| Course landing page editor | `https://www.udemy.com/course/*/manage/basics/` (needs login — use fallback) |

#### Phase 2
| Page | URL to visit |
|---|---|
| Cart | `https://www.udemy.com/cart/` |
| Checkout | `https://www.udemy.com/payment/checkout/` |
| Reviews section | Any course detail page → scroll to reviews |
| Q&A dashboard | `https://www.udemy.com/instructor/communication/qa/` (needs login — use fallback) |
| Performance overview | `https://www.udemy.com/instructor/performance/overview/` (needs login — use fallback) |
| Revenue report | `https://www.udemy.com/instructor/finances/revenue-report/` (needs login — use fallback) |
| Account settings | `https://www.udemy.com/user/edit-profile/` (needs login — use fallback) |
| Notifications dropdown | Any page → click bell icon (needs login — use fallback) |

#### Phase 3
| Page | URL to visit |
|---|---|
| Practice test UI | Any course with practice test → launch test (use fallback) |
| Marketplace insights | `https://www.udemy.com/instructor/tools/marketplace-insights/` (needs login — use fallback) |
| Engagement dashboard | `https://www.udemy.com/instructor/performance/engagement/` (needs login — use fallback) |

---

### Fallback — If Udemy Blocks or Requires Login

If a page requires auth that Codex doesn't have:
1. Search `site:web.archive.org udemy.com/[page]` for archived screenshots
2. Search YouTube: `"udemy [page name] walkthrough 2024"` — visit the video page with browser tool to observe the UI
3. Use the full feature documentation in the **UI/UX Reference** section below — every element is already listed in detail
4. Ask Ibrahim — he has a Udemy account and can share screenshots on demand

---

### Design System — Skillforge Tokens (Udemy-inspired baseline)

> Apply in `tailwind.config.ts` and `globals.css`. Customize freely but stay consistent across all pages.

```
Colors:
  Primary:          #a435f0   (Udemy purple — use or replace with Skillforge brand)
  Primary dark:     #7719aa
  Primary hover:    #8710d8
  Text primary:     #1c1d1f
  Text secondary:   #6a6f73
  Text muted:       #9ca3af
  Border:           #d1d7dc
  Background:       #ffffff
  Surface:          #f7f9fa
  Star / Rating:    #e59819
  Success:          #1ea2b1
  Error:            #d32f2f

Typography:
  Font:             Inter, system-ui, sans-serif
  Base size:        16px
  Scale:            12 / 14 / 16 / 18 / 24 / 32 / 40 / 48px
  Weight:           400 (body) / 600 (subheading) / 700 (heading)

Spacing:
  Border radius:    4px (buttons, inputs) / 8px (cards) / 12px (modals)
  Shadow card:      0 2px 4px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.08)
  Shadow modal:     0 8px 32px rgba(0,0,0,.18)

Breakpoints (Tailwind):
  sm: 640px / md: 768px / lg: 1024px / xl: 1280px / 2xl: 1440px
```

---

## UI/UX Reference — Udemy Feature Parity Audit

> **Skillforge must reach full feature parity with Udemy.**
> Codex: when building any page or feature, visit the corresponding Udemy URL with the `--web` browser tool to observe the exact layout, interactions, and UX patterns. Do not copy code — observe and build from scratch with the Skillforge stack.
>
> 🔗 **Primary reference:** https://www.udemy.com

---

### Public Pages (Unauthenticated)

| Page | Udemy URL | Key UX Elements to Replicate |
|---|---|---|
| Homepage | `/` | Hero with search bar, category pills, featured courses, topics trending, top instructors, testimonials, footer CTA |
| Course Catalog | `/courses/` | Left sidebar filters (rating, duration, level, language, price), course cards grid, sort by (Most relevant, Highest rated, Newest, Most popular), active filter tags |
| Category page | `/courses/[category]/` | Category hero, subcategory tabs, featured courses, topic badges |
| Subcategory page | `/courses/[cat]/[subcat]/` | Filtered catalog, related topics sidebar |
| Course Detail (Landing) | `/course/[slug]/` | Sticky sidebar (price, CTA, preview video), breadcrumb, star rating, enrollment count, last updated, what you'll learn checklist, course includes (hours, articles, resources, certificate), curriculum accordion (sections + lessons preview), instructor card, reviews section, students also bought |
| Instructor Public Profile | `/user/[username]/` | Avatar, bio, rating, students, courses count, reviews, course list |
| Search Results | `/courses/search/?q=` | Filters panel, result count, course cards, "did you mean" suggestions |
| Topic Page | `/topic/[topic]/` | Topic description, related courses, related topics |
| Login / Signup | `/login/` `/join/` | Email + password, Google OAuth, Apple OAuth, SSO link |
| Pricing (Business) | `/pricing/` | Plan comparison table |
| Cart | `/cart/` | Course list, price breakdown, coupon input, checkout CTA |
| Checkout | `/payment/checkout/` | Stripe payment form, order summary, secure badge, money-back guarantee |
| Gift course | `/payment/checkout/gift/` | Gift recipient email, message |

---

### Student Pages (Authenticated)

| Page | Udemy URL | Key UX Elements |
|---|---|---|
| My Learning | `/home/my-courses/` | Course cards with progress bar, filter tabs (All, In Progress, Completed, Archived, Wishlist), sort by (Recent, Title, Last accessed), search bar |
| Course Player | `/course/[slug]/learn/lecture/[id]/` | Left sidebar (curriculum tree, progress %, section collapse), video player center (playback speed, CC, quality, fullscreen, notes), right panel (Q&A tab, Notes tab, Announcements tab, Reviews tab, Search tab), keyboard shortcuts, auto-play next lecture |
| Notes | `/home/my-courses/notes/` | All notes across courses, filter by course, edit/delete inline |
| Wishlist | `/home/my-courses/wishlist/` | Saved courses, add to cart from wishlist |
| Certificates | `/home/my-courses/completed/` | Downloadable PDF certificate per course, LinkedIn share button |
| Account Settings | `/user/edit-profile/` | Photo, name, bio, website, Twitter, LinkedIn, language, timezone |
| Notification Settings | `/user/edit-profile/notifications/` | Toggle email notifications by type |
| Privacy Settings | `/user/edit-profile/privacy/` | Profile visibility, data settings |
| Payment Methods | `/user/edit-profile/payment-methods/` | Saved cards, billing history |
| Purchase History | `/user/edit-profile/purchase-history/` | Transaction list, download invoice |
| Subscriptions | `/user/edit-profile/subscriptions/` | Plan info, cancel, upgrade |
| Messages | `/user/edit-profile/messages/` | DM inbox with instructors |
| Assignments | `/course/[slug]/learn/quiz/[id]/` | Assignment submission, instructor feedback |
| Quiz/Practice Test | `/course/[slug]/learn/quiz/[id]/` | Timed or untimed, question types, result summary, retry |
| Coding Exercise | `/course/[slug]/learn/coding-exercise/[id]/` | Split-pane editor + instructions, run/submit |

---

### Instructor Pages (Authenticated + Instructor Role)

| Page | Udemy URL | Key UX Elements |
|---|---|---|
| Instructor Dashboard Home | `/instructor/courses/` | Course cards grid, status badge (Draft/In Review/Published), quick stats, New Course CTA |
| Course Creator — Intended Learners | `/course/[id]/manage/goals/` | Learning objectives input (min 4), prerequisites, target audience |
| Course Creator — Curriculum | `/course/[id]/manage/curriculum/` | Drag-and-drop sections, drag-and-drop lectures within sections, add lecture (video/article/quiz/coding exercise), bulk upload, section description |
| Course Creator — Captions | `/course/[id]/manage/captions/` | Upload SRT, auto-caption request |
| Course Creator — Accessibility | `/course/[id]/manage/accessibility/` | Alt text for images |
| Course Creator — Landing Page | `/course/[id]/manage/basics/` | Title, subtitle, description (rich text), language, level, category, topic tags, course image, promo video |
| Course Creator — Pricing | `/course/[id]/manage/pricing/` | Price tier selector, free toggle, currency |
| Course Creator — Promotions | `/course/[id]/manage/promotions/` | Create coupon (%, fixed, free), referral link, bulk coupon |
| Course Creator — Course Messages | `/course/[id]/manage/communications/welcome/` | Welcome message, congratulations message (auto-email to students) |
| Course Creator — Submit for Review | `/course/[id]/manage/review/` | Checklist completion, submit button |
| Instructor Performance — Overview | `/instructor/performance/overview/` | Total revenue, total students, avg rating, chart (last 12 months), per-course breakdown |
| Instructor Performance — Students | `/instructor/performance/students/` | World map, languages, other topics, student list (name, enrolled date, progress, last visit, questions asked) |
| Instructor Performance — Reviews | `/instructor/performance/reviews/` | All reviews across courses, filter by rating/course, respond to review, review insights tab (top themes) |
| Instructor Performance — Engagement | `/instructor/performance/engagement/` | Minutes watched chart, completion rate, practice test insights, coding exercise insights, fast feedback (👍👎 per section) |
| Instructor Performance — Traffic & Conversion | `/instructor/performance/traffic/` | Page visits, conversion rate, traffic sources |
| Instructor Communications — Q&A | `/instructor/communication/qa/` | All student questions, filter (unanswered/unread), single/double pane view, mark top answer, feature question, AI-suggested answer, Q&A insights (themes per lecture) |
| Instructor Communications — Announcements | `/instructor/communication/announcements/` | Send announcement email to all enrolled students |
| Instructor Communications — Direct Messages | `/instructor/communication/direct-messages/` | DM inbox with students |
| Instructor Communications — Assignments | `/instructor/communication/assignments/` | Review submitted assignments, give feedback |
| Instructor Tools — Test Video | `/instructor/tools/test-video/` | Upload test video, get expert feedback |
| Instructor Tools — Marketplace Insights | `/instructor/tools/marketplace-insights/` | Search demand by topic, competition score, avg rating, earnings potential |
| Instructor Tools — Bulk Coupon Creation | `/instructor/tools/bulk-coupons/` | Generate N coupons in one click |
| Instructor Tools — Course Bundling | `/instructor/tools/bundles/` | Bundle multiple courses, set bundle price |
| Revenue Report | `/instructor/finances/revenue-report/` | Transaction list (date, course, amount, type), filter by period, export CSV |
| Payout Report | `/instructor/finances/payout-report/` | Payout history, pending balance, payout method setup |
| Co-instructor Management | `/course/[id]/manage/settings/` | Invite co-instructor by email, set permissions (visible/manage/Q&A/reviews/assignments/revenue share), remove |

---

### Admin Pages (Internal)

| Page | Route in Skillforge | Key Features |
|---|---|---|
| Admin Overview | `/admin/` | Platform KPIs (MAU, revenue, courses, enrollments) |
| User Management | `/admin/users/` | Search users, filter by role, suspend/ban, impersonate |
| Course Moderation | `/admin/courses/` | Review queue (submitted courses), approve/reject with feedback, unpublish |
| Category Management | `/admin/categories/` | CRUD categories, subcategories, topics |
| Payout Management | `/admin/payouts/` | Pending payouts, approve/reject, payout history |
| Revenue Dashboard | `/admin/revenue/` | Platform revenue, instructor splits, Stripe fees |
| Coupon Management | `/admin/coupons/` | All platform coupons, deactivate |
| Organization Management | `/admin/orgs/` | Tenant list, plan, status, impersonate |
| Feature Flags | `/admin/flags/` | Toggle features on/off per env or per org |
| Support Tickets | `/admin/support/` | Tickets from students/instructors |
| Announcements | `/admin/announcements/` | Platform-wide banners |

---

### Multi-tenant Org Pages (B2B — Phase 2)

| Page | Route | Key Features |
|---|---|---|
| Org Homepage | `[slug].skillforge.app/` | Branded landing, org logo, featured courses |
| Org Course Catalog | `[slug].skillforge.app/courses/` | Filtered to org-only courses |
| Org Admin Dashboard | `[slug].skillforge.app/admin/` | User management, learning paths, activity reports |
| Org User Activity | `[slug].skillforge.app/admin/activity/` | Minutes watched, active users, progress per user |
| Org Learning Paths | `[slug].skillforge.app/admin/paths/` | Create/assign learning paths to team members |
| Org Settings | `[slug].skillforge.app/admin/settings/` | Branding, SSO, billing, seat management |

---

### Feature Details — Exact Behavior to Replicate

#### Video Player (Course Player)
- Playback speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
- Auto-save progress every 10 seconds
- Resume from last position on re-open
- Closed captions (SRT upload + toggle)
- Fullscreen mode
- Picture-in-picture
- Keyboard shortcuts: Space (play/pause), F (fullscreen), M (mute), arrows (seek 5s), numbers 0-9 (seek %)
- Auto-play next lecture toggle
- Mark lecture complete manually (checkbox)
- Lecture automatically marked complete at 90% watched

#### Course Curriculum Builder
- Drag-and-drop sections and lectures (react-beautiful-dnd or dnd-kit)
- Lecture types: Video, Article (rich text), Quiz, Coding Exercise, Assignment
- Section: title + learning objective
- Lecture: title + content + free preview toggle + downloadable toggle
- Bulk video upload with progress indicators
- Reorder via drag handle

#### Reviews System
- 1-5 star rating required at course completion prompt
- Text review optional (min 75 chars if submitted)
- Instructor can respond once per review
- Helpful/not helpful vote on reviews
- Sort: Most recent, Most helpful, Critical (≤3 stars), Positive (≥4 stars)
- Featured review (algorithmically chosen, pinned at top)
- Review insights: top themes extracted from all reviews

#### Q&A System
- Students ask questions linked to a specific lecture + timestamp
- Instructors respond in thread
- Other students can answer
- Mark "Top Answer"
- Mark "Featured Question" (pinned)
- Upvote questions
- AI-generated draft answer for instructor to review (Phase 3)
- Q&A Insights: top themes per lecture (Phase 3)

#### Certificate
- Auto-generated PDF on 100% course completion
- Contains: student name, course title, instructor name, completion date, course duration, Skillforge logo, unique verification URL
- LinkedIn "Add to profile" button
- Shareable public verification URL

#### Search
- Full-text search on: course title, subtitle, description, instructor name, topic tags
- Filters: price (free/paid/price range), rating (≥4.5/≥4.0/≥3.5), duration (<1h/1-3h/3-6h/6-17h/17h+), level (beginner/intermediate/expert/all), language, topic, category
- Sort: Most relevant, Highest rated, Most reviewed, Newest, Price (low/high)
- Typo tolerance
- Search suggestions dropdown (autocomplete)
- "X results for Y" count

#### Notifications
- In-app notification bell (unread count badge)
- Types: new Q&A reply, new review, new enrollment, payout processed, course approved/rejected, assignment submitted, announcement, direct message
- Email notifications (toggleable per type in settings)
- Mark all as read

---

## References

- **Udemy (primary UX reference):** https://www.udemy.com
- **Udemy Support Docs:** https://support.udemy.com
- Next.js 15: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- Clerk: https://clerk.com/docs
- Stripe Connect: https://stripe.com/docs/connect
- shadcn/ui: https://ui.shadcn.com
- Vidstack: https://vidstack.io
- Meilisearch: https://www.meilisearch.com/docs
- ARQ (job queue): https://arq-docs.helpmanual.io

---

## Skills Routing — Next.js + FastAPI Project

| Phase | Skills / Agents |
|-------|----------------|
| Design/UI | `frontend-design`, `design-system`, `liquid-glass-design`, `a11y-architect`, `nextjs-turbopack` |
| Backend/API | `api-design`, `backend-patterns`, `python-patterns`, `silent-failure-hunter` |
| Database | `postgres-patterns`, `database-migrations` |
| Auth/Payments | `security-reviewer` agent, `silent-failure-hunter` agent |
| Testing | `tdd-guide` agent, `tdd-workflow`, `python-testing`, `pr-test-analyzer` agent |
| Security | `security-reviewer` agent, `security-review`, `silent-failure-hunter` agent |
| Performance | `performance-optimizer` agent |
| Refactor | `refactor-cleaner` agent, `code-simplifier` agent |
| PR/Commit | `finishing-a-development-branch`, `pr-review-toolkit`, `commit-commands` |

> Global routing rules in ~/.Codex/AGENTS.md always active on top of these.

### Codex Delegation — Per Phase

| Phase | Who | Mode |
|-------|-----|------|
| Planning / architecture / explain | Codex only | — |
| Config / env / AGENTS.md edits | Codex only | — |
| Security review (auth, Clerk, Stripe) | Codex only | review + BLOCK |
| PR / commit prep | Codex only | review |
| Frontend/UI — component fix | Codex | exec |
| Frontend/UI — full page / restyle | Codex | terminal |
| Next.js API route / server action | Codex | terminal |
| FastAPI endpoint / service / schema | Codex | terminal |
| SQLAlchemy model / Alembic migration | Codex | terminal |
| ARQ job / background task | Codex | terminal |
| Testing (pytest / vitest) | Codex | terminal |
| Bug fix — single file | Codex | exec |
| Bug fix — multi-file / complex | Codex | terminal |
| Refactor / dead code cleanup | Codex | terminal |
| Feature (any size) | Codex | terminal |

> exec = bridge auto-runs (`codex-exec-enhanced.ps1`). terminal = Codex generates prompt → you paste to Codex → bring result back.

> **Place this file at the root of your project.** Your global `~/.Codex/AGENTS.md` handles everything else (security, git, code quality, testing protocol, etc.).
