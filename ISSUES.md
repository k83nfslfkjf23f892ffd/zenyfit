# ONGOING FEATURES & ISSUES

## CRITICAL

### 21. Firestore Read Quota Exhaustion — 46k reads in 1 hour
- **Status:** Open
- **Severity:** Critical — app becomes unusable when quota is hit
- **Problem:** Normal browsing burns through Firestore read quota extremely fast. Went from 5k to 46k reads in ~1 hour of light testing on dev branch.

#### Root Cause: Unbounded queries + no server-side cache + fake client cache

**1. Unbounded collection reads (no `.limit()`):**

| Route | What it reads | Reads per call |
|-------|--------------|----------------|
| `/api/achievements` (line 34-37) | ALL user's exercise_logs `.get()` | N logs |
| `/api/achievements` (line 46-49) | ALL user's challenges | M challenges |
| `/api/leaderboard/trend` (line 38-42) | ALL exercise_logs in 7 days | N logs |
| `/api/profile/stats` (line 25-29) | ALL user's exercise_logs | N logs |
| `/api/leaderboard/stats` (line 63-74) | **ALL exercise_logs from ALL users** (community scope) | **Every log in the system** |

The `/api/leaderboard/stats` with `scope=community` is the worst offender — it reads every single exercise log from every user in the time range, with no limit.

`/api/achievements` reads ALL logs just to count them (`workoutsSnapshot.size`) when it could use `.count()`.

**2. Client-side "cache" doesn't actually prevent API calls:**
The stale-while-revalidate pattern in every widget (e.g., StatsGridWidget, profile page):
```typescript
const fetchStats = useCallback(async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCachedStats();
    if (cached) {
      setStats(cached);         // Show cached data instantly
      setLoading(false);
      fetchStats(true);          // ← ALWAYS fires background fetch
      return;
    }
  }
  // ... actual API call happens every time
```
The cache only skips the loading spinner — it ALWAYS makes API calls in the background. So every page visit = full Firestore reads regardless of cache.

**3. No server-side caching:**
Every API request hits Firestore directly. No in-memory TTL cache on the server. On Vercel serverless this is harder (instances don't share memory), but even per-instance caching would help since warm instances handle many requests.

**4. Dashboard is the worst page — loads 5+ API calls simultaneously:**
- `/api/leaderboard/trend` → N exercise_log reads
- `/api/achievements` → N exercise_log reads + M challenge reads + K invite reads
- `/api/profile/stats` → N exercise_log reads (AGAIN, same collection)
- `/api/leaderboard/stats` → ALL exercise_logs from ALL users
- `/api/challenges` → challenge reads + participant user reads

If a user has 200 logs and there are 500 total logs in the system, each dashboard visit = ~1,400+ Firestore reads. With background refetch, every navigation back to dashboard repeats this.

#### Fix Plan (in priority order):
1. **Use `.count()` instead of `.get()` where only counts are needed** — `/api/achievements` reads all logs just for `workoutsSnapshot.size`
2. **Add server-side in-memory TTL cache** to expensive routes (even 60s cache would cut reads 90%+)
3. **Make client cache actually skip background fetch when cache is fresh** — only refetch if cache is older than TTL, not every time
4. **Add `.limit()` to all unbounded queries** or paginate results
5. **Deduplicate overlapping reads** — `/api/profile/stats` and `/api/achievements` both read all exercise_logs separately; could combine into one call
6. **Store pre-computed stats in user document** — total workout count, consistency score, etc. updated on each workout log, so reads are 1 doc instead of N logs

---

## HIGH PRIORITY

### ~~Dev Deployment API Errors (Firebase Quota)~~ (Fixed)
- **Status:** Fixed
- **Location:** All API routes on `devzenyfit.vercel.app`
- **Problem:** All API endpoints returning 500 with `RESOURCE_EXHAUSTED: Quota exceeded`
- **Fix:** Resolved

### React Hydration Error #418 (Desktop Only)
- **Status:** Open
- **Location:** Unknown component
- **Problem:** Server-rendered HTML doesn't match client-rendered HTML on desktop browser
- **Possible causes:**
  - Date/time rendering differences (server vs client timezone)
  - Conditional rendering based on `window` or browser APIs
  - Browser extensions modifying the DOM
- **Fix:** Identify component causing mismatch, use `useEffect` for client-only rendering
- **How to debug:**
  1. Open React DevTools, enable "Highlight updates"
  2. Check components that render dates, times, or use `typeof window`
  3. Look for `Math.random()`, `Date.now()`, or `new Date()` in render
  4. Common culprits: timestamps, "time ago" displays, theme detection, viewport checks
  5. Wrap client-only logic in `useEffect` or use `dynamic()` with `ssr: false`
- **Technical background:**
  - Next.js renders components on the server first (SSR), producing HTML
  - Browser receives this HTML, displays it immediately (fast initial paint)
  - React then "hydrates" - attaches event handlers and makes it interactive
  - During hydration, React re-renders components and compares output to server HTML
  - If they don't match, React throws error #418 and must discard server HTML and re-render
  - **Why it matters:**
    - Breaks the performance benefit of SSR (double rendering)
    - Can cause visual flicker as content changes
    - In strict mode, React will warn but continue; in production, it silently re-renders
    - Indicates architectural issue - code assumes browser APIs exist during server render
  - **Common patterns that cause this:**
    ```typescript
    // BAD: Different output on server vs client
    const isDesktop = window.innerWidth > 768;  // window undefined on server
    const now = new Date().toLocaleString();    // different timezone on server
    const id = Math.random();                   // different value each render

    // GOOD: Defer to client
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
      setIsDesktop(window.innerWidth > 768);
    }, []);
    ```
  - **Why desktop-only:** Desktop browser extensions (React DevTools, ad blockers, password managers) can inject DOM nodes that weren't in server HTML, triggering mismatch

### ~~1. Profile Stats Bug - Wrong "This Week" Data~~ (Not a bug)
- **Status:** Closed - Not a bug
- **Location:** `src/app/profile/page.tsx:131-135`
- **Problem:** "This Week" and "Week XP" appeared to display total values instead of weekly values
- **Resolution:** The API `/api/leaderboard/trend` already filters to 7 days, so `totalWorkouts`/`totalXp` in the response ARE weekly values. The variable naming is misleading but the displayed data is correct.

### ~~2. Infinite Fetch Loop Risk~~ (Fixed v1.4.6)
- **Status:** Fixed
- **Location:** `src/app/log/page.tsx`, `src/app/leaderboard/page.tsx`, `src/app/challenges/page.tsx`
- **Problem:** Background refresh can hang indefinitely if network fails. No timeout or error handling.
- **Fix:** Added 10-second timeout to clear `updating` state

### ~~3. Session Progress Can Be Lost~~ (Fixed v1.4.6)
- **Status:** Fixed
- **Location:** `src/app/log/page.tsx`
- **Problem:** `sessionTotal` resets on exercise type change with no warning
- **Fix:** Session totals now persist per exercise type in sessionStorage, added "Clear session" button

### ~~4. Missing Error Boundaries~~ (Fixed v1.4.8)
- **Status:** Fixed
- **Location:** All main pages
- **Problem:** No error boundaries. If a component crashes, entire app becomes unusable
- **Fix:** Added `ErrorBoundary` component in providers.tsx (app-wide) and `WidgetErrorBoundary` around dashboard widgets for isolation

### ~~5. Auth Race Condition~~ (Fixed)
- **Status:** Fixed
- **Location:** `src/lib/auth-context.tsx`
- **Problem:** Multiple concurrent Firestore subscriptions can cause level-up celebration triggering multiple times
- **Fix:** Added `lastCelebratedLevelRef` to deduplicate celebrations - only fires if level exceeds both previous and last celebrated level

---

## MEDIUM PRIORITY

### 6. No Real-Time Challenge Updates
- **Status:** Open
- **Location:** `src/app/challenges/[id]/page.tsx:89-129`
- **Problem:** Challenge participants only update on refresh or 2-min cache expiry. Undermines "social motivation" philosophy
- **Fix:** Use Firestore `onSnapshot` for live updates

### ~~7. Missing Loading State During Tab Switching~~ (Fixed)
- **Status:** Fixed
- **Location:** `src/app/leaderboard/page.tsx`, `src/app/challenges/page.tsx`
- **Problem:** When switching tabs, UI shows stale cached data without indication it's refreshing
- **Fix:** Added "Updating..." indicator with `animate-pulse` animation during background refresh

### ~~8. No Debouncing on Rapid Actions~~ (Fixed v1.4.6)
- **Status:** Fixed
- **Location:** `src/app/log/page.tsx` (quick add buttons)
- **Problem:** Users can spam quick-add buttons, creating duplicate API requests
- **Fix:** Added 300ms debounce on quick add buttons

### 9. Accessibility Gaps
- **Status:** Open
- **Location:** Multiple pages
- **Problem:** Session total has no screen reader context, bottom nav icons missing labels, modal dialogs missing ARIA attributes
- **Fix:** Add ARIA labels, use semantic HTML

### ~~10. Pull-to-Refresh Edge Cases~~ (Fixed)
- **Status:** Fixed
- **Location:** `src/app/challenges/[id]/page.tsx`
- **Problem:** Only worked if `scrollTop === 0`, unreliable on mobile due to momentum scrolling
- **Fix:** Changed to `scrollTop <= 5` threshold, visual feedback already present

---

## LOWER PRIORITY

### Firestore Deprecation Warning
- **Status:** Low priority
- **Location:** `src/lib/firebase.ts`
- **Problem:** `enableIndexedDbPersistence() will be deprecated in the future`
- **Fix:** Migrate to new `FirestoreSettings.cache` API when convenient

### Permissions-Policy Header Warning
- **Status:** Can ignore
- **Problem:** `Unrecognized feature: 'browsing-topics'` in console
- **Cause:** Vercel infrastructure adds this header, not our code
- **Fix:** None needed

### 13. LocalStorage No Cleanup
- **Status:** Open
- **Location:** Multiple pages
- **Problem:** Multiple caches can exceed 5MB quota, silent failures when exceeded
- **Fix:** Implement storage quota checking, cleanup old entries

### 14. Avatar Images Not Optimized
- **Status:** Open
- **Location:** Leaderboard pages
- **Problem:** Using `<img>` without lazy loading or Next.js Image optimization
- **Fix:** Use Next.js `<Image>` component

### 15. Missing Skeleton Loaders
- **Status:** Open
- **Location:** All pages with data fetching
- **Problem:** Pages show spinner then content. No skeleton placeholders
- **Fix:** Use existing `src/components/ui/skeleton.tsx`

### 16. Rate Limiting Uses In-Memory Map
- **Status:** Open
- **Location:** `src/lib/rate-limit.ts:15`
- **Problem:** On Vercel with multiple instances, rate limits not enforced properly
- **Fix:** Use Redis-backed rate limiting for production scale
- **Detailed explanation:**
  - Vercel runs serverless functions across multiple isolated instances
  - Each instance has its own memory - they don't share state
  - User hits instance A, gets counted. Hits instance B, counter resets to 0
  - Attacker can bypass rate limits by forcing different instances (different IPs, timing)
  - Current implementation gives false sense of security
  - **Options:**
    1. **Vercel KV** (Redis) - simplest, ~$1/mo for hobby tier
    2. **Upstash Redis** - serverless Redis, free tier available
    3. **Accept the limitation** - fine for small user base, add monitoring to detect abuse
    4. **Move to edge runtime** - more consistent routing but still not guaranteed

### 17. Challenge Creation No Abuse Prevention
- **Status:** Open
- **Location:** `src/app/api/challenges/route.ts:47-55`
- **Problem:** No check for duplicate titles, extreme durations, or spam creation
- **Fix:** Per-user rate limit, validate duration, check duplicates

### ~~18. Custom Exercises~~ (Removed)
- **Status:** Closed - Feature removed from UI
- **Note:** Custom exercises removed from log page and dashboard for now. API routes and schema kept for future re-enabling

### ~~19. Challenge Timer Display~~ (Fixed)
- **Status:** Fixed
- **Location:** `src/app/challenges/page.tsx`
- **Problem:** Timer only showed minutes/seconds
- **Fix:** Timer now displays days, hours, minutes, and seconds with appropriate granularity

### ~~20. Inefficient XP Rate Lookup~~ (Fixed)
- **Status:** Fixed
- **Location:** `src/app/log/page.tsx`
- **Problem:** Every render calculates `activeXpRate` from constants
- **Fix:** Wrapped in `useMemo`

---

## ARCHITECTURE NOTES

### Over-Engineering vs Under-Engineering Balance

**Under-engineered (needs more attention):**

1. **Rate limiting (critical)** - In-memory map doesn't work on serverless. See issue #16.

   **Why this is a fundamental architectural mismatch:**
   - Traditional servers: Single process, persistent memory, rate limit maps work perfectly
   - Vercel serverless: Each request can hit a different cold-started function instance
   - The `Map<string, RateLimitEntry>` in `rate-limit.ts` exists only in that instance's memory
   - When instance dies (after ~15 min idle) or when request routes elsewhere, the map is gone

   **Real-world impact:**
   ```
   Request 1 → Instance A → Map: { user123: 1 request }
   Request 2 → Instance B → Map: { user123: 1 request }  // B doesn't know about A
   Request 3 → Instance A → Map: { user123: 2 requests }
   Request 4 → Instance C → Map: { user123: 1 request }  // New instance, fresh map
   ```
   User made 4 requests but each instance only saw 1-2. A determined attacker with 100 req/min limit could send 300+ by hitting different instances.

   **Why it's still "working" for now:**
   - Low traffic means requests often hit same warm instance
   - Honest users don't try to bypass it
   - Vercel's own DDoS protection catches extreme abuse
   - But it's security theater - provides false confidence

2. **Error handling** - API errors often swallowed silently, users see blank screens instead of helpful messages. (Error boundaries added in v1.4.8)

3. **State management** - Auth context doing too much (user data, subscriptions, level-up detection). Should be split into smaller concerns.

4. **Caching strategy** - Mix of localStorage, in-memory, and no caching. No consistent TTL policy. Cache invalidation is manual and error-prone.

**Over-engineered (could be simpler):**

1. **XP rate constants** - Extensive variation tables (e.g., 8 different pull-up variations with different XP). Users unlikely to distinguish "wide grip" vs "regular" pull-ups. Could simplify to 3-4 tiers.

2. ~~**Theme system** - 24 themes is a lot to maintain.~~ (Fixed in v2.0.0 — reduced to 6 themes)

3. **Challenge participant tracking** - Stores full participant objects with progress in challenge doc. Could use subcollection for scalability, but current user count probably doesn't need it.

4. **Security headers** - Comprehensive but some (CSP, HSTS) are already handled by Vercel. Duplicating effort.

**Right-sized:**
- Firebase Admin singleton pattern
- Auth token verification flow
- API route structure
- PWA configuration

---

## PLANNED FEATURES

*None currently*

---

## RECENTLY COMPLETED

- Dashboard widget customizer scroll fix - last item wasn't visible due to `overscroll-none` and missing bottom padding
- XP info button on leaderboard - enlarged touch target (`p-2 -m-2`, icon `h-5 w-5`) for mobile accessibility
- #20 Inefficient XP Rate Lookup - wrapped in `useMemo`
- #18 Custom Exercises - removed from UI (log page, creation page), API routes kept for future
- #10 Pull-to-Refresh - changed `scrollTop === 0` to `<= 5` for reliable mobile activation
- #5 Auth Race Condition - added `lastCelebratedLevelRef` to deduplicate level-up celebrations
- #19 Challenge Timer Display - now shows days, hours, minutes, seconds with appropriate granularity
- #7 Missing Loading State During Tab Switching - added "Updating..." indicator with pulse animation
- #1 Profile Stats Bug - verified not a bug, API already returns weekly data correctly
- Notification API crash on Settings page - `Notification` variable accessed without checking if it exists, crashing on browsers without Web Notification support. Added `typeof Notification !== 'undefined'` guards in `push-notifications.ts`
- #4 Missing Error Boundaries (v1.4.8) - added ErrorBoundary component in providers.tsx and WidgetErrorBoundary for dashboard widgets
- #2 Infinite Fetch Loop Risk (v1.4.6) - added 10s timeout for background updates
- #3 Session Progress Can Be Lost (v1.4.6) - persist per-exercise in sessionStorage, added clear button
- #8 No Debouncing on Rapid Actions (v1.4.6) - 300ms debounce on quick add buttons
- #11 PWA theme color mismatch (changed to #000000 for dark mode)
- #12 Logout confirmation dialog added
- Invite codes Firestore index issue (fixed by sorting in memory instead of using orderBy)
- Custom exercises UI on dashboard
- Challenge invitations (invite users to challenges)
- Profile achievements count (fetches real count)
