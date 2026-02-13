# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core App Philosophy

ZenyFit is built on these fundamental principles:

1. **Social Motivation** - "Others are working hard, I should too" - Seeing friends' activity inspires users to stay active
2. **Gamification** - XP makes fitness fun and trackable, turning workouts into progress
3. **Competition** - Leaderboards and challenges push people beyond their limits
4. **Fairness** - Challenges must feel fair so competition is meaningful
5. **Urgency** - Seeing others progress creates healthy pressure to not fall behind

### Leaderboard Structure
- **Global Leaderboard**: Ranked by **time-based effort** (minutes/hours), with XP shown as reference only - ensures fairness across different exercise types
- **Category Leaderboards**: Ranked by **XP** within each category (Calisthenics, Team Sports, Cardio)

### Exercise Categories
| Category | Exercises | Ranked By |
|----------|-----------|-----------|
| Calisthenics | Push-ups, pull-ups, dips, muscle-ups, etc. | XP (per rep difficulty) |
| Team Sports | Volleyball, basketball, soccer, etc. | XP (time-based) |
| Cardio | Running, walking, swimming, etc. | XP (distance/time-based) |

### Challenge Philosophy
- Challenges are **single exercise type only** - ensures all participants compete fairly on the same metric
- Seeing others "going all out" in a challenge creates motivation to push harder

## Mobile-First Development

**CRITICAL**: ZenyFit is primarily a mobile app. All features MUST be designed and tested for mobile first.

- **Always test on mobile viewport** before considering desktop
- **Touch targets** must be large enough (min 44x44px)
- **Modals/sheets** must have visible buttons without scrolling
- **Drag-and-drop** must work with touch gestures
- **No hover-only interactions** - everything must work with tap
- **Bottom sheets** preferred over centered modals on mobile

## Communication Guidelines

When working with this codebase, Claude should:
- **Ask for clarification** when requirements are ambiguous or more context is needed
- **Say "I don't know" or "I don't fully understand"** - this is ALWAYS acceptable and preferred over guessing or making assumptions. Honesty about uncertainty leads to better outcomes.
- **Flag potential issues** before implementing changes
- **Suggest alternatives** when a better approach exists
- **Be honest about limitations** - accuracy over assumptions

## Development Commands

### Running the Application
```bash
npm run dev          # Start Next.js dev server on http://localhost:3001
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Deployment
**IMPORTANT**: When the user says "deploy", they mean **deploy to GitHub** (commit and push changes).
- This repository is connected to Vercel for automatic deployments
- Pushing to the `main` branch triggers automatic deployment to production
- DO NOT use `vercel` CLI commands unless explicitly requested

### Versioning
**Always update version numbers when making changes:**
- **Patch (1.1.x)**: Update for any changes/fixes
- **Minor (1.x.0)**: Update for major or big changes
- Version is tracked in commit messages (e.g., "v1.1.8: Description of change")
- **IMPORTANT**: Also update `APP_VERSION` in `shared/constants.ts` to match

## Architecture Overview

### Project Structure
```
zenyfit/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # API route handlers
│   │   └── [page]/       # Page components
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── widgets/      # Dashboard widgets (10 customizable)
│   │   ├── admin/        # Admin panel components
│   │   ├── charts/       # Recharts data visualization
│   │   └── animations/   # Framer Motion animations
│   └── lib/              # Utilities, Firebase, auth context
├── shared/               # Shared Zod schemas and constants
├── public/               # Static assets, PWA icons, manifest
└── prompts/              # Design briefs and prompts
```

### Key Architectural Patterns

#### 1. Authentication Flow
- **Client**: Firebase Auth with email/password (emails are `username@zenyfit.local`)
- **Server**: Validates ID tokens via Firebase Admin SDK (`verifyAuthToken` in `src/lib/firebase-admin.ts`)
- **Context**: `AuthProvider` in `src/lib/auth-context.tsx` manages auth state
- **Pattern**: Client authenticates → Gets ID token → Sends `Authorization: Bearer <token>` header → Server verifies

#### 2. Data Integrity Model
**All writes to Firestore happen server-side only** (via API routes) to prevent cheating:
- XP calculations are server-controlled
- Challenge progress updates use Firestore transactions
- Firestore rules deny all client-side writes except avatar/username/theme on own profile

#### 3. API Architecture (Next.js App Router)
API routes are in `src/app/api/[route]/route.ts`:
- Export named functions: `GET`, `POST`, `PATCH`, `DELETE`
- Use `NextRequest` and `NextResponse` from `next/server`
- All routes implement rate limiting via `src/lib/rate-limit.ts`
- Protected routes verify auth token before processing

Example pattern:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminInstances, verifyAuthToken } from '@/lib/firebase-admin';
import { rateLimitByUser, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const decodedToken = await verifyAuthToken(authHeader);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitResponse = rateLimitByUser(decodedToken, '/api/route', RATE_LIMITS.MODERATE);
  if (rateLimitResponse) return rateLimitResponse;

  const { db } = getAdminInstances();
  // ... handle request
}
```

#### 4. XP and Leveling System
**XP Rates** (defined in `shared/constants.ts`):

Calisthenics (per rep):
- Push-ups: 3 XP (baseline), variations: 2-6 XP based on difficulty
- Pull-ups: 6 XP, variations: 2-8 XP (chin-ups 5, wide 7, L-sit 8)
- Dips: 6 XP, variations: 2-7 XP (bench 2, ring 7)
- Muscle-ups: 11 XP

Cardio (per km):
- Running: 30 XP
- Walking: 18 XP
- Swimming: 40 XP
- Sprinting: 50 XP

Team Sports (per minute):
- Volleyball/Basketball/Soccer: 2 XP

Custom exercises: 0 XP (tracking only)

**Level Calculation**:
- Levels 1-10: Fixed thresholds `[0, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000, 30000]`
- Level 11+: Additional 7000 XP per level

#### 5. Theme System
- 6 themes defined in `src/lib/themes.ts`
- Theme provider injects CSS variables dynamically
- Uses `next-themes` for dark/light mode support
- User theme preference stored in Firestore and localStorage

#### 6. Caching Architecture (see `ARCHITECTURE.md` for full details)
Two-layer caching to minimize Firestore reads:
- **Server-side** (`src/lib/api-cache.ts`): In-memory Map with 1-2 min TTLs on 6 heavy routes
- **Client-side** (`src/lib/client-cache.ts`): localStorage with 5 min TTL, shared cache keys across widgets
- **Pattern**: Fresh cache → no API call. Stale cache → show old data, background refresh. No cache → loading spinner, fetch.

#### 7. Security Features
- **Rate Limiting**: All API endpoints protected (IP-based for public, user-based for authenticated)
- **Input Sanitization**: `src/lib/sanitize.ts` for XSS prevention
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc. in `next.config.js`
- **Firestore Rules**: Strict read/write permissions in `firestore.rules`

### Path Aliases (defined in `tsconfig.json`)
```typescript
"@/*"       → "src/*"
"@shared/*" → "shared/*"
```

## Environment Variables
**Required for server**:
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Entire JSON service account key as string
- `FIREBASE_API_KEY` - Firebase web API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID
- `MASTER_INVITE_CODE` - Bootstrap invite code for first users

## Database Schema (Firestore)

### Collections
1. **`users`**: User profiles (id, username, avatar, level, xp, totals, isAdmin, isBanned, theme, invitedBy, dashboardWidgets, createdAt)
2. **`exercise_logs`**: Workout records (userId, type, amount, timestamp, xpEarned, synced, isCustom)
3. **`custom_exercises`**: User-defined exercises (userId, name, unit, quickActions, createdAt)
4. **`challenges`**: Competition events (title, description, type, goal, dates, participants, participantIds, isPublic, colors, createdBy)
5. **`inviteCodes`**: Registration codes (code as doc ID, createdBy, used, usedBy, createdAt, usedAt)
6. **`pushSubscriptions`**: Web push subscriptions (userId, endpoint, keys, createdAt)

## UI Components

### shadcn/ui
- Components in `src/components/ui/`
- Built on Radix UI primitives
- Styled with Tailwind CSS

### Toast Notifications
- Uses `sonner` library
- Import `toast` from `sonner` for notifications

### Charts
- Recharts components in `src/components/charts/`
- XPHistoryChart, WeeklyActivityChart, UserGrowthChart, ExerciseRatioChart

### Animations
- Framer Motion components in `src/components/animations/`
- LevelUpCelebration, WorkoutCelebration, AchievementUnlock

## PWA Features
- Service worker at `public/sw.js`
- Manifest at `public/manifest.json`
- Custom icons in `public/icons/`
- Offline support with Firestore persistence
