# ZenyFit Architecture

Everything that happens behind the scenes when users interact with ZenyFit.

---

## Service Limits & Costs

ZenyFit runs entirely on free tiers. Here's what we get and what to watch.

### Firebase — Spark Plan (Free)

#### Firestore (our database)

| Resource | Free Limit | Reset | What Counts |
|----------|-----------|-------|-------------|
| Reads | **50,000/day** | Midnight PT | Every `.get()` on a doc or query result doc. A query returning 200 docs = 200 reads |
| Writes | **20,000/day** | Midnight PT | Every `.set()`, `.update()`, `.delete()` |
| Deletes | **20,000/day** | Midnight PT | Every `.delete()` |
| `.count()` queries | **1 read per 1,000 docs** | — | Much cheaper than `.get()` when you only need the count |
| Stored data | **1 GiB** | Cumulative | All documents + indexes |
| Network egress | **10 GiB/month** | Monthly | Data transferred out to clients |

**Key insight:** A single `.get()` on a query returning 200 documents = **200 reads**. A `.count()` on the same query = **1 read**.

**When exceeded:** Service stops entirely for the rest of the day. API calls return `RESOURCE_EXHAUSTED` errors. No surprise billing — Firebase never auto-upgrades you.

#### Firebase Auth

| Resource | Free Limit |
|----------|-----------|
| Monthly Active Users (email/password) | **50,000 MAU** |
| Daily Active Users | **3,000 DAU** |
| Sign-up rate | ~100/hour per IP |
| Phone/SMS auth | Not available on Spark (Blaze only) |

**Included free:** Email/password, social login (Google, Facebook, Apple, GitHub), anonymous auth, custom email templates, account linking.

#### What ZenyFit Actually Uses

| Firebase Service | Used? | Notes |
|-----------------|-------|-------|
| Firestore | Yes | Primary database — the bottleneck to watch |
| Auth | Yes | Email/password only (emails are `username@zenyfit.local`) |
| Cloud Storage | No | Avatars are Dicebear URLs, not uploaded files |
| Cloud Functions | No | We use Next.js API routes on Vercel instead |
| Hosting | No | We deploy on Vercel |
| Cloud Messaging (FCM) | No | Push notifications use Web Push API directly |
| Analytics | No | — |

### Vercel — Hobby Plan (Free)

#### Serverless Functions (our API routes)

| Resource | Free Limit |
|----------|-----------|
| Invocations | **1,000,000/month** |
| Active CPU time | **4 CPU-hours/month** |
| Provisioned memory time | **360 GB-hours/month** |
| Max duration per function | **300 seconds** (5 min) |
| Max memory per function | **2 GB / 1 vCPU** |
| Request/response body | **4.5 MB** max |
| Concurrent executions | Auto-scales up to 30,000 |

#### Bandwidth & Builds

| Resource | Free Limit |
|----------|-----------|
| Data transfer (bandwidth) | **100 GB/month** |
| Origin transfer | **10 GB/month** |
| Build execution | **6,000 min/month** (100 hours) |
| Max build time per deploy | **45 min** |
| Concurrent builds | **1** |
| Deployments per day | **100** |

#### Other Limits

| Resource | Free Limit |
|----------|-----------|
| Projects | 200 |
| Domains per project | 50 |
| Image optimization (source images) | 1,000/month |
| Web Analytics events | 50,000/month |
| Runtime log retention | 1 hour |
| Cron jobs per project | 100 |
| WAF custom rules | 3 |
| DDoS protection | Included |

**Important:** Hobby plan is for **personal, non-commercial use only**. If ZenyFit becomes commercial, it needs Vercel Pro ($20/user/month).

**When exceeded:** Vercel will block further requests or builds until the next billing period. No surprise charges on Hobby.

### ZenyFit Capacity on Free Tiers

| Bottleneck | Limit | ZenyFit Usage per Active User/Day | Max Users |
|-----------|-------|----------------------------------|-----------|
| **Firestore reads** | 50,000/day | ~3,000-4,000 reads/day | **~12-15 users** |
| **Firestore writes** | 20,000/day | ~20-50 writes/day (workouts) | ~400+ users |
| **Vercel invocations** | 1M/month | ~200-500 calls/day | ~60-150 users |
| **Vercel CPU** | 4 hrs/month | ~1-3 min/day | ~80-240 users |
| **Vercel bandwidth** | 100 GB/month | ~5-20 MB/day | ~150-600 users |
| **Auth MAU** | 50,000/month | 1 MAU per user | 50,000 users |

**Firestore reads are the bottleneck.** Everything else has plenty of headroom.

### Upgrading Path

| Trigger | Action | Cost |
|---------|--------|------|
| > ~15 active users | Firebase Blaze (pay-as-you-go) | ~$0.06 per 100k reads beyond free tier |
| Commercial use | Vercel Pro | $20/month |
| Need Redis for rate limiting | Upstash or Vercel KV | Free tier available, ~$1/month after |

---

## What Happens When a User Visits Each Page

### Dashboard (heaviest page)

| Widget | API Called | Firestore Reads (cold) | With Cache |
|--------|-----------|----------------------|------------|
| UserHeaderWidget | — (auth context) | 0 | 0 |
| StatsGridWidget | `/api/leaderboard/trend` + `/api/achievements` | ~15 (trend logs) + ~5 (achievements counts) | 0 |
| StreaksWidget | `/api/profile/stats` | ~50-200 (all user logs) | 0 (shared cache) |
| ExerciseRatioWidget | — (auth context totals) | 0 | 0 |
| WeeklyActivityWidget | `/api/profile/stats` | 0 (shared cache hit) | 0 |
| ConsistencyWidget | `/api/profile/stats` | 0 (shared cache hit) | 0 |
| PersonalBestsWidget | `/api/profile/stats` | 0 (shared cache hit) | 0 |
| ExerciseTotalsWidget | — (auth context totals) | 0 | 0 |
| XPHistoryWidget | `/api/leaderboard/trend` | 0 (shared cache hit) | 0 |
| ActiveChallengesWidget | `/api/challenges` | ~5-20 (challenges + participant avatars) | 0 |

**Total cold:** ~75-240 reads | **With fresh cache:** 0 reads | **API calls:** 4 unique (was 7 before deduplication)

#### Widget Customization System

Users can reorder, hide, and show dashboard widgets via an edit mode.

**Data model** (stored in user doc as `dashboardWidgets`):
- `order: string[]` — All widget IDs in display order (visible first, hidden at end)
- `hidden: string[]` — Widget IDs that are hidden from the dashboard

**Key files:**
- `src/lib/widgets.ts` — Widget definitions, default config, `getVisibleWidgets()` / `getHiddenWidgets()` helpers
- `src/components/SortableWidget.tsx` — Edit mode wrapper with drag handle and hide/show toggle
- `src/app/dashboard/page.tsx` — Dashboard page with `@dnd-kit/sortable` drag-and-drop

**Behavior:**
- Edit mode shows all widgets (visible + hidden) with a "Hidden" separator between zones
- Drag-and-drop reorders widgets; dragging across the visible/hidden boundary toggles visibility
- Hide/Show button moves widget to/from the hidden zone
- New widgets (added to `WIDGET_DEFINITIONS`) are auto-inserted at the end of the visible area
- Config is debounce-saved (500ms) to `/api/users/[id]` via PATCH

### Profile Page

| API Called | Firestore Reads (cold) |
|-----------|----------------------|
| `/api/leaderboard/trend` | ~15 |
| `/api/achievements` | ~5 |
| `/api/profile/stats` | ~50-200 |

**Total cold:** ~70-220 reads | **With fresh cache:** 0 reads

### Leaderboard Page

| API Called | Firestore Reads (cold) |
|-----------|----------------------|
| `/api/leaderboard` | ~50 (user docs) |
| `/api/leaderboard/stats` | ~50-5000 (depends on scope) |

**Total cold:** ~100-5050 reads | **With fresh cache:** 0 reads

### Other Pages

| Page | API | Reads (cold) |
|------|-----|-------------|
| Challenges | `/api/challenges` | ~5-20 |
| Achievements | `/api/achievements` | ~5 |
| Log | `/api/workouts?limit=7` | ~8 |

---

## API Route Reference

### User-Facing Routes

| Route | Methods | Collections Read | Reads/Call | Server Cache | Rate Limit |
|-------|---------|-----------------|-----------|-------------|------------|
| `/api/leaderboard` | GET | `users` | ~50 | 2 min | READ_HEAVY |
| `/api/leaderboard/trend` | GET | `exercise_logs` | ~15 | 2 min | READ_HEAVY |
| `/api/leaderboard/stats` | GET | `exercise_logs` | 50-5000 | 2 min | READ_HEAVY |
| `/api/profile/stats` | GET | `exercise_logs` | 50-200 | 2 min | MODERATE |
| `/api/achievements` | GET | `users`, `exercise_logs`, `challenges`, `inviteCodes` | ~5 | 2 min | READ_HEAVY |
| `/api/challenges` | GET | `challenges`, `users` | 5-50 | 1 min | MODERATE |
| `/api/challenges` | POST | `users`, `challenges` | ~2 | - | MODERATE |
| `/api/challenges/[id]` | GET | `challenges`, `users` | 2-10 | - | MODERATE |
| `/api/challenges/[id]/join` | POST | `users`, `challenges` | ~2 | - | MODERATE |
| `/api/workouts` | GET | `exercise_logs` | ~8 | - | WRITE_HEAVY |
| `/api/workouts` | POST | `exercise_logs`, `users`, `challenges` | 2-4 | - | WRITE_HEAVY |
| `/api/workouts/[id]` | DELETE | `exercise_logs`, `users`, `challenges` | 2-4 | - | MODERATE |
| `/api/exercises/custom` | GET/POST | `custom_exercises` | 1-2 | - | MODERATE |
| `/api/exercises/custom/[id]` | PATCH/DELETE | `custom_exercises` | 1-2 | - | MODERATE |
| `/api/notifications/subscribe` | GET/POST/DELETE | `users` | 1 | - | MODERATE |
| `/api/users/validate` | GET | — (Firebase Auth) | 0 | - | PUBLIC_MOD |
| `/api/config` | GET | — (env vars only) | 0 | - | PUBLIC_MOD |
| `/api/invites` | GET | `inviteCodes`, `users` | 1-10 | - | READ_HEAVY |
| `/api/invites/generate` | POST | `inviteCodes` | 1-10 | - | MODERATE |
| `/api/invites/validate` | GET | `inviteCodes` | 1 | - | PUBLIC_MOD |
| `/api/auth/signup` | POST | `inviteCodes`, `users` | 2-3 | - | PUBLIC_STRICT |
| `/api/users/[id]` | GET/PATCH | `users` | 1-2 | - | MODERATE |

### Admin Routes (require admin auth)

| Route | Methods | Collections Read | Reads/Call |
|-------|---------|-----------------|-----------|
| `/api/admin/users` | GET/PATCH/DELETE | `users`, `exercise_logs`, `custom_exercises`, `inviteCodes` | 1-50+ |
| `/api/admin/stats` | GET | `users`, `exercise_logs`, `challenges`, `inviteCodes`, `custom_exercises` | 10+ counts |
| `/api/admin/invites` | GET/POST/DELETE | `inviteCodes`, `users` | 1-50 |
| `/api/admin/moderation` | GET/DELETE | `challenges`, `custom_exercises`, `exercise_logs`, `users` | 10-50 |
| `/api/admin/backup-xp` | GET/POST | `xp_backups`, `users`, `exercise_logs` | Full scan |
| `/api/admin/restore-xp` | POST | `xp_backups`, `users`, `exercise_logs` | Full scan |
| `/api/admin/recalculate-xp` | POST | `users`, `exercise_logs` | Full scan |

---

## Caching Architecture

### Layer 1: Client-Side Cache (localStorage)

**File:** `src/lib/client-cache.ts`

Every widget/page checks localStorage before making API calls. Cache entries have a 5-minute TTL.

**Behavior:**
- **Fresh cache (< 5 min old):** Use cached data, **no API call at all**
- **Stale cache (> 5 min old):** Show cached data immediately, background-fetch fresh data
- **No cache:** Show loading spinner, fetch data

**Shared cache keys** (multiple widgets share one entry to prevent duplicate fetches):

| Cache Key | Used By | API Route |
|-----------|---------|-----------|
| `zenyfit_profile_stats_v2` | ConsistencyWidget, PersonalBestsWidget, WeeklyActivityWidget, Profile page | `/api/profile/stats` |
| `zenyfit_trend_cache` | StatsGridWidget, XPHistoryWidget, Profile page | `/api/leaderboard/trend` |
| `zenyfit_stats_grid_v2` | StatsGridWidget, Profile page | `/api/achievements` (subset) |
| `zenyfit_challenges` | ActiveChallengesWidget, Challenges page | `/api/challenges` |
| `zenyfit_achievements_v2` | Achievements page | `/api/achievements` |
| `zenyfit_rankings_cache` | Leaderboard page | `/api/leaderboard` |
| `zenyfit_chart_cache` | LeaderboardCharts | `/api/leaderboard/stats` |

### Layer 2: Server-Side Cache (in-memory)

**File:** `src/lib/api-cache.ts`

In-memory Map on the server (same pattern as rate-limit.ts). Caches full JSON responses keyed by route + userId + query params.

| Route | TTL |
|-------|-----|
| `/api/leaderboard` | 2 min |
| `/api/leaderboard/trend` | 2 min |
| `/api/leaderboard/stats` | 2 min |
| `/api/profile/stats` | 2 min |
| `/api/achievements` | 2 min |
| `/api/challenges` | 1 min |

**When both layers hit:** Client cache serves data instantly with zero API calls. When client cache is stale but server cache is fresh, the API call completes instantly with zero Firestore reads.

### Layer 3: Real-Time Listener

**File:** `src/lib/auth-context.tsx`

An `onSnapshot` listener on the user's own document keeps profile data (XP, level, totals, avatar) live without polling. This costs **1 read per change** (not per page view).

---

## Cost Estimates: Before vs After

### Before These Fixes

| Scenario | Reads per Visit |
|----------|----------------|
| Dashboard visit | ~1,800 (3 full collection scans + always-fire background fetches) |
| Rapid navigation (5 pages in 1 min) | ~5,000 |
| 1 active user, full day (~15 visits) | ~27,000 |
| **Free tier supports** | **~1-2 users** |

**Root causes:**
1. `/api/achievements` fetched full exercise_logs collection (~200 docs) just for `.size`
2. Stale-while-revalidate ALWAYS fired background fetches, even with fresh cache
3. Three widgets independently called `/api/profile/stats` (3x the reads)
4. Two widgets independently called `/api/leaderboard/trend` (2x the reads)
5. Community stats query read ALL exercise_logs (unbounded)

### After These Fixes

| Scenario | Reads per Visit |
|----------|----------------|
| Dashboard visit (fresh cache) | **0** |
| Dashboard visit (stale cache, server cache hit) | **0 Firestore reads** (served from memory) |
| Dashboard visit (everything cold) | **~80-250** |
| Rapid navigation (5 pages in 1 min) | **~80-250** (client cache covers subsequent pages) |
| 1 active user, full day (~15 visits) | **~3,000-4,000** |
| **Free tier supports** | **~12-15 users** |

**What changed:**
1. `.count()` queries: 208 reads -> ~3 reads for achievements
2. TTL-respecting cache: fresh cache = zero API calls (was: always background fetch)
3. Shared cache keys: 3 widgets share 1 `/api/profile/stats` call (was: 3 independent calls)
4. Shared trend cache: 2 widgets share 1 `/api/leaderboard/trend` call
5. Server-side cache: repeated API calls within 2 min = 0 Firestore reads
6. `.limit(5000)` on community stats: caps worst-case reads

---

## How to Monitor Usage

### Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com) -> your project
2. **Usage tab** (left sidebar) -> Shows daily reads/writes/deletes
3. **Firestore** -> **Usage** tab -> Detailed breakdown by collection

### What to Watch

- **Daily reads** should stay well under 50,000
- If reads spike, check if server-side cache is working (Vercel cold starts clear the in-memory cache)
- After a Vercel deploy, expect a temporary spike as all caches are cold

### Vercel Cold Starts

The server-side cache (`api-cache.ts`) lives in memory. When Vercel spins down a function after inactivity (~5-15 min), the cache is lost. The first request after a cold start will hit Firestore, but subsequent requests within the TTL window will be served from cache.

---

## Data Flow: Logging a Workout

```
User taps "Log" -> POST /api/workouts
                    |
                    v
              Verify auth token
                    |
                    v
              Rate limit check
                    |
                    v
              Calculate XP (server-side, anti-cheat)
                    |
                    v
              Write to exercise_logs collection
                    |
                    v
              Update user doc (xp, level, totals)
                    |
                    v
              Check active challenges (transaction)
                    |
                    v
              Return { xpEarned, newLevel, ... }
                    |
                    v
              Client receives response
                    |
                    v
              onSnapshot fires -> AuthContext updates -> UI re-renders
```

**Reads:** 2-4 | **Writes:** 2-3 (log + user + maybe challenge)

---

## Security Model

- **All XP calculations happen server-side** - clients can't cheat by sending fake XP values
- **Firestore rules deny client-side writes** to sensitive fields (XP, level, totals)
- **Rate limiting** on all endpoints prevents abuse
- **Input sanitization** (`src/lib/sanitize.ts`) prevents XSS
- **Security headers** (CSP, HSTS, X-Frame-Options) in `next.config.js`
