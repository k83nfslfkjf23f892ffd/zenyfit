# ONGOING FEATURES & ISSUES

## HIGH PRIORITY

### 1. Profile Stats Bug - Wrong "This Week" Data
- **Status:** Open
- **Location:** `src/app/profile/page.tsx:131-135`
- **Problem:** "This Week" and "Week XP" display total values instead of weekly values
- **Options:**
  - Fix API to return weekly data separately
  - Remove the "This Week" cards
  - Rename labels to "Total"

### 2. Infinite Fetch Loop Risk
- **Status:** Open
- **Location:** `src/app/log/page.tsx`, `src/app/leaderboard/page.tsx:99`, `src/app/challenges/page.tsx:106`
- **Problem:** Background refresh can hang indefinitely if network fails. No timeout or error handling.
- **Fix:** Add 10-second timeout to clear `updating` state

### 3. Session Progress Can Be Lost
- **Status:** Open
- **Location:** `src/app/log/page.tsx:127-128, 239-241`
- **Problem:** `sessionTotal` resets on exercise type change with no warning
- **Fix:** Persist to `sessionStorage`, add "Clear Session" button, show warning toast

### 4. Missing Error Boundaries
- **Status:** Open
- **Location:** All main pages
- **Problem:** No error boundaries. If a component crashes, entire app becomes unusable
- **Fix:** Add error boundaries around Log, Leaderboard, Challenges, Profile stats

### 5. Auth Race Condition
- **Status:** Open
- **Location:** `src/lib/auth-context.tsx:96-128`
- **Problem:** Multiple concurrent Firestore subscriptions can cause level-up celebration triggering multiple times, stale cached user data
- **Fix:** Add cleanup flag, deduplication, track last level-up event ID

---

## MEDIUM PRIORITY

### 6. No Real-Time Challenge Updates
- **Status:** Open
- **Location:** `src/app/challenges/[id]/page.tsx:89-129`
- **Problem:** Challenge participants only update on refresh or 2-min cache expiry. Undermines "social motivation" philosophy
- **Fix:** Use Firestore `onSnapshot` for live updates

### 7. Missing Loading State During Tab Switching
- **Status:** Open
- **Location:** `src/app/leaderboard/page.tsx:192-201`, `src/app/challenges/page.tsx:209-215`
- **Problem:** When switching tabs, UI shows stale cached data without indication it's refreshing
- **Fix:** Show "Refreshing..." indicator or fade old data while fetching

### 8. No Debouncing on Rapid Actions
- **Status:** Open
- **Location:** `src/app/log/page.tsx:706-754` (quick add buttons)
- **Problem:** Users can spam quick-add buttons, creating duplicate API requests
- **Fix:** Track last click timestamp, ignore clicks within 200ms

### 9. Accessibility Gaps
- **Status:** Open
- **Location:** Multiple pages
- **Problem:** Session total has no screen reader context, bottom nav icons missing labels, modal dialogs missing ARIA attributes
- **Fix:** Add ARIA labels, use semantic HTML

### 10. Pull-to-Refresh Edge Cases
- **Status:** Open
- **Location:** `src/app/challenges/[id]/page.tsx:175-194`
- **Problem:** Only works if `scrollTop === 0`. Unreliable on small content. No visual feedback
- **Fix:** Use `scrollTop <= 20`, add drag indicator animation

---

## LOWER PRIORITY

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

### 17. Challenge Creation No Abuse Prevention
- **Status:** Open
- **Location:** `src/app/api/challenges/route.ts:47-55`
- **Problem:** No check for duplicate titles, extreme durations, or spam creation
- **Fix:** Per-user rate limit, validate duration, check duplicates

### 18. Custom Exercise Deletion Not Handled
- **Status:** Open
- **Location:** Log page
- **Problem:** If user deletes a custom exercise that's currently selected, silent failure
- **Fix:** Show toast, fallback to first available exercise

### 19. Challenge Timer Display
- **Status:** Open
- **Location:** `src/app/challenges/page.tsx:163-174`
- **Problem:** Timer only shows minutes/seconds. No urgency indicator when time almost up
- **Fix:** Add days/hours, red pulse animation when <5 minutes remaining

### 20. Inefficient XP Rate Lookup
- **Status:** Open
- **Location:** `src/app/log/page.tsx:558`
- **Problem:** Every render calculates `activeXpRate` from constants
- **Fix:** Wrap in `useMemo`

---

## PLANNED FEATURES

*None currently*

---

## RECENTLY COMPLETED

- #11 PWA theme color mismatch (changed to #000000 for dark mode)
- #12 Logout confirmation dialog added
- Invite codes Firestore index issue (fixed by sorting in memory instead of using orderBy)
- Custom exercises UI on dashboard
- Challenge invitations (invite users to challenges)
- Profile achievements count (fetches real count)
